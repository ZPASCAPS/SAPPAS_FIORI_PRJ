/**
 * MmHeroUiUtil.js
 *
 * MM Cockpit 탭 공통 Hero UI — Uniqlo Material 필터 문구·조회 건수 포맷.
 */
sap.ui.define([], function () {
    "use strict";

    var UNIQLO_LABEL = "Uniqlo BOM 자재";
    var NO_DATA = "데이터 없음";

    function formatCount(nCount) {
        var n = Number(nCount);

        if (!n || n < 0) {
            return NO_DATA;
        }

        return String(n) + "건";
    }

    function buildFilterLine(nCount) {
        return "현재 필터: " + UNIQLO_LABEL + " · 조회: " + formatCount(nCount);
    }

    function buildOverviewFilterLine(nCount) {
        return "현재 필터: " + UNIQLO_LABEL + " · UP 자재 기준 · 조회: " + formatCount(nCount);
    }

    function buildCriteriaBase(sSuffix) {
        if (sSuffix) {
            return UNIQLO_LABEL + " · " + sSuffix;
        }
        return UNIQLO_LABEL;
    }

    return {
        UNIQLO_LABEL: UNIQLO_LABEL,
        NO_DATA: NO_DATA,
        formatCount: formatCount,
        buildFilterLine: buildFilterLine,
        buildOverviewFilterLine: buildOverviewFilterLine,
        buildCriteriaBase: buildCriteriaBase
    };
});
