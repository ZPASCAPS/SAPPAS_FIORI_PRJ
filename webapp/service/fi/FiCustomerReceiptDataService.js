/**
 * FiCustomerReceiptDataService.js
 * Z_C_FI_REC_DETAIL CDS — detail EntitySet only, customer summary computed in UI5.
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil"
], function (SapErrorUtil) {
    "use strict";

    var DETAIL_SET = "/Z_C_FI_REC_DETAIL";
    var EMPTY_MESSAGE = "\uC870\uD68C\uB41C \uACE0\uAC1D \uBBF8\uC218\uAE08 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.";

    var DETAIL_FIELDS = [
        "CompanyCode", "Customer", "CustomerName", "AccountingDocument", "FiscalYear",
        "AccountingDocumentItem", "DocumentType", "PostingDate", "Amount", "Currency",
        "ClearingDocument", "ClearingDate", "OpenAmount", "PaidAmount",
        "OpenCountFlag", "PaidCountFlag", "ReceiptStatus"
    ];

    function _normalizeCode(sValue) {
        return String(sValue || "").trim();
    }

    function _normalizeStatus(sValue) {
        return String(sValue || "").trim().toUpperCase();
    }

    function _toNumber(vValue) {
        if (vValue === null || vValue === undefined || vValue === "") {
            return null;
        }

        var n = Number(vValue);
        return isNaN(n) ? null : n;
    }

    function _pickFields(oRow, aFields) {
        var oOut = {};
        var i;

        for (i = 0; i < aFields.length; i++) {
            oOut[aFields[i]] = oRow ? oRow[aFields[i]] : undefined;
        }

        return oOut;
    }

    function _readCollection(oModel, sPath) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error("fiCustomerReceiptDetail OData model is not available."));
                return;
            }

            console.log("[FI Receipt] model:", oModel);
            console.log("[FI Receipt] read path:", sPath);

            function fnExecuteRead() {
                oModel.read(sPath, {
                    success: function (oData) {
                        var aResults = oData.results || [];

                        console.log("[FI Receipt] detail rows:", aResults);
                        console.log("[FI Receipt] raw result count:", aResults.length);
                        console.table(aResults);
                        resolve(aResults);
                    },
                    error: function (oError) {
                        console.error("[FI Receipt] OData load failed:", oError);
                        reject(oError);
                    }
                });
            }

            if (oModel.getMetaModel && oModel.getMetaModel().loaded) {
                oModel.getMetaModel().loaded().then(fnExecuteRead).catch(reject);
            } else if (typeof oModel.metadataLoaded === "function" && !oModel.metadataLoaded()) {
                oModel.attachMetadataLoaded(fnExecuteRead);
                oModel.attachMetadataFailed(reject);
            } else {
                fnExecuteRead();
            }
        });
    }

    function _mapDetailRows(aRows) {
        return (aRows || []).map(function (oRow) {
            return _pickFields(oRow, DETAIL_FIELDS);
        });
    }

    function _rowCountContribution(oRow, sKind) {
        var sFlagField = sKind === "open" ? "OpenCountFlag" : "PaidCountFlag";
        var sStatusTarget = sKind === "open" ? "OPEN" : "PAID";
        var nFlag = _toNumber(oRow[sFlagField]);

        if (nFlag !== null) {
            return nFlag;
        }

        return _normalizeStatus(oRow.ReceiptStatus) === sStatusTarget ? 1 : 0;
    }

    function _computeCustomerStatus(fOpen, fPaid) {
        var fOpenAmt = fOpen || 0;
        var fPaidAmt = fPaid || 0;

        if (fOpenAmt <= 0 && fPaidAmt > 0) {
            return "PAID";
        }

        if (fPaidAmt <= 0 && fOpenAmt > 0) {
            return "OPEN";
        }

        if (fOpenAmt > 0 && fPaidAmt > 0) {
            return "PARTIAL";
        }

        return "OPEN";
    }

    function _buildCustomerSummary(sCustomer, aRows) {
        var fOpen = 0;
        var fPaid = 0;
        var iOpenCount = 0;
        var iPaidCount = 0;
        var sCompanyCode = "";
        var sCustomerName = "";
        var sCurrency = "";
        var fInvoice;
        var fPaymentRate = null;
        var fOpenRate = null;

        (aRows || []).forEach(function (oRow) {
            var nOpen = _toNumber(oRow.OpenAmount);
            var nPaid = _toNumber(oRow.PaidAmount);

            if (nOpen !== null) {
                fOpen += nOpen;
            }

            if (nPaid !== null) {
                fPaid += nPaid;
            }

            iOpenCount += _rowCountContribution(oRow, "open");
            iPaidCount += _rowCountContribution(oRow, "paid");

            if (!sCompanyCode && oRow.CompanyCode) {
                sCompanyCode = String(oRow.CompanyCode).trim();
            }

            if (!sCustomerName && oRow.CustomerName) {
                sCustomerName = String(oRow.CustomerName).trim();
            }

            if (!sCurrency && oRow.Currency) {
                sCurrency = String(oRow.Currency).trim();
            }
        });

        fInvoice = fOpen + fPaid;

        if (fInvoice > 0) {
            fPaymentRate = (fPaid / fInvoice) * 100;
            fOpenRate = (fOpen / fInvoice) * 100;
        }

        return {
            CompanyCode: sCompanyCode,
            Customer: sCustomer,
            CustomerName: sCustomerName,
            InvoiceAmount: fInvoice,
            PaidAmount: fPaid,
            OpenAmount: fOpen,
            InvoiceCount: (aRows || []).length,
            PaidCount: iPaidCount,
            OpenCount: iOpenCount,
            PaymentRate: fPaymentRate,
            OpenRate: fOpenRate,
            Status: _computeCustomerStatus(fOpen, fPaid),
            Currency: sCurrency
        };
    }

    function groupCustomersFromDetails(aDetails) {
        var mGroups = {};
        var aCustomers = [];

        (aDetails || []).forEach(function (oRow) {
            var sCustomer = _normalizeCode(oRow.Customer);

            if (!sCustomer) {
                return;
            }

            if (!mGroups[sCustomer]) {
                mGroups[sCustomer] = [];
            }

            mGroups[sCustomer].push(oRow);
        });

        Object.keys(mGroups).sort().forEach(function (sCustomer) {
            aCustomers.push(_buildCustomerSummary(sCustomer, mGroups[sCustomer]));
        });

        return aCustomers;
    }

    function buildKpiFromCustomers(aCustomers) {
        var fInvoice = 0;
        var fPaid = 0;
        var fOpen = 0;
        var fPaymentRate = null;
        var sCurrency = "";
        var i;

        (aCustomers || []).forEach(function (oCustomer) {
            var nInvoice = _toNumber(oCustomer.InvoiceAmount);
            var nPaid = _toNumber(oCustomer.PaidAmount);
            var nOpen = _toNumber(oCustomer.OpenAmount);

            if (nInvoice !== null) {
                fInvoice += nInvoice;
            }

            if (nPaid !== null) {
                fPaid += nPaid;
            }

            if (nOpen !== null) {
                fOpen += nOpen;
            }

            if (!sCurrency && oCustomer.Currency) {
                sCurrency = String(oCustomer.Currency).trim();
            }
        });

        if (fInvoice > 0) {
            fPaymentRate = (fPaid / fInvoice) * 100;
        } else {
            fPaymentRate = 0;
        }

        return {
            TotalInvoiceAmount: fInvoice,
            TotalPaidAmount: fPaid,
            TotalOpenAmount: fOpen,
            TotalPaymentRate: fPaymentRate,
            Currency: sCurrency
        };
    }

    function _parseDateForSort(vValue) {
        if (vValue === null || vValue === undefined || vValue === "") {
            return 0;
        }

        var s = String(vValue).trim();
        var mMatch;
        var dParsed;

        if (!s || s === "00000000") {
            return 0;
        }

        mMatch = s.match(/^\/Date\((\d+)\)\/$/);
        if (mMatch) {
            dParsed = new Date(Number(mMatch[1]));
            return isNaN(dParsed.getTime()) ? 0 : dParsed.getTime();
        }

        if (/^\d{8}$/.test(s)) {
            dParsed = new Date(
                Number(s.slice(0, 4)),
                Number(s.slice(4, 6)) - 1,
                Number(s.slice(6, 8))
            );
            return isNaN(dParsed.getTime()) ? 0 : dParsed.getTime();
        }

        dParsed = new Date(s);
        return isNaN(dParsed.getTime()) ? 0 : dParsed.getTime();
    }

    function _pickRepresentativeDetail(aDetails) {
        var aSorted = (aDetails || []).slice().sort(function (a, b) {
            return _parseDateForSort(b.PostingDate) - _parseDateForSort(a.PostingDate);
        });

        return aSorted.length ? aSorted[0] : null;
    }

    function _enrichSelectedCustomer(oCustomer, aDetails) {
        var oRep = _pickRepresentativeDetail(aDetails);
        var oEnriched = Object.assign({ hasSelection: true }, oCustomer);

        if (!oRep) {
            oEnriched.AccountingDocument = "";
            oEnriched.FiscalYear = "";
            oEnriched.DocumentType = "";
            oEnriched.PostingDate = "";
            oEnriched.ClearingDocument = "";
            oEnriched.ClearingDate = "";
            return oEnriched;
        }

        oEnriched.AccountingDocument = oRep.AccountingDocument || "";
        oEnriched.FiscalYear = oRep.FiscalYear || "";
        oEnriched.DocumentType = oRep.DocumentType || "";
        oEnriched.PostingDate = oRep.PostingDate || "";
        oEnriched.ClearingDocument = oRep.ClearingDocument || "";
        oEnriched.ClearingDate = oRep.ClearingDate || "";

        return oEnriched;
    }

    function _buildEmptySelectedCustomer() {
        return {
            hasSelection: false,
            CompanyCode: "",
            Customer: "",
            CustomerName: "",
            InvoiceAmount: null,
            PaidAmount: null,
            OpenAmount: null,
            InvoiceCount: null,
            PaidCount: null,
            OpenCount: null,
            PaymentRate: null,
            OpenRate: null,
            Status: "",
            Currency: "",
            AccountingDocument: "",
            FiscalYear: "",
            DocumentType: "",
            PostingDate: "",
            ClearingDocument: "",
            ClearingDate: ""
        };
    }

    function _findCustomer(aCustomers, sCustomer) {
        var sTarget = _normalizeCode(sCustomer);

        if (!sTarget) {
            return null;
        }

        var oFound = null;

        (aCustomers || []).some(function (oRow) {
            if (_normalizeCode(oRow.Customer) === sTarget) {
                oFound = oRow;
                return true;
            }

            return false;
        });

        return oFound;
    }

    function _filterDetails(aDetails, sCustomer) {
        var sTarget = _normalizeCode(sCustomer);

        if (!sTarget) {
            return [];
        }

        return (aDetails || []).filter(function (oRow) {
            return _normalizeCode(oRow.Customer) === sTarget;
        });
    }

    function buildViewState(oCache, sSelectedCustomerKey) {
        var aDetails = oCache && oCache.details ? oCache.details : [];
        var aCustomers = oCache && oCache.customers ? oCache.customers : [];
        var sCustomerKey = _normalizeCode(sSelectedCustomerKey);
        var oSelected;
        var aSelectedDetails;

        if (!sCustomerKey && aCustomers.length) {
            sCustomerKey = _normalizeCode(aCustomers[0].Customer);
        }

        oSelected = _findCustomer(aCustomers, sCustomerKey);
        aSelectedDetails = oSelected ? _filterDetails(aDetails, sCustomerKey) : [];

        return {
            hasData: aDetails.length > 0 && aCustomers.length > 0,
            emptyMessage: EMPTY_MESSAGE,
            customers: aCustomers.slice(),
            kpi: oCache && oCache.kpi ? oCache.kpi : buildKpiFromCustomers(aCustomers),
            selectedCustomer: oSelected
                ? _enrichSelectedCustomer(oSelected, aSelectedDetails)
                : _buildEmptySelectedCustomer(),
            selectedDetails: aSelectedDetails,
            detailEmptyMessage: oSelected
                ? "\uC120\uD0DD\uD55C \uACE0\uAC1D\uC758 \uD68C\uACC4\uBB38\uC11C \uC0C1\uC138 \uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."
                : EMPTY_MESSAGE
        };
    }

    function buildCacheFromDetails(aRawRows) {
        var aDetails = _mapDetailRows(aRawRows);
        var aCustomers = groupCustomersFromDetails(aDetails);
        var oKpi = buildKpiFromCustomers(aCustomers);

        return {
            details: aDetails,
            customers: aCustomers,
            kpi: oKpi
        };
    }

    function getEmptyViewState() {
        return {
            loading: false,
            loaded: false,
            error: "",
            hasData: false,
            emptyMessage: EMPTY_MESSAGE,
            customers: [],
            kpi: buildKpiFromCustomers([]),
            selectedCustomer: _buildEmptySelectedCustomer(),
            selectedDetails: [],
            detailEmptyMessage: EMPTY_MESSAGE
        };
    }

    return {
        DETAIL_SET: DETAIL_SET,
        EMPTY_MESSAGE: EMPTY_MESSAGE,

        loadDetailRows: function (oComponent) {
            var oModel = oComponent && oComponent.getModel("fiCustomerReceiptDetail");

            if (!oModel) {
                return Promise.reject(new Error("fiCustomerReceiptDetail OData model is not available."));
            }

            return _readCollection(oModel, DETAIL_SET).then(function (aRows) {
                return _mapDetailRows(aRows);
            });
        },

        buildCacheFromDetails: buildCacheFromDetails,
        buildViewState: buildViewState,
        getEmptyViewState: getEmptyViewState,
        groupCustomersFromDetails: groupCustomersFromDetails,
        buildKpiFromCustomers: buildKpiFromCustomers,

        extractErrorMessage: function (oError, sDefault) {
            return SapErrorUtil.extractMessage(
                oError,
                sDefault || "\uACE0\uAC1D \uBBF8\uC218\uAE08 OData \uC694\uCCAD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4."
            );
        }
    };
});
