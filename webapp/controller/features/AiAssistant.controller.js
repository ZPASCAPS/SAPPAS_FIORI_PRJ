/**
 * AiAssistant.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.AiAssistant
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.AiAssistant
 *
 * 역할:
 * - 오른쪽 하단 플로팅 AI 챗봇 버튼·Dialog 열기/닫기.
 *
 * 대시보드 구조: DashboardMain → AiAssistant (오버레이)
 *
 * 협업:
 * - 챗봇 UI → AiAssistant.view.xml / 대화 API 연동 → 이 Controller
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.AiAssistant", {

        onOpenChatbot: function () {
            this.byId("chatbotDialog").open();
        },

        onCloseChatbot: function () {
            this.byId("chatbotDialog").close();
        }
    });
});
