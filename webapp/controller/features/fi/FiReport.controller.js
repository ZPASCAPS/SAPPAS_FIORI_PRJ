/**
 * FiReport.controller.js ??FI Report
 * TODO: Eclipse CDS / OData ?�결 ??차트 ?�이??로드 로직 추�?
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/FiEmptyStateUtil"
], function (Controller, FiEmptyStateUtil) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.fi.FiReport", {

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

            if (!oModel.getProperty("/fiReport") || !oModel.getProperty("/fiReport/chartSlots") || !oModel.getProperty("/fiReport/chartSlots").length) {
                oModel.setProperty("/fiReport", FiEmptyStateUtil.getReportEmptyState());
            }
        },

        onRefreshPress: function () {
            // UI only ??FI OData ?�결 ???�로고침 로직 추�? ?�정
        }
    });
});
