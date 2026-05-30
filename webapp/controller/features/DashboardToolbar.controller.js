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
        }
    });
});
