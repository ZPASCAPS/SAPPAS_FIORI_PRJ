/**
 * DashboardToolbar.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardToolbar
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardToolbar
 *
 * 역할:
 * - 탭 제목(navLabel), 기준 시각, 새로고침, 대시보드 설정 버튼 처리.
 *
 * 대시보드 구조: DashboardMain → DashboardToolbar (헤더 아래)
 *
 * 협업:
 * - 새로고침 → EventBus "dashboard/refreshData" → Main.controller.js
 * - 탭 제목은 ModuleSideNav.controller.js가 navLabel 설정
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardToolbar", {

        onRefresh: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
        },

        onDashboardSettings: function () {
            MessageToast.show("대시보드 설정은 추후 연결 예정입니다");
        },

        onExecuteDateQuery: function () {
            var oDateRange = this.byId("dashboardDateRange");
            var oPeriod = this.byId("dashboardPeriodSelect");
            var sRange = oDateRange && oDateRange.getValue();
            var sPeriod = oPeriod && oPeriod.getSelectedItem() && oPeriod.getSelectedItem().getText();

            MessageToast.show((sRange || "기간 미설정") + " · " + (sPeriod || "주기 미설정") + " 조회 실행");
            sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
        },

        onSaveDateQuery: function () {
            MessageToast.show("조회 조건을 저장했습니다");
        },

        onLoadDateQuery: function () {
            MessageToast.show("저장된 조회 조건을 불러왔습니다");
        }
    });
});
