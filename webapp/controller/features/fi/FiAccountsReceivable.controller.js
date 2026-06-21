/**
 * FiAccountsReceivable.controller.js ??FI Accounts Receivable
 * TODO: Eclipse CDS / OData ?∞Í≤∞ ???∞Ïù¥??Î°úÎìú Î°úÏßÅ Ï∂îÍ?
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/FiEmptyStateUtil"
], function (Controller, FiEmptyStateUtil) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.fi.FiAccountsReceivable", {

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

            if (!oModel.getProperty("/fiAccountsReceivable")) {
                oModel.setProperty("/fiAccountsReceivable", FiEmptyStateUtil.getAccountsReceivableEmptyState());
            }
        },

        onToolbarFilterOpen: function () {
            // UI only ??FI OData ?∞Í≤∞ ???ÑÌÑ∞ Î°úÏßÅ Ï∂îÍ? ?àÏ†ï
        }
    });
});
