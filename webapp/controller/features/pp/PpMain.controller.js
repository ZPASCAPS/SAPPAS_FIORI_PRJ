sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    // 고정 5단계 정의 (laneId 기준)
    var STEP_DEFS = [
        { key: "SO", label: "영업오더", sub: "SD", icon: "sap-icon://sales-order" },
        { key: "PR", label: "계획/PR", sub: "PP", icon: "sap-icon://activity-items" },
        { key: "PO", label: "발주/PO", sub: "MM", icon: "sap-icon://cart" },
        { key: "GR", label: "물류입고", sub: "MM", icon: "sap-icon://shipping-status" },
        { key: "MES", label: "생산오더", sub: "PP", icon: "sap-icon://factory" }
    ];

    var STEP_DEF_MAP = STEP_DEFS.reduce(function (m, d) { m[d.key] = d; return m; }, {});

    // 상태 → 짧은 배지 라벨 (긴 설명 대신 노출)
    var BADGE_BY_STATE = {
        done: "완료",
        warning: "진행중",
        bottleneck: "병목",
        pending: "대기"
    };

    // 병목 발생 lane 별 알림 메시지
    var ALERT_BY_LANE = {
        SO: { title: "영업 오더 확인 필요", guide: "영업팀 오더 상태 점검 및 납기 확정 요망" },
        PR: { title: "자재 결품 위험", guide: "구매팀 발주(PO) 전환 긴급 독촉 요망" },
        PO: { title: "자재 결품 위험", guide: "구매팀 발주(PO) 전환 긴급 독촉 요망" },
        GR: { title: "물류 지연 상태", guide: "물류팀 배송 추적 및 긴급 수송(Air) 요청" },
        MES: { title: "생산 가동 지연", guide: "현장 잔업 편성 또는 라인 평준화 조치 요망" }
    };

    var DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
    var MONTH_LABELS = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    // 생산 시작 시기 예측용 기본 리드타임 상수 (실측 데이터 연결 전 폴백)
    // 첫 미완료 단계부터 끝까지 남은 리드타임을 누적해 "예상 생산 시작"을 계산
    var LEAD_TIME = { SO: 1, PR: 3, PO: 2, GR: 2, MES: 1 };
    var DEFAULT_PROD_DURATION = 2; // 계획 생산 시작 = 요청 납기일 - 2일

    // 도넛 차트 색상 (확보=초록 / 진행중=주황 / 부족=빨강 / 대기=회색)
    var BOM_COLORS = { secured: "#16a34a", transit: "#ea580c", shortage: "#dc2626", idle: "#cbd5e1" };

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.pp.PpMain", {

        onInit: function () {
            this._oViewModel = new JSONModel(this._getEmptyModel());
            this.getView().setModel(this._oViewModel, "ppView");
            this._loadOrders();
            this._loadShortage();
        },

        _getEmptyModel: function () {
            return {
                busy: true,
                activeTab: "E2E",
                orders: [],
                selectedOrderKey: "",
                selectedOrderLabel: "",
                hasOrder: false,
                alert: {
                    severity: "none",
                    icon: "sap-icon://message-information",
                    title: "오더를 선택하세요",
                    guide: "상단 검색에서 영업오더를 선택하면 위험 상태가 표시됩니다."
                },
                pipeline: this._buildDefaultPipeline(),
                progress: {
                    pct: 0,
                    pctLabel: "0%",
                    fillWidth: "0%",
                    lineWidth: "0%",
                    lineVisible: false,
                    doneCount: 0,
                    total: STEP_DEFS.length,
                    summary: "진행률 0% · 0/" + STEP_DEFS.length + " 완료"
                },
                insight: this._emptyInsight(),
                bom: this._emptyBom(),
                feasibility: this._emptyFeasibility(),
                timeline: {
                    rangeLabel: "",
                    monthLabel: "",
                    days: this._buildDefaultDays(),
                    rows: [],
                    isEmpty: true
                },
                shortage: {
                    count: 0,
                    totalCount: 0,
                    rows: [],
                    isEmpty: true,
                    materials: [],
                    selectedKeys: []
                }
            };
        },

        _buildDefaultPipeline: function () {
            return STEP_DEFS.map(function (oDef) {
                return {
                    key: oDef.key,
                    label: oDef.label,
                    sub: oDef.sub,
                    icon: oDef.icon,
                    state: "pending",
                    statusText: "대기",
                    showStatus: true,
                    isCurrent: false,
                    currentClass: "",
                    connState: "idle"
                };
            });
        },

        _buildDefaultDays: function () {
            var oMonday = this._startOfWeek(new Date());
            return this._daysFromStart(oMonday);
        },

        /* ============================ 데이터 로드 ============================ */

        _getModel: function () {
            return this.getView().getModel() || this.getOwnerComponent().getModel();
        },

        _read: function (sModelName, sPath, aFilters) {
            var oModel = this.getView().getModel(sModelName)
                || this.getOwnerComponent().getModel(sModelName);
            return new Promise(function (resolve, reject) {
                if (!oModel) {
                    reject(new Error("model not available: " + sModelName));
                    return;
                }
                oModel.read(sPath, {
                    filters: aFilters || [],
                    success: function (oData) {
                        resolve((oData && oData.results) || []);
                    },
                    error: reject
                });
            });
        },

        _loadOrders: function () {
            var that = this;
            this._read("ppOrderListModel", "/ZI_PP_MTO_ORDER_LIST")
                .then(function (aRows) {
                    var aOrders = aRows.map(function (o) {
                        var sOrder = o.SalesOrder || "";
                        var sMat = o.MaterialName || o.Material || "";
                        return {
                            key: sOrder,
                            salesOrder: sOrder,
                            materialName: sMat,
                            label: sMat ? (sOrder + " · " + sMat) : sOrder
                        };
                    }).filter(function (o) { return o.key; });

                    that._oViewModel.setProperty("/orders", aOrders);

                    if (aOrders.length > 0) {
                        that._selectOrder(aOrders[0].key, aOrders[0].label);
                    } else {
                        that._oViewModel.setProperty("/busy", false);
                    }
                })
                .catch(function () {
                    that._oViewModel.setProperty("/orders", []);
                    that._oViewModel.setProperty("/busy", false);
                });
        },

        _selectOrder: function (sKey, sLabel) {
            this._oViewModel.setProperty("/selectedOrderKey", sKey);
            this._oViewModel.setProperty("/selectedOrderLabel", sLabel || sKey);
            this._oViewModel.setProperty("/hasOrder", !!sKey);
            this._loadOrderDetails(sKey);
        },

        // 신규 PP 1번 탭 전용 CDS 기준으로 로딩한다.
        //  - ppOverviewModel (/ZC_PP_MTO_OVERVIEW)  : 요약/파이프라인 flag/납기/리드타임/BOM 요약
        //  - ppBomStockModel (/ZC_PP_MTO_BOM_STOCK) : BOM 구성품 상세/부족 TOP3/부족 자재 리드타임
        // 신규 CDS가 비거나 실패하면 기존 trackerModel + ppShortageModel 조합으로 폴백한다.
        _loadOrderDetails: function (sOrder) {
            var that = this;
            var sPadded = this._padOrder(sOrder);
            var aFilters = sPadded ? [new Filter("SalesOrder", FilterOperator.EQ, sPadded)] : [];
            this._sCurrentOrder = sPadded;

            this._oViewModel.setProperty("/busy", true);

            Promise.all([
                this._read("ppOverviewModel", "/ZC_PP_MTO_OVERVIEW", aFilters).catch(function () { return null; }),
                this._read("ppBomStockModel", "/ZC_PP_MTO_BOM_STOCK", aFilters).catch(function () { return []; })
            ]).then(function (aRes) {
                var aOverview = aRes[0];
                var aBom = aRes[1] || [];
                var oOverview = (aOverview && aOverview.length) ? aOverview[0] : null;

                if (oOverview) {
                    that._bUsingFallbackBom = false;
                    that._applyOverview(oOverview, aBom);
                    that._oViewModel.setProperty("/busy", false);
                } else {
                    // 신규 CDS 미응답 → 기존 조합 로직으로 폴백
                    that._loadOrderDetailsFallback(sPadded);
                }
            });
        },

        // 폴백: 기존 Z_C_E2E_OrderTracker + ppShortageModel 조합 로직 유지
        _loadOrderDetailsFallback: function (sPadded) {
            var that = this;
            var aFilters = sPadded ? [new Filter("SalesOrder", FilterOperator.EQ, sPadded)] : [];
            this._bUsingFallbackBom = true;
            this._read("trackerModel", "/Z_C_E2E_OrderTracker", aFilters)
                .catch(function () { return []; })
                .then(function (aRows) {
                    that._applyPipeline(sPadded, aRows);   // 내부에서 /insight 갱신
                    that._loadBomStockSummary(sPadded);    // shortage 기반 BOM 도넛
                    that._oViewModel.setProperty("/busy", false);
                });
        },

        // 공정 일정 조회: SalesOrder 서버 필터 우선, 결과가 없거나 필터 필드가 다르면
        // 무필터 조회 후 클라이언트에서 오더 키로 매칭(필드명 차이 대비).
        _loadTimelineRows: function (sPadded) {
            var that = this;
            var aFilters = sPadded ? [new Filter("SalesOrder", FilterOperator.EQ, sPadded)] : [];

            var fnFallback = function () {
                return that._read("ppOperationSchedModel", "/ZI_PP_OPERATION_SCHED")
                    .then(function (aAll) { return that._filterOpsByOrder(aAll, sPadded); })
                    .catch(function () { return []; });
            };

            return this._read("ppOperationSchedModel", "/ZI_PP_OPERATION_SCHED", aFilters)
                .then(function (aRows) {
                    return (aRows && aRows.length) ? aRows : fnFallback();
                })
                .catch(fnFallback);
        },

        _filterOpsByOrder: function (aRows, sPadded) {
            if (!sPadded) {
                return aRows || [];
            }
            var sRaw = String(Number(sPadded));  // 0000000354 → 354
            var aKeyFields = ["SalesOrder", "SalesOrderNumber", "ProductionOrder", "Aufnr", "Kdauf", "OrderNumber"];
            return (aRows || []).filter(function (o) {
                return aKeyFields.some(function (sField) {
                    var v = o[sField];
                    if (v === undefined || v === null || v === "") {
                        return false;
                    }
                    var s = String(v).trim();
                    return s === sPadded || s === sRaw || s.padStart(10, "0") === sPadded;
                });
            });
        },

        // SAP 표준 10자리 zero-padding (숫자형 오더에만 적용)
        _padOrder: function (sOrder) {
            var s = (sOrder === null || sOrder === undefined) ? "" : String(sOrder).trim();
            if (!s) {
                return "";
            }
            return /^\d+$/.test(s) ? s.padStart(10, "0") : s;
        },

        _loadShortage: function () {
            var that = this;
            this._read("ppShortageModel", "/ZI_PP_MAT_SHORTAGE")
                .then(function (aRows) {
                    that._applyShortage(aRows);
                })
                .catch(function () {
                    that._applyShortage([]);
                });
        },

        /* ============================ 가공 로직 ============================ */

        // 트래커 행들에서 특정 문서 필드의 유효한 값(중복 제거)을 수집
        _collectDocs: function (aRows, sField) {
            var mSeen = {};
            var aDocs = [];
            (aRows || []).forEach(function (o) {
                var v = (o[sField] === null || o[sField] === undefined) ? "" : String(o[sField]).trim();
                if (!v || v === "없음" || /^0+$/.test(v)) {
                    return;
                }
                if (!mSeen[v]) {
                    mSeen[v] = true;
                    aDocs.push(v);
                }
            });
            return aDocs;
        },

        // 문서 목록을 "A, B 외 n건" 형태로 요약
        _summarizeDocs: function (aDocs) {
            if (!aDocs || !aDocs.length) {
                return "";
            }
            if (aDocs.length <= 2) {
                return aDocs.join(", ");
            }
            return aDocs.slice(0, 2).join(", ") + " 외 " + (aDocs.length - 2) + "건";
        },

        _step: function (sKey, sState, sDetail) {
            var oDef = STEP_DEF_MAP[sKey];
            return {
                key: sKey,
                label: oDef.label,
                sub: oDef.sub,
                icon: oDef.icon,
                state: sState,
                statusText: BADGE_BY_STATE[sState] || "",   // 화면에는 짧은 배지만
                detail: sDetail || "",                        // 문서번호 등 상세는 내부 보관(미표시)
                showStatus: true
            };
        },

        // 메인 대시보드 E2E Order Tracking 기준으로 5단계 파이프라인 구성
        // (마지막 MES 단계는 ProdMigoDoc이 아니라 ProductionOrder 기준)
        _buildPipelineFromTracker: function (sOrder, aRows) {
            var aPR = this._collectDocs(aRows, "PurchaseRequisition");
            var aPO = this._collectDocs(aRows, "PurchaseOrder");
            var aGR = this._collectDocs(aRows, "POMigoDoc");
            var aProd = this._collectDocs(aRows, "ProductionOrder");
            var aProdGR = this._collectDocs(aRows, "ProdMigoDoc");

            var bSO = !!sOrder && (aRows || []).length > 0;
            var bPR = aPR.length > 0;
            var bPO = aPO.length > 0;
            var bGR = aGR.length > 0;
            var bProd = aProd.length > 0;
            var bProdGR = aProdGR.length > 0;

            var aSteps = [];

            // 1) SO
            aSteps.push(this._step("SO",
                bSO ? "done" : "pending",
                bSO ? ("영업오더 생성됨: " + sOrder) : "영업오더 없음"));

            // 2) PR
            if (bPR) {
                aSteps.push(this._step("PR", "done", "PR 생성됨: " + this._summarizeDocs(aPR)));
            } else if (bSO) {
                aSteps.push(this._step("PR", "warning", "PR 미생성"));
            } else {
                aSteps.push(this._step("PR", "pending", "대기"));
            }

            // 3) PO (PR은 있는데 PO 없음 → 병목/SHORTAGE)
            if (bPO) {
                aSteps.push(this._step("PO", "done", "PO 생성됨: " + this._summarizeDocs(aPO)));
            } else if (bPR) {
                aSteps.push(this._step("PO", "bottleneck", "PO 미생성"));
            } else {
                aSteps.push(this._step("PO", "pending", "대기"));
            }

            // 4) GR 원자재 입고 (PO는 있는데 입고 없음 → 지연)
            if (bGR) {
                aSteps.push(this._step("GR", "done", "원자재 입고 완료"));
            } else if (bPO) {
                aSteps.push(this._step("GR", "bottleneck", "원자재 입고 진행중"));
            } else {
                aSteps.push(this._step("GR", "pending", "원자재 입고 대기"));
            }

            // 5) MES / 생산 준비 (ProductionOrder 기준)
            if (bProd) {
                aSteps.push(this._step("MES", "done", "생산오더 생성됨: " + this._summarizeDocs(aProd)));
            } else if (bProdGR) {
                aSteps.push(this._step("MES", "done", "완제품 입고 완료"));
            } else if (bGR) {
                aSteps.push(this._step("MES", "warning", "원자재 입고 완료, 생산오더 생성 가능"));
            } else {
                aSteps.push(this._step("MES", "pending", "원자재 입고 후 생산오더 생성 가능"));
            }

            return aSteps;
        },

        _applyPipeline: function (sOrder, aRows) {
            var aPipeline = this._buildPipelineFromTracker(sOrder, aRows);

            var iDone = aPipeline.filter(function (s) { return s.state === "done"; }).length;
            var iTotal = aPipeline.length;
            var iPct = iTotal ? Math.round((iDone / iTotal) * 100) : 0;

            // 첫 미완료 단계를 '현재 단계'로 표시(펄스/링 강조)
            var bMarked = false;
            aPipeline.forEach(function (s) {
                s.isCurrent = false;
                if (!bMarked && s.state !== "done") {
                    s.isCurrent = true;
                    bMarked = true;
                }
                s.currentClass = s.isCurrent ? "nxPpStep--current" : "";
            });

            // 진행 연결선(초록 fill): 앞에서부터 연속 완료된 노드 중심까지 채움
            // 노드 중심 위치 = 10% / 30% / 50% / 70% / 90%
            var iLeading = 0;
            for (var k = 0; k < aPipeline.length; k++) {
                if (aPipeline[k].state === "done") { iLeading++; } else { break; }
            }
            var fLineW = iLeading > 1 ? (iLeading - 1) * 20 : 0;

            this._oViewModel.setProperty("/pipeline", aPipeline);
            this._oViewModel.setProperty("/progress", {
                pct: iPct,
                pctLabel: iPct + "%",
                fillWidth: iPct + "%",
                lineWidth: fLineW + "%",
                lineVisible: fLineW > 0,
                doneCount: iDone,
                total: iTotal,
                summary: "진행률 " + iPct + "% · " + iDone + "/" + iTotal + " 완료"
            });
            this._applyAlert(aPipeline);
            this._oViewModel.setProperty("/insight", this._buildProductionInsight(aPipeline, aRows));
        },

        /* ==================== 신규 CDS(ZC_PP_MTO_*) 기반 처리 ==================== */

        _today: function () {
            var d = new Date();
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        },

        _addDays: function (oDate, iDays) {
            return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate() + iDays);
        },

        // CoverageRate가 0~1 비율로 내려오면 100분율로 환산
        _pct100: function (v) {
            var n = this._toNum(v);
            if (n > 0 && n <= 1) {
                return n * 100;
            }
            return n;
        },

        _applyOverview: function (oRow, aBomRows) {
            this._aBomRows = aBomRows || [];
            var oBom = this._analyzeBom(oRow, this._aBomRows);
            var aPipeline = this._buildPipelineFromFlags(oRow, oBom);
            this._setPipeline(aPipeline);
            this._applyAlert(aPipeline);
            this._oViewModel.setProperty("/insight", this._buildInsightFromCds(oRow, oBom));
            this._oViewModel.setProperty("/bom", this._buildBomFromCds(oRow, oBom));
            this._oViewModel.setProperty("/feasibility", this._buildFeasibility(oRow, oBom));
        },

        // BOM component 상태 (소모/확보/부분/부족) — 현재고 0이어도 생산 투입분은 부족이 아님
        //  CONSUMED  : 출고(IssuedQty)가 소요량 이상 → 생산 투입/소모 완료
        //  AVAILABLE : 부족 수량 없음 → 확보 완료
        //  PARTIAL   : 일부 확보/투입되었으나 아직 부족분 존재 → 부분 입고
        //  SHORTAGE  : 입고도 투입도 없음 → 부족/입고 대기
        _componentStatus: function (oRow) {
            var nReq = this._toNum(oRow.RequiredQty);
            var nIssued = this._toNum(oRow.IssuedQty);
            var nAvail = this._toNum(oRow.AvailableQty);
            var nShort = this._toNum(oRow.ShortageQty);

            if (nReq > 0 && nIssued >= nReq) {
                return "CONSUMED";
            }
            if (nShort <= 0) {
                return "AVAILABLE";
            }
            if (nAvail > 0 || nIssued > 0) {
                return "PARTIAL";
            }
            return "SHORTAGE";
        },

        // BOM 행 전체를 분석해 component 충족/부족을 일관된 기준으로 집계한다.
        // rows가 있으면 행 기준으로 재분류(소모분을 부족으로 오판하지 않음),
        // rows가 없으면 overview 요약 필드로 폴백한다.
        _analyzeBom: function (oRow, aBomRows) {
            var that = this;
            var aRows = aBomRows || [];
            var bHasRows = aRows.length > 0;
            var bBom = bHasRows || this._toNum(oRow.HasBomData) === 1;

            if (!bHasRows) {
                var bMixedOv = this._toNum(oRow.IsMixedUnit) === 1;
                return {
                    hasBom: bBom,
                    hasRows: false,
                    rows: [],
                    totalItems: this._toNum(oRow.BomItemCount),
                    consumedCount: 0,
                    availableCount: this._toNum(oRow.AvailableItemCount),
                    partialCount: 0,
                    shortageCount: this._toNum(oRow.ShortageItemCount),
                    satisfiedCount: this._toNum(oRow.AvailableItemCount),
                    shortRemainingCount: this._toNum(oRow.ShortageItemCount),
                    reqTot: this._toNum(oRow.BomRequiredTotalQty),
                    securedTot: this._toNum(oRow.BomAvailableTotalQty),
                    shortTot: this._toNum(oRow.BomShortageTotalQty),
                    mixed: bMixedOv,
                    coverageRate: bMixedOv ? this._pct100(oRow.ItemCoverageRate) : this._pct100(oRow.CoverageRate)
                };
            }

            var mUnit = {};
            var nReqTot = 0, nSecuredTot = 0, nShortTot = 0;
            var oCnt = { CONSUMED: 0, AVAILABLE: 0, PARTIAL: 0, SHORTAGE: 0 };

            aRows.forEach(function (r) {
                var sStatus = that._componentStatus(r);
                var nReq = that._toNum(r.RequiredQty);
                var nShort = that._toNum(r.ShortageQty);
                var bStillShort = (sStatus === "SHORTAGE" || sStatus === "PARTIAL");
                var nEffShort = bStillShort ? nShort : 0;

                nReqTot += nReq;
                nShortTot += nEffShort;
                nSecuredTot += Math.max(0, nReq - nEffShort);
                oCnt[sStatus]++;
                if (r.Unit) { mUnit[r.Unit] = true; }

                r._status = sStatus;
                r._stillShort = bStillShort;
                r._effShort = nEffShort;
            });

            var iTotal = aRows.length;
            var iSatisfied = oCnt.CONSUMED + oCnt.AVAILABLE;
            var iShortRemaining = oCnt.PARTIAL + oCnt.SHORTAGE;
            var bMixed = Object.keys(mUnit).filter(function (u) { return u; }).length > 1
                || this._toNum(oRow.IsMixedUnit) === 1;
            var iItemCov = iTotal ? Math.round((iSatisfied / iTotal) * 100) : 0;
            var iQtyCov = nReqTot > 0 ? Math.round((nSecuredTot / nReqTot) * 100) : 0;

            return {
                hasBom: true,
                hasRows: true,
                rows: aRows,
                totalItems: iTotal,
                consumedCount: oCnt.CONSUMED,
                availableCount: oCnt.AVAILABLE,
                partialCount: oCnt.PARTIAL,
                shortageCount: oCnt.SHORTAGE,
                satisfiedCount: iSatisfied,
                shortRemainingCount: iShortRemaining,
                reqTot: nReqTot,
                securedTot: nSecuredTot,
                shortTot: nShortTot,
                mixed: bMixed,
                coverageRate: bMixed ? iItemCov : iQtyCov
            };
        },

        // 5단계 파이프라인. GR(물류입고) 완료는 POMigoDoc 존재가 아니라
        // 전체 BOM component 충족 여부로 판단한다(부분 입고는 주황 = 진행중).
        _buildPipelineFromFlags: function (oRow, oBom) {
            var bSO = this._toNum(oRow.HasSalesOrder) === 1;
            var bPR = this._toNum(oRow.HasPurchaseRequisition) === 1;
            var bPO = this._toNum(oRow.HasPurchaseOrder) === 1;
            var bProd = this._toNum(oRow.HasProductionOrder) === 1;

            var bBom = oBom.hasBom;
            var iShortRemaining = oBom.shortRemainingCount;

            // 생산오더가 있으면 자재는 이미 투입/소모된 것으로 보고 GR 완료로 간주
            var bGrDone = bProd || (bBom && iShortRemaining === 0);

            var aSteps = [];
            aSteps.push(this._step("SO", bSO ? "done" : "pending", ""));
            aSteps.push(this._step("PR", bPR ? "done" : (bSO ? "warning" : "pending"), ""));
            aSteps.push(this._step("PO", bPO ? "done" : (bPR ? "bottleneck" : "pending"), ""));

            var sGr;
            if (bGrDone) {
                sGr = "done";
            } else if (bBom && iShortRemaining > 0) {
                sGr = "warning";              // 부분 입고 / 입고 대기 (주황, 빨강 아님)
            } else if (bPO) {
                sGr = "warning";              // PO는 있으나 입고 정보 미확정 → 진행중
            } else {
                sGr = "pending";
            }
            aSteps.push(this._step("GR", sGr, ""));

            aSteps.push(this._step("MES", bProd ? "done" : (bGrDone ? "warning" : "pending"), ""));
            return aSteps;
        },

        // /pipeline + /progress 설정 (진행률 = 완료수 * 20%)
        _setPipeline: function (aPipeline) {
            var iDone = aPipeline.filter(function (s) { return s.state === "done"; }).length;
            var iTotal = aPipeline.length;
            var iPct = iTotal ? Math.round((iDone / iTotal) * 100) : 0;

            var bMarked = false;
            aPipeline.forEach(function (s) {
                s.isCurrent = false;
                if (!bMarked && s.state !== "done") {
                    s.isCurrent = true;
                    bMarked = true;
                }
                s.currentClass = s.isCurrent ? "nxPpStep--current" : "";
            });

            var iLeading = 0;
            for (var k = 0; k < aPipeline.length; k++) {
                if (aPipeline[k].state === "done") { iLeading++; } else { break; }
            }
            var fLineW = iLeading > 1 ? (iLeading - 1) * 20 : 0;

            this._oViewModel.setProperty("/pipeline", aPipeline);
            this._oViewModel.setProperty("/progress", {
                pct: iPct,
                pctLabel: iPct + "%",
                fillWidth: iPct + "%",
                lineWidth: fLineW + "%",
                lineVisible: fLineW > 0,
                doneCount: iDone,
                total: iTotal,
                summary: "진행률 " + iPct + "% · " + iDone + "/" + iTotal + " 완료"
            });
        },

        // Component 리드타임: 조달유형(BESKZ)에 따라 자재마스터 리드타임 조합 (임의 상수 금지)
        _componentLeadTime: function (oRow) {
            var sType = String(oRow.CompProcType || "").toUpperCase();
            var plifz = this._toNum(oRow.CompPlndDelivDays);
            var webaz = this._toNum(oRow.CompGRProcDays);
            var dzeit = this._toNum(oRow.CompInhouseProdDays);
            var wzeit = this._toNum(oRow.CompTotReplLeadDays);

            if (sType === "F") {            // 외부조달
                return plifz + webaz;
            }
            if (sType === "E") {            // 자체생산
                return dzeit || wzeit;
            }
            return wzeit || dzeit || (plifz + webaz);
        },

        // 6-3/6-4/6-5 : 예상/계획 생산 시작 + 납기 차이/위험 상태
        _buildInsightFromCds: function (oRow, oBom) {
            var that = this;
            var bProd = this._toNum(oRow.HasProductionOrder) === 1;
            var bBom = oBom.hasBom;
            // 아직 미입고/부족한 component만 예상 생산 시작 계산에 사용 (소모분 제외)
            var aShort = oBom.hasRows
                ? oBom.rows.filter(function (r) { return r._stillShort; })
                : [];
            var oToday = this._today();

            // 예상 생산 시작
            var oExpDate = null;
            var sExpText;
            if (bProd) {
                sExpText = "생산오더 생성 완료";
            } else if (!bBom) {
                sExpText = "정보 없음";
            } else if (aShort.length === 0) {
                sExpText = "즉시 생산 가능";
                oExpDate = oToday;
            } else {
                var iMax = Math.max.apply(null, aShort.map(function (r) { return that._componentLeadTime(r); }));
                if (!iMax || iMax <= 0) {
                    sExpText = "리드타임 정보 없음";
                } else {
                    oExpDate = this._addDays(oToday, iMax);
                    sExpText = this._fmtDot(oExpDate);
                }
            }

            // 계획 생산 시작 = 납기일 - 완제품 생산 리드타임 (없으면 정보 없음)
            var oDue = this._parseDate(oRow.RequestedDeliveryDate);
            var iDur = this._toNum(oRow.ProductionDurationDays)
                || this._toNum(oRow.FGInhouseProdDays)
                || this._toNum(oRow.FGTotReplLeadDays);
            var oReqDate = (oDue && iDur) ? this._addDays(oDue, -iDur) : null;
            var sReqText = oReqDate ? this._fmtDot(oReqDate) : "-";

            // 차이 / 상태
            var sSev, sBadge, sGap;
            if (bProd) {
                sSev = "ok"; sBadge = "완료"; sGap = "생산오더 생성 완료";
            } else if (!oDue) {
                sSev = "none"; sBadge = "정보 없음"; sGap = "납기 정보 없음";
            } else if (!iDur) {
                sSev = "none"; sBadge = "정보 없음"; sGap = "리드타임 정보 없음";
            } else if (!oExpDate) {
                sSev = "none"; sBadge = "정보 없음"; sGap = sExpText;
            } else {
                var iGap = this._dayDiff(oReqDate, oExpDate);
                if (iGap <= 0) {
                    sSev = "ok"; sBadge = "정상";
                    sGap = iGap === 0 ? "즉시 생산 가능" : (Math.abs(iGap) + "일 여유");
                } else if (iGap <= 2) {
                    sSev = "warning"; sBadge = "주의"; sGap = "+" + iGap + "일 지연 예상";
                } else {
                    sSev = "danger"; sBadge = "지연 위험"; sGap = "+" + iGap + "일 지연 예상";
                }
            }

            return {
                hasData: true,
                expectedText: sExpText,
                requiredText: sReqText,
                gapText: sGap,
                severity: sSev,
                badgeText: sBadge
            };
        },

        // 6-6 : BOM/재고 도넛. rows가 하나라도 있으면 empty 처리하지 않는다.
        // 소모(CONSUMED)된 자재는 부족이 아니라 확보(투입)로 집계한다.
        _buildBomFromCds: function (oRow, oBom) {
            var that = this;
            var sOrderText = oRow.SalesOrder
                ? String(Number(oRow.SalesOrder))
                : (this._sCurrentOrder ? String(Number(this._sCurrentOrder)) : "-");

            if (!oBom.hasBom) {
                var oEmpty = this._emptyBom();
                oEmpty.orderText = sOrderText;
                oEmpty.statusKey = "none";
                oEmpty.statusText = "정보 없음";
                return oEmpty;
            }

            var bMixed = oBom.mixed;
            var iCoverage = Math.round(oBom.coverageRate);

            // 도넛: 확보(초록) / 부분(주황) / 부족(빨강)
            var sDonut = bMixed
                ? this._buildDonutHtml(oBom.satisfiedCount, oBom.partialCount, oBom.shortageCount, oBom.totalItems)
                : this._buildDonutHtml(oBom.securedTot, 0, oBom.shortTot, oBom.reqTot);

            var aTop3 = (oBom.rows || [])
                .filter(function (r) { return r._stillShort; })
                .sort(function (a, b) { return that._toNum(b.ShortageQty) - that._toNum(a.ShortageQty); })
                .slice(0, 3)
                .map(function (r) {
                    return {
                        materialCode: r.ComponentMaterial || r.ComponentMaterialName || "-",
                        materialName: r.ComponentMaterialName || "",
                        shortageText: that._fmtQty(r.ShortageQty) + " " + (r.Unit || "")
                    };
                });

            var oStatus;
            if (oBom.shortRemainingCount === 0) {
                oStatus = { key: "done", text: "정상" };
            } else if (oBom.satisfiedCount > 0 || oBom.partialCount > 0) {
                oStatus = { key: "transit", text: "부분 입고" };
            } else {
                oStatus = { key: "po", text: "부족" };
            }

            return {
                hasData: true,
                orderText: sOrderText,
                bomItemCount: oBom.totalItems,
                requiredText: oBom.reqTot.toLocaleString(),
                receivedText: oBom.securedTot.toLocaleString(),
                shortageText: oBom.shortTot.toLocaleString(),
                shortageItemCount: oBom.shortRemainingCount,
                securedItemCount: oBom.satisfiedCount,
                coverageRate: iCoverage,
                centerValue: iCoverage + "%",
                centerLabel: bMixed ? "품목 확보율" : "확보율",
                donutHtml: sDonut,
                statusKey: oStatus.key,
                statusText: oStatus.text,
                mixedUnit: bMixed,
                unitText: bMixed ? "(단위 혼재 · 품목 기준)" : "",
                top3: aTop3,
                hasShortage: oBom.shortRemainingCount > 0
            };
        },

        // 6-7 : 생산 가능 여부 (생산오더 생성 시 부족 오판 방지)
        _buildFeasibility: function (oRow, oBom) {
            var iShort = oBom.shortRemainingCount;
            var bProd = this._toNum(oRow.HasProductionOrder) === 1;

            if (!oBom.hasBom) {
                return { key: "none", statusText: "정보 없음", text: "BOM 또는 자재 소요 정보 확인 필요" };
            }
            if (bProd) {
                return { key: "done", statusText: "완료", text: "생산오더 생성 완료 · 자재 투입" };
            }
            if (iShort > 0) {
                return { key: "po", statusText: "부분 입고", text: "부족 자재 PO/입고 확인" };
            }
            return { key: "done", statusText: "가능", text: "생산오더 생성 가능" };
        },

        _emptyFeasibility: function () {
            return { key: "none", statusText: "정보 없음", text: "오더를 선택하세요" };
        },

        /* ==================== 생산 시작 시기 예측 (폴백 전용) ==================== */

        _emptyInsight: function () {
            return {
                hasData: false,
                expectedText: "-",
                requiredText: "-",
                gapDays: null,
                gapText: "오더를 선택하세요",
                severity: "none",
                badgeText: "정보 없음"
            };
        },

        // YYYY.MM.DD
        _fmtDot: function (oDate) {
            if (!oDate) {
                return "-";
            }
            return oDate.getFullYear() + "."
                + String(oDate.getMonth() + 1).padStart(2, "0") + "."
                + String(oDate.getDate()).padStart(2, "0");
        },

        // 현재 파이프라인 진행 상태 기준 예상 생산 시작일.
        // 완료되지 않은 단계부터 끝까지 남은 리드타임을 today에 누적한다.
        // (ProductionOrder가 이미 있으면 누적 0 → 오늘 = 즉시 생산 가능)
        _calcExpectedProductionStart: function (aPipeline) {
            var oDay = new Date();
            (aPipeline || []).forEach(function (s) {
                if (s.state === "done") {
                    return;
                }
                var iAdd = LEAD_TIME[s.key] || 0;
                oDay = new Date(oDay.getFullYear(), oDay.getMonth(), oDay.getDate() + iAdd);
            });
            return new Date(oDay.getFullYear(), oDay.getMonth(), oDay.getDate());
        },

        // 요청 납기일에서 생산 소요기간을 역산한 계획 생산 시작일.
        // 납기 필드가 없으면 null (→ 화면은 '-' / '정보 없음'으로 안전 처리).
        // TODO: 실제 생산 소요기간/납기 필드가 확정되면 여기만 교체하면 됨.
        _calcRequiredProductionStart: function (aRows) {
            var oRow = (aRows && aRows[0]) || {};
            var oDue = this._parseDate(this._pick(oRow, [
                "RequestedDeliveryDate", "RequestedDelivDate", "RequestedDelivery",
                "DeliveryDate", "RequestedDate", "VDATU", "SODeliveryDate"
            ]));
            if (!oDue) {
                return null;
            }
            var iDur = Number(this._pick(oRow, ["ProductionDuration", "ProdDuration", "LeadTimeDays"]))
                || DEFAULT_PROD_DURATION;
            return new Date(oDue.getFullYear(), oDue.getMonth(), oDue.getDate() - iDur);
        },

        _buildProductionInsight: function (aPipeline, aRows) {
            var oExp = this._calcExpectedProductionStart(aPipeline);
            var oReq = this._calcRequiredProductionStart(aRows);
            var iGap = oReq ? this._dayDiff(oReq, oExp) : null; // +면 지연, -면 여유

            var sSev, sBadge, sGapText;
            if (iGap === null) {
                sSev = "none";
                sBadge = "정보 없음";
                sGapText = "납기 정보 없음";
            } else if (iGap <= 0) {
                sSev = "ok";
                sBadge = "정상";
                sGapText = iGap === 0 ? "즉시 생산 가능" : (Math.abs(iGap) + "일 여유");
            } else if (iGap <= 2) {
                sSev = "warning";
                sBadge = "주의";
                sGapText = "+" + iGap + "일 지연 예상";
            } else {
                sSev = "danger";
                sBadge = "지연 위험";
                sGapText = "+" + iGap + "일 지연 예상";
            }

            return {
                hasData: true,
                expectedText: this._fmtDot(oExp),
                requiredText: oReq ? this._fmtDot(oReq) : "-",
                gapDays: iGap,
                gapText: sGapText,
                severity: sSev,
                badgeText: sBadge
            };
        },

        /* ==================== BOM / 재고 도넛 ==================== */

        _emptyBom: function () {
            return {
                hasData: false,
                orderText: "-",
                bomItemCount: 0,
                requiredText: "0",
                receivedText: "0",
                shortageText: "0",
                shortageItemCount: 0,
                coverageRate: 0,
                centerValue: "0%",
                centerLabel: "확보율",
                donutHtml: this._buildDonutHtml(0, 0, 0, 1),
                statusKey: "po",
                statusText: "데이터 없음",
                mixedUnit: false,
                unitText: "",
                top3: [],
                hasShortage: false
            };
        },

        // 이미 로딩된 결품 전체 목록(_aShortageAll)을 선택 오더로 필터링해 집계.
        // 새 CDS 없이 ZI_PP_MAT_SHORTAGE 만으로 BOM 소요/확보/부족을 도출한다.
        _loadBomStockSummary: function (sPaddedOrder) {
            this._sCurrentOrder = sPaddedOrder;
            var sRaw = sPaddedOrder ? String(Number(sPaddedOrder)) : "";
            var aRows = (this._aShortageAll || []).filter(function (o) {
                var so = String(o.salesOrder || "").trim();
                return so === sPaddedOrder || so === sRaw;
            });
            this._oViewModel.setProperty("/bom", this._buildBomSummary(aRows, sPaddedOrder));
        },

        _toNum: function (v) {
            var n = Number(String(v == null ? "" : v).replace(/,/g, ""));
            return isNaN(n) ? 0 : n;
        },

        _buildBomSummary: function (aRows, sOrder) {
            if (!aRows || !aRows.length) {
                var oEmpty = this._emptyBom();
                oEmpty.orderText = sOrder ? String(Number(sOrder)) : "-";
                return oEmpty;
            }

            var that = this;
            var nReq = 0, nRecv = 0, nShort = 0, iShortItems = 0, iTransitItems = 0;
            var mUnit = {};
            aRows.forEach(function (o) {
                nReq += that._toNum(o.requiredQty);
                nRecv += that._toNum(o.issuedQty);
                var s = that._toNum(o.shortageQty);
                nShort += s;
                if (s > 0) {
                    iShortItems++;
                    if (that._toNum(o.issuedQty) > 0) {
                        iTransitItems++; // 일부 출고됨 = 입고/운송 진행중
                    }
                }
                mUnit[o.unit || ""] = true;
            });

            var bMixedUnit = Object.keys(mUnit).filter(function (u) { return u; }).length > 1;
            var iTotalItems = aRows.length;
            var iSecuredItems = iTotalItems - iShortItems;

            // 수량 단위가 혼재하면 단순 합산이 왜곡되므로 품목 수 기준으로 전환
            var nCoverage, sCenterVal, sCenterLabel, sDonut;
            if (bMixedUnit) {
                nCoverage = iTotalItems ? Math.round((iSecuredItems / iTotalItems) * 100) : 0;
                sCenterVal = nCoverage + "%";
                sCenterLabel = "품목 확보율";
                sDonut = this._buildDonutHtml(iSecuredItems, iTransitItems, iShortItems - iTransitItems, iTotalItems);
            } else {
                nCoverage = nReq > 0 ? Math.round((nRecv / nReq) * 100) : 0;
                sCenterVal = nCoverage + "%";
                sCenterLabel = "확보율";
                sDonut = this._buildDonutHtml(nRecv, 0, nShort, nReq);
            }

            // 부족 자재 TOP 3 (부족 수량 내림차순)
            var aTop3 = aRows.filter(function (o) { return that._toNum(o.shortageQty) > 0; })
                .sort(function (a, b) { return that._toNum(b.shortageQty) - that._toNum(a.shortageQty); })
                .slice(0, 3)
                .map(function (o) {
                    return {
                        materialCode: o.materialCode || o.materialName,
                        materialName: o.materialName,
                        shortageText: o.shortageQty + " " + (o.unit || "")
                    };
                });

            var oStatus = iShortItems === 0
                ? { key: "done", text: "정상" }
                : (iTransitItems > 0 ? { key: "transit", text: "입고 진행중" } : { key: "po", text: "부족" });

            return {
                hasData: true,
                orderText: sOrder ? String(Number(sOrder)) : "-",
                bomItemCount: iTotalItems,
                requiredText: nReq.toLocaleString(),
                receivedText: nRecv.toLocaleString(),
                shortageText: nShort.toLocaleString(),
                shortageItemCount: iShortItems,
                securedItemCount: iSecuredItems,
                coverageRate: nCoverage,
                centerValue: sCenterVal,
                centerLabel: sCenterLabel,
                donutHtml: sDonut,
                statusKey: oStatus.key,
                statusText: oStatus.text,
                mixedUnit: bMixedUnit,
                unitText: bMixedUnit ? "(단위 혼재 · 품목 기준)" : "",
                top3: aTop3,
                hasShortage: iShortItems > 0
            };
        },

        // conic-gradient 기반 도넛 HTML (MmChartHtmlUtil 톤과 일치)
        _buildDonutHtml: function (nSecured, nTransit, nShort, nTotal) {
            var nIdle = Math.max(0, nTotal - nSecured - nTransit - nShort);
            var nSum = nSecured + nTransit + nShort + nIdle || 1;
            var fSec = nSecured / nSum * 360;
            var fTra = fSec + (nTransit / nSum * 360);
            var fSho = fTra + (nShort / nSum * 360);
            var sGrad = "conic-gradient("
                + BOM_COLORS.secured + " 0deg " + fSec + "deg,"
                + BOM_COLORS.transit + " " + fSec + "deg " + fTra + "deg,"
                + BOM_COLORS.shortage + " " + fTra + "deg " + fSho + "deg,"
                + BOM_COLORS.idle + " " + fSho + "deg 360deg)";
            return "<div class='nxPpDonutRing' style='background:" + sGrad + ";'></div>";
        },

        _applyAlert: function (aPipeline) {
            var oBottleStep = null;
            // 가장 앞선(흐름상 먼저인) 병목 단계를 우선 노출
            for (var i = 0; i < aPipeline.length; i++) {
                if (aPipeline[i].state === "bottleneck" || aPipeline[i].state === "warning") {
                    oBottleStep = aPipeline[i];
                    break;
                }
            }

            var oAlert;
            if (!oBottleStep) {
                oAlert = {
                    severity: "ok",
                    icon: "sap-icon://sys-enter-2",
                    title: "정상 진행 중",
                    guide: "현재 선택된 오더의 공급망·공정에 감지된 병목이 없습니다."
                };
            } else {
                var oMsg = ALERT_BY_LANE[oBottleStep.key] || {
                    title: "공정 이상 감지",
                    guide: "해당 단계 담당 부서 조치 요망"
                };
                oAlert = {
                    severity: oBottleStep.state === "bottleneck" ? "danger" : "warning",
                    icon: "sap-icon://alert",
                    title: oMsg.title,
                    guide: oMsg.guide
                };
            }

            this._oViewModel.setProperty("/alert", oAlert);
        },

        _classifyOpState: function (sStatus) {
            var s = (sStatus || "").toUpperCase();
            if (s === "DELAY" || s === "ERROR") {
                return "delay";
            }
            if (s === "WARNING" || s === "WARN" || s === "CRITICAL") {
                return "warn";
            }
            if (s === "DONE" || s === "COMPLETE" || s === "COMPLETED") {
                return "done";
            }
            return "normal";
        },

        _parseDate: function (vDate) {
            if (!vDate) {
                return null;
            }
            if (vDate instanceof Date) {
                return vDate;
            }
            if (typeof vDate === "string") {
                var m = /Date\((\d+)\)/.exec(vDate);
                if (m && m[1]) {
                    return new Date(Number(m[1]));
                }
                var oParsed = new Date(vDate);
                return isNaN(oParsed.getTime()) ? null : oParsed;
            }
            return null;
        },

        _startOfWeek: function (oDate) {
            var oStart = new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
            oStart.setDate(oStart.getDate() - oStart.getDay()); // 일요일 시작
            return oStart;
        },

        _daysFromStart: function (oStart) {
            var oToday = new Date();
            var sTodayKey = oToday.getFullYear() + "-" + oToday.getMonth() + "-" + oToday.getDate();
            var aDays = [];
            for (var i = 0; i < 7; i++) {
                var d = new Date(oStart.getFullYear(), oStart.getMonth(), oStart.getDate() + i);
                var bToday = (d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate()) === sTodayKey;
                var bWeekend = (d.getDay() === 0 || d.getDay() === 6);
                aDays.push({
                    dow: DAY_LABELS[d.getDay()],
                    dom: String(d.getDate()).padStart(2, "0"),
                    isToday: bToday,
                    isWeekend: bWeekend,
                    clsWeekend: bWeekend ? "nxPpTlDayCell--weekend" : "",
                    clsToday: bToday ? "nxPpTlDayCell--today" : ""
                });
            }
            return aDays;
        },

        _dayDiff: function (oFrom, oTo) {
            var oA = new Date(oFrom.getFullYear(), oFrom.getMonth(), oFrom.getDate());
            var oB = new Date(oTo.getFullYear(), oTo.getMonth(), oTo.getDate());
            return Math.round((oB - oA) / 86400000);
        },

        _pct: function (n) {
            return (Math.round(n * 10000) / 10000) + "%";
        },

        // 다양한 CDS 필드명 변형을 허용해 첫 번째로 값이 있는 것을 사용
        _pick: function (oRow, aFields) {
            for (var i = 0; i < aFields.length; i++) {
                var v = oRow[aFields[i]];
                if (v !== undefined && v !== null && v !== "") {
                    return v;
                }
            }
            return undefined;
        },

        _applyTimeline: function (aOps) {
            var that = this;
            this._aTimelineOps = (aOps || []).map(function (o) {
                var oStart = that._parseDate(that._pick(o, [
                    "StartDateTime", "StartDate", "EarliestStartDate", "ScheduledStart", "StartTime", "Start"
                ]));
                var oEnd = that._parseDate(that._pick(o, [
                    "EndDateTime", "EndDate", "LatestFinishDate", "ScheduledFinish", "FinishDate", "EndTime", "End"
                ]));
                return {
                    name: that._pick(o, ["OperationText", "OperationDescription", "WorkCenterName", "WorkCenter", "RoutingOperation"]) || "공정",
                    sub: that._pick(o, ["WorkCenterName", "WorkCenter"]) || "",
                    state: that._classifyOpState(that._pick(o, ["Status", "OperationStatus"])),
                    start: oStart,
                    end: oEnd
                };
            }).filter(function (o) { return o.start; });

            // 기준 주(일~토): 가장 빠른 공정 시작일이 속한 주, 없으면 이번 주
            if (this._aTimelineOps.length > 0) {
                var oMinStart = this._aTimelineOps.reduce(function (min, o) {
                    return o.start < min ? o.start : min;
                }, this._aTimelineOps[0].start);
                this._oBaseWeekStart = this._startOfWeek(oMinStart);
            } else {
                this._oBaseWeekStart = this._startOfWeek(new Date());
            }
            this._iWeekOffset = 0;
            this._renderTimelineWeek();
        },

        _renderTimelineWeek: function () {
            var that = this;
            var oBase = this._oBaseWeekStart || this._startOfWeek(new Date());
            var oWeekStart = new Date(oBase.getFullYear(), oBase.getMonth(),
                oBase.getDate() + (this._iWeekOffset || 0) * 7);
            var oWeekEnd = new Date(oWeekStart.getFullYear(), oWeekStart.getMonth(), oWeekStart.getDate() + 6);

            var aRows = (this._aTimelineOps || []).filter(function (o) {
                var oEnd = o.end || o.start;
                return o.start <= oWeekEnd && oEnd >= oWeekStart;
            }).map(function (o, iRow) {
                var iStartIdx = Math.max(0, Math.min(6, that._dayDiff(oWeekStart, o.start)));
                var iEndIdx = Math.max(iStartIdx, Math.min(6, that._dayDiff(oWeekStart, o.end || o.start)));
                var iSpan = iEndIdx - iStartIdx + 1;
                var sBadge = o.state === "delay" ? "지연" : (o.state === "warn" ? "대기" : "");
                // 지연/대기/완료 같은 의미 상태는 상태색을 유지하고,
                // 정상 공정은 공정별로 다른 팔레트 색을 순환 적용한다(Cut/Sew 구분).
                var sColorClass = (o.state === "normal")
                    ? ("nxPpTlBar--p" + (iRow % 6))
                    : ("nxPpTlBar--" + o.state);
                return {
                    name: o.name,
                    sub: o.sub,
                    state: o.state,
                    colorClass: sColorClass,
                    badge: sBadge,
                    showBadge: !!sBadge,
                    leftPct: that._pct((iStartIdx / 7) * 100),
                    widthPct: that._pct((iSpan / 7) * 100)
                };
            });

            this._oViewModel.setProperty("/timeline", {
                rangeLabel: this._formatRange(oWeekStart, oWeekEnd),
                monthLabel: MONTH_LABELS[oWeekStart.getMonth()] + " " + oWeekStart.getFullYear(),
                days: this._daysFromStart(oWeekStart),
                rows: aRows,
                isEmpty: aRows.length === 0
            });
        },

        onTlPrevWeek: function () {
            this._iWeekOffset = (this._iWeekOffset || 0) - 1;
            this._renderTimelineWeek();
        },

        onTlNextWeek: function () {
            this._iWeekOffset = (this._iWeekOffset || 0) + 1;
            this._renderTimelineWeek();
        },

        onTlThisWeek: function () {
            var oBase = this._oBaseWeekStart || this._startOfWeek(new Date());
            var oNow = this._startOfWeek(new Date());
            this._iWeekOffset = Math.round(this._dayDiff(oBase, oNow) / 7);
            this._renderTimelineWeek();
        },

        _formatRange: function (oStart, oEnd) {
            var fmt = function (d) {
                return d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0")
                    + "." + String(d.getDate()).padStart(2, "0");
            };
            return fmt(oStart) + " ~ " + fmt(oEnd);
        },

        _applyShortage: function (aRows) {
            var that = this;
            var aMapped = (aRows || []).map(function (o) {
                var nShort = Number(o.ShortageQty) || 0;
                var nIssued = Number(o.IssuedQty) || 0;
                var oStatus = that._shortageStatus(nShort, nIssued);
                return {
                    salesOrder: o.SalesOrder || "-",
                    materialName: o.MaterialName || o.Material || "-",
                    materialCode: o.Material || "",
                    requiredQty: that._fmtQty(o.RequiredQty),
                    issuedQty: that._fmtQty(o.IssuedQty),
                    shortageQty: that._fmtQty(o.ShortageQty),
                    unit: o.Unit || "",
                    isShort: nShort > 0,
                    shortClass: nShort > 0 ? "nxPpCellShort" : "",
                    statusText: oStatus.text,
                    statusKey: oStatus.key
                };
            });

            // 전체 결품 목록을 보관하고, 품목 드롭다운/필터를 구성한다.
            this._aShortageAll = aMapped;
            this._oViewModel.setProperty("/shortage/materials", this._buildMaterialOptions(aMapped));
            this._oViewModel.setProperty("/shortage/selectedKeys", []);
            this._oViewModel.setProperty("/shortage/totalCount", aMapped.length);
            this._applyShortageFilter([]);

            // 폴백 모드일 때만, 결품 데이터가 오더 선택보다 늦게 도착하는 경우를 대비해
            // 현재 선택 오더 기준 BOM/재고 도넛을 다시 집계한다.
            // (신규 CDS 모드에서는 /bom 을 덮어쓰지 않도록 한다.)
            if (this._sCurrentOrder && this._bUsingFallbackBom) {
                this._loadBomStockSummary(this._sCurrentOrder);
            }
        },

        // 결품 데이터에서 중복 없는 품목(자재) 목록을 만든다.
        _buildMaterialOptions: function (aRows) {
            var oSeen = {};
            var aOpts = [];
            (aRows || []).forEach(function (o) {
                var sCode = o.materialCode;
                if (sCode && !oSeen[sCode]) {
                    oSeen[sCode] = true;
                    aOpts.push({ key: sCode, text: sCode });
                }
            });
            aOpts.sort(function (a, b) { return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0); });
            return aOpts;
        },

        // 선택된 품목 키 배열로 결품 테이블을 필터링한다(빈 배열 = 전체).
        _applyShortageFilter: function (aKeys) {
            var aAll = this._aShortageAll || [];
            var aRows;
            if (aKeys && aKeys.length) {
                var oSet = {};
                aKeys.forEach(function (k) { oSet[k] = true; });
                aRows = aAll.filter(function (o) { return oSet[o.materialCode]; });
            } else {
                aRows = aAll;
            }
            this._oViewModel.setProperty("/shortage/rows", aRows);
            this._oViewModel.setProperty("/shortage/count", aRows.length);
            this._oViewModel.setProperty("/shortage/isEmpty", aRows.length === 0);
        },

        onShortageMaterialChange: function (oEvent) {
            var aKeys = oEvent.getSource().getSelectedKeys() || [];
            this._oViewModel.setProperty("/shortage/selectedKeys", aKeys);
            this._applyShortageFilter(aKeys);
        },

        _shortageStatus: function (nShort, nIssued) {
            if (nShort <= 0) {
                return { key: "done", text: "입고 완료" };
            }
            if (nIssued > 0) {
                return { key: "transit", text: "물류 운송 중" };
            }
            return { key: "po", text: "발주(PO) 미생성" };
        },

        _fmtQty: function (v) {
            if (v === null || v === undefined || v === "") {
                return "0";
            }
            var n = Number(v);
            return isNaN(n) ? String(v) : n.toLocaleString();
        },

        /* ============================ 이벤트 ============================ */

        onTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key") || oEvent.getParameter("selectedKey");
            if (sKey) {
                this._oViewModel.setProperty("/activeTab", sKey);
            }
        },

        onOrderSelect: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (!oItem) {
                return;
            }
            var sKey = oItem.getKey();
            var sLabel = oItem.getText();
            this._selectOrder(sKey, sLabel);
        },

        onExportShortage: function () {
            var aRows = this._oViewModel.getProperty("/shortage/rows") || [];
            if (aRows.length === 0) {
                MessageToast.show("내보낼 결품 데이터가 없습니다.");
                return;
            }

            var aHeader = ["생산오더", "결품자재명", "자재코드", "소요수량", "출고수량", "부족수량", "단위", "상태"];
            var aLines = [aHeader.join(",")];
            aRows.forEach(function (o) {
                aLines.push([
                    o.salesOrder, o.materialName, o.materialCode,
                    o.requiredQty, o.issuedQty, o.shortageQty, o.unit, o.statusText
                ].map(function (v) {
                    return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
                }).join(","));
            });

            var sCsv = "\ufeff" + aLines.join("\r\n");
            var oBlob = new Blob([sCsv], { type: "text/csv;charset=utf-8;" });
            var sUrl = URL.createObjectURL(oBlob);
            var oLink = document.createElement("a");
            oLink.href = sUrl;
            oLink.download = "material_shortage.csv";
            document.body.appendChild(oLink);
            oLink.click();
            document.body.removeChild(oLink);
            URL.revokeObjectURL(sUrl);
            MessageToast.show("결품 내역을 다운로드했습니다.");
        }
    });
});
