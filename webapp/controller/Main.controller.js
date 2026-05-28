/**
 * Main.controller.js
 *
 * 역할:
 * - 메인 대시보드 전체 뼈대의 공통 초기화와 SAP OData 연동을 담당한다.
 * - dashboard / create JSONModel을 Component에 연결해 하위 Nested View가 공유한다.
 *
 * 주요 기능:
 * - 대시보드 모델 초기화
 * - SAP BomStock 데이터 로딩 및 갱신
 * - OData create entity 자동 탐색
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil"
], function (Controller, JSONModel, MessageToast, MessageBox, DashboardDataService, SapErrorUtil) {
    "use strict";

    var CREATE_ENTITY_CANDIDATES = [
        "BomStockSet",
        "MaterialSet",
        "MaterialMasterSet",
        "ZmaterialSet"
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.Main", {

        onInit: function () {
            this._sImageBase = this._resolveImageBase();
            this._initModels();
            this._bindEventBus();
            this._discoverCreateEntity();
            this._loadSapBomStock();
        },

        onExit: function () {
            if (this._oEventBus) {
                this._oEventBus.unsubscribe("dashboard", "refreshData", this._onRefreshData, this);
            }
        },

        _resolveImageBase: function () {
            try {
                return sap.ui.require.toUrl("com/capstone/dashboard/fioridashboard/images/");
            } catch (e) {
                return "images/";
            }
        },

        /**
         * 공통 모델을 Component에 설정해 Nested View 전체에서 사용한다.
         */
        _initModels: function () {
            var oComponent = this.getOwnerComponent();
            var oDashboardModel = new JSONModel({
                ui: {
                    navKey: "DASHBOARD",
                    navLabel: "Dashboard",
                    createEntityLabel: "MaterialSet",
                    createEntityPath: "/MaterialSet",
                    dateRange: "Oct 18 - Nov 18",
                    period: "MONTHLY",
                    notificationCount: 6,
                    lastUpdated: "2025.05.20 10:30 기준"
                },
                user: {
                    name: "박찬영",
                    role: "FI/CO Analyst",
                    initials: "PC"
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
                    bars: [],
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
                allItems: [],
                displayItems: []
            });

            oComponent.setModel(oDashboardModel, "dashboard");
            oComponent.setModel(new JSONModel({
                Component: "",
                ComponentText: "",
                ParentMatnr: "UP-F-PNT-001",
                BomQty: "1",
                OrderQty: "1",
                Remark: ""
            }), "create");
        },

        _bindEventBus: function () {
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("dashboard", "refreshData", this._onRefreshData, this);
        },

        _onRefreshData: function () {
            this._loadSapBomStock();
            MessageToast.show("SAP 데이터를 새로고침했습니다");
        },

        _discoverCreateEntity: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            if (!oODataModel) {
                return;
            }

            var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
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
                        // try next candidate
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
                    oDashboardModel.setProperty("/ui/createEntityLabel", sFound);
                    oDashboardModel.setProperty("/ui/createEntityPath", "/" + sFound);
                }
            });
        },

        _loadSapBomStock: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

            if (!oODataModel) {
                MessageToast.show("OData Model 없음: manifest.json 확인 필요");
                return;
            }

            oODataModel.read("/BomStockSet", {
                success: function (oData) {
                    var aItems = (oData.results || []).map(function (oItem) {
                        return DashboardDataService.mapODataItem(oItem, this._sImageBase);
                    }.bind(this));
                    DashboardDataService.refreshDashboard(oDashboardModel, aItems);
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(SapErrorUtil.extractMessage(oError, "SAP 자재 데이터 조회에 실패했습니다."));
                }
            });
        }
    });
});
