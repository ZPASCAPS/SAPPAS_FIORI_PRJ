/**
 * SdKpiTilesSlot.controller.js — SD Overview KPI Tiles (Step 1, OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "com/capstone/dashboard/fioridashboard/service/SdKpiDataService"
], function (Controller, JSONModel, BusyIndicator, SdKpiDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.sd.SdKpiTilesSlot", {

        onInit: function () {
            this._oViewModel = new JSONModel(SdKpiDataService.getEmptyViewData());
            this.getView().setModel(this._oViewModel, "sdKpi");

            this._oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (this._oDashboard) {
                this._fnDashboardChange = this._onDashboardPropertyChange.bind(this);
                this._oDashboard.attachPropertyChange(this._fnDashboardChange);
            }

            this._loadKpiData();
        },

        onExit: function () {
            if (this._oDashboard && this._fnDashboardChange) {
                this._oDashboard.detachPropertyChange(this._fnDashboardChange);
            }
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/moduleView/period" || sPath === "/ui/navKey") {
                this._loadKpiData();
            }
        },

        _getPeriodKey: function () {
            if (!this._oDashboard) {
                return "THIS_WEEK";
            }
            return this._oDashboard.getProperty("/moduleView/period") || "THIS_WEEK";
        },

        _loadKpiData: function () {
            var oComponent = this.getOwnerComponent();
            var sPeriodKey = this._getPeriodKey();
            var that = this;

            if (!oComponent || !oComponent.getModel("sdKpiModel")) {
                this._oViewModel.setData(SdKpiDataService.getEmptyViewData());
                this._oViewModel.setProperty("/loading", false);
                this._oViewModel.setProperty("/error", "sdKpiModel이 연결되지 않았습니다.");
                return;
            }

            this._oViewModel.setProperty("/loading", true);
            BusyIndicator.show(0);

            SdKpiDataService.load(oComponent, sPeriodKey)
                .then(function (oTiles) {
                    that._oViewModel.setData(oTiles);
                })
                .finally(function () {
                    BusyIndicator.hide();
                    that._oViewModel.setProperty("/loading", false);
                });
        }
    });
});
