/**
 * OrderInquiry.controller.js  (A공간 — 오더 조회)
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.OrderInquiry
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.OrderInquiry
 *
 * 역할:
 * - 메인 대시보드 왼쪽(A) 오더 조회 영역의 UI 이벤트를 담당한다.
 * - 공통 dashboard 모델은 Main.controller.js가 Component에 등록한다.
 *
 * 대시보드 구조:
 * Main → DashboardMain → DashboardCanvas → OrderInquiry
 *
 * 협업:
 * - 조회·검색·오더 상세 UI → 이 Controller
 * - 모델 초기값 → Main.controller.js (dashboard/spaces/orderInquiry)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.OrderInquiry", {

        onInit: function () {
            // dashboard 모델은 Main.controller.js _initModels()에서 Component에 등록됨
        }
    });
});
