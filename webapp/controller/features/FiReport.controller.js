/**
 * FiReport.controller.js — FI Report
 * TODO: Eclipse CDS / OData 연결 후 차트 데이터 로드 로직 추가
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/FiEmptyStateUtil"
], function (Controller, FiEmptyStateUtil) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.FiReport", {

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
            // UI only — FI OData 연결 후 새로고침 로직 추가 예정
        }
    });
});
