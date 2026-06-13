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
            var aDictKeys = Object.keys(this._mappingDict).sort(function (a, b) {
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
        processCommand: function (sRawText, oModel, oInventoryModel, oTrackerModel, oCallbacks) {

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


            // 🚀 4. [신규] 전표 추적 로직 (우선순위를 높여서 다른 단어에 안 뺏기게 함!)
            } else if (sProcessedText.includes("추적") || sProcessedText.includes("흐름")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://chain-link", "전표 연결 흐름을 추적하고 있습니다...");
                
                var aMatch = sProcessedText.match(/\d+/);
                var sOrderNum = aMatch ? aMatch[0] : null;
                
                if (sOrderNum) {
                    // 모델 파라미터가 정확히 넘어가는지 확인 (oTrackerModel)
                    this._handleOrderTracking(sOrderNum, oTrackerModel, oCallbacks);
                } else {
                    oCallbacks.onError("AI 비서", "sap-icon://sys-cancel", "어떤 판매오더를 추적할지 찾지 못했어요. '320번 추적해 줘'처럼 번호를 말씀해 주세요.");
                }    

                
                // 4. 재고 조회 로직
            } else if (sProcessedText.includes("재고") || sProcessedText.includes("몇 개") || sProcessedText.includes("수량") || sProcessedText.includes("품절")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://product", "재고 현황을 분석하고 있습니다...");

                // 💡 수정 1: "이상" 조건이 가장 먼저 실행되도록 순서를 맨 위로 올립니다.
                if (sProcessedText.includes("이상")) {
                    var aMatch = sProcessedText.match(/(\d+)\s*개\s*이상/);
                    var iTargetQty = aMatch ? parseInt(aMatch[1]) : 100; // 숫자가 없으면 기본값 100
                    this._handleBulkStockCheck(oInventoryModel, iTargetQty, oCallbacks);


                } else if (sProcessedText.includes("이하")) {
                    var aMatchBelow = sProcessedText.match(/(\d+)\s*개\s*이하/);
                    var iTargetBelowQty = aMatchBelow ? parseInt(aMatchBelow[1]) : 10; // 기본값은 예시로 10개
                    this._handleLowStockBelowCheck(oInventoryModel, iTargetBelowQty, oCallbacks);

                    // 💡 수정 2: "0개"를 검사할 때, 100개나 500개가 걸리지 않도록 정규식을 씁니다.
                    // (^|[^0-9])0\s*개 -> 앞에 숫자가 없는 순수한 0개만 인식
                } else if (sProcessedText.match(/(^|[^0-9])0\s*개/) || sProcessedText.includes("품절") || sProcessedText.includes("없는")) {
                    this._handleZeroStockCheck(oInventoryModel, oCallbacks);

                } else {
                    this._handleInventoryCheck(sProcessedText, oInventoryModel, oCallbacks);
                }

                // 3. 판매오더 요약/조회 로직 (CDS View 연동)
            } else if (sProcessedText.includes("요약") || sProcessedText.includes("조회") || sProcessedText.includes("알려줘")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://sys-find", "전표 조회 업무로 파악했습니다. 요약 데이터를 검색합니다.");
                this._handleOrderSummary(sProcessedText, oModel, oCallbacks);


                // 🚀 6. PR -> PO 변환 로직 (신규)
            } else if (sProcessedText.includes("변환")) {
                oCallbacks.onProcess("AI 비서", "sap-icon://transform", "PR(구매요청)을 PO(구매오더)로 변환하는 작업을 시작합니다⏳...");
                this._handlePrToPoConversion(sProcessedText, oModel, oCallbacks);


                // 5. 예외 처리
            } else {
    oCallbacks.onError(
        "AI 비서",
        "sap-icon://sys-help-2",
        "죄송합니다, 용민님. 어떤 업무인지 정확히 파악하지 못했어요. 😅\n\n" +
        "사용 가능한 지시에 대해 알려드릴게요.\n" +
        "- 판매오더 생성 [주문]\n" +
        "- 판매오더 요약 [요약]\n" +
        "- 판매오더 추적 [추적]\n" +
        "- 구매오더 생성 [발주]\n" +
        "- 가용재고 조회 [재고]\n\n" +
        "지시를 하실 키워드 [두글자]를 입력해주시면 명령 가이드를 드립니다."
    );
}


        },

        // ==========================================================
        // 세부 비즈니스 로직 함수들
        // ==========================================================

        _handleSalesOrder: function (sRawText, oModel, oCallbacks) {
            var oDateRegex = /\d{4}\.\d{2}\.\d{2}/;
            var oCustomerRegex = /UP-C-[A-Z0-9-]+/i;
            var oMaterialRegex = /UP-F-[A-Z0-9-]+/i;
            var oQtyRegex = /(\d+)\s*(개|박스|주문|수량|오더)/i;

            var aDateMatch = sRawText.match(oDateRegex);
            var aCustomerMatch = sRawText.match(oCustomerRegex);
            var aMaterialMatch = sRawText.match(oMaterialRegex);
            var aQtyMatch = sRawText.match(oQtyRegex);

            var sReqDate = aDateMatch ? aDateMatch[0] : null;
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

        _handleInventoryCheck: function (sProcessedText, oInventoryModel, oCallbacks) {
            var oMaterialRegex = /UP-[A-Z]-[A-Z0-9-]+/i;
            var aMatch = sProcessedText.match(oMaterialRegex);
            var sMaterial = aMatch ? aMatch[0].toUpperCase() : null;

            if (!sMaterial) {
                oCallbacks.onError("AI 비서", "sap-icon://sys-cancel", "어떤 품목의 재고를 조회할지 찾지 못했어요.\n'폴리에스터 재고 알려줘' 처럼 정확히 말씀해 주세요!");
                return;
            }

            var sKoreanName = sMaterial;
            for (var key in this._mappingDict) {
                if (this._mappingDict[key] === sMaterial) {
                    sKoreanName = key;
                    break;
                }
            }

            // 💡 프론트엔드 필터: 자재코드만 던집니다. (공장은 이미 CDS에서 1010으로 고정됨)
            var aFilters = [
                new sap.ui.model.Filter("Material", "EQ", sMaterial)
            ];

            oInventoryModel.read("/Z_C_InventoryStatus", {
                filters: aFilters,
                success: function (oData) {
                    var aResults = oData.results;

                    if (aResults && aResults.length > 0) {
                        var iTotalStock = 0;

                        // 💡 여러 저장위치(0001, 0002 등)에 흩어진 가용재고를 모두 찾아 합산합니다.
                        for (var i = 0; i < aResults.length; i++) {
                            iTotalStock += parseFloat(aResults[i].AvailableStock || 0);
                        }

                        var sSummary = sKoreanName + "(" + sMaterial + ")의 현재 가용재고는 " + iTotalStock + "개 입니다.";
                        oCallbacks.onSuccess("AI 비서", "sap-icon://accept", "📦 재고 조회 완료!\n\n" + sSummary);
                    } else {
                        var sZeroMsg = sKoreanName + "(" + sMaterial + ")의 현재 가용재고는 0개 입니다. (데이터 없음)";
                        oCallbacks.onSuccess("AI 비서", "sap-icon://warning2", "📦 재고 조회 완료!\n\n" + sZeroMsg);
                    }
                },
                error: function (oError) {
                    oCallbacks.onError("AI 비서", "sap-icon://error", "SAP 시스템에서 재고 데이터를 불러오는 중 오류가 발생했습니다.");
                }
            });
        },

        _handlePurchaseOrder: function (sRawText, oModel, oCallbacks) {
            // 정규식 정의
            var oVendorRegex = /UP-V-[A-Z0-9-]+/i;
            var oMaterialRegex = /UP-R-[A-Z0-9-]+/i;
            var oQtyRegex = /(\d+)\s*(개|박스|수량|EA|ea)/i; // 단위 엄격 제한

            var aVendorMatch = sRawText.match(oVendorRegex);
            var aMaterialMatch = sRawText.match(oMaterialRegex);
            var aQtyMatch = sRawText.match(oQtyRegex);

            var sVendor = aVendorMatch ? aVendorMatch[0].toUpperCase() : null;
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
        },


        //조건 1: 가용재고가 0개(품절)인 품목 조회
        _handleZeroStockCheck: function (oInventoryModel, oCallbacks) {
            var that = this;
            oInventoryModel.read("/Z_C_InventoryStatus", {
                success: function (oData) {
                    var aResults = oData.results;
                    var aZeroItems = [];
                    var oCodeToNameMap = {};

                    for (var sKey in that._mappingDict) {
                        oCodeToNameMap[that._mappingDict[sKey]] = sKey;
                    }

                    aResults.forEach(function (item) {
                        var iStock = parseFloat(item.AvailableStock || 0);
                        if (iStock === 0) {
                            var sKoreanName = oCodeToNameMap[item.Material] || item.Material;
                            if (!aZeroItems.includes(sKoreanName)) {
                                aZeroItems.push(sKoreanName + " (" + item.Material + ")");
                            }
                        }
                    });

                    if (aZeroItems.length > 0) {
                        var sMsg = "🚨 현재 가용재고가 0개인 품목 리스트입니다:\n\n" +
                            aZeroItems.map(function (item) { return "▪ " + item; }).join("\n");
                        oCallbacks.onSuccess("AI 비서", "sap-icon://warning", sMsg);
                    } else {
                        oCallbacks.onSuccess("AI 비서", "sap-icon://accept", "✅ 현재 품절되거나 재고가 0개인 자재가 없습니다. 아주 안정적인 상태입니다!");
                    }
                },
                error: function () {
                    oCallbacks.onError("AI 비서", "sap-icon://error", "재고 데이터를 읽어오는 중 오류가 발생했습니다.");
                }
            });
        },


        //조건 2: 특정 수량(예: 100개) 이상인 품목 조회
        _handleBulkStockCheck: function (oInventoryModel, iTargetQty, oCallbacks) {
            var that = this;
            oInventoryModel.read("/Z_C_InventoryStatus", {
                success: function (oData) {
                    var aResults = oData.results;
                    var aRichItems = [];
                    var oCodeToNameMap = {};

                    for (var sKey in that._mappingDict) {
                        oCodeToNameMap[that._mappingDict[sKey]] = sKey;
                    }

                    aResults.forEach(function (item) {
                        var iStock = parseFloat(item.AvailableStock || 0);
                        if (iStock >= iTargetQty) {
                            var sKoreanName = oCodeToNameMap[item.Material] || item.Material;
                            if (!aRichItems.includes(sKoreanName)) {
                                aRichItems.push(sKoreanName + " (" + item.Material + ") : " + iStock + "개");
                            }
                        }
                    });

                    if (aRichItems.length > 0) {
                        var sMsg = "✅ 재고가 " + iTargetQty + "개 이상인 품목 리스트입니다:\n\n" +
                            aRichItems.map(function (item) { return "▪ " + item; }).join("\n");
                        oCallbacks.onSuccess("AI 비서", "sap-icon://accept", sMsg);
                    } else {
                        oCallbacks.onSuccess("AI 비서", "sap-icon://warning2", "🚨 가용재고가 " + iTargetQty + "개 이상인 자재가 하나도 없습니다.");
                    }
                },
                error: function () {
                    oCallbacks.onError("AI 비서", "sap-icon://error", "재고 데이터를 읽어오는 중 오류가 발생했습니다.");
                }
            });
        },

        _handleLowStockBelowCheck: function (oInventoryModel, iTargetQty, oCallbacks) {
            var that = this;
            oInventoryModel.read("/Z_C_InventoryStatus", {
                success: function (oData) {
                    var aResults = oData.results;
                    var aLowItems = [];
                    var oCodeToNameMap = {};

                    // 코드 ↔ 한글명 매핑 테이블 생성
                    for (var sKey in that._mappingDict) {
                        if (that._mappingDict.hasOwnProperty(sKey)) {
                            oCodeToNameMap[that._mappingDict[sKey]] = sKey;
                        }
                    }

                    aResults.forEach(function (item) {
                        var iStock = parseFloat(item.AvailableStock || 0);

                        // 필요에 따라 iStock > 0 조건을 넣을지 말지 결정
                        // "0개 포함한 이하"라면 iStock <= iTargetQty 만,
                        // "0개는 품절 로직에서 따로 처리"라면 iStock > 0 && iStock <= iTargetQty
                        if (iStock > 0 && iStock <= iTargetQty) {
                            var sKoreanName = oCodeToNameMap[item.Material] || item.Material;
                            var sEntry = sKoreanName + " (" + item.Material + ") : " + iStock + "개";

                            if (!aLowItems.includes(sEntry)) {
                                aLowItems.push(sEntry);
                            }
                        }
                    });

                    if (aLowItems.length > 0) {
                        var sMsg =
                            "재고가 " + iTargetQty + "개 이하인 품목 리스트입니다:\n\n" +
                            aLowItems
                                .map(function (item) {
                                    return "▪ " + item;
                                })
                                .join("\n");

                        oCallbacks.onSuccess("AI 비서", "sap-icon://alert", sMsg);
                    } else {
                        oCallbacks.onSuccess(
                            "AI 비서",
                            "sap-icon://accept",
                            "현재 재고가 " + iTargetQty + "개 이하인 품목은 없습니다."
                        );
                    }
                },
                error: function () {
                    oCallbacks.onError(
                        "AI 비서",
                        "sap-icon://error",
                        "재고 데이터를 읽어오는 중 오류가 발생했습니다."
                    );
                }
            });
        },
        _handleOrderTracking: function (sOrderNum, oTrackerModel, oCallbacks) {
            // SAP 영업오더 번호는 10자리이므로 앞에 0을 채워줍니다 (예: 320 -> 0000000320)
            var sPaddedOrder = sOrderNum.padStart(10, '0');
            
            // 필터 생성
            var aFilters = [ new sap.ui.model.Filter("SalesOrder", "EQ", sPaddedOrder) ];

            oTrackerModel.read("/Z_C_E2E_OrderTracker", {
                filters: aFilters,
                success: function (oData) {
                    var aResults = oData.results;
                    
                    if (aResults && aResults.length > 0) {
                        
                        // 💡 1. 중복 데이터를 하나로 묶기 위한 그룹화 (Grouping) 객체 생성
                        var oGroupedData = {};

                        aResults.forEach(function(item) {
                            var sMat = item.Material;
                            
                            // 해당 품목이 처음 나왔다면 기본 뼈대 생성
                            if (!oGroupedData[sMat]) {
                                oGroupedData[sMat] = {
                                    SalesOrder: item.SalesOrder,
                                    Material: item.Material,
                                    PlannedOrder: item.PlannedOrder || "없음",
                                    PurchaseRequisitions: [], // PR은 여러 개일 수 있으므로 배열로!
                                    PurchaseOrder: item.PurchaseOrder || "없음",
                                    ProductionOrder: item.ProductionOrder || "없음",
                                    OutboundDelivery: item.OutboundDelivery || "없음",
                                    BillingDocument: item.BillingDocument || "없음",
                                    FIDocument: item.FIDocument || "없음",
                                    ClearingDocument: item.ClearingDocument || "없음"
                                };
                            }
                            
                            // 구매요청(PR) 번호가 존재하고, 아직 배열에 없다면 추가
                            if (item.PurchaseRequisition && !oGroupedData[sMat].PurchaseRequisitions.includes(item.PurchaseRequisition)) {
                                oGroupedData[sMat].PurchaseRequisitions.push(item.PurchaseRequisition);
                            }
                        });

                        // 💡 2. 묶여진 데이터를 기반으로 챗봇 메시지 조립
                        var sMsg = "";
                        
                        for (var key in oGroupedData) {
                            var oGroup = oGroupedData[key];
                            
                            // 구매요청 배열을 쉼표로 예쁘게 연결 (값이 없으면 "없음")
                            var sPRString = oGroup.PurchaseRequisitions.length > 0 ? oGroup.PurchaseRequisitions.join(", ") : "없음";
                            
                            sMsg += "📌 판매오더 " + sOrderNum + "번 추적 결과입니다. (품목 : " + oGroup.Material + ")\n\n";
                            sMsg += "- 판매오더 : " + oGroup.SalesOrder + "\n";
                            sMsg += "- 계획오더 : " + oGroup.PlannedOrder + "\n";
                            sMsg += "- 구매요청 : " + sPRString + "\n"; // 쉼표로 연결된 PR 출력
                            sMsg += "- 구매오더 : " + oGroup.PurchaseOrder + "\n";
                            sMsg += "- 생산오더 : " + oGroup.ProductionOrder + "\n";
                            sMsg += "- 출하문서 : " + oGroup.OutboundDelivery + "\n";
                            sMsg += "- 송장/회계 : " + oGroup.BillingDocument + " / " + oGroup.FIDocument + "\n";
                            sMsg += "- 입금전기 : " + oGroup.ClearingDocument + "\n\n";
                        }
                        
                        oCallbacks.onSuccess("AI 비서", "sap-icon://accept", sMsg);
                    } else {
                        oCallbacks.onSuccess("AI 비서", "sap-icon://warning2", sOrderNum + "번 오더에 대한 추적 데이터가 없습니다.");
                    }
                },
                error: function () {
                    oCallbacks.onError("AI 비서", "sap-icon://error", "추적 데이터를 불러오는 중 오류가 발생했습니다.");
                }
            });
        },



        /**
         * [API 호출] PR 번호를 PO로 변환하는 백엔드 로직 실행
         */
        _handlePrToPoConversion: function (sProcessedText, oModel, oCallbacks) {
            // 1. 문장에서 10자리 숫자(PR 번호)만 쏙 뽑아내기
            var aMatch = sProcessedText.match(/(\d{10})/); 
            var sPrNumber = aMatch ? aMatch[1] : null;

            if (!sPrNumber) {
                oCallbacks.onError("AI 비서", "sap-icon://sys-cancel", "변환할 PR 번호를 찾지 못했어요. '0010000395 변환해 줘' 처럼 10자리 번호를 말씀해 주세요.");
                return;
            }

            // 2. 백엔드로 보낼 파라미터 세팅
            var oPayload = {
                PR_LIST: sPrNumber
            };

            // 3. Function Import 호출
            oModel.callFunction("/ConvertPrToPo", {
                method: "POST", 
                urlParameters: oPayload,
                success: function (oData) {
                    // 성공 메시지 추출
                    var sMessage = oData.MSG || (oData.ConvertPrToPo && oData.ConvertPrToPo.MSG) || "변환 성공!";
                    oCallbacks.onSuccess("AI 비서", "sap-icon://accept", "✨ " + sMessage);
                },
                error: function (oError) {
                    // 실패 메시지 추출
                    var sErrMsg = "백엔드 통신 중 에러가 발생했습니다.";
                    try {
                        var oErrorObj = JSON.parse(oError.responseText);
                        sErrMsg = oErrorObj.error.message.value;
                    } catch (e) { }
                    oCallbacks.onError("AI 비서", "sap-icon://error", "🚨 " + sErrMsg);
                }
            });
        }

    };
});