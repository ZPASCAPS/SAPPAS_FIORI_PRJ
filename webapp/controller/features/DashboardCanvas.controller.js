/**
 * DashboardCanvas.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardCanvas
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas
 *
 * 역할:
 * - 중앙 콘텐츠 영역. navKey별 View 전환.
 * - navKey=DASHBOARD: A/B 분할
 * - navKey=MM_MATERIALS + Overview: MmOverview Cockpit (SAP OData)
 * - 그 외: SectionPlaceholder
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas", {});
});
