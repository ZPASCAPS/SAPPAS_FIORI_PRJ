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
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.AiAssistant", {

        onInit: function () {
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

        /**
         * 챗봇 패널 표시/숨김 토글 (배경 화면은 계속 사용 가능)
         */
        onToggleChatbot: function () {
            var oPanel = this.byId("chatbotPanel");
            if (!oPanel) {
                return;
            }

            oPanel.setVisible(!oPanel.getVisible());

            if (oPanel.getVisible()) {
                setTimeout(this._bindChatbotDrag.bind(this), 0);
            }
        },

        onCloseChatbot: function () {
            var oPanel = this.byId("chatbotPanel");
            if (oPanel) {
                oPanel.setVisible(false);
            }
        },

        /**
         * visible=false 일 때 DOM이 없어 최초 바인딩이 실패할 수 있음 → 열릴 때 재시도
         */
        _bindChatbotDrag: function () {
            var oHeader = this.byId("chatbotPanelHeader");
            var oHeaderDom = oHeader && oHeader.getDomRef();

            if (!oHeaderDom) {
                return;
            }

            if (this._bDragBound) {
                return;
            }

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
            return oTarget && oTarget.closest && oTarget.closest(".nxChatbotPanelClose");
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

            if (!oDom || this._isCloseButtonTarget(oTarget)) {
                return;
            }

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

            if (oEvent.button !== undefined && oEvent.button !== 0) {
                return;
            }

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
            var iDeltaX;
            var iDeltaY;
            var iNewLeft;
            var iNewTop;
            var iMaxLeft;
            var iMaxTop;

            if (!this._oDragState || !oDom) {
                return;
            }

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

            if (!this._oDragState) {
                return;
            }

            this._oDragState = null;
            document.removeEventListener("mousemove", this._fnMouseMove);
            document.removeEventListener("mouseup", this._fnMouseUp);
            document.removeEventListener("touchmove", this._fnTouchMove);
            document.removeEventListener("touchend", this._fnTouchEnd);

            if (oDom) {
                oDom.classList.remove("nxChatbotPanelDragging");
            }
        }
    });
});
