/**
 * SdRmaMonitorSlot.controller.js — Step 3: 반품(RMA) 입고 모니터링 (OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "com/capstone/dashboard/fioridashboard/service/SdRmaDataService"
], function (Controller, JSONModel, BusyIndicator, SdRmaDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.sd.SdRmaMonitorSlot", {

        onInit: function () {
            this._oViewModel = new JSONModel(SdRmaDataService.getEmptyViewData());
            this.getView().setModel(this._oViewModel, "sdRma");

            this._oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (this._oDashboard) {
                this._fnDashboardChange = this._onDashboardPropertyChange.bind(this);
                this._oDashboard.attachPropertyChange(this._fnDashboardChange);
            }

            this._loadRmaData();
        },

        onExit: function () {
            if (this._oDashboard && this._fnDashboardChange) {
                this._oDashboard.detachPropertyChange(this._fnDashboardChange);
            }
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._loadRmaData();
            }
        },

        _loadRmaData: function () {
            var oComponent = this.getOwnerComponent();
            var that = this;

            if (!oComponent || !oComponent.getModel("sdRmaModel")) {
                this._oViewModel.setData(SdRmaDataService.getEmptyViewData());
                this._oViewModel.setProperty("/loading", false);
                this._oViewModel.setProperty("/error", "sdRmaModel이 연결되지 않았습니다.");
                return;
            }

            this._oViewModel.setProperty("/loading", true);
            this._oViewModel.setProperty("/error", "");
            BusyIndicator.show(0);

            SdRmaDataService.load(oComponent)
                .then(function (oViewData) {
                    that._oViewModel.setData(oViewData);
                })
                .finally(function () {
                    BusyIndicator.hide();
                    that._oViewModel.setProperty("/loading", false);
                });
        }
    });
});
