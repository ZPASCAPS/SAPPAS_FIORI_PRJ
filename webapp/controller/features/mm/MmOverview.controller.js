/**
 * MmOverview.controller.js — MM Overview (히트텍/가방 BOM + Z_C_MM_INVENTORY)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/service/mm/MmOverviewDataService"
], function (Controller, MessageBox, MmOverviewDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.mm.MmOverview", {

        onInit: function () {
            this._oCache = null;
            this._bLoading = false;
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._fnRefreshHandler = this._onGlobalRefresh.bind(this);
            this._oEventBus.subscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
            this._waitForDashboardModel();
        },

        onExit: function () {
            var oModel = this._getDashboardModel();

            if (this._oEventBus && this._fnRefreshHandler) {
                this._oEventBus.unsubscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
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
            if (this._bLoading) {
                return;
            }
            if (!this._oCache || !this._getDashboardModel().getProperty("/mmOverview/loaded")) {
                this._loadOverview();
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
            this._loadOverview();
        },

        _loadOverview: function () {
            var oModel = this._getDashboardModel();
            var oComponent = this.getOwnerComponent();

            if (!oModel || !oComponent || this._bLoading) {
                return;
            }

            this._bLoading = true;
            this._setLoading(true);
            oModel.setProperty("/mmOverview/error", "");

            MmOverviewDataService.loadBomOverviewData(oComponent)
                .then(function (oCache) {
                    this._oCache = oCache;
                    oModel.setProperty("/mmOverview", MmOverviewDataService.buildBomOverviewState(oCache));
                    this._setLoading(false);
                    this._bLoading = false;
                }.bind(this))
                .catch(function (oError) {
                    this._setLoading(false);
                    this._bLoading = false;
                    this._oCache = null;
                    oModel.setProperty("/mmOverview/loaded", false);
                    oModel.setProperty("/mmOverview/error", oError.message || "SAP OData 조회 실패");
                    MessageBox.error(oError.message || "SAP OData 조회에 실패했습니다.");
                }.bind(this));
        },

        onToolbarRefresh: function () {
            this._loadOverview();
        }
    });
});
