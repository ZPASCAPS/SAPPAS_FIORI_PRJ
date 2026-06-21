/**
 * MmUpMaterialFilterUtil.js
 *
 * Uniqlo MM 자재 필터 — 히트텍/가방 BOM 원자재 6종 + 완제품 2종만 허용.
 */
sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/capstone/dashboard/fioridashboard/util/mm/MmBomOverviewConfig"
], function (Filter, FilterOperator, MmBomOverviewConfig) {
    "use strict";

    function normalizeCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function getAllowedMaterialCodes() {
        return MmBomOverviewConfig.getAllMaterialCodes();
    }

    function matchesUpMaterial(sCode) {
        return getAllowedMaterialCodes().indexOf(normalizeCode(sCode)) >= 0;
    }

    function getODataFilters(sMaterialField) {
        var aCodes = getAllowedMaterialCodes();
        var aFilters;

        if (!sMaterialField || !aCodes.length) {
            return [];
        }

        aFilters = aCodes.map(function (sCode) {
            return new Filter(sMaterialField, FilterOperator.EQ, sCode);
        });

        return [new Filter({
            filters: aFilters,
            and: false
        })];
    }

    function getBomMaterialCode(oItem) {
        return oItem && (oItem.Component || oItem.MaterialCode || oItem.Material || "");
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
        getAllowedMaterialCodes: getAllowedMaterialCodes,
        normalizeCode: normalizeCode,
        matchesUpMaterial: matchesUpMaterial,
        getODataFilters: getODataFilters,
        getBomMaterialCode: getBomMaterialCode,
        getRowMaterialCode: getRowMaterialCode,
        filterRows: filterRows
    };
});
