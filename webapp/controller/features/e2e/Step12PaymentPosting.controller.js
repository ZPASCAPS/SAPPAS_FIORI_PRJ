/**
 * Step12PaymentPosting.controller.js — E2E Step 12: 입금 전기
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.e2e.Step12PaymentPosting
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    var STEP_KEY = "step12";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.e2e.Step12PaymentPosting", {

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

        onNodePress: function () {
            var oModel = this.getOwnerComponent().getModel("dashboard");
            var sPath = "/e2eProcessFlow/steps/" + STEP_KEY;
            var bShow = oModel.getProperty(sPath + "/showDetail");

            oModel.setProperty("/e2eProcessFlow/selectedStepId", STEP_KEY);
            oModel.setProperty(sPath + "/showDetail", !bShow);

            if (!bShow) {
                this.loadDocuments();
            }

            MessageToast.show("Step 12 — 입금 전기 selected");
        },

        /** TODO: OData Payment Posting read → dashboard>/e2eProcessFlow/steps/step12/documents */
        loadDocuments: function () {}
    });
});
