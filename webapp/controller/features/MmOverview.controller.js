/**
 * MmOverview.controller.js — MM Overview Cockpit (SAP OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/service/MmOverviewDataService"
], function (Controller, MessageToast, MessageBox, MmOverviewDataService) {
    "use strict";

    var WORKLIST_DEFAULT_SIZE = 3;

    var PRIMARY_KPI_LABELS = [
        "Shortage Items",
        "Total Materials",
        "Total Stock Qty",
        "Avg Fill Rate",
        "PO/MIGO Tracker Count"
    ];

    var KPI_DISPLAY = {
        "Shortage Items": { displayTitle: "부족 자재", hint: "Status/ShortageQty 기준", accent: "danger" },
        "Total Materials": { displayTitle: "전체 자재", hint: "BomStockSet 전체 자재 수", accent: "blue" },
        "Total Stock Qty": { displayTitle: "전체 재고 수량", hint: "StockQty 합계", accent: "blue" },
        "Avg Fill Rate": { displayTitle: "평균 충족률", hint: "RequiredQty 대비 StockQty", accent: "amber" },
        "PO/MIGO Tracker Count": { displayTitle: "PO/MIGO 추적", hint: "OrderTracker 추적 건수", accent: "blue" }
    };

    var COCKPIT_ROW1_CHARTS = [
        "Top Shortage Materials",
        "Stock Status Distribution"
    ];

    var COCKPIT_ROW2_CHARTS = [
        "Priority Action",
        "PO/MIGO Tracker Summary"
    ];

    var COCKPIT_EXTRA_CHARTS = [
        "Stock by TypeLabel"
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.MmOverview", {

        onInit: function () {
            this._oCache = null;
            this._bDataLoaded = false;
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._fnRefreshHandler = this._onGlobalRefresh.bind(this);
            this._fnOverviewActionHandler = this._onMmOverviewAction.bind(this);
            this._oEventBus.subscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
            this._oEventBus.subscribe("dashboard", "mmOverviewAction", this._fnOverviewActionHandler, this);
            this._waitForDashboardModel();
        },

        onExit: function () {
            var oModel = this._getDashboardModel();

            if (this._oEventBus) {
                if (this._fnRefreshHandler) {
                    this._oEventBus.unsubscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
                }
                if (this._fnOverviewActionHandler) {
                    this._oEventBus.unsubscribe("dashboard", "mmOverviewAction", this._fnOverviewActionHandler, this);
                }
            }

            if (oModel && this._fnNavChange) {
                oModel.detachPropertyChange(this._fnNavChange, this);
            }
        },

        _getDashboardModel: function () {
            var oView = this.getView();
            return (oView && oView.getModel("dashboard")) || this.getOwnerComponent().getModel("dashboard");
        },

        _waitForDashboardModel: function () {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                setTimeout(this._waitForDashboardModel.bind(this), 50);
                return;
            }

            if (!oModel.getProperty("/mmOverview")) {
                oModel.setProperty("/mmOverview", MmOverviewDataService.getEmptyState());
            }

            this._fnNavChange = this._onDashboardPropertyChange.bind(this);
            oModel.attachPropertyChange(this._fnNavChange, this);
            this._loadIfActive();
        },

        _isOverviewActive: function () {
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return false;
            }
            return oModel.getProperty("/ui/navKey") === "MM_MATERIALS"
                && oModel.getProperty("/moduleView/activeSubTab") === "OVERVIEW";
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();
            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._loadIfActive();
            }
        },

        _loadIfActive: function () {
            if (!this._isOverviewActive()) {
                return;
            }
            if (!this._bDataLoaded) {
                this._bDataLoaded = true;
                this._loadOverview(true);
            }
        },

        _resolveImageBase: function () {
            try {
                return sap.ui.require.toUrl("com/capstone/dashboard/fioridashboard/images/");
            } catch (e) {
                return "images/";
            }
        },

        _setLoading: function (bLoading) {
            var oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/mmOverview/loading", bLoading);
            }
        },

        _onGlobalRefresh: function () {
            if (!this._isOverviewActive()) {
                return;
            }
            this._loadOverview(false);
        },

        _loadOverview: function (bApplyCurrentQuery) {
            var oModel = this._getDashboardModel();
            var oComponent = this.getOwnerComponent();

            if (!oModel || !oComponent) {
                return;
            }

            var sMode = oModel.getProperty("/mmOverview/queryMode") || MmOverviewDataService.QUERY_MODES.ALL;
            var sSearch = oModel.getProperty("/mmOverview/searchText") || "";

            this._setLoading(true);
            oModel.setProperty("/mmOverview/error", "");

            MmOverviewDataService.loadOverviewData(oComponent, this._resolveImageBase())
                .then(function (oCache) {
                    this._oCache = oCache;
                    if (!bApplyCurrentQuery) {
                        sMode = MmOverviewDataService.QUERY_MODES.ALL;
                        sSearch = "";
                    }
                    oModel.setProperty("/mmOverview", MmOverviewDataService.buildOverviewState(oCache, sMode, sSearch));
                    this._resetWorklistVisibility(oModel);
                    this._applyOverviewLayout(oModel);
                    this._setLoading(false);
                }.bind(this))
                .catch(function (oError) {
                    this._setLoading(false);
                    oModel.setProperty("/mmOverview/loaded", false);
                    oModel.setProperty("/mmOverview/error", oError.message || "SAP OData 조회 실패");
                    MessageBox.error(oError.message || "SAP OData 조회에 실패했습니다.");
                }.bind(this));
        },

        _onMmOverviewAction: function (sChannel, sEvent, oData) {
            if (!oData || !oData.action) {
                return;
            }

            switch (oData.action) {
                case "queryMode":
                    this._handleQueryModeChange(oData.key);
                    break;
                case "search":
                    this.onSearchPress();
                    break;
                case "reset":
                    this.onResetPress();
                    break;
                case "refresh":
                    this.onRefreshPress();
                    break;
                default:
                    break;
            }
        },

        _handleQueryModeChange: function (sKey) {
            var oModel = this._getDashboardModel();

            if (!oModel || !sKey) {
                return;
            }

            oModel.setProperty("/mmOverview/queryMode", sKey);
            oModel.setProperty("/mmOverview/searchEnabled", sKey !== MmOverviewDataService.QUERY_MODES.ALL);
            oModel.setProperty("/mmOverview/searchPlaceholder",
                sKey === MmOverviewDataService.QUERY_MODES.MATERIAL
                    ? "자재번호를 입력하세요. 예: UP-R-COT-001"
                    : sKey === MmOverviewDataService.QUERY_MODES.PO
                        ? "PO번호를 입력하세요. 예: 4500000012"
                        : "전체 MM 현황을 조회합니다");

            if (sKey === MmOverviewDataService.QUERY_MODES.ALL) {
                oModel.setProperty("/mmOverview/searchText", "");
                this._applyQuery(MmOverviewDataService.QUERY_MODES.ALL, "");
            }
        },

        onQueryModeChange: function (oEvent) {
            var sKey = oEvent.getParameter("item") && oEvent.getParameter("item").getKey();
            this._handleQueryModeChange(sKey);
        },

        onSearchPress: function () {
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return;
            }

            var sMode = oModel.getProperty("/mmOverview/queryMode") || MmOverviewDataService.QUERY_MODES.ALL;
            var sSearch = (oModel.getProperty("/mmOverview/searchText") || "").trim();

            if (sMode !== MmOverviewDataService.QUERY_MODES.ALL && !sSearch) {
                MessageToast.show("검색어를 입력해 주세요.");
                return;
            }
            this._applyQuery(sMode, sSearch);
        },

        onResetPress: function () {
            var oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/mmOverview/searchText", "");
                oModel.setProperty("/mmOverview/queryMode", MmOverviewDataService.QUERY_MODES.ALL);
                oModel.setProperty("/mmOverview/searchEnabled", false);
                oModel.setProperty("/mmOverview/searchPlaceholder", "전체 MM 현황을 조회합니다");
            }
            this._applyQuery(MmOverviewDataService.QUERY_MODES.ALL, "");
            MessageToast.show("조회 조건을 초기화했습니다.");
        },

        onRefreshPress: function () {
            this._loadOverview(true);
            MessageToast.show("SAP OData를 새로고침했습니다.");
        },

        _applyQuery: function (sMode, sSearch) {
            if (!this._oCache) {
                this._loadOverview(true);
                return;
            }
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return;
            }
            oModel.setProperty("/mmOverview", MmOverviewDataService.buildOverviewState(this._oCache, sMode, sSearch));
            this._resetWorklistVisibility(oModel);
            this._applyOverviewLayout(oModel);
        },

        _enrichKpiForDisplay: function (oKpi) {
            var oMeta = KPI_DISPLAY[oKpi.label] || {
                displayTitle: oKpi.label,
                hint: oKpi.hint,
                accent: "neutral"
            };
            var oDisplay = {
                label: oKpi.label,
                displayTitle: oMeta.displayTitle || oKpi.label,
                value: oKpi.value,
                unit: oKpi.unit,
                hint: oMeta.hint || oKpi.hint,
                accent: oMeta.accent || "neutral"
            };

            if (oKpi.label === "Shortage Items" && oKpi.value !== "데이터 없음" && Number(oKpi.value) > 0) {
                oDisplay.accent = "danger";
            }

            if (oKpi.label === "Avg Fill Rate" && oKpi.unit === "%") {
                var fRate = Number(oKpi.value);
                if (!isNaN(fRate)) {
                    oDisplay.accent = fRate < 40 ? "danger" : (fRate < 70 ? "amber" : "blue");
                }
            }

            return oDisplay;
        },

        _pickChartsByTitle: function (aCharts, aTitles) {
            var aResult = [];
            var i;
            var j;

            aTitles.forEach(function (sTitle) {
                for (i = 0; i < aCharts.length; i++) {
                    if (aCharts[i].title === sTitle) {
                        aResult.push(aCharts[i]);
                        break;
                    }
                }
            });

            return aResult;
        },

        _applyOverviewLayout: function (oModel) {
            var aKpis = oModel.getProperty("/mmOverview/kpis") || [];
            var aCharts = oModel.getProperty("/mmOverview/charts") || [];
            var aPrimary = [];
            var aRow1Charts;
            var aRow2Charts;
            var aExtraCharts;
            var i;

            PRIMARY_KPI_LABELS.forEach(function (sLabel) {
                for (i = 0; i < aKpis.length; i++) {
                    if (aKpis[i].label === sLabel) {
                        aPrimary.push(this._enrichKpiForDisplay(aKpis[i]));
                        break;
                    }
                }
            }.bind(this));

            if (!aPrimary.length) {
                aPrimary = aKpis.slice(0, 5).map(this._enrichKpiForDisplay.bind(this));
            }

            aRow1Charts = this._pickChartsByTitle(aCharts, COCKPIT_ROW1_CHARTS);
            aRow2Charts = this._pickChartsByTitle(aCharts, COCKPIT_ROW2_CHARTS);
            aExtraCharts = this._pickChartsByTitle(aCharts, COCKPIT_EXTRA_CHARTS);

            if (!aRow1Charts.length && !aRow2Charts.length) {
                aRow1Charts = aCharts.slice(0, 2);
                aRow2Charts = aCharts.slice(2, 4);
                aExtraCharts = aCharts.slice(4);
            }

            oModel.setProperty("/mmOverview/primaryKpis", aPrimary);
            oModel.setProperty("/mmOverview/showSecondaryKpis", false);
            oModel.setProperty("/mmOverview/row1Charts", aRow1Charts);
            oModel.setProperty("/mmOverview/row2Charts", aRow2Charts);
            oModel.setProperty("/mmOverview/extraCharts", aExtraCharts);
            oModel.setProperty("/mmOverview/hasExtraCharts", aExtraCharts.length > 0);
            oModel.setProperty("/mmOverview/chartsExpanded", false);
        },

        onChartsTogglePress: function () {
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return;
            }
            var bExpanded = oModel.getProperty("/mmOverview/chartsExpanded") === true;
            oModel.setProperty("/mmOverview/chartsExpanded", !bExpanded);
        },

        _resetWorklistVisibility: function (oModel) {
            this._applyWorklistVisibility(oModel, false);
        },

        _applyWorklistVisibility: function (oModel, bExpanded) {
            if (!oModel) {
                return;
            }

            var aAll = oModel.getProperty("/mmOverview/worklist") || [];
            var iTotal = aAll.length;
            var bShowAll = bExpanded === true || iTotal <= WORKLIST_DEFAULT_SIZE;
            var iVisible = bShowAll ? iTotal : Math.min(WORKLIST_DEFAULT_SIZE, iTotal);
            var aVisible = aAll.slice(0, iVisible);

            oModel.setProperty("/mmOverview/worklistExpanded", bShowAll && iTotal > WORKLIST_DEFAULT_SIZE);
            oModel.setProperty("/mmOverview/visibleWorklist", aVisible);
            oModel.setProperty("/mmOverview/worklistTotalCount", iTotal);
            oModel.setProperty("/mmOverview/worklistVisibleCount", iVisible);
            oModel.setProperty("/mmOverview/worklistHiddenCount", Math.max(0, iTotal - WORKLIST_DEFAULT_SIZE));
            oModel.setProperty("/mmOverview/worklistShowToggle", iTotal > WORKLIST_DEFAULT_SIZE);
        },

        onWorklistExpandPress: function () {
            this._applyWorklistVisibility(this._getDashboardModel(), true);
        },

        onWorklistCollapsePress: function () {
            this._applyWorklistVisibility(this._getDashboardModel(), false);
        },

        onWorklistPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oCtx = oItem.getBindingContext("dashboard");
            var oModel = this._getDashboardModel();

            if (!oCtx || !oModel) {
                return;
            }

            var oRow = oCtx.getObject();
            var mInventory = this._oCache ? this._oCache.inventoryMap : {};

            oModel.setProperty("/mmOverview/selectedWorklistId", oRow.id);
            oModel.setProperty("/mmOverview/detail", MmOverviewDataService.buildDetailFromSelection(oRow, mInventory));

            var oDialog = this.byId("mmOverviewDetailDialog");
            if (oDialog) {
                oDialog.open();
            }
        },

        onDetailClose: function () {
            var oDialog = this.byId("mmOverviewDetailDialog");
            if (oDialog) {
                oDialog.close();
            }
        }
    });
});
