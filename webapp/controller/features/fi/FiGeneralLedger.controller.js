/**
 * FiGeneralLedger.controller.js ??FI General Ledger (Z_C_FI_GL CDS OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/FiEmptyStateUtil"
], function (Controller, FiEmptyStateUtil) {
    "use strict";

    var DETAIL_FIELDS = [
        "CompanyCode",
        "AccountingDocument",
        "FiscalYear",
        "PostingDate",
        "GLAccount",
        "DebitCreditCode",
        "Amount",
        "Currency",
        "ItemText",
        "CreatedBy"
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.fi.FiGeneralLedger", {

        onInit: function () {
            this._waitForDashboardModel();
            this._initFiGLModel();
        },

        onExit: function () {
            var oFiGL = this._getFiGLModel();
            var oModel = this._getDashboardModel();

            if (oFiGL) {
                if (this._fnFiGLMetadataFailed) {
                    oFiGL.detachMetadataFailed(this._fnFiGLMetadataFailed, this);
                }
                if (this._fnFiGLRequestFailed) {
                    oFiGL.detachRequestFailed(this._fnFiGLRequestFailed, this);
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

        _getFiGLModel: function () {
            return this.getOwnerComponent() && this.getOwnerComponent().getModel("fiGL");
        },

        _waitForDashboardModel: function () {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                setTimeout(this._waitForDashboardModel.bind(this), 50);
                return;
            }

            if (!oModel.getProperty("/fiGeneralLedger")) {
                oModel.setProperty("/fiGeneralLedger", FiEmptyStateUtil.getGeneralLedgerEmptyState());
            }

            this._fnNavChange = this._onDashboardPropertyChange.bind(this);
            oModel.attachPropertyChange(this._fnNavChange, this);
        },

        _initFiGLModel: function () {
            var oFiGL = this._getFiGLModel();
            var oModel = this._getDashboardModel();

            if (!oModel) {
                setTimeout(this._initFiGLModel.bind(this), 50);
                return;
            }

            if (!oFiGL) {
                oModel.setProperty("/fiGeneralLedger/error", "FI General Ledger OData Î™®Îç∏(fiGL)???¨Ïö©?????ÜÏäµ?àÎã§.");
                return;
            }

            oModel.setProperty("/fiGeneralLedger/error", "");
            oModel.setProperty("/fiGeneralLedger/odataConnected", true);

            this._fnFiGLMetadataFailed = this._onFiGLMetadataFailed.bind(this);
            this._fnFiGLRequestFailed = this._onFiGLRequestFailed.bind(this);
            oFiGL.attachMetadataFailed(this._fnFiGLMetadataFailed, this);
            oFiGL.attachRequestFailed(this._fnFiGLRequestFailed, this);
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._clearSelectionIfInactive();
            }
        },

        _isGeneralLedgerActive: function () {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                return false;
            }

            return oModel.getProperty("/ui/navKey") === "FI_CO_FINANCE"
                && oModel.getProperty("/moduleView/activeSubTab") === "GENERAL_LEDGER";
        },

        _clearSelectionIfInactive: function () {
            var oTable;
            var oModel;

            if (this._isGeneralLedgerActive()) {
                return;
            }

            oTable = this.byId("fiGeneralLedgerTable");
            if (oTable) {
                oTable.removeSelections(true);
            }

            oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/fiGeneralLedger/detail", this._buildEmptyDetail());
            }
        },

        _buildEmptyDetail: function () {
            return {
                hasSelection: false,
                emptyMessage: "?ºÏ™Ω Î™©Î°ù?êÏÑú ?ÑÌëúÎ•??†ÌÉù?òÎ©¥ ?ÅÏÑ∏ ?ïÎ≥¥Í∞Ä ?úÏãú?©Îãà??",
                CompanyCode: "",
                AccountingDocument: "",
                FiscalYear: "",
                PostingDate: "",
                GLAccount: "",
                DebitCreditCode: "",
                Amount: "",
                AmountDisplay: "",
                Currency: "",
                ItemText: "",
                CreatedBy: ""
            };
        },

        _buildDetailFromContext: function (oCtx) {
            var oData = oCtx.getObject() || {};
            var oDetail = this._buildEmptyDetail();
            var i;

            oDetail.hasSelection = true;
            oDetail.emptyMessage = "";

            for (i = 0; i < DETAIL_FIELDS.length; i++) {
                oDetail[DETAIL_FIELDS[i]] = oData[DETAIL_FIELDS[i]] != null ? String(oData[DETAIL_FIELDS[i]]) : "";
            }

            if (oDetail.Amount && oDetail.Currency) {
                oDetail.AmountDisplay = oDetail.Amount + " " + oDetail.Currency;
            } else {
                oDetail.AmountDisplay = oDetail.Amount;
            }

            return oDetail;
        },

        _setDashboardError: function (sMessage) {
            var oModel = this._getDashboardModel();

            if (oModel) {
                oModel.setProperty("/fiGeneralLedger/error", sMessage || "");
            }
        },

        _extractErrorMessage: function (oEvent) {
            var oParams = oEvent && oEvent.getParameters();
            var oResponse = oParams && oParams.response;
            var sMessage = oParams && oParams.message;

            if (oResponse && oResponse.message) {
                return oResponse.message;
            }

            if (sMessage) {
                return sMessage;
            }

            return "FI General Ledger OData ?îÏ≤≠???§Ìå®?àÏäµ?àÎã§.";
        },

        _onFiGLMetadataFailed: function (oEvent) {
            this._setDashboardError(this._extractErrorMessage(oEvent));
        },

        _onFiGLRequestFailed: function (oEvent) {
            var sMessage = this._extractErrorMessage(oEvent);

            if (oEvent && oEvent.getParameters && oEvent.getParameters().response
                && oEvent.getParameters().response.statusCode === 404) {
                return;
            }

            this._setDashboardError(sMessage);
        },

        onJournalEntrySelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oCtx = oItem && oItem.getBindingContext("fiGL");
            var oModel = this._getDashboardModel();

            if (!oModel) {
                return;
            }

            if (!oCtx) {
                oModel.setProperty("/fiGeneralLedger/detail", this._buildEmptyDetail());
                return;
            }

            oModel.setProperty("/fiGeneralLedger/detail", this._buildDetailFromContext(oCtx));
        },

        onToolbarFilterOpen: function () {
            // UI only ???ÑÌÑ∞ Î°úÏßÅ?Ä Ï∂îÌõÑ Ï∂îÍ?
        }
    });
});
