/**
 * SectionPlaceholder.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.SectionPlaceholder
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.SectionPlaceholder
 *
 * 역할:
 * - 탭별 빈 대시보드 안내 카드. dashboard 모델 navLabel/navDescription/navIcon 바인딩.
 *
 * 대시보드 구조: DashboardCanvas → SectionPlaceholder
 *
 * 협업:
 * - 안내 문구 변경 → ModuleSideNav.controller.js
 * - 안내 UI 변경 → SectionPlaceholder.view.xml
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.SectionPlaceholder", {});
});
