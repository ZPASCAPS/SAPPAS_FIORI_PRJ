/**
 * 파일명: AiCommandHandler.js
 * 역할: 챗봇의 자연어를 분석하고 의도를 파악하여 SAP OData(aiModel)와 통신하는 비즈니스 로직 전담 모듈.
 * 추후 구매오더, 생산오더 등의 로직이 이곳에 계속 추가됩니다.
 */
sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * 사용자의 메시지를 분석하고 적절한 함수로 분기(Routing)합니다.
         */
        processCommand: function (sRawText, oModel, oCallbacks) {
            
            // 1. 판매오더 생성 로직
            if (sRawText.includes("주문") || sRawText.includes("판매")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://sales-order", "판매오더 생성 업무로 파악했습니다. 분석을 시작합니다...");
                this._handleSalesOrder(sRawText, oModel, oCallbacks);

            // 2. 재고 조회 로직
            } else if (sRawText.includes("재고") || sRawText.includes("몇 개") || sRawText.includes("수량")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://product", "재고 조회 업무로 파악했습니다. 분석을 시작합니다...");
                this._handleInventoryCheck(sRawText, oModel, oCallbacks);

            // 3. (예시) 구매오더 생성 등 추가될 로직 자리
           } else if (sRawText.includes("구매") || sRawText.includes("발주")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://purchasing", "구매오더 생성 업무로 파악했습니다. 분석을 시작합니다...");
                this._handlePurchaseOrder(sRawText, oModel, oCallbacks);

            // 4. 예외 처리
            } else {
                oCallbacks.onError("AI 비서", "sap-icon://sys-help-2", "죄송합니다, 용민님. 어떤 업무인지 정확히 파악하지 못했어요. 😅\n'주문해 줘' 또는 '재고 알려줘' 처럼 목적을 명확히 말씀해 주세요!");
            }
        },

        // ==========================================================
        // 세부 비즈니스 로직 함수들
        // ==========================================================
        
        _handleSalesOrder: function (sRawText, oModel, oCallbacks) {
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
                oCallbacks.onError("AI 비서", "sap-icon://sys-cancel", sErrorMsg);
                return;
            }

            var sCleanDate = sReqDate.replace(/\./g, "");
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

            oModel.create("/AiCommandSet", oPayload, {
                success: function (oData) {
                    oCallbacks.onSuccess("AI 비서", "sap-icon://accept", "🎉 임무 완료!\n\n" + oData.ReturnMessage);
                },
                error: function (oError) {
                    oCallbacks.onError("AI 비서", "sap-icon://error", "SAP 시스템 연동 중 오류가 발생했습니다.");
                }
            });
        },

        _handleInventoryCheck: function (sRawText, oModel, oCallbacks) {
            // 차후 OData 연동을 위해 분리해둠
            oCallbacks.onSuccess("AI 비서", "sap-icon://database", "🔍 (테스트) 삐빅! 재고를 조회하는 모드로 진입했습니다. 곧 CDS View와 연결될 예정입니다!");
        },

        _handlePurchaseOrder: function (sRawText, oModel, oCallbacks) {
            // 정규식 정의 (공급업체, 자재, 수량)
            var oVendorRegex   = /UP-V-[A-Z0-9-]+/i;
            var oMaterialRegex = /UP-[A-Z]-[A-Z0-9-]+/i; 
            var oQtyRegex      = /(\d+)\s*(개|박스|수량|발주|구매)/;

            var aVendorMatch   = sRawText.match(oVendorRegex);
            var aMaterialMatch = sRawText.match(oMaterialRegex);
            var aQtyMatch      = sRawText.match(oQtyRegex);

            var sVendor   = aVendorMatch ? aVendorMatch[0].toUpperCase() : null;
            var sMaterial = aMaterialMatch ? aMaterialMatch[0].toUpperCase() : null;
            var sQuantity = aQtyMatch ? aQtyMatch[1] : null;

            if (!sVendor || !sMaterial || !sQuantity) {
                var sErrorMsg = "구매오더를 생성하기엔 정보가 부족합니다. 다시 확인해 주세요!\n\n" +
                                "▪ 공급업체: " + (sVendor || "❌ 미인식") + "\n" +
                                "▪ 자재: " + (sMaterial || "❌ 미인식") + "\n" +
                                "▪ 수량: " + (sQuantity ? sQuantity + " 개" : "❌ 미인식");
                oCallbacks.onError("AI 비서", "sap-icon://sys-cancel", sErrorMsg);
                return;
            }

            // OData Payload 구성
            var oPayload = {
                "ActionType": "CREATE_PO",  
                "Vendor": sVendor,          
                "Material": sMaterial,      
                "Quantity": sQuantity,      
                "ReturnMessage": ""         
            };

            // OData 호출
            oModel.create("/AiCommandSet", oPayload, {
                success: function (oData) {
                    oCallbacks.onSuccess("AI 비서", "sap-icon://accept", "🎉 구매오더(PO) 생성 완료!\n\n" + (oData.ReturnMessage || "성공적으로 발주되었습니다."));
                },
                error: function (oError) {
                    oCallbacks.onError("AI 비서", "sap-icon://error", "SAP 시스템 연동 중 오류가 발생했습니다.");
                }
            });
        }
    };
});