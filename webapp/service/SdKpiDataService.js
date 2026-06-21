/**
 * SdKpiDataService.js — SD Overview KPI Tiles OData read (Z_C_SD_KPI_SJ)
 */
sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/model/formatter"
], function (Filter, FilterOperator, SapErrorUtil, formatter) {
    "use strict";

    var ENTITY_SET = "/Z_C_SD_KPI_SJ";
    var DEFAULT_SEASON = "00003";
    var DEFAULT_PERIOD = "THIS_WEEK";

    function _roundRate(nValue) {
        var n = Number(nValue);
        if (isNaN(n)) {
            return 0;
        }
        return Math.round(n * 10) / 10;
    }

    function _formatDelta(nDelta) {
        var n = Number(nDelta);
        if (isNaN(n) || n === 0) {
            return "전주 대비 변동 없음";
        }
        var sSign = n > 0 ? "+" : "";
        return "전주 " + sSign + _roundRate(n) + "%p";
    }

    function _readCollection(oModel, aFilters) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error("sdKpiModel not available"));
                return;
            }

            oModel.read(ENTITY_SET, {
                filters: aFilters || [],
                success: function (oData) {
                    resolve(oData.results || []);
                },
                error: function (oError) {
                    reject(oError);
                }
            });
        });
    }

    function _pickRow(aRows, sSeason, sPeriodKey) {
        var i;
        var oRow;

        for (i = 0; i < aRows.length; i++) {
            oRow = aRows[i];
            if (String(oRow.Season || "") === sSeason
                && String(oRow.PeriodKey || "") === sPeriodKey) {
                return oRow;
            }
        }

        for (i = 0; i < aRows.length; i++) {
            oRow = aRows[i];
            if (String(oRow.Season || "") === sSeason) {
                return oRow;
            }
        }

        return aRows[0] || null;
    }

    function _emptyTileData() {
        return {
            loading: true,
            error: "",
            seasonAchievement: {
                header: "목표 주문 비용 달성률",
                label: "목표 주문 비용 달성률",
                subheader: "조회 중...",
                percentage: 0,
                valueText: "0%",
                trendPillText: "-",
                trendPillClass: "nxSdDashPill--neutral",
                footnote: "조회 중...",
                icon: "sap-icon://goal"
            },
            returnAcceptanceRate: {
                header: "반품 접수율",
                label: "반품 접수율",
                subheader: "조회 중...",
                value: 0,
                valueText: "0%",
                indicator: "None",
                trendPillText: "-",
                trendPillClass: "nxSdDashPill--neutral",
                footnote: "조회 중...",
                icon: "sap-icon://undo"
            },
            creditExceed: {
                header: "여신 초과",
                label: "여신 초과",
                subheader: "조회 중...",
                value: 0,
                valueText: "0",
                valueSuffix: "건",
                trendPillText: "-",
                trendPillClass: "nxSdDashPill--neutral",
                footnote: "조회 중...",
                icon: "sap-icon://alert"
            }
        };
    }

    function _mapRowToTiles(oRow) {
        var sCurrency;
        var nDelta;
        var nSeasonPct;
        var nReturnPct;
        var oTiles;

        if (!oRow) {
            oTiles = _emptyTileData();
            oTiles.loading = false;
            oTiles.error = "KPI 데이터가 없습니다.";
            oTiles.seasonAchievement.subheader = "데이터 없음";
            oTiles.returnAcceptanceRate.subheader = "데이터 없음";
            oTiles.creditExceed.subheader = "데이터 없음";
            return oTiles;
        }

        sCurrency = oRow.Currency || "";
        nDelta = Number(oRow.ReturnRateDelta);
        nSeasonPct = _roundRate(oRow.SeasonAchievementRate);
        nReturnPct = _roundRate(oRow.ReturnAcceptanceRate);

        return {
            loading: false,
            error: "",
            seasonAchievement: {
                header: "목표 주문 비용 달성률",
                label: "목표 주문 비용 달성률",
                subheader: "Season " + (oRow.Season || DEFAULT_SEASON)
                    + " · " + formatter.formatAmountInKrw(oRow.SeasonActualAmount, sCurrency)
                    + " / " + formatter.formatAmountInKrw(oRow.SeasonTargetAmount, sCurrency),
                percentage: nSeasonPct,
                valueText: nSeasonPct + "%",
                trendPillText: nSeasonPct >= 70 ? "양호" : "주의",
                trendPillClass: nSeasonPct >= 70 ? "nxSdDashPill--up" : "nxSdDashPill--down",
                footnote: formatter.formatAmountInKrw(oRow.SeasonActualAmount, sCurrency) + " 실적",
                icon: "sap-icon://goal"
            },
            returnAcceptanceRate: {
                header: "반품 접수율",
                label: "반품 접수율",
                subheader: (oRow.ReturnOrderCount || 0) + "건 · " + _formatDelta(nDelta),
                value: nReturnPct,
                valueText: nReturnPct + "%",
                indicator: nDelta > 0 ? "Up" : (nDelta < 0 ? "Down" : "None"),
                trendPillText: nDelta > 0
                    ? "+" + _roundRate(nDelta) + "%p"
                    : (nDelta < 0 ? _roundRate(nDelta) + "%p" : ""),
                trendPillClass: nDelta > 0 ? "nxSdDashPill--down" : (nDelta < 0 ? "nxSdDashPill--up" : "nxSdDashPill--neutral"),
                footnote: (oRow.ReturnOrderCount || 0) + "건 반품 접수",
                icon: "sap-icon://undo"
            },
            creditExceed: {
                header: "여신 초과",
                label: "여신 초과",
                subheader: "블로킹 오더 · " + formatter.formatAmountInKrw(oRow.CreditBlockOrderAmount, sCurrency),
                value: Number(oRow.CreditBlockOrderCount) || 0,
                valueText: String(Number(oRow.CreditBlockOrderCount) || 0),
                valueSuffix: "건",
                trendPillText: "블로킹",
                trendPillClass: "nxSdDashPill--warn",
                footnote: formatter.formatAmountInKrw(oRow.CreditBlockOrderAmount, sCurrency),
                icon: "sap-icon://alert"
            }
        };
    }

    return {
        ENTITY_SET: ENTITY_SET,
        DEFAULT_SEASON: DEFAULT_SEASON,

        getEmptyViewData: _emptyTileData,

        load: function (oComponent, sPeriodKey) {
            var oModel = oComponent && oComponent.getModel("sdKpiModel");
            var sSeason = DEFAULT_SEASON;
            var sPeriod = sPeriodKey || DEFAULT_PERIOD;
            var aFilters = [
                new Filter("Season", FilterOperator.EQ, sSeason),
                new Filter("PeriodKey", FilterOperator.EQ, sPeriod)
            ];

            return _readCollection(oModel, aFilters)
                .then(function (aRows) {
                    if (aRows.length > 0) {
                        return _mapRowToTiles(_pickRow(aRows, sSeason, sPeriod));
                    }

                    return _readCollection(oModel, [
                        new Filter("Season", FilterOperator.EQ, sSeason)
                    ]).then(function (aSeasonRows) {
                        return _mapRowToTiles(_pickRow(aSeasonRows, sSeason, sPeriod));
                    });
                })
                .catch(function (oError) {
                    var oTiles = _emptyTileData();
                    oTiles.loading = false;
                    oTiles.error = SapErrorUtil.extractMessage(oError, "KPI 조회에 실패했습니다.");
                    oTiles.seasonAchievement.subheader = "조회 실패";
                    oTiles.returnAcceptanceRate.subheader = "조회 실패";
                    oTiles.creditExceed.subheader = "조회 실패";
                    return oTiles;
                });
        }
    };
});
