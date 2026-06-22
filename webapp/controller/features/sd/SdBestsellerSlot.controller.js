/**
 * SdBestsellerSlot.controller.js — Step 4: 시즌 베스트셀러 BP 랭킹 (OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "com/capstone/dashboard/fioridashboard/service/SdBestsellerDataService"
], function (Controller, JSONModel, BusyIndicator, SdBestsellerDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.sd.SdBestsellerSlot", {

        onInit: function () {
            this._oViewModel = new JSONModel(SdBestsellerDataService.getEmptyViewData());
            this.getView().setModel(this._oViewModel, "sdBestseller");

            this._oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (this._oDashboard) {
                this._fnDashboardChange = this._onDashboardPropertyChange.bind(this);
                this._oDashboard.attachPropertyChange(this._fnDashboardChange);
            }

            this._loadBestsellerData();
        },

        onExit: function () {
            if (this._oDashboard && this._fnDashboardChange) {
                this._oDashboard.detachPropertyChange(this._fnDashboardChange);
            }
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._loadBestsellerData();
            }
        },

        _loadBestsellerData: function () {
            var oComponent = this.getOwnerComponent();
            var that = this;

            if (!oComponent || !oComponent.getModel("sdBestsellerModel")) {
                this._oViewModel.setData(SdBestsellerDataService.getEmptyViewData());
                this._oViewModel.setProperty("/loading", false);
                this._oViewModel.setProperty("/error", "sdBestsellerModel이 연결되지 않았습니다.");
                return;
            }

            this._oViewModel.setProperty("/loading", true);
            this._oViewModel.setProperty("/error", "");
            BusyIndicator.show(0);

            SdBestsellerDataService.load(oComponent)
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
