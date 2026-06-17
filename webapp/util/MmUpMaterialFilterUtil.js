/**
 * MmUpMaterialFilterUtil.js
 *
 * MM Cockpit 공통 자재 필터:
 * - Material starts with "UP"
 * - excludes UP-R-COT-001, UP-F-ONT-001
 */
sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
    "use strict";

    var PREFIX = "UP";
    var EXCLUDED_MATERIALS = ["UP-R-COT-001", "UP-F-ONT-001"];

    function normalizeCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function matchesUpMaterial(sCode) {
        var sMat = normalizeCode(sCode);

        if (!sMat || sMat.indexOf(PREFIX) !== 0) {
            return false;
        }

        return EXCLUDED_MATERIALS.indexOf(sMat) < 0;
    }

    function getODataFilters(sMaterialField) {
        if (!sMaterialField) {
            return [];
        }

        return [
            new Filter(sMaterialField, FilterOperator.StartsWith, PREFIX),
            new Filter(sMaterialField, FilterOperator.NE, "UP-R-COT-001"),
            new Filter(sMaterialField, FilterOperator.NE, "UP-F-ONT-001")
        ];
    }

    function getBomMaterialCode(oItem) {
        return oItem && (oItem.Component || oItem.MaterialCode || "");
    }

    function getRowMaterialCode(oRow, sField) {
        if (!oRow) {
            return "";
        }
        if (sField && oRow[sField]) {
            return oRow[sField];
        }
        return oRow.Material || oRow.Component || oRow.MaterialCode || "";
    }

    function filterRows(aRows, fnGetMaterialCode) {
        if (!aRows || !aRows.length) {
            return [];
        }

        return aRows.filter(function (oRow) {
            return matchesUpMaterial(fnGetMaterialCode(oRow));
        });
    }

    return {
        PREFIX: PREFIX,
        EXCLUDED_MATERIALS: EXCLUDED_MATERIALS,
        normalizeCode: normalizeCode,
        matchesUpMaterial: matchesUpMaterial,
        getODataFilters: getODataFilters,
        getBomMaterialCode: getBomMaterialCode,
        getRowMaterialCode: getRowMaterialCode,
        filterRows: filterRows
    };
});
