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

        formatDocClearingLine: function (vClearingDoc) {
            var sDoc = "";

            if (!_isEmpty(vClearingDoc)) {
                sDoc = String(vClearingDoc).trim();
                if (!sDoc || sDoc === "00000000") {
                    sDoc = "";
                }
            }

            return sDoc ? "Clr " + sDoc : "";
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
        }
    };
});
