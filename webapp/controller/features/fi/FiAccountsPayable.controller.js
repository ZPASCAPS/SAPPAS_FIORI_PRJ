/**
 * FiAccountsPayable.controller.js ??FI Accounts Payable (Z_C_FI_AP CDS OData Ï§ÄÎπ?
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/FiEmptyStateUtil"
], function (Controller, FiEmptyStateUtil) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.fi.FiAccountsPayable", {

        onInit: function () {
            this._waitForDashboardModel();
            this._initFiAPModel();
        },

        onExit: function () {
            var oFiAP = this._getFiAPModel();
            var oModel = this._getDashboardModel();

            if (oFiAP) {
                if (this._fnFiAPMetadataFailed) {
                    oFiAP.detachMetadataFailed(this._fnFiAPMetadataFailed, this);
                }
                if (this._fnFiAPRequestFailed) {
                    oFiAP.detachRequestFailed(this._fnFiAPRequestFailed, this);
                }
            }

            if (oModel && this._fnNavChange) {
                oModel.detachPropertyChange(this._fnNavChange, this);
            }
        },

        _getDashboardModel: function () {
            var oView = this.getView();
            return (oView && oView.getModel("dashboard")) || this.getOwnerComponent().getModel("dashboard");
        },

        _getFiAPModel: function () {
            return this.getOwnerComponent() && this.getOwnerComponent().getModel("fiAP");
        },

        _waitForDashboardModel: function () {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                setTimeout(this._waitForDashboardModel.bind(this), 50);
                return;
            }

            if (!oModel.getProperty("/fiAccountsPayable")) {
                oModel.setProperty("/fiAccountsPayable", FiEmptyStateUtil.getAccountsPayableEmptyState());
            }

            this._fnNavChange = this._onDashboardPropertyChange.bind(this);
            oModel.attachPropertyChange(this._fnNavChange, this);
        },

        _initFiAPModel: function () {
            var oFiAP = this._getFiAPModel();
            var oModel = this._getDashboardModel();

            if (!oModel) {
                setTimeout(this._initFiAPModel.bind(this), 50);
                return;
            }

            if (!oFiAP) {
                oModel.setProperty("/fiAccountsPayable/error", "");
                oModel.setProperty("/fiAccountsPayable/odataConnected", false);
                oModel.setProperty("/fiAccountsPayable/emptyMessage", "?∞Ïù¥???ÜÏùå");
                oModel.setProperty("/fiAccountsPayable/emptyHint", "FI Accounts Payable OData(fiAP) ?úÎπÑ?§Í? ?±Î°ù?òÏ? ?äÏïò?µÎãà??");
                return;
            }

            oModel.setProperty("/fiAccountsPayable/error", "");
            oModel.setProperty("/fiAccountsPayable/odataConnected", true);
            oModel.setProperty("/fiAccountsPayable/emptyMessage", "?∞Ïù¥???ÜÏùå");
            oModel.setProperty("/fiAccountsPayable/emptyHint", "Z_C_FI_AP CDS??ÎØ∏Ï?Í∏âÍ∏à ?∞Ïù¥?∞Í? ?ÜÏäµ?àÎã§.");

            this._fnFiAPMetadataFailed = this._onFiAPMetadataFailed.bind(this);
            this._fnFiAPRequestFailed = this._onFiAPRequestFailed.bind(this);
            oFiAP.attachMetadataFailed(this._fnFiAPMetadataFailed, this);
            oFiAP.attachRequestFailed(this._fnFiAPRequestFailed, this);
        },

        _onDashboardPropertyChange: function () {
            // ???ÑÌôò ???†ÌÉù ?†Ï? ??Ï∂îÌõÑ ?ÅÏÑ∏ ?∞Îèô ???ïÏû•
        },

        _setDashboardError: function (sMessage) {
            var oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/fiAccountsPayable/error", sMessage || "");
                if (sMessage) {
                    oModel.setProperty("/fiAccountsPayable/odataConnected", false);
                }
            }
        },

        _extractErrorMessage: function (oEvent) {
            var oParams = oEvent && oEvent.getParameters();
            var oResponse = oParams && oParams.response;
            if (oResponse && oResponse.message) {
                return oResponse.message;
            }
            if (oParams && oParams.message) {
                return oParams.message;
            }
            return "FI Accounts Payable OData ?îÏ≤≠???§Ìå®?àÏäµ?àÎã§.";
        },

        _onFiAPMetadataFailed: function (oEvent) {
            this._setDashboardError(this._extractErrorMessage(oEvent));
        },

        _onFiAPRequestFailed: function (oEvent) {
            this._setDashboardError(this._extractErrorMessage(oEvent));
        },

        onToolbarFilterOpen: function () {
            // UI only ??fiAP OData ?∞Í≤∞ ???ÑÌÑ∞ Î°úÏßÅ Ï∂îÍ? ?àÏ†ï
        }
    });
});
