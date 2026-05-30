/**
 * InventoryStatus.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.InventoryStatus
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.InventoryStatus
 *
 * 역할:
 * - 재고 KPI 카드 3개 UI. dashboard/summary 바인딩, 로직 없음.
 *
 * 대시보드 구조: (예비) Serve/Main 탭 Canvas 연결용 — 현재 미사용
 *
 * 협업:
 * - KPI UI → InventoryStatus.view.xml / 데이터 → DashboardDataService
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.InventoryStatus", {});
});
