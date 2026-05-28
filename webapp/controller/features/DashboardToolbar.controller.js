/**
 * DashboardToolbar.controller.js
 *
 * 역할:
 * - 환영 배너(인사, 기준 시각, 새로고침, 대시보드 설정)를 처리한다.
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
