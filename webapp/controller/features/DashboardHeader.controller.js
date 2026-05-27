/**
 * DashboardHeader.controller.js
 *
 * 역할:
 * - 대시보드 상단 헤더(검색, 새로고침, 프로필) 이벤트를 처리한다.
 *
 * 주요 기능:
 * - 전역 검색 필터 적용
 * - SAP 데이터 새로고침 요청 (EventBus)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService"
], function (Controller, DashboardDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader", {

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            oModel.setProperty("/filters/query", sQuery);
            DashboardDataService.applySearchFilter(oModel);
        },

        onRefresh: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
        }
    });
});
