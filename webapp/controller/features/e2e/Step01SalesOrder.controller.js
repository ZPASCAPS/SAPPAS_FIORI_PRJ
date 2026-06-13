/**
 * Step01SalesOrder.controller.js — E2E Step 1: Sales Order
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.e2e.Step01SalesOrder
 *
 * 역할:
 * - Step 1 원형 노드 클릭·상세 패널 토글.
 * - 추후 SAP OData Sales Order 문서 목록 로드.
 *
 * 협업:
 * - Step 1 로직만 이 파일에 작성한다.
 * - dashboard 모델 초기값 → Main.controller.js (e2eProcessFlow/steps/step01)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.e2e.Step01SalesOrder", {

        onInit: function () {
            // 💡 화면(XML)이 중앙 칠판(flowModel)을 알아서 쳐다보고 있으므로
            // 초기화 로직은 비워두셔도 완벽하게 동작합니다.
        },

        onAfterRendering: function () {
            // 화면이 다 그려진 후 노드 클릭 이벤트 연결
            this._bindNodePress("stepNode");
        },

        _bindNodePress: function (sNodeId) {
            if (this._bNodePressBound) { return; }
            
            var oNode = this.byId(sNodeId);
            if (oNode) {
                oNode.attachBrowserEvent("click", this.onNodePress.bind(this));
                this._bNodePressBound = true;
            }
        },

        /**
         * 💡 노드를 클릭했을 때 실행되는 함수
         * OData 통신(DB 조회)을 여기서 또 할 필요가 없습니다!
         * 이미 OrderInquiry에서 flowModel에 다 담아놨기 때문입니다.
         */
        onNodePress: function () {
            // 중앙 칠판(flowModel)을 슬쩍 열어봅니다.
            var oFlowModel = this.getOwnerComponent().getModel("flowModel");
            var sSalesOrder = oFlowModel.getProperty("/SalesOrder");

            // 값이 있으면 클릭 시 알림창(Toast)만 가볍게 띄워줍니다.
            if (sSalesOrder && sSalesOrder !== "대기중...") {
                MessageToast.show("📌 선택된 판매오더: " + sSalesOrder);
            } else {
                MessageToast.show("아직 조회된 판매오더가 없습니다.");
            }
        }

    });
});
