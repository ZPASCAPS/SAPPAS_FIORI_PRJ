/**
 * AiAssistant.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.AiAssistant
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.AiAssistant
 * [개발일지]
 * 5/30 김용민
 * 역할:
 * - 오른쪽 하단 플로팅 버튼 위 비모달 채팅 패널 열기/닫기(토글).
 * - 패널 헤더 드래그로 위치 이동.
 *
 * 대시보드 구조: DashboardMain → AiAssistant (오버레이)
 *
 * 협업:
 * - 챗봇 UI → AiAssistant.view.xml / 대화 API·드래그 → 이 Controller
 */
/**
 * 파일명: AiAssistant.controller.js
 * 역할: 챗봇 패널의 드래그 기능과 사용자의 자연어 분석(Regex), OData 연동(AiCommand) 및 UI 렌더링 로직을 통합 관리합니다.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    "com/capstone/dashboard/fioridashboard/util/AiCommandHandler" // 💡 분리된 로직 모듈 임포트
], function (Controller, JSONModel, DateFormat, AiCommandHandler) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.AiAssistant", {
        
        onInit: function () {
            var oData = {
                chat: [
                    {
                        sender: "AI 비서",
                        icon: "sap-icon://activate-blueprints",
                        text: "안녕하세요! AI 비서 파스텔입니다. 무엇을 도와드릴까요?\n\n[가능한 업무]\n1. 판매오더 생성\n2. 구매오더 생성\n3. 전표 요약",
                        time: this._getCurrentTime(),
                        isUser: false 
                    }
                ]
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "chatModel");

            this._oDragState = null;
            this._bDragBound = false;
            this._fnMouseMove = this._onDragMove.bind(this);
            this._fnMouseUp = this._onDragEnd.bind(this);
            this._fnDragStart = this._onDragStart.bind(this);
            this._fnTouchMove = this._onTouchMove.bind(this);
            this._fnTouchEnd = this._onDragEnd.bind(this);
        },

        onAfterRendering: function () {
            this._bindChatbotDrag();
        },

        onExit: function () {
            this._unbindChatbotDrag();
        },

        _getCurrentTime: function() {
            var oDateFormat = DateFormat.getDateTimeInstance({pattern: "HH:mm"});
            return oDateFormat.format(new Date());
        },

        _addMessage: function(sSender, sIcon, sText, bIsUser) {
            var oModel = this.getView().getModel("chatModel");
            var aChat = oModel.getProperty("/chat");
            
            aChat.push({
                sender: sSender,
                icon: sIcon,
                text: sText,
                time: this._getCurrentTime(),
                isUser: bIsUser
            });
            oModel.setProperty("/chat", aChat);

            setTimeout(function() {
                var oScroll = this.getView().byId("chatScrollContainer");
                if (oScroll) {
                    oScroll.scrollTo(0, 99999, 200); 
                }
            }.bind(this), 50);
        },

        /**
         * 사용자가 메세지 전송 시 실행
         * 화면에 메세지를 띄우고, 로직 분석은 AiCommandHandler에게 통째로 넘깁니다.
         */
        onSendVoiceCommand: function () {
            var oInput = this.getView().byId("chatInput");
            var sRawText = oInput.getValue();

            if (!sRawText || sRawText.trim() === "") return;

            // 1. 내가 보낸 메세지 화면에 그리기
            this._addMessage("용민(사용자)", "sap-icon://employee", sRawText, true);
            oInput.setValue("");

            // 2. 챗봇 OData 모델 가져오기
            var oModel = this.getOwnerComponent().getModel("aiModel");
            var that = this; 

            // 3. 🚀 분리된 모듈(AiCommandHandler)로 분석 및 실행 위임
            AiCommandHandler.processCommand(sRawText, oModel, {
                onProcess: function (sSender, sIcon, sText) {
                    that._addMessage(sSender, sIcon, sText, false);
                },
                onSuccess: function (sSender, sIcon, sText) {
                    that._addMessage(sSender, sIcon, sText, false);
                },
                onError: function (sSender, sIcon, sText) {
                    that._addMessage(sSender, sIcon, sText, false);
                }
            });
        },

        // ==========================================================
        // 이하 UI 드래그 앤 드롭 로직 유지 (건드리지 않음)
        // ==========================================================
        onToggleChatbot: function () {
            var oPanel = this.byId("chatbotPanel");
            if (!oPanel) return;
            oPanel.setVisible(!oPanel.getVisible());
            if (oPanel.getVisible()) {
                setTimeout(this._bindChatbotDrag.bind(this), 0);
            }
        },

        onCloseChatbot: function () {
            var oPanel = this.byId("chatbotPanel");
            if (oPanel) oPanel.setVisible(false);
        },

        _bindChatbotDrag: function () {
            var oHeader = this.byId("chatbotPanelHeader");
            var oHeaderDom = oHeader && oHeader.getDomRef();
            if (!oHeaderDom) return;
            if (this._bDragBound) return;

            oHeaderDom.addEventListener("mousedown", this._fnDragStart);
            oHeaderDom.addEventListener("touchstart", this._fnDragStart, { passive: false });
            this._bDragBound = true;
        },

        _unbindChatbotDrag: function () {
            var oHeader = this.byId("chatbotPanelHeader");
            var oHeaderDom = oHeader && oHeader.getDomRef();
            if (oHeaderDom) {
                oHeaderDom.removeEventListener("mousedown", this._fnDragStart);
                oHeaderDom.removeEventListener("touchstart", this._fnDragStart);
            }
            document.removeEventListener("mousemove", this._fnMouseMove);
            document.removeEventListener("mouseup", this._fnMouseUp);
            document.removeEventListener("touchmove", this._fnTouchMove);
            document.removeEventListener("touchend", this._fnTouchEnd);

            this._bDragBound = false;
            this._oDragState = null;
        },

        _getPanelDom: function () {
            var oPanel = this.byId("chatbotPanel");
            return oPanel && oPanel.getDomRef();
        },

        _isCloseButtonTarget: function (oTarget) {
            return oTarget && oTarget.closest && oTarget.closest(".sapUiSmallMarginEnd"); 
        },

        _applyPanelPosition: function (oDom, iLeft, iTop) {
            oDom.classList.add("nxChatbotPanelMoved");
            oDom.style.setProperty("left", iLeft + "px", "important");
            oDom.style.setProperty("top", iTop + "px", "important");
            oDom.style.setProperty("right", "auto", "important");
            oDom.style.setProperty("bottom", "auto", "important");
        },

        _startDrag: function (iClientX, iClientY, oTarget) {
            var oDom = this._getPanelDom();
            var oRect;
            if (!oDom || this._isCloseButtonTarget(oTarget)) return;

            oRect = oDom.getBoundingClientRect();
            this._applyPanelPosition(oDom, oRect.left, oRect.top);

            this._oDragState = {
                startX: iClientX,
                startY: iClientY,
                startLeft: oRect.left,
                startTop: oRect.top
            };

            oDom.classList.add("nxChatbotPanelDragging");
            document.addEventListener("mousemove", this._fnMouseMove);
            document.addEventListener("mouseup", this._fnMouseUp);
            document.addEventListener("touchmove", this._fnTouchMove, { passive: false });
            document.addEventListener("touchend", this._fnTouchEnd);
        },

        _onDragStart: function (oEvent) {
            var iX = oEvent.clientX;
            var iY = oEvent.clientY;
            if (oEvent.touches && oEvent.touches.length) {
                iX = oEvent.touches[0].clientX;
                iY = oEvent.touches[0].clientY;
            }
            if (oEvent.button !== undefined && oEvent.button !== 0) return;
            oEvent.preventDefault();
            this._startDrag(iX, iY, oEvent.target);
        },

        _onTouchMove: function (oEvent) {
            var oTouch = oEvent.touches && oEvent.touches[0];
            if (oTouch) {
                this._moveDrag(oTouch.clientX, oTouch.clientY);
                oEvent.preventDefault();
            }
        },

        _onDragMove: function (oEvent) {
            this._moveDrag(oEvent.clientX, oEvent.clientY);
        },

        _moveDrag: function (iClientX, iClientY) {
            var oDom = this._getPanelDom();
            var iDeltaX, iDeltaY, iNewLeft, iNewTop, iMaxLeft, iMaxTop;
            if (!this._oDragState || !oDom) return;

            iDeltaX = iClientX - this._oDragState.startX;
            iDeltaY = iClientY - this._oDragState.startY;
            iNewLeft = this._oDragState.startLeft + iDeltaX;
            iNewTop = this._oDragState.startTop + iDeltaY;
            
            iMaxLeft = window.innerWidth - oDom.offsetWidth - 8;
            iMaxTop = window.innerHeight - oDom.offsetHeight - 8;

            iNewLeft = Math.max(8, Math.min(iNewLeft, iMaxLeft));
            iNewTop = Math.max(8, Math.min(iNewTop, iMaxTop));

            this._applyPanelPosition(oDom, iNewLeft, iNewTop);
        },

        _onDragEnd: function () {
            var oDom = this._getPanelDom();
            if (!this._oDragState) return;

            this._oDragState = null;
            document.removeEventListener("mousemove", this._fnMouseMove);
            document.removeEventListener("mouseup", this._fnMouseUp);
            document.removeEventListener("touchmove", this._fnTouchMove);
            document.removeEventListener("touchend", this._fnTouchEnd);

            if (oDom) oDom.classList.remove("nxChatbotPanelDragging");
        }
    });
});