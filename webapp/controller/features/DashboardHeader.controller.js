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
    "sap/m/MessageToast",
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService"
], function (Controller, MessageToast, DashboardDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader", {

        _applySearch: function (sQuery) {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            oModel.setProperty("/filters/query", sQuery || "");
            DashboardDataService.applySearchFilter(oModel);
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query")
                || oEvent.getParameter("newValue")
                || oEvent.getSource().getValue()
                || "";
            this._applySearch(sQuery);
        },

        onMenuPress: function () {
            MessageToast.show("메뉴는 추후 연결 예정입니다");
        },

        onNotifications: function () {
            MessageToast.show("알림함은 추후 연결 예정입니다");
        },

        onHelp: function () {
            MessageToast.show("도움말은 추후 연결 예정입니다");
        },

        onProfile: function () {
            MessageToast.show("프로필 메뉴는 추후 연결 예정입니다");
        },

        onRefresh: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
        }
    });
});
