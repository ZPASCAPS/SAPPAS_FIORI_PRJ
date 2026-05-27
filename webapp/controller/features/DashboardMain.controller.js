/**
 * DashboardMain.controller.js
 *
 * 역할:
 * - 메인 영역(헤더 + 대시보드 콘텐츠 + 오버레이) Nested View 컨테이너를 담당한다.
 * - UI 배치는 DashboardMain.view.xml에 있으며, 데이터·이벤트는 하위 기능 Controller가 처리한다.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardMain", {});
});
