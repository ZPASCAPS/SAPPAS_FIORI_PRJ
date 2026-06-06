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

    var STEP_KEY = "step01";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.e2e.Step01SalesOrder", {

        onInit: function () {
            // dashboard 모델은 Main.controller.js에서 Component에 등록됨
        },

        onAfterRendering: function () {
            this._bindNodePress("stepNode");
        },

        _bindNodePress: function (sNodeId) {
            if (this._bNodePressBound) {
                return;
            }
            var oNode = this.byId(sNodeId);
            if (oNode) {
                oNode.attachBrowserEvent("click", this.onNodePress.bind(this));
                this._bNodePressBound = true;
            }
        },

        /**
         * 노드 클릭 — 상세 placeholder 토글 및 선택 Step 갱신.
         */
        onNodePress: function () {
            var oModel = this.getOwnerComponent().getModel("dashboard");
            var sPath = "/e2eProcessFlow/steps/" + STEP_KEY;
            var bShow = oModel.getProperty(sPath + "/showDetail");

            oModel.setProperty("/e2eProcessFlow/selectedStepId", STEP_KEY);
            oModel.setProperty(sPath + "/showDetail", !bShow);

            if (!bShow) {
                this.loadDocuments();
            }

            MessageToast.show("Step 1 — Sales Order selected");
        },

        /**
         * TODO: SAP OData 연동 — Sales Order entity set read.
         * Example: oModel.read("/A_SalesOrder", { success: fnMapToDocuments });
         * 결과를 dashboard>/e2eProcessFlow/steps/step01/documents 에 setProperty.
         */
        loadDocuments: function () {
            // Placeholder — team member implements OData binding here
        }
    });
});
