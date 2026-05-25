sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, Fragment, JSONModel, MessageToast, MessageBox) {
    "use strict";

    var CREATE_ENTITY_CANDIDATES = [
        "BomStockSet",
        "MaterialSet",
        "MaterialMasterSet",
        "ZmaterialSet"
    ];

    var REGION_KEYS = ["china", "ue", "usa", "canada", "other"];
    var PANTS_BOM_MATNR = "UP-F-PNT-001";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.Main", {

        onInit: function () {
            this._aAllItems = [];
            this._sImageBase = this._resolveImageBase();
            this._sCreateEntityPath = "/MaterialSet";
            this._initDashboardModel();
            this._initCreateModel();
            this._discoverCreateEntity();
            this._loadSapBomStock();
        },

        _resolveImageBase: function () {
            try {
                return sap.ui.require.toUrl("com/capstone/dashboard/fioridashboard/images/");
            } catch (e) {
                return "images/";
            }
        },

        _initDashboardModel: function () {
            var oModel = new JSONModel({
                ui: {
                    navKey: "DASHBOARD",
                    createEntityLabel: "MaterialSet",
                    dateRange: "Oct 18 - Nov 18",
                    period: "MONTHLY"
                },
                user: {
                    name: "Young Alaska",
                    role: "Business",
                    initials: "YA"
                },
                summary: {
                    totalMaterials: 0,
                    totalMaterialsTrend: "+0%",
                    totalMaterialsTrendUp: true,
                    stockValue: "0",
                    stockValueTrend: "0%",
                    stockValueTrendUp: false,
                    shortageRate: "0%",
                    shortageRateTrend: "+0%",
                    shortageRateTrendUp: false
                },
                salesOverview: {
                    total: "0",
                    trend: "+0%",
                    trendUp: true,
                    months: [],
                    legend: []
                },
                subscribers: {
                    total: "0",
                    trend: "0%",
                    trendUp: true,
                    trendState: "None",
                    subtitle: "",
                    days: []
                },
                distribution: {
                    channels: [],
                    segments: []
                },
                integrations: [],
                counts: { all: 0, active: 0, warning: 0, shortage: 0 },
                filters: {
                    query: ""
                },
                displayItems: []
            });
            this.getView().setModel(oModel, "dashboard");
        },

        _initCreateModel: function () {
            this.getView().setModel(new JSONModel(this._emptyCreatePayload()), "create");
        },

        _emptyCreatePayload: function () {
            return {
                Component: "",
                ComponentText: "",
                ParentMatnr: "UP-F-PNT-001",
                BomQty: "1",
                OrderQty: "1",
                Remark: ""
            };
        },

        _discoverCreateEntity: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            if (!oODataModel) {
                return;
            }

            var oMetaModel = oODataModel.getMetaModel();
            oMetaModel.loaded().then(function () {
                var sFound = null;
                var i;

                for (i = 0; i < CREATE_ENTITY_CANDIDATES.length; i++) {
                    try {
                        var oSet = oMetaModel.getODataEntitySet(CREATE_ENTITY_CANDIDATES[i]);
                        if (oSet) {
                            sFound = CREATE_ENTITY_CANDIDATES[i];
                            break;
                        }
                    } catch (e) {
                        // try next
                    }
                }

                if (!sFound) {
                    try {
                        var oContainer = oMetaModel.getODataEntityContainer("");
                        var aSets = (oContainer && oContainer.entitySet) || [];
                        for (i = 0; i < aSets.length; i++) {
                            var sName = aSets[i].name || "";
                            if (/material|matnr|bomstock|component/i.test(sName)) {
                                sFound = sName;
                                break;
                            }
                        }
                    } catch (e2) {
                        // keep default
                    }
                }

                if (sFound) {
                    this._sCreateEntityPath = "/" + sFound;
                    this.getView().getModel("dashboard").setProperty("/ui/createEntityLabel", sFound);
                }
            }.bind(this));
        },

        _loadSapBomStock: function () {
            var oODataModel = this.getOwnerComponent().getModel();

            if (!oODataModel) {
                MessageToast.show("OData Model 없음: manifest.json 확인 필요");
                return;
            }

            oODataModel.read("/BomStockSet", {
                success: function (oData) {
                    var aItems = (oData.results || []).map(this._mapODataItem, this);
                    this._aAllItems = aItems;
                    this._refreshDashboard(aItems);
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(this._extractSapError(oError, "SAP 자재 데이터 조회에 실패했습니다."));
                }.bind(this)
            });
        },

        _mapODataItem: function (oItem) {
            oItem.BomQty = Number(oItem.BomQty || 0);
            oItem.OrderQty = Number(oItem.OrderQty || 0);
            oItem.RequiredQty = Number(oItem.RequiredQty || 0);
            oItem.StockQty = Number(oItem.StockQty || 0);
            oItem.ShortageQty = Number(oItem.ShortageQty || 0);

            var sStatus = oItem.Status || "";
            if (sStatus === "OK") {
                oItem.StatusText = "정상";
                oItem.StatusState = "Success";
                oItem.FilterStatus = "OK";
            } else if (sStatus === "SHORT") {
                oItem.StatusText = "부족";
                oItem.StatusState = "Error";
                oItem.FilterStatus = "SHORT";
            } else {
                oItem.StatusText = "확인";
                oItem.StatusState = "Warning";
                oItem.FilterStatus = "WARN";
            }

            oItem.MaterialName = oItem.ComponentText || oItem.Component || "-";
            oItem.MaterialCode = oItem.Component || "";
            oItem.CategoryLine = (oItem.ParentMatnr || "-") + " · 재고 " + oItem.StockQty + " EA";
            oItem.IsLowStock = oItem.ShortageQty > 0;
            oItem.LocationText = oItem.ParentMatnr
                ? "Depo " + String(oItem.ParentMatnr).slice(-1)
                : "Depo A";
            oItem.TypeLabel = this._resolveTypeLabel(oItem);
            oItem.RatePercent = this._calcFillRate(oItem);
            oItem.ProfitLabel = this._formatCurrency(oItem.StockQty * oItem.OrderQty * 12.5);

            this._assignMaterialVisual(oItem);
            return oItem;
        },

        _resolveTypeLabel: function (oItem) {
            var sCode = (oItem.Component || "").toUpperCase();
            if (sCode.indexOf("COT") >= 0) {
                return "원단";
            }
            if (sCode.indexOf("ZIP") >= 0) {
                return "부자재";
            }
            if (sCode.indexOf("BRG") >= 0 || sCode.indexOf("MOT") >= 0) {
                return "기계";
            }
            return "자재";
        },

        _calcFillRate: function (oItem) {
            var fRequired = Number(oItem.RequiredQty || oItem.BomQty || 1);
            var fStock = Number(oItem.StockQty || 0);
            if (fRequired <= 0) {
                return 100;
            }
            return Math.min(100, Math.round((fStock / fRequired) * 100));
        },

        _formatCurrency: function (nValue) {
            return "$ " + Number(nValue || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

        _assignMaterialVisual: function (oItem) {
            var sCode = (oItem.Component || "").toUpperCase();
            var sName = (oItem.MaterialName || "").toUpperCase();
            var sImg = "product.svg";
            var sIcon = "sap-icon://product";

            if (sCode.indexOf("COT") >= 0 || sName.indexOf("COTTON") >= 0 || sName.indexOf("면") >= 0) {
                sImg = "fabric.svg";
                sIcon = "sap-icon://palette";
            } else if (sCode.indexOf("ZIP") >= 0 || sName.indexOf("ZIP") >= 0) {
                sImg = "zipper.svg";
                sIcon = "sap-icon://chain-link";
            } else if (sCode.indexOf("BRG") >= 0) {
                sImg = "part.svg";
                sIcon = "sap-icon://lathe";
            }

            oItem.ImageUrl = this._sImageBase + sImg;
            oItem.Icon = sIcon;
        },

        _refreshDashboard: function (aItems) {
            var oModel = this.getView().getModel("dashboard");
            var iTotal = aItems.length;
            var iActive = aItems.filter(function (i) { return i.FilterStatus === "OK"; }).length;
            var iWarn = aItems.filter(function (i) { return i.FilterStatus === "WARN"; }).length;
            var iShort = aItems.filter(function (i) { return i.FilterStatus === "SHORT"; }).length;
            var fStockValue = aItems.reduce(function (s, i) {
                return s + (Number(i.StockQty || 0) * Number(i.OrderQty || 1) * 12.5);
            }, 0);
            var fShortageRate = iTotal ? (iShort / iTotal) * 100 : 0;
            var fPrevShortage = Math.max(0, fShortageRate - 8.3);

            oModel.setProperty("/counts", {
                all: iTotal,
                active: iActive,
                warning: iWarn,
                shortage: iShort
            });

            oModel.setProperty("/summary", {
                totalMaterials: iTotal,
                totalMaterialsTrend: iTotal ? "+15.8%" : "0%",
                totalMaterialsTrendUp: true,
                stockValue: this._formatCurrency(fStockValue),
                stockValueTrend: iShort ? (Math.round((iShort / Math.max(iTotal, 1)) * 100) + "%") : "0%",
                stockValueTrendUp: false,
                shortageRate: fShortageRate.toFixed(1) + "%",
                shortageRateTrend: "+" + Math.abs(fShortageRate - fPrevShortage).toFixed(1) + "%",
                shortageRateTrendUp: fShortageRate >= fPrevShortage
            });

            oModel.setProperty("/salesOverview", this._buildSalesOverview(aItems, fStockValue));
            oModel.setProperty("/subscribers", this._buildStockActivity(aItems));
            oModel.setProperty("/distribution", this._buildDistribution(aItems));
            oModel.setProperty("/integrations", this._buildIntegrations(aItems));
            oModel.setProperty("/displayItems", aItems.slice(0, 8));
            this._applySearchFilter();
        },

        _buildSalesOverview: function (aItems, fTotal) {
            var aMonths = ["Oct", "Nov", "Dec"];
            var aBars = aMonths.map(function (sMonth, mIdx) {
                var aSegments = REGION_KEYS.map(function (sKey, idx) {
                    var fBase = (fTotal / 5) * (0.65 + idx * 0.08);
                    return {
                        height: Math.max(18, Math.round(28 + fBase / 140 + mIdx * 14 + idx * 8)),
                        tone: "nxBarSeg" + ((idx + mIdx) % 5 + 1)
                    };
                });
                return { month: sMonth, segments: aSegments };
            });

            return {
                total: this._formatCurrency(fTotal || 9257.51),
                trend: "+15.8%",
                trendUp: true,
                bars: aBars,
                legend: ["China", "UE", "USA", "Canada", "Other"].map(function (sLabel, i) {
                    return { label: sLabel, tone: "nxLegend" + (i + 1) };
                })
            };
        },

        /**
         * Stock Activity — 바지 BOM(UP-F-PNT-001) 구성자재의 MMBE 재고(StockQty) 합계·분포.
         * OData: ZUP_PNT_STOCK_SRV / BomStockSet
         */
        _buildStockActivity: function (aItems) {
            var aBomItems = aItems.filter(function (oItem) {
                return String(oItem.ParentMatnr || "").toUpperCase() === PANTS_BOM_MATNR;
            });

            if (!aBomItems.length) {
                aBomItems = aItems.slice();
            }

            var fTotalStock = aBomItems.reduce(function (sum, oItem) {
                return sum + Number(oItem.StockQty || 0);
            }, 0);

            var fTotalRequired = aBomItems.reduce(function (sum, oItem) {
                return sum + Number(oItem.RequiredQty || 0);
            }, 0);

            var fCoverage = fTotalRequired > 0
                ? Math.min(999.9, (fTotalStock / fTotalRequired) * 100)
                : (fTotalStock > 0 ? 100 : 0);

            var iShort = aBomItems.filter(function (oItem) {
                return oItem.FilterStatus === "SHORT";
            }).length;

            var sTrendState = "Success";
            if (iShort > 0) {
                sTrendState = iShort === aBomItems.length ? "Error" : "Warning";
            }

            var aStocks = aBomItems.map(function (oItem) {
                return Number(oItem.StockQty || 0);
            });
            var fMaxStock = Math.max.apply(null, aStocks.concat([1]));

            var aBars = aBomItems.map(function (oItem) {
                var fStock = Number(oItem.StockQty || 0);
                var sComponent = oItem.Component || oItem.MaterialCode || "-";
                var sShortLabel = sComponent.replace(/^UP-[RH]-/, "");

                return {
                    day: sShortLabel.length > 8 ? sShortLabel.slice(0, 8) : sShortLabel,
                    tooltip: (oItem.MaterialName || sComponent) + ": " + fStock + " EA",
                    value: fStock,
                    height: Math.max(10, Math.round((fStock / fMaxStock) * 100)),
                    active: oItem.FilterStatus === "SHORT"
                };
            });

            return {
                total: Math.round(fTotalStock).toLocaleString("en-US"),
                trend: fCoverage.toFixed(1) + "%",
                trendUp: fCoverage >= 70,
                trendState: sTrendState,
                subtitle: PANTS_BOM_MATNR + " BOM · MMBE " + aBomItems.length + "건",
                days: aBars
            };
        },

        _buildDistribution: function (aItems) {
            var mGroups = {
                website: { key: "website", label: "완제품 BOM", amount: 0, color: "nxDonut1" },
                mobile: { key: "mobile", label: "부자재", amount: 0, color: "nxDonut2" },
                other: { key: "other", label: "기타", amount: 0, color: "nxDonut3" }
            };

            aItems.forEach(function (oItem) {
                var fAmt = Number(oItem.StockQty || 0) * Number(oItem.OrderQty || 1) * 12.5;
                var sType = oItem.TypeLabel;
                if (sType === "원단" || sType === "자재") {
                    mGroups.website.amount += fAmt;
                } else if (sType === "부자재") {
                    mGroups.mobile.amount += fAmt;
                } else {
                    mGroups.other.amount += fAmt;
                }
            });

            var aChannels = Object.keys(mGroups).map(function (sKey) {
                var o = mGroups[sKey];
                return {
                    key: o.key,
                    label: o.label,
                    amountLabel: "$" + o.amount.toFixed(2),
                    amount: o.amount
                };
            });

            var fSum = aChannels.reduce(function (s, c) { return s + c.amount; }, 0) || 1;
            var fCursor = 0;
            var aSegments = aChannels.map(function (c) {
                var fPct = (c.amount / fSum) * 100;
                var oSeg = {
                    color: mGroups[c.key].color,
                    start: fCursor,
                    size: fPct
                };
                fCursor += fPct;
                return oSeg;
            });

            return { channels: aChannels, segments: aSegments };
        },

        _buildIntegrations: function (aItems) {
            return aItems.slice().sort(function (a, b) {
                return b.RatePercent - a.RatePercent;
            }).slice(0, 6).map(function (oItem, idx) {
                return {
                    id: oItem.Component || String(idx),
                    name: oItem.MaterialName,
                    code: oItem.MaterialCode,
                    type: oItem.TypeLabel,
                    rate: oItem.RatePercent,
                    profit: oItem.ProfitLabel,
                    icon: oItem.Icon,
                    imageUrl: oItem.ImageUrl,
                    statusText: oItem.StatusText,
                    statusState: oItem.StatusState,
                    selected: false
                };
            });
        },

        _applySearchFilter: function () {
            var oModel = this.getView().getModel("dashboard");
            var sQuery = (oModel.getProperty("/filters/query") || "").trim().toLowerCase();
            var aItems = (this._aAllItems || []).slice();

            if (sQuery) {
                aItems = aItems.filter(function (i) {
                    return (i.MaterialName || "").toLowerCase().indexOf(sQuery) >= 0
                        || (i.MaterialCode || "").toLowerCase().indexOf(sQuery) >= 0
                        || (i.ParentMatnr || "").toLowerCase().indexOf(sQuery) >= 0;
                });
            }

            oModel.setProperty("/displayItems", aItems.slice(0, 8));
            oModel.setProperty("/integrations", this._buildIntegrations(aItems));
        },

        _extractSapError: function (oError, sDefault) {
            try {
                var oResponse = oError && oError.responseText && JSON.parse(oError.responseText);
                var oMsg = oResponse && oResponse.error && oResponse.error.message;
                if (oMsg && oMsg.value) {
                    return oMsg.value;
                }
            } catch (e) {
                // ignore
            }
            return (oError && oError.message) || sDefault;
        },

        onRefresh: function () {
            this._loadSapBomStock();
            MessageToast.show("SAP 데이터를 새로고침했습니다");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            this.getView().getModel("dashboard").setProperty("/filters/query", sQuery);
            this._applySearchFilter();
        },

        onNavSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var aCustom = oItem && oItem.getCustomData();
            var sKey = (aCustom && aCustom[0] && aCustom[0].getValue()) || "DASHBOARD";
            this.getView().getModel("dashboard").setProperty("/ui/navKey", sKey);
            this._syncDashboardHeroState(sKey);
            if (sKey === "MATERIALS") {
                MessageToast.show("SAP 자재 목록은 하단 Integrations 테이블을 확인하세요");
            }
        },

        onDashboardNav: function () {
            var oList = this.byId("mainNavList");
            if (oList) {
                oList.removeSelections(true);
            }
            this.getView().getModel("dashboard").setProperty("/ui/navKey", "DASHBOARD");
            this._syncDashboardHeroState("DASHBOARD");
        },

        _syncDashboardHeroState: function (sKey) {
            var oHero = this.byId("navDashboardHero");
            if (!oHero) {
                return;
            }
            if (sKey === "DASHBOARD") {
                oHero.addStyleClass("nxDashHeroActive");
            } else {
                oHero.removeStyleClass("nxDashHeroActive");
            }
        },

        onPeriodChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            this.getView().getModel("dashboard").setProperty("/ui/period", sKey);
        },

        onExport: function () {
            MessageToast.show("SAP 데이터보내기 준비 중");
        },

        onFilterPress: function () {
            MessageToast.show("필터 패널은 추후 연결 예정");
        },

        onSeeAllIntegrations: function () {
            MessageToast.show("전체 SAP 자재 " + (this._aAllItems || []).length + "건");
        },

        onAddMaterial: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            if (!oODataModel) {
                MessageBox.error("SAP OData 모델이 없습니다.");
                return;
            }

            if (!this._oCreateDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.capstone.dashboard.fioridashboard.view.fragment.MaterialCreateDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oCreateDialog = oDialog;
                    this.getView().addDependent(this._oCreateDialog);
                    this._openCreateDialog();
                }.bind(this));
            } else {
                this._openCreateDialog();
            }
        },

        _openCreateDialog: function () {
            this.getView().getModel("create").setData(this._emptyCreatePayload());
            this._oCreateDialog.open();
        },

        onCancelMaterialCreate: function () {
            if (this._oCreateDialog) {
                this._oCreateDialog.close();
            }
        },

        onSaveMaterial: function () {
            var oCreateModel = this.getView().getModel("create");
            var oData = oCreateModel.getData();
            var oODataModel = this.getOwnerComponent().getModel();

            if (!oData.Component || !oData.ComponentText || !oData.ParentMatnr) {
                MessageBox.warning("자재코드, 자재명, 완제품은 필수입니다.");
                return;
            }

            var oPayload = {
                Component: oData.Component.trim(),
                ComponentText: oData.ComponentText.trim(),
                ParentMatnr: oData.ParentMatnr.trim(),
                BomQty: String(oData.BomQty || "1"),
                OrderQty: String(oData.OrderQty || "1"),
                Remark: (oData.Remark || "").trim()
            };

            var oDialog = this._oCreateDialog;
            if (oDialog) {
                oDialog.setBusy(true);
            }

            oODataModel.create(this._sCreateEntityPath, oPayload, {
                success: function () {
                    if (oDialog) {
                        oDialog.setBusy(false);
                        oDialog.close();
                    }
                    MessageToast.show("SAP에 자재가 등록되었습니다");
                    this._loadSapBomStock();
                }.bind(this),
                error: function (oError) {
                    if (oDialog) {
                        oDialog.setBusy(false);
                    }
                    MessageBox.error(this._extractSapError(oError, "SAP 자재 등록에 실패했습니다."));
                }.bind(this)
            });
        },

        


// 1. 챗봇 버튼 누르면 창 열기 - 김용민 0524
        onOpenChatbot: function () {
            var oView = this.getView();

            // 만약 챗봇 창이 아직 한 번도 안 만들어졌다면 서랍에서 꺼내서 만듭니다.
            if (!this._oChatbotDialog) {
                // ⚠️ 중요: 팀원의 프로젝트 이름에 맞게 경로를 설정해야 합니다. (아래에서 다시 설명해 드릴게요!)
                this._oChatbotDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.capstone.dashboard.fioridashboard.view.fragment.Chatbot", 
                    this
                );
                oView.addDependent(this._oChatbotDialog);
            }

            // 챗봇 대화창을 화면에 짠! 하고 오픈합니다.
            this._oChatbotDialog.open();
        },

        // 2. 닫기 버튼 누르면 창 닫기
        onCloseChatbot: function () {
            if (this._oChatbotDialog) {
                this._oChatbotDialog.close();
            }
        }




    });
});
