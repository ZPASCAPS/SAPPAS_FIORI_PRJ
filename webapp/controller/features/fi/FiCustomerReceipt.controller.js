/**
 * FiCustomerReceipt.controller.js - FI Customer Receipt (Z_C_FI_REC_DETAIL CDS)
 *
 * - Load detail rows from fiCustomerReceiptDetail OData on init
 * - Group by Customer and compute customer summaries
 * - Electronic receipt card + side panel layout
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/Popover",
    "sap/m/Text",
    "sap/m/PlacementType",
    "com/capstone/dashboard/fioridashboard/service/fi/FiCustomerReceiptDataService",
    "com/capstone/dashboard/fioridashboard/util/fi/FiCustomerReceiptFormatter",
    "com/capstone/dashboard/fioridashboard/util/fi/FiCustomerReceiptExportUtil",
    "com/capstone/dashboard/fioridashboard/util/fi/FiCustomerReceiptPrintUtil"
], function (Controller, JSONModel, MessageToast, Popover, Text, PlacementType, FiCustomerReceiptDataService, FiCustomerReceiptFormatter, FiCustomerReceiptExportUtil, FiCustomerReceiptPrintUtil) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.fi.FiCustomerReceipt", {

        formatAmount: FiCustomerReceiptFormatter.formatAmount,
        formatRate: FiCustomerReceiptFormatter.formatRate,
        formatStatus: FiCustomerReceiptFormatter.formatStatus,
        formatStatusBadgeClass: FiCustomerReceiptFormatter.formatStatusBadgeClass,
        formatOptionalText: FiCustomerReceiptFormatter.formatOptionalText,
        formatClearingDocument: FiCustomerReceiptFormatter.formatClearingDocument,
        formatDate: FiCustomerReceiptFormatter.formatDate,
        formatDocMeta: FiCustomerReceiptFormatter.formatDocMeta,
        formatDocPostingClearing: FiCustomerReceiptFormatter.formatDocPostingClearing,
        formatDocClearingLine: FiCustomerReceiptFormatter.formatDocClearingLine,
        formatKpiOpenClass: FiCustomerReceiptFormatter.formatKpiOpenClass,

        formatCustomerCardClass: function (sCustomer, sSelectedKey) {
            var sBase = "fiReceiptCustomerCard";

            if (sCustomer && sSelectedKey && String(sCustomer) === String(sSelectedKey)) {
                return sBase + " fiReceiptCustomerCardSelected";
            }

            return sBase;
        },

        onInit: function () {
            /* eslint-disable no-console */
            console.log("[FI Receipt] onInit");
            /* eslint-enable no-console */

            this._oCache = null;
            this._bLoading = false;
            this._initViewModel();
            this._waitForDashboardModel();
            this._loadCustomerReceiptData();
        },

        onAfterRendering: function () {
            this._ensureCustomerReceiptLoaded();
        },

        onExit: function () {
            var oModel = this._getDashboardModel();

            if (oModel && this._fnNavChange) {
                oModel.detachPropertyChange(this._fnNavChange, this);
            }
        },

        _initViewModel: function () {
            this.getView().setModel(
                new JSONModel(FiCustomerReceiptDataService.getEmptyViewState()),
                "fiReceiptView"
            );
        },

        _getViewModel: function () {
            return this.getView().getModel("fiReceiptView");
        },

        _getDashboardModel: function () {
            var oView = this.getView();
            return (oView && oView.getModel("dashboard")) || this.getOwnerComponent().getModel("dashboard");
        },

        _waitForDashboardModel: function () {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                setTimeout(this._waitForDashboardModel.bind(this), 50);
                return;
            }

            this._fnNavChange = this._onDashboardPropertyChange.bind(this);
            oModel.attachPropertyChange(this._fnNavChange, this);
            this._ensureCustomerReceiptLoaded();
        },

        _isCustomerReceiptActive: function () {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                return false;
            }

            if (oModel.getProperty("/ui/navKey") !== "FI_CO_FINANCE") {
                return false;
            }

            return oModel.getProperty("/moduleView/activeSubTab") === "CUSTOMER_RECEIPT";
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/ui/navKey"
                || sPath === "/moduleView"
                || sPath === "/moduleView/activeSubTab") {
                this._ensureCustomerReceiptLoaded();
            }
        },

        _ensureCustomerReceiptLoaded: function () {
            if (!this._isCustomerReceiptActive()) {
                return;
            }

            if (this._bLoading) {
                return;
            }

            if (!this._oCache || !this._getViewModel().getProperty("/loaded")) {
                this._loadCustomerReceiptData();
            }
        },

        /** Load /Z_C_FI_REC_DETAIL and build grouped customer summaries */
        _loadCustomerReceiptData: function () {
            var oViewModel = this._getViewModel();
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent && oComponent.getModel("fiCustomerReceiptDetail");
            var sReadPath = FiCustomerReceiptDataService.DETAIL_SET;

            /* eslint-disable no-console */
            console.log("[FI Receipt] model:", oModel);
            console.log("[FI Receipt] read path:", sReadPath);
            /* eslint-enable no-console */

            if (!oViewModel) {
                return;
            }

            if (this._bLoading) {
                return;
            }

            if (!oModel) {
                oViewModel.setProperty("/loaded", true);
                oViewModel.setProperty("/hasData", false);
                oViewModel.setProperty("/error", "fiCustomerReceiptDetail OData model is not available.");
                return;
            }

            this._bLoading = true;
            oViewModel.setProperty("/loading", true);
            oViewModel.setProperty("/error", "");

            FiCustomerReceiptDataService.loadDetailRows(oComponent)
                .then(function (aResults) {
                    var oCache = FiCustomerReceiptDataService.buildCacheFromDetails(aResults);

                    /* eslint-disable no-console */
                    console.table(oCache.customers);
                    console.log("[FI Receipt] KPI:", oCache.kpi);
                    /* eslint-enable no-console */

                    this._oCache = oCache;
                    this._applyViewState("");
                    oViewModel.setProperty("/loaded", true);
                }.bind(this))
                .catch(function (oError) {
                    /* eslint-disable no-console */
                    console.error("[FI Receipt] OData load failed:", oError);
                    /* eslint-enable no-console */

                    this._oCache = null;
                    oViewModel.setProperty("/loaded", true);
                    oViewModel.setProperty("/hasData", false);
                    oViewModel.setProperty("/customers", []);
                    oViewModel.setProperty("/selectedDetails", []);
                    oViewModel.setProperty("/error", FiCustomerReceiptDataService.extractErrorMessage(oError));
                }.bind(this))
                .finally(function () {
                    this._bLoading = false;
                    oViewModel.setProperty("/loading", false);
                }.bind(this));
        },

        /** Update selectedCustomer and selectedDetails for receipt card / detail list */
        _applyViewState: function (sSelectedCustomerKey) {
            var oViewModel = this._getViewModel();
            var sResolved = sSelectedCustomerKey !== undefined && sSelectedCustomerKey !== null
                ? String(sSelectedCustomerKey)
                : String(
                    oViewModel.getProperty("/selectedCustomer/Customer")
                    || oViewModel.getProperty("/selectedCustomerKey")
                    || ""
                );
            var oState;

            if (!this._oCache) {
                return;
            }

            oState = FiCustomerReceiptDataService.buildViewState(this._oCache, sResolved);
            oViewModel.setProperty("/hasData", oState.hasData);
            oViewModel.setProperty("/emptyMessage", oState.emptyMessage);
            oViewModel.setProperty("/kpi", oState.kpi);
            oViewModel.setProperty("/customers", oState.customers);
            oViewModel.setProperty("/selectedCustomer", oState.selectedCustomer);
            oViewModel.setProperty("/selectedCustomerKey", oState.selectedCustomer.Customer || "");
            oViewModel.setProperty("/selectedDetails", oState.selectedDetails);
            oViewModel.setProperty("/detailEmptyMessage", oState.detailEmptyMessage);

            setTimeout(function () {
                this._syncCustomerListSelection(oState.selectedCustomer.Customer);
            }.bind(this), 60);
        },

        onExportReceiptPress: function () {
            var oViewModel = this._getViewModel();
            var oCustomer = oViewModel && oViewModel.getProperty("/selectedCustomer");
            var aDetails = oViewModel && oViewModel.getProperty("/selectedDetails");
            var oResult = FiCustomerReceiptExportUtil.exportCustomerReceipt(oCustomer, aDetails);

            if (!oResult.ok) {
                MessageToast.show(oResult.message);
                return;
            }

            MessageToast.show(oResult.message);
        },

        onPrintReceiptPress: function () {
            var oViewModel = this._getViewModel();
            var oCustomer = oViewModel && oViewModel.getProperty("/selectedCustomer");
            var oResult = FiCustomerReceiptPrintUtil.printCustomerReceipt(oCustomer);

            if (!oResult.ok) {
                MessageToast.show(oResult.message);
                return;
            }

            MessageToast.show(oResult.message);
        },

        onReceiptFieldHelpPress: function (oEvent) {
            var oSource = oEvent.getSource();
            var sHelpKey = "";
            var oHelp;
            var oPopover;

            if (oSource && oSource.getCustomData) {
                oSource.getCustomData().some(function (oData) {
                    if (oData.getKey() === "helpKey") {
                        sHelpKey = String(oData.getValue() || "");
                        return true;
                    }
                    return false;
                });
            }

            oHelp = FiCustomerReceiptFormatter.getFieldHelp(sHelpKey);
            if (!oHelp) {
                return;
            }

            oPopover = this._getFieldHelpPopover();
            oPopover.setTitle(oHelp.title);
            this._oFieldHelpText.setText(oHelp.description);
            oPopover.openBy(oSource);
        },

        _getFieldHelpPopover: function () {
            if (!this._oFieldHelpPopover) {
                this._oFieldHelpText = new Text({
                    wrapping: true
                });
                this._oFieldHelpText.addStyleClass("fiReceiptFieldHelpText");
                this._oFieldHelpPopover = new Popover({
                    placement: PlacementType.Bottom,
                    showHeader: true,
                    contentWidth: "18rem",
                    content: [this._oFieldHelpText]
                });
                this._oFieldHelpPopover.addStyleClass("fiReceiptFieldHelpPopover");
                this.getView().addDependent(this._oFieldHelpPopover);
            }

            return this._oFieldHelpPopover;
        },

        onCustomerSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oCtx = oItem && oItem.getBindingContext("fiReceiptView");
            var oData = oCtx && oCtx.getObject();

            if (!oData || !oData.Customer) {
                return;
            }

            this._applyViewState(oData.Customer);
        },

        onCustomerItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oCtx = oItem && oItem.getBindingContext("fiReceiptView");
            var oData = oCtx && oCtx.getObject();

            if (!oData || !oData.Customer) {
                return;
            }

            this._applyViewState(oData.Customer);
        },

        _syncCustomerListSelection: function (sCustomer) {
            var oList = this.byId("fiCustomerReceiptList");
            var aItems;
            var i;

            if (!oList || !sCustomer) {
                return;
            }

            aItems = oList.getItems();

            for (i = 0; i < aItems.length; i++) {
                var oCtx = aItems[i].getBindingContext("fiReceiptView");
                var oData = oCtx && oCtx.getObject();

                if (oData && String(oData.Customer) === String(sCustomer)) {
                    oList.setSelectedItem(aItems[i], true);
                    return;
                }
            }
        }
    });
});
