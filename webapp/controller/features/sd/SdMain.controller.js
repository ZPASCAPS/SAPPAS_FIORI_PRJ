/**
 * SdMain.controller.js — SD Overview 메인 컨테이너 (Step 0)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.sd.SdMain", {

        onInit: function () {
            var oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (!oDashboard) {
                return;
            }

            if (!oDashboard.getProperty("/sdMain")) {
                oDashboard.setProperty("/sdMain", {
                    ready: true,
                    lastUpdated: this._formatNow(),
                    showStepsBelow: false
                });
            }
        },

        _formatNow: function () {
            var oNow = new Date();
            return oNow.getFullYear() + "."
                + String(oNow.getMonth() + 1).padStart(2, "0") + "."
                + String(oNow.getDate()).padStart(2, "0") + " "
                + String(oNow.getHours()).padStart(2, "0") + ":"
                + String(oNow.getMinutes()).padStart(2, "0");
        }
    });
});
