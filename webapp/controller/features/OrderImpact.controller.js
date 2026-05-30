/**
 * OrderImpact.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.OrderImpact
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.OrderImpact
 *
 * 역할:
 * - Sales Overview 막대 차트. Filter 버튼 등 UI 이벤트.
 *
 * 대시보드 구조: (예비) SD Sales 탭 — 현재 미사용
 *
 * 협업: UI → OrderImpact.view.xml / 데이터 → dashboard/salesOverview
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.OrderImpact", {

        onFilterPress: function () {
            MessageToast.show("필터 패널은 추후 연결 예정");
        }
    });
});
