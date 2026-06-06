/**
 * Step03PurchaseRequisition.controller.js — E2E Step 3: Purchase Requisition
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    var STEP_KEY = "step03";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.e2e.Step03PurchaseRequisition", {

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
            MessageToast.show("Step 3 — Purchase Requisition selected");
        },

        /** TODO: OData Purchase Requisition read */
        loadDocuments: function () {}
    });
});
