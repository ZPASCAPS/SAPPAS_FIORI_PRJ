sap.ui.define([], function () {
    "use strict";

    function dash(vValue) {
        if (vValue === undefined || vValue === null || vValue === "") {
            return "-";
        }
        return String(vValue);
    }

    function formatDate(vDate) {
        if (!vDate) {
            return "-";
        }
        var oDate = vDate instanceof Date ? vDate : new Date(vDate);
        if (isNaN(oDate.getTime())) {
            return String(vDate);
        }
        return oDate.getFullYear() + "."
            + String(oDate.getMonth() + 1).padStart(2, "0") + "."
            + String(oDate.getDate()).padStart(2, "0");
    }

    function formatAmount(vAmount, sCurrency) {
        if (vAmount === undefined || vAmount === null || vAmount === "") {
            return "-";
        }
        var nAmount = Number(vAmount);
        if (isNaN(nAmount)) {
            return String(vAmount) + (sCurrency ? " " + sCurrency : "");
        }
        if (sCurrency === "KRW" || sCurrency === "WON") {
            return "₩ " + nAmount.toLocaleString("ko-KR");
        }
        return nAmount.toLocaleString("ko-KR") + (sCurrency ? " " + sCurrency : "");
    }

    function formatQtyUnit(vQty, sUnit) {
        if (vQty === undefined || vQty === null || vQty === "") {
            return "-";
        }
        return String(vQty) + (sUnit ? " " + sUnit : "");
    }

    function formatMaterial(sCode, sName) {
        var sMat = dash(sCode);
        var sMatName = dash(sName);
        if (sMat === "-" && sMatName === "-") {
            return "-";
        }
        if (sMat === "-") {
            return sMatName;
        }
        if (sMatName === "-") {
            return sMat;
        }
        return sMat + " / " + sMatName;
    }

    function formatProductionStatus(sCode) {
        switch (String(sCode || "").toUpperCase()) {
            case "COMPLETED":
                return "완료";
            case "IN_PROGRESS":
                return "진행중";
            case "RELEASED":
                return "착수";
            case "NONE":
                return "대기";
            default:
                return dash(sCode);
        }
    }

    function formatMoveType(sCode) {
        if (String(sCode) === "101") {
            return "입고";
        }
        return dash(sCode);
    }

    function formatMRPElement(sCode) {
        if (String(sCode).toUpperCase() === "KD") {
            return "고객오더(MTO)";
        }
        return dash(sCode);
    }

    function formatDNStatus(sCode) {
        switch (String(sCode || "").toUpperCase()) {
            case "C":
                return "완료";
            case "A":
                return "미처리";
            default:
                return dash(sCode);
        }
    }

    function formatBLType(sCode) {
        if (String(sCode).toUpperCase() === "F2") {
            return "표준청구";
        }
        return dash(sCode);
    }

    function formatFIDocType(sCode) {
        if (String(sCode).toUpperCase() === "RV") {
            return "매출";
        }
        return dash(sCode);
    }

    function formatFIStatus(sCode) {
        switch (String(sCode || "").toUpperCase()) {
            case "POSTED":
                return "전기완료";
            case "REVERSED":
                return "역분개";
            default:
                return dash(sCode);
        }
    }

    function formatDNActualDate(vDate) {
        if (!vDate) {
            return "미처리";
        }
        return formatDate(vDate);
    }

    return {
        dash: dash,
        formatDate: formatDate,
        formatAmount: formatAmount,
        formatQtyUnit: formatQtyUnit,
        formatMaterial: formatMaterial,
        formatProductionStatus: formatProductionStatus,
        formatMoveType: formatMoveType,
        formatMRPElement: formatMRPElement,
        formatDNStatus: formatDNStatus,
        formatBLType: formatBLType,
        formatFIDocType: formatFIDocType,
        formatFIStatus: formatFIStatus,
        formatDNActualDate: formatDNActualDate
    };
});
