/**
 * E2EProcessFlow.controller.js — E2E 프로세스 대시보드 프레임
 *
 * 레이아웃 클래스는 View XML 고정, 진행도 색상만 addStyleClass/removeStyleClass 로 갱신.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/E2EProgressHelper"
], function (Controller, E2EProgressHelper) {
    "use strict";

    var CARD_STATE_CLASSES = ["e2eMtoCardDone", "e2eMtoCardActive", "e2eMtoCardPending"];
    var CONNECTOR_STATE_CLASSES = ["e2eMtoConnectorDone", "e2eMtoConnectorActive", "e2eMtoConnectorPending"];
    var CONNECTOR_IDS = {
        "12": "e2eConnector12",
        "23": "e2eConnector23",
        "34": "e2eConnector34",
        "45": "e2eConnector45",
        "56": "e2eConnector56",
        "67": "e2eConnector67",
        "78": "e2eConnector78",
        "89": "e2eConnector89",
        "910": "e2eConnector910",
        "1011": "e2eConnector1011",
        "1112": "e2eConnector1112"
    };

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.E2EProcessFlow", {

        onInit: function () {
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("dashboard", "e2eProgressUpdated", this._onProgressUpdated, this);

            var oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (oDashboard) {
                this._fnProgressBinding = function (oEvent) {
                    var sPath = oEvent.getParameter("path") || "";
                    if (sPath.indexOf("progressStep") === -1) {
                        return;
                    }
                    this._applyProgressVisuals(oDashboard.getProperty("/e2eProcessFlow/progressStep") || 0);
                }.bind(this);
                oDashboard.attachPropertyChange(this._fnProgressBinding);
            }
        },

        onExit: function () {
            if (this._oEventBus) {
                this._oEventBus.unsubscribe("dashboard", "e2eProgressUpdated", this._onProgressUpdated, this);
            }
            var oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (oDashboard && this._fnProgressBinding) {
                oDashboard.detachPropertyChange(this._fnProgressBinding);
            }
        },

        onAfterRendering: function () {
            this._scheduleApplyProgressVisuals();
        },

        _scheduleApplyProgressVisuals: function () {
            var oDashboard = this.getOwnerComponent().getModel("dashboard");
            var iProgressStep = oDashboard ? (oDashboard.getProperty("/e2eProcessFlow/progressStep") || 0) : 0;
            var that = this;

            this._applyProgressVisuals(iProgressStep);
            setTimeout(function () {
                that._applyProgressVisuals(iProgressStep);
            }, 100);
        },

        _onProgressUpdated: function (_sChannel, _sEvent, oData) {
            this._applyProgressVisuals(oData && oData.progressStep !== undefined ? oData.progressStep : 0);
            var that = this;
            setTimeout(function () {
                that._applyProgressVisuals(oData && oData.progressStep !== undefined ? oData.progressStep : 0);
            }, 100);
        },

        _applyProgressVisuals: function (iProgressStep) {
            var i;
            var aStepStatuses = E2EProgressHelper.buildStepStatuses(iProgressStep);
            var oConnectorClasses = E2EProgressHelper.buildConnectorClasses(iProgressStep);

            for (i = 1; i <= E2EProgressHelper.TOTAL_STEPS; i++) {
                this._applyStepVisual(i, aStepStatuses[i - 1]);
            }

            Object.keys(CONNECTOR_IDS).forEach(function (sKey) {
                this._setStateClasses(this.byId(CONNECTOR_IDS[sKey]), CONNECTOR_STATE_CLASSES, oConnectorClasses[sKey]);
            }, this);

            this._applyMrpVisual(iProgressStep);
        },

        _applyMrpVisual: function (iProgressStep) {
            var oConnector = this.byId("e2eConnector12");
            if (!oConnector) {
                return;
            }
            var sStep2Status = E2EProgressHelper.buildStepStatuses(iProgressStep)[1];
            if (sStep2Status === "active" || sStep2Status === "completed") {
                oConnector.addStyleClass("e2eMtoMrpRunning");
            } else {
                oConnector.removeStyleClass("e2eMtoMrpRunning");
            }
        },

        _applyStepVisual: function (iStepNo, sStatus) {
            var sViewId = "e2eStepView" + String(iStepNo).padStart(2, "0");
            var oStepView = this.byId(sViewId);
            if (!oStepView) {
                return;
            }

            var oCard = this._getNestedControl(oStepView, "e2eStepCard");
            var oStatus = this._getNestedControl(oStepView, "e2eStepStatus");

            this._setStateClasses(oCard, CARD_STATE_CLASSES, E2EProgressHelper.cardClassForStatus(sStatus));

            if (oStatus) {
                if (sStatus === "completed") {
                    oStatus.setText("완료");
                    oStatus.setState("Success");
                } else if (sStatus === "active") {
                    oStatus.setText("진행중");
                    oStatus.setState("Warning");
                } else {
                    oStatus.setText("예정");
                    oStatus.setState("None");
                }
            }
        },

        _getNestedControl: function (oView, sLocalId) {
            if (!oView) {
                return null;
            }
            return oView.byId(sLocalId) || sap.ui.getCore().byId(oView.createId(sLocalId));
        },

        _setStateClasses: function (oControl, aAllStates, sTargetClass) {
            var i;

            if (!oControl) {
                return;
            }

            for (i = 0; i < aAllStates.length; i++) {
                oControl.removeStyleClass(aAllStates[i]);
            }
            if (sTargetClass) {
                oControl.addStyleClass(sTargetClass);
            }
        }
    });
});
