/**
 * DashboardCanvas.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardCanvas
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas
 *
 * 역할:
 * - 중앙 콘텐츠 영역. navKey별 View 전환.
 * - navKey=DASHBOARD: A/B 분할
 * - navKey=MM_MATERIALS + Reports: MmReports (SAP BomStock 실데이터)
 * - navKey=SD/MM/PP/FI: ModuleDashboardShell + 탭별 본문
 * - 그 외: SectionPlaceholder
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas", {});
});
