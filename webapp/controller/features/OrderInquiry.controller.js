/**
 * OrderInquiry.controller.js  (A공간 — 오더 조회)
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.OrderInquiry
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.OrderInquiry
 *
 * 역할:
 * - 메인 대시보드 왼쪽(A) 오더 조회 영역의 UI 이벤트를 담당한다.
 * - 공통 dashboard 모델은 Main.controller.js가 Component에 등록한다.
 *
 * 대시보드 구조:
 * Main → DashboardMain → DashboardCanvas → OrderInquiry
 *
 * 협업:
 * - 조회·검색·오더 상세 UI → 이 Controller
 * - 모델 초기값 → Main.controller.js (dashboard/spaces/orderInquiry)
 */
/* sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.OrderInquiry", {

        onInit: function () {
            // dashboard 모델은 Main.controller.js _initModels()에서 Component에 등록됨
        }
    });
}); */


sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator"
], function (Controller, MessageToast, MessageBox, BusyIndicator) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.OrderInquiry", {

        onInit: function () {
            // dashboard 모델 및 flowModel은 Main.controller.js _initModels()에서 Component에 등록됨
        },

        /**
         * 💡 [조회] 버튼 클릭 시 실행되는 메인 로직
         */
        onSearchOrder: function () {
            // 1. 화면에서 사용자가 입력한 값 가져오기 (XML의 Input ID와 일치해야 합니다)

            console.log("🔥 [테스트] 조회 버튼이 정상적으로 클릭되었습니다!!!");

            
            var oInput = this.byId("salesOrderInput"); 
            
            if (!oInput) {
                MessageBox.error("Input 필드를 찾을 수 없습니다. XML 파일의 ID를 확인해주세요.");
                return;
            }

            var sOrderNum = oInput.getValue().trim(); // 공백 제거

            // 입력값 검증 (비어있으면 안내 메시지)
            if (!sOrderNum) {
                MessageToast.show("조회할 판매오더 번호를 입력해 주세요. (예: 320)");
                return;
            }

            // 💡 2. 디테일 반영: 사용자가 '320'을 치면 '0000000320'으로 10자리 0 채우기
            var sPaddedOrder = sOrderNum.padStart(10, '0');

            // 3. 글로벌 모델 가져오기
            var oTrackerModel = this.getOwnerComponent().getModel("trackerModel"); // CDS View 통신용 모델
            var oFlowModel = this.getOwnerComponent().getModel("flowModel");       // 오른쪽 1~11번 뷰와 연결된 공용 칠판

            if (!oTrackerModel || !oFlowModel) {
                MessageBox.error("시스템 모델을 불러오지 못했습니다. 초기화 로직을 확인해주세요.");
                return;
            }

            // 조회 중임을 알리는 화면 로딩(모래시계) 표시
            BusyIndicator.show(0);

            // 4. OData 통신을 위한 필터 생성 (10자리 패딩된 번호 사용!)
            var aFilters = [
                new sap.ui.model.Filter("SalesOrder", sap.ui.model.FilterOperator.EQ, sPaddedOrder)
            ];

            // 5. CDS View(OData) 데이터 읽어오기
            oTrackerModel.read("/Z_C_E2E_OrderTracker", {
                filters: aFilters,
                success: function (oData) {
                    BusyIndicator.hide(); // 로딩 숨기기
                    var aResults = oData.results;

                    if (aResults && aResults.length > 0) {
                        // 💡 챗봇에서 사용했던 1:N 구매요청(PR) 그룹화 로직 적용
                        var aPRs = [];
                        aResults.forEach(function(item) {
                            if (item.PurchaseRequisition && !aPRs.includes(item.PurchaseRequisition)) {
                                aPRs.push(item.PurchaseRequisition);
                            }
                        });
                        var sPRMerge = aPRs.length > 0 ? aPRs.join(", ") : "없음";

                        // 기준이 될 첫 번째 전표 데이터 추출
                        var oBase = aResults[0];

                        // 💡 6. 공용 칠판(flowModel) 덮어쓰기! 
                        // 이 순간 오른쪽 1~11번 프로세스 뷰 화면이 자동으로 싹 바뀝니다.
                        oFlowModel.setData({
                            SalesOrder: oBase.SalesOrder,
                            PlannedOrder: oBase.PlannedOrder || "없음",
                            PurchaseReq: sPRMerge,
                            PurchaseOrder: oBase.PurchaseOrder || "없음",
                            POMigo: oBase.POMigoDoc || "없음",
                            ProductionOrder: oBase.ProductionOrder || "없음",
                            ProdMigo: oBase.ProdMigoDoc || "없음",
                            Delivery: oBase.OutboundDelivery || "없음",
                            Billing: oBase.BillingDocument || "없음",
                            FI: oBase.FIDocument || "없음",
                            Clearing: oBase.ClearingDocument || "없음"
                        });

                        MessageToast.show("판매오더 " + sOrderNum + "번 흐름이 동기화되었습니다.");
                    } else {
                        // 데이터가 없을 경우
                        MessageBox.warning("해당 판매오더 번호(" + sOrderNum + ")에 대한 전표 추적 데이터가 없습니다.");
                    }
                },
                error: function () {
                    BusyIndicator.hide();
                    MessageBox.error("SAP 시스템에서 데이터를 불러오는 중 오류가 발생했습니다.");
                }
            });
        }
    });
});
