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
    "sap/ui/core/format/DateFormat"
], function (Controller, JSONModel, DateFormat) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.AiAssistant", {
        
        onInit: function () {
            // --- 1. 사용자 제공 원본 챗봇 데이터 모델 ---
            var oData = {
                chat: [
                    {
                        sender: "AI 비서",
                        icon: "sap-icon://activate-blueprints",
                        text: "안녕하세요! 용민님의 SCM 지능형 비서입니다. 무엇을 도와드릴까요?\n\n[가능한 업무]\n1. 판매오더 생성 (예: 미아점에 히트택 10개 주문해 줘)\n2. 재고 조회 (예: 히트택 재고 몇 개야?)",
                        time: this._getCurrentTime(),
                        isUser: false 
                    }
                ]
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "chatModel");

            // --- 2. 챗봇 패널 드래그 관련 변수 설정 ---
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

        // ==========================================================
        // 챗봇 비즈니스 로직 (사용자 원본 코드 100% 유지)
        // ==========================================================

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

            // 스크롤 맨 아래로 자동 이동 로직
            setTimeout(function() {
                var oScroll = this.getView().byId("chatScrollContainer");
                if (oScroll) {
                    oScroll.scrollTo(0, 99999, 200); 
                }
            }.bind(this), 50);
        },

        onSendVoiceCommand: function () {
            var oInput = this.getView().byId("chatInput");
            var sRawText = oInput.getValue();

            if (!sRawText || sRawText.trim() === "") return;

            // 내가 보낸 메세지 등록
            this._addMessage("용민(사용자)", "sap-icon://employee", sRawText, true);
            oInput.setValue("");

            // 라우터 로직
            if (sRawText.includes("주문") || sRawText.includes("발주") || sRawText.includes("판매")) {
                this._addMessage("AI 비서", "sap-icon://sales-order", "판매오더 생성 업무로 파악했습니다. 분석을 시작합니다...", false);
                this._handleSalesOrder(sRawText); 

            } else if (sRawText.includes("재고") || sRawText.includes("몇 개") || sRawText.includes("수량")) {
                this._addMessage("AI 비서", "sap-icon://product", "재고 조회 업무로 파악했습니다. 분석을 시작합니다...", false);
                this._handleInventoryCheck(sRawText); 

            } else {
                this._addMessage("AI 비서", "sap-icon://sys-help-2", "죄송합니다, 용민님. 어떤 업무인지 정확히 파악하지 못했어요. 😅\n'주문해 줘' 또는 '재고 알려줘' 처럼 목적을 명확히 말씀해 주세요!", false);
            }
        },

        _handleSalesOrder: function(sRawText) {
            var oDateRegex     = /\d{4}\.\d{2}\.\d{2}/;
            var oCustomerRegex = /UP-C-[A-Z0-9-]+/;
            var oMaterialRegex = /UP-F-[A-Z0-9-]+/;
            var oQtyRegex      = /(\d+)\s*(개|박스|주문|수량|오더)/;

            var aDateMatch     = sRawText.match(oDateRegex);
            var aCustomerMatch = sRawText.match(oCustomerRegex);
            var aMaterialMatch = sRawText.match(oMaterialRegex);
            var aQtyMatch      = sRawText.match(oQtyRegex);

            var sReqDate  = aDateMatch ? aDateMatch[0] : null;
            var sCustomer = aCustomerMatch ? aCustomerMatch[0] : null;
            var sMaterial = aMaterialMatch ? aMaterialMatch[0] : null;
            var sQuantity = aQtyMatch ? aQtyMatch[1] : null;

            if (!sReqDate || !sCustomer || !sMaterial || !sQuantity) {
                var sErrorMsg = "판매오더를 생성하기엔 정보가 부족합니다. 다시 확인해 주세요!\n\n" +
                                "▪ 날짜: " + (sReqDate || "❌ 미인식") + "\n" +
                                "▪ 고객: " + (sCustomer || "❌ 미인식") + "\n" +
                                "▪ 자재: " + (sMaterial || "❌ 미인식") + "\n" +
                                "▪ 수량: " + (sQuantity ? sQuantity + " 개" : "❌ 미인식");
                this._addMessage("AI 비서", "sap-icon://sys-cancel", sErrorMsg, false);
                return;
            }

            var sCleanDate = sReqDate.replace(/\./g, "");
            
            // 사용자 원본 Payload 및 OData 로직 100% 복구
            var oPayload = {
                "ActionType": "CREATE_SO",      
                "ReqDate": sCleanDate,          
                "Customer": sCustomer,          
                "Material": sMaterial,          
                "Quantity": sQuantity,          
                "DocType": "TA",                
                "SalesOrg": "1010",             
                "DistChan": "10",               
                "Division": "00",               
                "ReturnMessage": ""             
            };

            var oModel = this.getOwnerComponent().getModel("aiModel");
            var that = this; 

            oModel.create("/AiCommandSet", oPayload, {
                success: function (oData) {
                    that._addMessage("AI 비서", "sap-icon://accept", "🎉 임무 완료!\n\n" + oData.ReturnMessage, false);
                },
                error: function (oError) {
                    that._addMessage("AI 비서", "sap-icon://error", "SAP 시스템 연동 중 오류가 발생했습니다.", false);
                }
            });
        },

        _handleInventoryCheck: function(sRawText) {
            this._addMessage("AI 비서", "sap-icon://database", "🔍 (테스트) 삐빅! 재고를 조회하는 모드로 진입했습니다. 곧 CDS View와 연결될 예정입니다!", false);
        },

        // ==========================================================
        // UI 이벤트 및 드래그 앤 드롭 관련 로직
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