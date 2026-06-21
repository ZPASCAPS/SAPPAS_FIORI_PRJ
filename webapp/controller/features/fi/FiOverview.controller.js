/**
 * FiOverview.controller.js - FI Overview onboarding landing page
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/FiEmptyStateUtil"
], function (Controller, FiEmptyStateUtil) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.fi.FiOverview", {

        onInit: function () {
            this._waitForDashboardModel();
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

            if (!oModel.getProperty("/fiOverview")
                || !oModel.getProperty("/fiOverview/features")
                || !oModel.getProperty("/fiOverview/features").length) {
                oModel.setProperty("/fiOverview", FiEmptyStateUtil.getOverviewEmptyState());
            }
        },

        onOpenCustomerReceipt: function () {
            this._navigateToSubTab("CUSTOMER_RECEIPT");
        },

        onScrollToFeatures: function () {
            var oSection = this.byId("fiOverviewFeatureSection");
            var oDom;

            if (!oSection) {
                return;
            }

            oDom = oSection.getDomRef();
            if (oDom && oDom.scrollIntoView) {
                oDom.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        },

        onFeaturePress: function (oEvent) {
            var oSource = oEvent.getSource();
            var aCustom = oSource.getCustomData();
            var sKey = aCustom && aCustom[0] && aCustom[0].getValue();

            if (sKey === "CUSTOMER_RECEIPT") {
                this._navigateToSubTab("CUSTOMER_RECEIPT");
            }
        },

        _navigateToSubTab: function (sSubTabKey) {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                return;
            }

            oModel.setProperty("/moduleView/activeSubTab", sSubTabKey);
        }
    });
});
