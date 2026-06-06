/**
 * E2EProcessFlow.controller.js — E2E 프로세스 대시보드 프레임
 *
 * 역할:
 * - 프로세스 카드 뼈대(제목·범례 + 빈 캔버스)를 담는 컨테이너.
 * - Step 그리드는 View에서 제거됨. 추후 e2e/StepXX 를 다시 연결할 때 이 Controller 확장.
 *
 * 협업:
 * - 레이아웃 → E2EProcessFlow.view.xml + style.css
 * - Step UI/클릭 → controller/features/e2e/StepXX*.controller.js
 * - 공통 데이터 → Main.controller.js (dashboard/e2eProcessFlow)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.E2EProcessFlow", {});
});
