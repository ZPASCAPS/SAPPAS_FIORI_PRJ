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
                        text:
                            "안녕하세요! AI 비서 파스텔입니다☺️ \n무엇을 도와드릴까요?\n\n" +
                            "<가능한 업무>\n" +
                            "- 판매오더 생성 [주문]\n" +
                            "- 판매오더 요약 [요약]\n" +
                            "- 판매오더 추적 [추적]\n" +
                            "- 구매오더 생성 [발주]\n" +
                            "- 구매요청 변환 [변환]\n" +
                            "- 구매오더 입고 [입고]\n" +
                            "- 가용재고 조회 [재고]\n\n" +
                            "지시를 하실 업무 키워드 [두글자]를 입력해주시면 명령 가이드를 드립니다.",
                        time: this._getCurrentTime(),
                        isUser: false
                    }
                ]
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "chatModel");

            this._oDragState = null;
            this._oFabDragState = null;
            this._bFabDragMoved = false;
            this._bDragBound = false;
            this._bFabDragBound = false;
            this._fnMouseMove = this._onDragMove.bind(this);
            this._fnMouseUp = this._onDragEnd.bind(this);
            this._fnDragStart = this._onDragStart.bind(this);
            this._fnTouchMove = this._onTouchMove.bind(this);
            this._fnTouchEnd = this._onDragEnd.bind(this);
            this._fnFabMouseMove = this._onFabDragMove.bind(this);
            this._fnFabMouseUp = this._onFabDragEnd.bind(this);
            this._fnFabDragStart = this._onFabDragStart.bind(this);
            this._fnFabTouchMove = this._onFabTouchMove.bind(this);
            this._fnFabTouchEnd = this._onFabDragEnd.bind(this);
            this._waitForDashboardModel();
        },

        _waitForDashboardModel: function () {
            var oModel = this.getOwnerComponent() && this.getOwnerComponent().getModel("dashboard");

            if (!oModel) {
                setTimeout(this._waitForDashboardModel.bind(this), 50);
                return;
            }

            this._fnNavReset = this._onDashboardNavChange.bind(this);
            oModel.attachPropertyChange(this._fnNavReset, this);
        },

        _onDashboardNavChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._resetFloatingButtonPosition();
            }
        },

        onAfterRendering: function () {
            this._bindChatbotDrag();
            this._bindFloatingBtnDrag();
        },

        onExit: function () {
            var oModel = this.getOwnerComponent() && this.getOwnerComponent().getModel("dashboard");

            if (oModel && this._fnNavReset) {
                oModel.detachPropertyChange(this._fnNavReset, this);
            }

            this._unbindChatbotDrag();
            this._unbindFloatingBtnDrag();
        },

        _getCurrentTime: function () {
            var oDateFormat = DateFormat.getDateTimeInstance({ pattern: "HH:mm" });
            return oDateFormat.format(new Date());
        },

        _addMessage: function (sSender, sIcon, sText, bIsUser) {
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

            setTimeout(function () {
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
            var oInventoryModel = this.getOwnerComponent().getModel("inventoryModel"); // 💡 재고조회기능추가
            var oTrackerModel = this.getOwnerComponent().getModel("trackerModel"); // 💡 추가!
            var that = this;

            // 3. 🚀 분리된 모듈(AiCommandHandler)로 분석 및 실행 위임
            AiCommandHandler.processCommand(sRawText, oModel, oInventoryModel, oTrackerModel, {
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


        /**
         * [API 호출] PR 번호를 PO로 변환하는 백엔드 로직 실행
         * @param {string} sPrNumber - 사용자가 입력한 PR 번호 (예: "0010000395")
         */
        _convertPrToPo: function (sPrNumber) {
            // 1. OData 모델 가져오기 (manifest.json에 등록된 기본 모델)
            // 만약 OData 모델 이름이 지정되어 있다면 getModel("모델명")으로 변경하세요.
            var oModel = this.getOwnerComponent().getModel(); 

            // 2. 백엔드로 보낼 파라미터 세팅 (SEGW에서 만든 PR_LIST)
            var oPayload = {
                PR_LIST: sPrNumber
            };

            // 3. 로딩 상태 메세지 띄우기
            this._addMessage("AI 비서", "sap-icon://activate-blueprints", "요청하신 PR(" + sPrNumber + ")을 변환하고 있습니다. 잠시만 기다려주세요⏳...", false);

            // 4. Function Import 호출
            oModel.callFunction("/ConvertPrToPo", {
                method: "POST", 
                urlParameters: oPayload,
                success: function (oData, response) {
                    // 통신 성공 (200 OK)
                    var sMessage = oData.MSG || (oData.ConvertPrToPo && oData.ConvertPrToPo.MSG);
                    
                    // 챗봇 말풍선에 성공 메시지 띄우기
                    this._addMessage("AI 비서", "sap-icon://activate-blueprints", "✨ " + sMessage, false);
                }.bind(this),
                error: function (oError) {
                    // 통신 실패 (500 에러 등)
                    var sErrMsg = "백엔드 통신 중 에러가 발생했습니다.";
                    try {
                        var oErrorObj = JSON.parse(oError.responseText);
                        sErrMsg = oErrorObj.error.message.value;
                    } catch (e) { }

                    // 챗봇 말풍선에 실패 메시지 띄우기
                    this._addMessage("AI 비서", "sap-icon://error", "🚨 " + sErrMsg, false);
                }.bind(this)
            });
        },

        // ==========================================================
        // 이하 UI 드래그 앤 드롭 로직 유지 (건드리지 않음)
        // ==========================================================
        onToggleChatbot: function () {
            if (this._bFabDragMoved) {
                return;
            }

            var oPanel = this.byId("chatbotPanel");
            if (!oPanel) {
                return;
            }

            oPanel.setVisible(!oPanel.getVisible());
            if (oPanel.getVisible()) {
                this._positionPanelNearFab();
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

            if (oDom) {
                oDom.classList.remove("nxChatbotPanelDragging");
            }
        },

        _getFabDom: function () {
            var oBtn = this.byId("chatbotFloatingBtn");
            return oBtn && oBtn.getDomRef();
        },

        _resetFloatingButtonPosition: function () {
            var oFabDom = this._getFabDom();
            var oPanelDom = this._getPanelDom();

            if (oFabDom) {
                oFabDom.classList.remove("myFloatingButtonMoved", "myFloatingButtonDragging");
                oFabDom.style.removeProperty("left");
                oFabDom.style.removeProperty("top");
                oFabDom.style.removeProperty("right");
                oFabDom.style.removeProperty("bottom");
            }

            if (oPanelDom) {
                oPanelDom.classList.remove("nxChatbotPanelMoved", "nxChatbotPanelDragging");
                oPanelDom.style.removeProperty("left");
                oPanelDom.style.removeProperty("top");
                oPanelDom.style.removeProperty("right");
                oPanelDom.style.removeProperty("bottom");
            }
        },

        _applyFabPosition: function (iLeft, iTop) {
            var oDom = this._getFabDom();
            var iSize = 72;
            var iMaxLeft;
            var iMaxTop;

            if (!oDom) {
                return;
            }

            iMaxLeft = window.innerWidth - iSize - 8;
            iMaxTop = window.innerHeight - iSize - 8;
            iLeft = Math.max(8, Math.min(iLeft, iMaxLeft));
            iTop = Math.max(8, Math.min(iTop, iMaxTop));

            oDom.classList.add("myFloatingButtonMoved");
            oDom.style.setProperty("left", iLeft + "px", "important");
            oDom.style.setProperty("top", iTop + "px", "important");
            oDom.style.setProperty("right", "auto", "important");
            oDom.style.setProperty("bottom", "auto", "important");
        },

        _positionPanelNearFab: function () {
            var oFabDom = this._getFabDom();
            var oPanelDom = this._getPanelDom();
            var oFabRect;
            var iPanelLeft;
            var iPanelTop;
            var iMaxLeft;
            var iMaxTop;

            if (!oFabDom || !oPanelDom) {
                return;
            }

            oFabRect = oFabDom.getBoundingClientRect();
            iPanelLeft = oFabRect.left + oFabRect.width - oPanelDom.offsetWidth;
            iPanelTop = oFabRect.top - oPanelDom.offsetHeight - 12;
            iMaxLeft = window.innerWidth - oPanelDom.offsetWidth - 8;
            iMaxTop = window.innerHeight - oPanelDom.offsetHeight - 8;

            if (iPanelTop < 8) {
                iPanelTop = oFabRect.bottom + 12;
            }

            iPanelLeft = Math.max(8, Math.min(iPanelLeft, iMaxLeft));
            iPanelTop = Math.max(8, Math.min(iPanelTop, iMaxTop));

            this._applyPanelPosition(oPanelDom, iPanelLeft, iPanelTop);
        },

        _bindFloatingBtnDrag: function () {
            var oDom = this._getFabDom();

            if (!oDom || this._bFabDragBound) {
                return;
            }

            oDom.addEventListener("mousedown", this._fnFabDragStart);
            oDom.addEventListener("touchstart", this._fnFabDragStart, { passive: false });
            this._bFabDragBound = true;
        },

        _unbindFloatingBtnDrag: function () {
            var oDom = this._getFabDom();

            if (oDom) {
                oDom.removeEventListener("mousedown", this._fnFabDragStart);
                oDom.removeEventListener("touchstart", this._fnFabDragStart);
            }

            document.removeEventListener("mousemove", this._fnFabMouseMove);
            document.removeEventListener("mouseup", this._fnFabMouseUp);
            document.removeEventListener("touchmove", this._fnFabTouchMove);
            document.removeEventListener("touchend", this._fnFabTouchEnd);

            this._bFabDragBound = false;
            this._oFabDragState = null;
        },

        _onFabDragStart: function (oEvent) {
            var iX = oEvent.clientX;
            var iY = oEvent.clientY;
            var oDom = this._getFabDom();
            var oRect;

            if (oEvent.touches && oEvent.touches.length) {
                iX = oEvent.touches[0].clientX;
                iY = oEvent.touches[0].clientY;
            }

            if (oEvent.button !== undefined && oEvent.button !== 0) {
                return;
            }

            if (!oDom) {
                return;
            }

            oRect = oDom.getBoundingClientRect();
            this._bFabDragMoved = false;
            this._oFabDragState = {
                startX: iX,
                startY: iY,
                startLeft: oRect.left,
                startTop: oRect.top,
                moved: false
            };

            document.addEventListener("mousemove", this._fnFabMouseMove);
            document.addEventListener("mouseup", this._fnFabMouseUp);
            document.addEventListener("touchmove", this._fnFabTouchMove, { passive: false });
            document.addEventListener("touchend", this._fnFabTouchEnd);
        },

        _onFabTouchMove: function (oEvent) {
            var oTouch = oEvent.touches && oEvent.touches[0];

            if (oTouch) {
                this._moveFabDrag(oTouch.clientX, oTouch.clientY, oEvent);
                oEvent.preventDefault();
            }
        },

        _onFabDragMove: function (oEvent) {
            this._moveFabDrag(oEvent.clientX, oEvent.clientY, oEvent);
        },

        _moveFabDrag: function (iClientX, iClientY, oEvent) {
            var iDeltaX;
            var iDeltaY;
            var oDom = this._getFabDom();

            if (!this._oFabDragState || !oDom) {
                return;
            }

            iDeltaX = iClientX - this._oFabDragState.startX;
            iDeltaY = iClientY - this._oFabDragState.startY;

            if (!this._oFabDragState.moved && Math.abs(iDeltaX) + Math.abs(iDeltaY) < 4) {
                return;
            }

            this._oFabDragState.moved = true;
            this._bFabDragMoved = true;
            oDom.classList.add("myFloatingButtonDragging");
            this._applyFabPosition(
                this._oFabDragState.startLeft + iDeltaX,
                this._oFabDragState.startTop + iDeltaY
            );

            if (oEvent && oEvent.preventDefault) {
                oEvent.preventDefault();
            }
        },

        _onFabDragEnd: function () {
            var oDom = this._getFabDom();

            document.removeEventListener("mousemove", this._fnFabMouseMove);
            document.removeEventListener("mouseup", this._fnFabMouseUp);
            document.removeEventListener("touchmove", this._fnFabTouchMove);
            document.removeEventListener("touchend", this._fnFabTouchEnd);

            if (oDom) {
                oDom.classList.remove("myFloatingButtonDragging");
            }

            if (this._oFabDragState && this._oFabDragState.moved) {
                setTimeout(function () {
                    this._bFabDragMoved = false;
                }.bind(this), 50);
            }

            this._oFabDragState = null;
        }
    });
});