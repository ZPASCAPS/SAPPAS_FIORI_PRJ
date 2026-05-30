/**
 * Main.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.Main
 * Controller: com.capstone.dashboard.fioridashboard.controller.Main
 *
 * 역할:
 * - 통합 대시보드 공통 초기화. dashboard/create JSONModel을 Component에 등록한다.
 * - SAP BomStock OData 로딩·갱신, create entity 탐색.
 *
 * 대시보드 구조:
 * Main.view.xml (뼈대) — 하위 features View는 각자 Controller가 담당
 *
 * 협업:
 * - 공통 모델·OData·EventBus(refreshData) → 이 Controller
 * - 화면별 UI/이벤트 → features/ 하위 Controller (충돌 방지)
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
                    navDescription: "SAP 통합 프로세스 전체 현황을 확인합니다.",
                    navIcon: "sap-icon://bbyd-dashboard",
                    createEntityLabel: "MaterialSet",
                    createEntityPath: "/MaterialSet",
                    dateRange: "Oct 18 - Nov 18",
                    period: "MONTHLY",
                    notificationCount: 6,
                    lastUpdated: "2025.05.20 10:30 기준"
                },
                user: {
                    name: "박찬영",
                    role: "FI.CO",
                    editName: "박찬영",
                    editModule: "FI.CO"
                },
                profileOptions: {
                    names: [
                        { key: "김용민", text: "김용민" },
                        { key: "신성진", text: "신성진" },
                        { key: "박찬영", text: "박찬영" }
                    ],
                    modules: [
                        { key: "SD", text: "SD" },
                        { key: "PP", text: "PP" },
                        { key: "MM", text: "MM" },
                        { key: "FI.CO", text: "FI.CO" }
                    ]
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
