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

    // 병목/진행 발생 lane 별 알림 메시지
    var ALERT_BY_LANE = {
        SO: { title: "영업 오더 확인 필요", guide: "영업팀 오더 상태 점검 및 납기 확정 요망" },
        PR: { title: "자재 결품 위험", guide: "구매팀 발주(PO) 전환 긴급 독촉 요망" },
        PO: { title: "자재 결품 위험", guide: "구매팀 발주(PO) 전환 긴급 독촉 요망" },
        GR: { title: "물류 지연 상태", guide: "물류팀 배송 추적 및 긴급 수송(Air) 요청" },
        MES: { title: "생산 가동 지연", guide: "현장 잔업 편성 또는 라인 평준화 조치 요망" }
    };

    // 도넛 차트 색상 (확보=초록 / 부분=주황 / 부족=빨강 / 대기=회색)
    var BOM_COLORS = { secured: "#16a34a", transit: "#ea580c", shortage: "#dc2626", idle: "#cbd5e1" };

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.pp.PpMain", {

        onInit: function () {
            this._oViewModel = new JSONModel(this._getEmptyModel());
            this.getView().setModel(this._oViewModel, "ppView");
            this._loadOrders();
        },

        _getEmptyModel: function () {
            return {
                busy: true,
                orders: [],
                selectedOrderKey: "",
                selectedOrderLabel: "",
                hasOrder: false,
                alert: {
                    severity: "none",
                    icon: "sap-icon://message-information",
                    title: "오더를 선택하세요",
                    guide: "상단 검색에서 영업오더를 입력하면 위험 상태가 표시됩니다."
                },
                pipeline: this._buildDefaultPipeline(),
                progress: {
                    pct: 0,
                    pctLabel: "0%",
                    fillWidth: "0%",
                    lineWidth: "0%",
                    lineVisible: false,
                    partialWidth: "0%",
                    partialVisible: false,
                    doneCount: 0,
                    total: STEP_DEFS.length,
                    summary: "진행률 0% · 0/" + STEP_DEFS.length + " 완료"
                },
                bom: this._emptyBom(),
                feasibility: this._emptyFeasibility()
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
                    currentClass: ""
                };
            });
        },

        /* ============================ 데이터 로드 ============================ */

        _read: function (sModelName, sPath, aFilters, mUrlParams) {
            var oModel = this.getView().getModel(sModelName)
                || this.getOwnerComponent().getModel(sModelName);
            return new Promise(function (resolve, reject) {
                if (!oModel) {
                    reject(new Error("model not available: " + sModelName));
                    return;
                }
                oModel.read(sPath, {
                    filters: aFilters || [],
                    urlParameters: mUrlParams || undefined,
                    success: function (oData) {
                        resolve((oData && oData.results) || []);
                    },
                    error: reject
                });
            });
        },

        // 게이트웨이 기본 페이지로 잘리는 것을 방지하기 위해
        // $skip/$top으로 페이지를 끝까지 돌며 전량을 모은다.
        _readAll: function (sModelName, sPath, aFilters, mBaseParams) {
            var that = this;
            var iPage = 500;
            var aAll = [];
            function buildParams(iSkip) {
                var m = { "$top": iPage, "$skip": iSkip };
                if (mBaseParams) {
                    Object.keys(mBaseParams).forEach(function (k) { m[k] = mBaseParams[k]; });
                }
                return m;
            }
            function readPage(iSkip, iGuard) {
                return that._read(sModelName, sPath, aFilters, buildParams(iSkip))
                    .then(function (aRows) {
                        aAll = aAll.concat(aRows);
                        if (aRows.length === iPage && iGuard < 50) {
                            return readPage(iSkip + aRows.length, iGuard + 1);
                        }
                        return aAll;
                    });
            }
            return readPage(0, 0);
        },

        _loadOrders: function () {
            var that = this;
            this._readAll("ppOrderListModel", "/ZCPP_E2E_ORDERLIST", [])
                .then(function (aRows) {
                    var aOrders = aRows.map(function (o) {
                        var sRaw = o.SalesOrder || "";
                        // 앞자리 0 제거: "0000000394" -> "394" (숫자형일 때만)
                        var sOrder = /^\d+$/.test(String(sRaw).trim())
                            ? String(parseInt(sRaw, 10))
                            : sRaw;
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

        // 오더번호를 직접 입력해 조회한다(목록에 없어도 $filter 단건 조회는 항상 가능).
        onOrderLookup: function (oEvent) {
            var sQuery = (oEvent.getParameter("query") || "").trim();
            var aMatch = sQuery.match(/\d+/);
            if (!aMatch) {
                MessageToast.show("오더번호(숫자)를 입력하세요.");
                return;
            }
            var sKey = String(parseInt(aMatch[0], 10));
            this._selectOrder(sKey, sKey);
        },

        // 신규 PP 전용 CDS(ZCPP_E2E_*) 기준으로 로딩한다.
        //  - ppOverviewModel (/ZCPP_E2E_OVERVIEW)  : 요약/파이프라인 flag·카운트/BOM 요약
        //  - ppBomStockModel (/ZCPP_E2E_BOMSTOCK)  : BOM 구성품 상세(소요/확보/부족)
        //  - ppTrackerModel  (/ZCPP_E2E_TRACKER)   : 부자재 PR/PO/GR 문서(폴백 파이프라인용)
        _loadOrderDetails: function (sOrder) {
            var that = this;
            var sPadded = this._padOrder(sOrder);
            var aFilters = sPadded ? [new Filter("SalesOrder", FilterOperator.EQ, sPadded)] : [];
            this._sCurrentOrder = sPadded;

            this._oViewModel.setProperty("/busy", true);

            Promise.all([
                this._read("ppOverviewModel", "/ZCPP_E2E_OVERVIEW", aFilters).catch(function () { return null; }),
                this._read("ppBomStockModel", "/ZCPP_E2E_BOMSTOCK", aFilters).catch(function () { return []; })
            ]).then(function (aRes) {
                var aOverview = aRes[0];
                var aBom = aRes[1] || [];
                var oOverview = (aOverview && aOverview.length) ? aOverview[0] : null;

                if (oOverview) {
                    that._applyOverview(oOverview, aBom);
                    that._oViewModel.setProperty("/busy", false);
                } else {
                    // overview 미응답 → 트래커 기반 폴백
                    that._loadOrderDetailsFallback(sPadded);
                }
            });
        },

        // 폴백: overview가 비면 ppTrackerModel(/ZCPP_E2E_TRACKER) 문서 건수로 파이프라인만 그린다.
        _loadOrderDetailsFallback: function (sPadded) {
            var that = this;
            var aFilters = sPadded ? [new Filter("SalesOrder", FilterOperator.EQ, sPadded)] : [];
            this._read("ppTrackerModel", "/ZCPP_E2E_TRACKER", aFilters)
                .catch(function () { return []; })
                .then(function (aRows) {
                    var oCounts = that._countsFromTracker(aRows);
                    var oBom = that._analyzeBom(oCounts, []);
                    var aPipeline = that._buildPipelineFromCounts(oCounts, oBom);
                    that._setPipeline(aPipeline);
                    that._applyAlert(aPipeline);
                    that._oViewModel.setProperty("/bom", that._emptyBom());
                    that._oViewModel.setProperty("/feasibility", that._emptyFeasibility());
                    that._oViewModel.setProperty("/busy", false);
                });
        },

        // 트래커 행들에서 문서 건수를 집계해 overview와 동일한 카운트 구조로 만든다.
        _countsFromTracker: function (aRows) {
            var aPr = this._collectDocs(aRows, "PurchaseRequisition");
            var aPo = this._collectDocs(aRows, "PurchaseOrder");
            var aGr = this._collectDocs(aRows, "POMigoDoc");
            var aProd = this._collectDocs(aRows, "ProductionOrder");
            return {
                CompCount: (aRows || []).length,
                PrCount: aPr.length,
                PoCount: aPo.length,
                GrCount: aGr.length,
                HasSalesOrder: (aRows && aRows.length) ? 1 : 0,
                HasPurchaseRequisition: aPr.length ? 1 : 0,
                HasPurchaseOrder: aPo.length ? 1 : 0,
                HasProductionOrder: aProd.length ? 1 : 0
            };
        },

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

        // SAP 표준 10자리 zero-padding (숫자형 오더에만 적용)
        _padOrder: function (sOrder) {
            var s = (sOrder === null || sOrder === undefined) ? "" : String(sOrder).trim();
            if (!s) {
                return "";
            }
            return /^\d+$/.test(s) ? s.padStart(10, "0") : s;
        },

        /* ==================== 신규 CDS(ZCPP_E2E_*) 기반 처리 ==================== */

        _toNum: function (v) {
            var n = Number(String(v == null ? "" : v).replace(/,/g, ""));
            return isNaN(n) ? 0 : n;
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
            var aPipeline = this._buildPipelineFromCounts(oRow, oBom);
            this._setPipeline(aPipeline);
            this._applyAlert(aPipeline);
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

        // 부자재 문서 건수(CompCount/PrCount/PoCount/GrCount) 기준 5단계 파이프라인.
        // 전량 완료 → done(초록), 일부만 진행 → warning(주황, 부분 진행),
        // 선행 완료인데 미착수 → bottleneck(빨강), 그 외 → pending(회색).
        // 생산오더(MES)는 실제 생성 전에는 절대 done으로 표시하지 않는다.
        _buildPipelineFromCounts: function (oRow, oBom) {
            var nComp = this._toNum(oRow.CompCount) || (oBom && oBom.totalItems) || 0;
            var nPr = this._toNum(oRow.PrCount);
            var nPo = this._toNum(oRow.PoCount);
            var nGr = this._toNum(oRow.GrCount);
            var bSO = this._toNum(oRow.HasSalesOrder) === 1;
            var bProd = this._toNum(oRow.HasProductionOrder) === 1;
            var bBomDone = oBom && oBom.hasBom && oBom.shortRemainingCount === 0;

            var aSteps = [];

            // 1) SO
            aSteps.push(this._stepC("SO", bSO ? "done" : "pending", bSO ? "완료" : "대기"));

            // 2) PR (계획/구매요청)
            if (nComp > 0 && nPr >= nComp) {
                aSteps.push(this._stepC("PR", "done", "계획 완료"));
            } else if (nPr > 0) {
                aSteps.push(this._stepC("PR", "warning", "부분 생성"));
            } else if (bSO) {
                aSteps.push(this._stepC("PR", "warning", "생성 대기"));
            } else {
                aSteps.push(this._stepC("PR", "pending", "대기"));
            }

            // 3) PO (발주)
            if (nComp > 0 && nPo >= nComp) {
                aSteps.push(this._stepC("PO", "done", "발주 완료"));
            } else if (nPo > 0) {
                aSteps.push(this._stepC("PO", "warning", "부분 발주"));
            } else if (nPr > 0) {
                aSteps.push(this._stepC("PO", "bottleneck", "발주 대기"));
            } else {
                aSteps.push(this._stepC("PO", "pending", "대기"));
            }

            // 4) GR (물류입고). 생산오더 있거나 BOM 부족 0이면 입고 완료로 간주.
            if (bProd || bBomDone || (nComp > 0 && nGr >= nComp)) {
                aSteps.push(this._stepC("GR", "done", "입고 완료"));
            } else if (nGr > 0) {
                aSteps.push(this._stepC("GR", "warning", "부분 입고"));
            } else if (nPo > 0) {
                aSteps.push(this._stepC("GR", "warning", "입고 대기"));
            } else {
                aSteps.push(this._stepC("GR", "pending", "대기"));
            }

            // 5) MES (생산오더) — 생성 전에는 done 금지
            var bGrDone = aSteps[3].state === "done";
            if (bProd) {
                aSteps.push(this._stepC("MES", "done", "생산 진행"));
            } else if (bGrDone) {
                aSteps.push(this._stepC("MES", "warning", "생성 가능"));
            } else {
                aSteps.push(this._stepC("MES", "pending", "대기"));
            }

            return aSteps;
        },

        _stepC: function (sKey, sState, sText) {
            var oDef = STEP_DEF_MAP[sKey];
            return {
                key: sKey,
                label: oDef.label,
                sub: oDef.sub,
                icon: oDef.icon,
                state: sState,
                statusText: sText || "",
                showStatus: true
            };
        },

        // /pipeline + /progress 설정. 초록선은 선두 연속 완료 구간, 주황선은 그 다음
        // '진행중(warning)' 단계까지 한 구간 더 뻗는다(초록선이 앞부분을 덮음).
        _setPipeline: function (aPipeline) {
            var iTotal = aPipeline.length;
            var iDone = aPipeline.filter(function (s) { return s.state === "done"; }).length;
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

            var iLead = 0;
            for (var k = 0; k < aPipeline.length; k++) {
                if (aPipeline[k].state === "done") { iLead++; } else { break; }
            }
            var fGreen = iLead >= 2 ? (iLead - 1) * 20 : 0;

            var bPartial = iLead >= 1 && iLead < iTotal
                && aPipeline[iLead] && aPipeline[iLead].state === "warning";
            var fOrange = bPartial ? iLead * 20 : 0;

            this._oViewModel.setProperty("/pipeline", aPipeline);
            this._oViewModel.setProperty("/progress", {
                pct: iPct,
                pctLabel: iPct + "%",
                fillWidth: iPct + "%",
                lineWidth: fGreen + "%",
                lineVisible: fGreen > 0,
                partialWidth: fOrange + "%",
                partialVisible: bPartial,
                doneCount: iDone,
                total: iTotal,
                summary: "진행률 " + iPct + "% · " + iDone + "/" + iTotal + " 완료"
            });
        },

        // BOM/재고 도넛. rows가 하나라도 있으면 empty 처리하지 않는다.
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

            // 부족 자재 전체 (부족 수량 내림차순)
            var aShort = (oBom.rows || [])
                .filter(function (r) { return r._stillShort; })
                .sort(function (a, b) { return that._toNum(b.ShortageQty) - that._toNum(a.ShortageQty); })
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
                top3: aShort,
                hasShortage: oBom.shortRemainingCount > 0
            };
        },

        // 생산 가능 여부 (생산오더 생성 시 부족 오판 방지)
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
                securedItemCount: 0,
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

        // conic-gradient 기반 도넛 HTML
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

        // 가장 앞선 병목/진행 단계를 알림으로 노출
        _applyAlert: function (aPipeline) {
            var oBottleStep = null;
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

        _fmtQty: function (v) {
            if (v === null || v === undefined || v === "") {
                return "0";
            }
            var n = Number(v);
            return isNaN(n) ? String(v) : n.toLocaleString();
        }
    });
});
