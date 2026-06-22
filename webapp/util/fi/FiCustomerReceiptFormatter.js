/**
 * FiCustomerReceiptFormatter.js — amount, rate, status, date formatters
 */
sap.ui.define([], function () {
    "use strict";

    var NO_DATA = "\uB370\uC774\uD130 \uC5C6\uC74C";

    var STATUS_LABELS = {
        PAID: "\uC785\uAE08\uC644\uB8CC",
        PARTIAL: "\uBD80\uBD84\uC785\uAE08",
        OPEN: "\uBBF8\uC785\uAE08"
    };

    var FIELD_HELP = {
        companyCode: {
            title: "Company Code",
            description: "SAP FI \uD68C\uC0AC \uCF54\uB4DC(BUKRS)\uC785\uB2C8\uB2E4. \uC804\uD45C\uC640 \uACE0\uAC1D \uCCAD\uAD6C \uB370\uC774\uD130\uAC00 \uC18D\uD55C \uBC95\uC778\uC744 \uAD6C\uBD84\uD569\uB2C8\uB2E4."
        },
        customer: {
            title: "Customer",
            description: "SAP FI \uACE0\uAC1D \uBC88\uD638(KUNNR)\uC785\uB2C8\uB2E4. \uC601\uC218\uC99D\uC5D0 \uD45C\uC2DC\uB418\uB294 \uACE0\uAC1D \uC2DD\uBCC4 \uCF54\uB4DC\uC785\uB2C8\uB2E4."
        },
        customerName: {
            title: "Customer Name",
            description: "\uACE0\uAC1D \uBA85\uCE6D\uC785\uB2C8\uB2E4. \uC9C1\uC601\uC810\uB7EC \uBAA9\uB85D\uACFC \uC601\uC218\uC99D \uD574\uB354\uC5D0 \uB3D9\uC77C\uD558\uAC8C \uD45C\uC2DC\uB429\uB2C8\uB2E4."
        },
        status: {
            title: "Status",
            description: "\uACE0\uAC1D \uCCAD\uAD6C \uC785\uAE08 \uC0C1\uD0DC\uC785\uB2C8\uB2E4. \uC785\uAE08\uC644\uB8CC, \uBD80\uBD84\uC785\uAE08, \uBBF8\uC785\uAE08 \uC911 \uD558\uB098\uB85C \uD45C\uC2DC\uB429\uB2C8\uB2E4."
        },
        currency: {
            title: "Currency",
            description: "\uAE08\uC561 \uD45C\uC2DC \uD86F\uD654 \uB2E8\uC704\uC785\uB2C8\uB2E4. \uCCAD\uAD6C\uAE08\uC561\uACFC \uC785\uAE08\uAE08\uC561\uC774 \uAC19\uC740 \uAE30\uC900\uC73C\uB85C \uACC4\uC0B0\uB429\uB2C8\uB2E4."
        },
        invoiceAmount: {
            title: "Invoice Amount",
            description: "\uC120\uD0DD \uACE0\uAC1D\uC758 \uCCAD\uAD6C \uAE08\uC561 \uD569\uACC4\uC785\uB2C8\uB2E4. \uBAA8\uB4E0 \uCCAD\uAD6C \uC804\uD45C \uAE08\uC561\uC758 \uCD1D\uD569\uC785\uB2C8\uB2E4."
        },
        paidAmount: {
            title: "Paid Amount",
            description: "\uC774\uBBF8 \uC785\uAE08\uB41C \uAE08\uC561 \uD569\uACC4\uC785\uB2C8\uB2E4. \uCCAD\uAD6C \uAE08\uC561 \uC911 \uC218\uAE08 \uC644\uB8CC \uB610\uB294 \uC0C1\uD0B0 \uCC98\uB9AC\uB41C \uAE08\uC561\uC785\uB2C8\uB2E4."
        },
        openAmount: {
            title: "Open Amount",
            description: "\uC544\uC9C1 \uC218\uAE08\uB418\uC9C0 \uC54A\uC740 \uBBF8\uC218 \uAE08\uC561 \uD569\uACC4\uC785\uB2C8\uB2E4. \uCCAD\uAD6C \uAE08\uC561 \uC911 \uC785\uAE08 \uC794\uC561\uC744 \uC758\uBBF8\uD569\uB2C8\uB2E4."
        },
        paymentRate: {
            title: "Payment Rate",
            description: "\uC785\uAE08 \uC644\uB8CC \uBE44\uC728\uC785\uB2C8\uB2E4. \uC785\uAE08\uC644\uB8CC \uAE08\uC561 \u00F7 \uCCAD\uAD6C \uAE08\uC561 \u00D7 100\uC73C\uB85C \uACC4\uC0B0\uB429\uB2C8\uB2E4."
        },
        openRate: {
            title: "Open Rate",
            description: "\uBBF8\uC218 \uBE44\uC728\uC785\uB2C8\uB2E4. \uBBF8\uC218 \uAE08\uC561 \u00F7 \uCCAD\uAD6C \uAE08\uC561 \u00D7 100\uC73C\uB85C \uACC4\uC0B0\uB429\uB2C8\uB2E4."
        },
        invoiceCount: {
            title: "Invoice Count",
            description: "\uC120\uD0DD \uACE0\uAC1D\uC758 \uCCAD\uAD6C \uC804\uD45C \uAC74\uC218\uC785\uB2C8\uB2E4."
        },
        paidCount: {
            title: "Paid Count",
            description: "\uC785\uAE08\uC774 \uC644\uB8CC\uB41C \uC804\uD45C \uAC74\uC218\uC785\uB2C8\uB2E4."
        },
        openCount: {
            title: "Open Count",
            description: "\uC544\uC9C1 \uBBF8\uC218 \uC794\uC561\uC774 \uB0A8\uC544 \uC788\uB294 \uC804\uD45C \uAC74\uC218\uC785\uB2C8\uB2E4."
        },
        accountingDoc: {
            title: "Accounting Doc.",
            description: "\uB300\uD45C \uD68C\uACC4 \uC804\uD45C \uBC88\uD638(BELNR)\uC785\uB2C8\uB2E4. \uACE0\uAC1D \uC694\uC57D \uAE30\uC900 \uC804\uD45C\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4."
        },
        fiscalYear: {
            title: "Fiscal Year",
            description: "\uD68C\uACC4 \uC804\uD45C\uAC00 \uC18D\uD55C \uD68C\uACC4 \uC5F0\uB3C4(GJAHR)\uC785\uB2C8\uB2E4."
        },
        documentType: {
            title: "Document Type",
            description: "SAP \uC804\uD45C \uC720\uD615(BLART)\uC785\uB2C8\uB2E4. \uC608: \uC785\uAE08(DZ), \uCCAD\uAD6C \uB4F1 \uC804\uD45C \uC131\uACA9\uC744 \uAD6C\uBD84\uD569\uB2C8\uB2E4."
        },
        postingDate: {
            title: "Posting Date",
            description: "\uC804\uD45C\uAC00 \uD68C\uACC4 \uC5F0\uB3C4\uC5D0 \uAE30\uC785\uB41C \uC804\uAE30 \uC77C(BUDAT)\uC785\uB2C8\uB2E4."
        },
        clearingDoc: {
            title: "Clearing Doc.",
            description: "\uC0C1\uD0B0(\uBC18\uC81C) \uC804\uD45C \uBC88\uD638\uC785\uB2C8\uB2E4. \uD68C\uACC4 \uC804\uD45C\uC640 \uBC88\uD638\uAC00 \uAC19\uC73C\uD558\uBA74 \u2018\uD68C\uACC4 \uC804\uD45C\uC640 \uB3D9\uC77C\u2019\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4."
        },
        clearingDate: {
            title: "Clearing Date",
            description: "\uC0C1\uD0B0 \uCC98\uB9AC\uAC00 \uC774\uB7EC\uC9C4 \uC77C\uC790\uC785\uB2C8\uB2E4. \uC785\uAE08 \uC644\uB8CC \uC2DC\uC810\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
        }
    };

    function getFieldHelp(sKey) {
        return FIELD_HELP[String(sKey || "")] || null;
    }

    function _isEmpty(vValue) {
        return vValue === null || vValue === undefined || vValue === "";
    }

    function _toNumber(vValue) {
        if (_isEmpty(vValue)) {
            return null;
        }

        var n = Number(vValue);
        return isNaN(n) ? null : n;
    }

    function _normalizeStatusKey(vStatus) {
        var s = String(vStatus || "").trim().toUpperCase();

        if (STATUS_LABELS[s]) {
            return s;
        }

        if (s.indexOf("PAID") >= 0 || s.indexOf("\uC785\uAE08\uC644\uB8CC") >= 0) {
            return "PAID";
        }

        if (s.indexOf("PARTIAL") >= 0 || s.indexOf("\uBD80\uBD84") >= 0) {
            return "PARTIAL";
        }

        if (s.indexOf("OPEN") >= 0 || s.indexOf("\uBBF8\uC785\uAE08") >= 0 || s.indexOf("\uBBF8\uC218") >= 0) {
            return "OPEN";
        }

        return s;
    }

    function _parseSapDate(vValue) {
        if (_isEmpty(vValue)) {
            return null;
        }

        var s = String(vValue).trim();

        if (!s || s === "00000000") {
            return null;
        }

        if (/^\/Date\((\d+)\)\/$/.test(s)) {
            var mDate = s.match(/^\/Date\((\d+)\)\/$/);
            var dFromMs = new Date(Number(mDate[1]));
            if (!isNaN(dFromMs.getTime())) {
                return dFromMs;
            }
        }

        if (/^\d{8}$/.test(s)) {
            var iY = Number(s.slice(0, 4));
            var iM = Number(s.slice(4, 6));
            var iD = Number(s.slice(6, 8));
            var dFromYmd = new Date(iY, iM - 1, iD);

            if (!isNaN(dFromYmd.getTime())) {
                return dFromYmd;
            }
        }

        var dParsed = new Date(s);
        return isNaN(dParsed.getTime()) ? null : dParsed;
    }

    return {
        NO_DATA: NO_DATA,

        formatAmount: function (vAmount, sCurrency) {
            var n = _toNumber(vAmount);

            if (n === null) {
                return NO_DATA;
            }

            var sFormatted = n.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            });

            if (sCurrency) {
                return sFormatted + " " + String(sCurrency).trim();
            }

            return sFormatted;
        },

        formatRate: function (vRate) {
            var n = _toNumber(vRate);

            if (n === null) {
                return NO_DATA;
            }

            return n.toLocaleString(undefined, {
                minimumFractionDigits: 1,
                maximumFractionDigits: 2
            }) + "%";
        },

        formatStatus: function (vStatus) {
            if (_isEmpty(vStatus)) {
                return NO_DATA;
            }

            var sKey = _normalizeStatusKey(vStatus);
            return STATUS_LABELS[sKey] || String(vStatus).trim();
        },

        formatStatusBadgeClass: function (vStatus) {
            var sBase = "fiReceiptStatusBadge";
            var sKey = _normalizeStatusKey(vStatus);

            if (sKey === "PAID") {
                return sBase + " fiReceiptStatusPaid";
            }

            if (sKey === "PARTIAL") {
                return sBase + " fiReceiptStatusPartial";
            }

            if (sKey === "OPEN") {
                return sBase + " fiReceiptStatusOpen";
            }

            return sBase;
        },

        formatOptionalText: function (vValue) {
            if (_isEmpty(vValue)) {
                return "-";
            }

            var s = String(vValue).trim();

            if (!s || s === "00000000") {
                return "-";
            }

            return s;
        },

        formatClearingDocument: function (vClearingDoc, bSameAsAccounting) {
            if (bSameAsAccounting === true || bSameAsAccounting === "true") {
                return "\uD68C\uACC4 \uC804\uD45C\uC640 \uB3D9\uC77C";
            }

            if (_isEmpty(vClearingDoc)) {
                return "-";
            }

            var s = String(vClearingDoc).trim();

            if (!s || s === "00000000") {
                return "-";
            }

            return s;
        },

        formatDate: function (vValue) {
            var d = _parseSapDate(vValue);

            if (!d) {
                return "-";
            }

            var iY = d.getFullYear();
            var iM = String(d.getMonth() + 1).padStart(2, "0");
            var iD = String(d.getDate()).padStart(2, "0");

            return iY + "." + iM + "." + iD;
        },

        formatDocMeta: function (sDocType, sItem) {
            var aParts = [];

            if (!_isEmpty(sDocType)) {
                aParts.push(String(sDocType).trim());
            }

            if (!_isEmpty(sItem)) {
                aParts.push("Item " + String(sItem).trim());
            }

            return aParts.length ? aParts.join(" · ") : NO_DATA;
        },

        formatDocClearingLine: function (vClearingDoc, vAccountingDoc) {
            var sDoc = "";
            var sAccounting = "";

            if (!_isEmpty(vClearingDoc)) {
                sDoc = String(vClearingDoc).trim();
                if (!sDoc || sDoc === "00000000") {
                    sDoc = "";
                }
            }

            if (!_isEmpty(vAccountingDoc)) {
                sAccounting = String(vAccountingDoc).trim();
                if (!sAccounting || sAccounting === "00000000") {
                    sAccounting = "";
                }
            }

            if (!sDoc) {
                return "";
            }

            if (sAccounting && sDoc === sAccounting) {
                return "Clr \uD68C\uACC4 \uC804\uD45C\uC640 \uB3D9\uC77C";
            }

            return "Clr " + sDoc;
        },

        formatDocPostingClearing: function (vPostingDate, vClearingDate) {
            var dPosting = _parseSapDate(vPostingDate);
            var dClearing = _parseSapDate(vClearingDate);
            var sPosting;
            var sClearing;
            var aParts = [];

            if (dPosting) {
                sPosting = dPosting.getFullYear() + "."
                    + String(dPosting.getMonth() + 1).padStart(2, "0") + "."
                    + String(dPosting.getDate()).padStart(2, "0");
                aParts.push("Posting " + sPosting);
            }

            if (dClearing) {
                sClearing = dClearing.getFullYear() + "."
                    + String(dClearing.getMonth() + 1).padStart(2, "0") + "."
                    + String(dClearing.getDate()).padStart(2, "0");
                aParts.push("Clearing " + sClearing);
            }

            return aParts.length ? aParts.join(" / ") : NO_DATA;
        },

        formatKpiOpenClass: function (vOpenAmount) {
            var n = _toNumber(vOpenAmount);

            if (n !== null && n <= 0) {
                return "fiReceiptKpiValue fiReceiptKpiValue--paid";
            }

            return "fiReceiptKpiValue fiReceiptKpiValue--open";
        },

        getFieldHelp: getFieldHelp
    };
});
