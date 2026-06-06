/**
 * Step02PlannedOrder.controller.js — E2E Step 2: Planned Order
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    var STEP_KEY = "step02";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.e2e.Step02PlannedOrder", {

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
            MessageToast.show("Step 2 — Planned Order selected");
        },

        /** TODO: OData Planned Order read → dashboard>/e2eProcessFlow/steps/step02/documents */
        loadDocuments: function () {}
    });
});
