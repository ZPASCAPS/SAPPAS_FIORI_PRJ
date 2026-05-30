/**
 * DashboardMain.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardMain
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardMain
 *
 * 역할:
 * - 오른쪽 메인 영역 Nested View 컨테이너. UI 배치만 View에 있고 로직은 비어 있음.
 *
 * 대시보드 구조:
 * Main → DashboardMain → Header / Toolbar / Canvas / AiAssistant / MaterialCreate
 *
 * 협업:
 * - 하위 View 추가·순서 변경 → DashboardMain.view.xml
 * - 이 Controller는 수정 거의 불필요 (컨테이너 전용)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardMain", {});
});
