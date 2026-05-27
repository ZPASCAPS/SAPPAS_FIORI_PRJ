/**
 * AiAssistant.controller.js
 *
 * 역할:
 * - 오른쪽 하단 플로팅 챗봇 버튼과 대화 Dialog를 제어한다.
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
