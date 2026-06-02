/**
 * 파일명: AiCommandHandler.js
 * 역할: 챗봇의 자연어를 분석하고 의도를 파악하여 SAP OData(aiModel)와 통신하는 비즈니스 로직 전담 모듈.
 * 추후 구매오더, 생산오더 등의 로직이 이곳에 계속 추가됩니다.
 */
sap.ui.define([], function () {
    "use strict";

    return {
        // ==========================================================
        // 📚 자연어 -> SAP 코드 매핑 사전 (Dictionary)
        // 여기에 공장 3개, 완제품 4개, 원자재 12개를 모두 등록해 주시면 됩니다!
        // ==========================================================
        _mappingDict: {
            // [공급업체 / 공장]
            "도레이": "UP-V-E-TOR",
            "토레이": "UP-V-E-TOR",
            "도레이 공장": "UP-V-E-TOR",
            "도레이공장": "UP-V-E-TOR",
            
            // [고객 / 매장]
            "미아점": "UP-C-I-MIA",
            "미아": "UP-C-I-MIA",
            "신세계점": "UP-C-I-SSG",
            "신세계": "UP-C-I-SSG",
            "강남점": "UP-C-I-GAN",
            "강남": "UP-C-I-GAN",
            "롯데백화점": "UP-C-I-LOT",
            "롯데점": "UP-C-I-LOT",
            "롯데": "UP-C-I-LOT",


            // [원자재]
            "폴리에스터": "UP-R-PES-001",
            "폴리애스터": "UP-R-PES-001",
            "코튼": "UP-R-COT-002",
            "면": "UP-R-COT-002",
            "레이온": "UP-R-RAY-001",
            "래이온": "UP-R-RAY-001",
            "나일론": "UP-R-NYL-001",
            "아크릴": "UP-R-ACR-001",
            "폴리우레탄": "UP-R-PUR-001",
            "폴리우래탄": "UP-R-PUR-001",

            "바지지퍼": "UP-R-PZP-001",
            "바지 지퍼": "UP-R-PZP-001",
            "가방지퍼": "UP-R-BZP-001",
            "가방 지퍼": "UP-R-BZP-001",
            "바지단추": "UP-R-PBT-001",
            "바지 단추": "UP-R-PBT-001",
            "셔츠단추": "UP-R-SBT-001",
            "셔츠 단추": "UP-R-SBT-001",

            
            // [완제품]
            "히트택": "UP-F-HIT-001",
            "히트텍": "UP-F-HIT-001",
            "바지": "UP-F-PNT-001",
            "와이드핏치노팬츠": "UP-F-PNT-001",
            "팬츠": "UP-F-PNT-001",
            "치노팬츠": "UP-F-PNT-001",
            "셔츠": "UP-F-SHT-001",
            "가방": "UP-F-BAG-001"
            
            // ... 이곳에 계속해서 추가해 주세요 ...
        },

        /**
         * [NEW] 사용자의 한글 문장에서 사전의 단어를 찾아 SAP 코드로 몰래 바꿔주는 전처리 함수
         */
        _preprocessText: function (sText) {
            var sResult = sText;
            
            // 글자 수가 긴 단어부터 치환하도록 정렬 (예: "도레이 공장"이 "도레이"보다 먼저 치환되게 방지)
            var aDictKeys = Object.keys(this._mappingDict).sort(function(a, b) { 
                return b.length - a.length; 
            });

            // 문장에서 한글 명칭을 찾아 SAP 코드로 변경
            for (var i = 0; i < aDictKeys.length; i++) {
                var sKey = aDictKeys[i];
                var sCode = this._mappingDict[sKey];
                // 자바스크립트의 split-join 기법을 통해 일괄 치환(Replace All)
                sResult = sResult.split(sKey).join(sCode);
            }

            return sResult;
        },

        /**
         * 사용자의 메시지를 분석하고 적절한 함수로 분기(Routing)합니다.
         */
        processCommand: function (sRawText, oModel, oCallbacks) {
            
            // 💡 1. 가장 먼저! 한글 문장을 SAP 코드가 섞인 문장으로 전처리(번역)합니다.
            var sProcessedText = this._preprocessText(sRawText);
            
            // 2. 구매오더 생성 로직
            if (sProcessedText.includes("구매") || sProcessedText.includes("발주")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://purchasing", "구매오더 생성 업무로 파악했습니다. 분석을 시작합니다.");
                // 💡 원본(sRawText) 대신 번역된 문장(sProcessedText)을 넘겨줍니다.
                this._handlePurchaseOrder(sProcessedText, oModel, oCallbacks);

            // 3. 판매오더 생성 로직
            } else if (sProcessedText.includes("주문") || sProcessedText.includes("판매")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://sales-order", "판매오더 생성 업무로 파악했습니다. 분석을 시작합니다.");
                this._handleSalesOrder(sProcessedText, oModel, oCallbacks);

            // 4. 재고 조회 로직
            } else if (sProcessedText.includes("재고") || sProcessedText.includes("몇 개") || sProcessedText.includes("수량")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://product", "재고 조회 업무로 파악했습니다. 분석을 시작합니다.");
                this._handleInventoryCheck(sProcessedText, oModel, oCallbacks);

            // 3. 판매오더 요약/조회 로직 (CDS View 연동)
            } else if (sProcessedText.includes("요약") || sProcessedText.includes("조회") || sProcessedText.includes("알려줘")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://sys-find", "전표 조회 업무로 파악했습니다. 요약 데이터를 검색합니다.");
                this._handleOrderSummary(sProcessedText, oModel, oCallbacks);

            // 5. 예외 처리
            } else {
                oCallbacks.onError("AI 비서", "sap-icon://sys-help-2", "죄송합니다, 용민님. 어떤 업무인지 정확히 파악하지 못했어요. 😅\n'주문해 줘', '발주해 줘' 또는 '재고 알려줘' 처럼 목적을 명확히 말씀해 주세요!");
            }

           
        },

        // ==========================================================
        // 세부 비즈니스 로직 함수들
        // ==========================================================
        
        _handleSalesOrder: function (sRawText, oModel, oCallbacks) {
            var oDateRegex     = /\d{4}\.\d{2}\.\d{2}/;
            var oCustomerRegex = /UP-C-[A-Z0-9-]+/i;
            var oMaterialRegex = /UP-F-[A-Z0-9-]+/i;
            var oQtyRegex      = /(\d+)\s*(개|박스|주문|수량|오더)/i;

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
            // 정규식 정의
            var oVendorRegex   = /UP-V-[A-Z0-9-]+/i;
            var oMaterialRegex = /UP-R-[A-Z0-9-]+/i; 
            var oQtyRegex      = /(\d+)\s*(개|박스|수량|EA|ea)/i; // 단위 엄격 제한

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

            // 💡 통일된 Payload: ReturnMessage 필드 추가 (백엔드에서 채워서 돌려줌)
            var oPayload = {
                "Vendor": sVendor,          
                "Material": sMaterial,      
                "Quantity": sQuantity,
                "ReturnMessage": "" 
            };

            // 💡 판매오더와 동일하게 ReturnMessage를 그대로 띄우도록 통일!
            oModel.create("/PurchaseOrderSet", oPayload, {
                success: function (oData) {
                    oCallbacks.onSuccess("AI 비서", "sap-icon://accept", "🎉 임무 완료!\n\n" + oData.ReturnMessage);
                },
                error: function (oError) {
                    oCallbacks.onError("AI 비서", "sap-icon://error", "SAP 시스템 연동 중 오류가 발생했습니다.");
                }
            });
        },

        /**
         * 전표 요약/조회 로직 (CDS View 연동)
         */
        _handleOrderSummary: function (sProcessedText, oModel, oCallbacks) {
            // 1. 정규식: 문장에서 연속된 숫자(전표번호)만 쏙 뽑아냅니다.
            var oOrderNumRegex = /(\d+)/; 
            var aMatch = sProcessedText.match(oOrderNumRegex);
            var sOrderNum = aMatch ? aMatch[1] : null;

            if (!sOrderNum) {
                oCallbacks.onError("AI 비서", "sap-icon://sys-cancel", "조회할 전표 번호를 찾지 못했어요. '322번 전표 요약해줘' 처럼 번호를 정확히 말씀해 주세요!");
                return;
            }

            // 2. SAP의 전표번호는 항상 10자리입니다. 
            var sPaddedNum = sOrderNum.padStart(10, '0');

            // 3. CDS View로 OData READ(GET) 요청을 보냅니다.
            var sPath = "/Z_C_OrderSummary('" + sPaddedNum + "')";

            oModel.read(sPath, {
                success: function (oData) {
                    
                    // 💡 날짜 포맷팅: SAP에서 넘어온 날짜를 2026.05.31 형태로 변환
                    var sDate = "알 수 없음";
                    if (oData.CreationDate) {
                        var oDate = new Date(oData.CreationDate);
                        var sYear = oDate.getFullYear();
                        var sMonth = String(oDate.getMonth() + 1).padStart(2, '0');
                        var sDay = String(oDate.getDate()).padStart(2, '0');
                        sDate = sYear + "." + sMonth + "." + sDay;
                    }

                    // 💡 챗봇 응답 메시지 조립 (요청하신 예시 포맷 적용)
                    var sSummary = "요청하신 " + sOrderNum + "번 판매오더의 요약입니다.\n" +
                                   "해당 전표는 " + sDate + "에 만들어졌고, 고객번호는 " + oData.Customer + "이며, " +
                                   "총 금액은 " + oData.TotalAmount + " " + oData.Currency + "입니다.\n\n" +
                                   "[ 상세 정보 ]\n" +
                                   "▪ 고객번호 : " + oData.Customer + "\n" +
                                   "▪ 총 금액 : " + oData.TotalAmount + " " + oData.Currency + "\n" +
                                   "▪ 판매문서 유형 : " + oData.DocType + "\n" +
                                   "▪ 판매조직 : " + oData.SalesOrg + "\n" +
                                   "▪ 유통경로 : " + oData.DistChannel + "\n" +
                                   "▪ 제품군(디비전) : " + oData.Division;
                                   
                    oCallbacks.onSuccess("AI 비서", "sap-icon://accept", sSummary);
                },
                error: function (oError) {
                    // 전표가 없거나 에러가 났을 때
                    oCallbacks.onError("AI 비서", "sap-icon://error", "SAP 시스템에 " + sOrderNum + "번 전표가 존재하지 않거나 읽기 권한이 없습니다.");
                }
            });
        }



    };
});