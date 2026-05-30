/**
 * DashboardCanvas.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardCanvas
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas
 *
 * 역할:
 * - 중앙 콘텐츠 영역. navKey별 View 전환은 View에서 SectionPlaceholder로 처리.
 *
 * 대시보드 구조: DashboardMain → DashboardCanvas (본문)
 *
 * 협업:
 * - 탭별 차트/KPI 추가 → DashboardCanvas.view.xml에 mvc:XMLView 연결
 * - 탭 전환 키 → dashboard/ui/navKey (ModuleSideNav.controller.js)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas", {});
});
