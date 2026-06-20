/**
 * Step04PurchaseOrder.controller.js — E2E Step 4: Purchase Order
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    var STEP_KEY = "step04";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.e2e.Step04PurchaseOrder", {

        onAfterRendering: function () {
            if (!this._bNodePressBound) {
                var oNode = this.byId("stepNode");
                if (oNode) {
                    oNode.attachBrowserEvent("click", this.onNodePress.bind(this));
                    this._bNodePressBound = true;
                }
            }
        },

        onNodePress: function () {
            var oModel = this.getOwnerComponent().getModel("dashboard");
            var sPath = "/e2eProcessFlow/steps/" + STEP_KEY;
            var bShow = oModel.getProperty(sPath + "/showDetail");
            oModel.setProperty("/e2eProcessFlow/selectedStepId", STEP_KEY);
            oModel.setProperty(sPath + "/showDetail", !bShow);
            
            if (!bShow) { this.loadDocuments(); }
            MessageToast.show("Step  4 — Purchase Order selected");
        },

        /** OData 데이터는 상위 컨트롤러에서 전역 flowModel에 담으므로 여기서는 비워둡니다 */
        loadDocuments: function () {}
    });
});