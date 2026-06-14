/**
 * MmInventoryDataService.js
 *
 * MM Inventory — BomStockSet + Z_C_InventoryStatus 기반 재고 상세 조회.
 * OData read는 MmOverviewDataService.loadOverviewData 재사용.
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/service/MmOverviewDataService",
    "com/capstone/dashboard/fioridashboard/util/MmChartHtmlUtil"
], function (MmOverviewDataService, MmChartHtmlUtil) {
    "use strict";

    var NO_DATA = "데이터 없음";
    var STATUS_OPTIONS = [
        { key: "ALL", text: "전체" },
        { key: "OK", text: "OK" },
        { key: "SHORT", text: "SHORT" }
    ];

    function _formatTime(dDate) {
        var d = dDate || new Date();
        return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }

    function _calcFillRate(oItem) {
        var fRequired = Number(oItem.RequiredQty || oItem.BomQty || 0);
        var fStock = Number(oItem.StockQty || 0);
        if (fRequired <= 0) {
            return null;
        }
        return Math.min(100, Math.round((fStock / fRequired) * 100));
    }

    function _isShortageItem(oItem) {
        return oItem.FilterStatus === "SHORT"
            || String(oItem.Status || "").toUpperCase() === "SHORT"
            || Number(oItem.ShortageQty || 0) > 0;
    }

    function _getAvailableStock(sMaterial, mInventory) {
        if (!sMaterial || !mInventory) {
            return null;
        }
        var sKey = String(sMaterial).toUpperCase();
        if (mInventory[sKey] === undefined) {
            return null;
        }
        return mInventory[sKey];
    }

    function _emptyChart(sMsg) {
        return "<div class='nxMmOverviewChartEmpty'>" + (sMsg || NO_DATA) + "</div>";
    }

    function _buildTypeLabelOptions(aBom) {
        var mTypes = {};
        var aOptions = [{ key: "ALL", text: "전체" }];

        aBom.forEach(function (oItem) {
            if (oItem.TypeLabel) {
                mTypes[oItem.TypeLabel] = true;
            }
        });

        Object.keys(mTypes).sort().forEach(function (sKey) {
            aOptions.push({ key: sKey, text: sKey });
        });

        return aOptions;
    }

    function _applyFilters(aBom, oFilters) {
        var aResult = aBom.slice();
        var sSearch;
        var sType;

        if (oFilters.materialSearch) {
            sSearch = String(oFilters.materialSearch).trim().toUpperCase();
            if (sSearch) {
                aResult = aResult.filter(function (oItem) {
                    var sCode = String(oItem.Component || oItem.MaterialCode || "").toUpperCase();
                    var sName = String(oItem.MaterialName || oItem.ComponentText || "").toUpperCase();
                    return sCode.indexOf(sSearch) >= 0 || sName.indexOf(sSearch) >= 0;
                });
            }
        }

        if (oFilters.statusFilter === "OK") {
            aResult = aResult.filter(function (oItem) {
                return oItem.FilterStatus === "OK";
            });
        } else if (oFilters.statusFilter === "SHORT") {
            aResult = aResult.filter(_isShortageItem);
        }

        sType = oFilters.typeLabelFilter;
        if (sType && sType !== "ALL") {
            aResult = aResult.filter(function (oItem) {
                return oItem.TypeLabel === sType;
            });
        }

        if (oFilters.shortageOnly) {
            aResult = aResult.filter(_isShortageItem);
        }

        return aResult;
    }

    function _criteriaLabel(oFilters) {
        var aParts = [];

        if (oFilters.materialSearch) {
            aParts.push("자재 " + oFilters.materialSearch);
        }
        if (oFilters.statusFilter === "OK") {
            aParts.push("Status OK");
        } else if (oFilters.statusFilter === "SHORT") {
            aParts.push("Status SHORT");
        }
        if (oFilters.typeLabelFilter && oFilters.typeLabelFilter !== "ALL") {
            aParts.push("Type " + oFilters.typeLabelFilter);
        }
        if (oFilters.shortageOnly) {
            aParts.push("부족 자재만");
        }

        return aParts.length ? aParts.join(" · ") : "전체 자재";
    }

    function _mapTableRow(oItem) {
        var fFill = oItem.RatePercent !== undefined && oItem.RatePercent !== null
            ? oItem.RatePercent
            : _calcFillRate(oItem);

        return {
            id: oItem.Component || oItem.MaterialCode || "",
            materialNo: oItem.Component || oItem.MaterialCode || NO_DATA,
            materialName: oItem.MaterialName || oItem.ComponentText || NO_DATA,
            typeLabel: oItem.TypeLabel || NO_DATA,
            stockQty: Number(oItem.StockQty || 0),
            requiredQty: Number(oItem.RequiredQty || oItem.BomQty || 0),
            shortageQty: Number(oItem.ShortageQty || 0),
            fillRate: fFill,
            fillRateText: fFill !== null ? fFill + "%" : NO_DATA,
            fillRatePercent: fFill !== null ? fFill : 0,
            fillRateState: fFill === null ? "None" : (fFill < 30 ? "Error" : (fFill < 80 ? "Warning" : "Success")),
            status: oItem.StatusText || oItem.Status || NO_DATA,
            statusState: oItem.StatusState || "None",
            filterStatus: oItem.FilterStatus || "",
            raw: oItem
        };
    }

    function _buildKpis(aItems) {
        var iShort = aItems.filter(_isShortageItem).length;
        var fStockSum = aItems.reduce(function (s, i) { return s + Number(i.StockQty || 0); }, 0);
        var aRates = aItems.map(_calcFillRate).filter(function (v) { return v !== null; });
        var fAvgFill = aRates.length
            ? Math.round(aRates.reduce(function (s, v) { return s + v; }, 0) / aRates.length)
            : null;

        return [
            { label: "Total Materials", displayTitle: "Total Materials", value: String(aItems.length), unit: "EA", hint: "BomStockSet 전체 자재 수", accent: "teal", icon: "sap-icon://product" },
            { label: "Total Stock Qty", displayTitle: "Total Stock Qty", value: String(Math.round(fStockSum)), unit: "EA", hint: "StockQty 합계", accent: "green", icon: "sap-icon://inventory" },
            { label: "Shortage Items", displayTitle: "Shortage Items", value: String(iShort), unit: "EA", hint: "부족 상태 자재 수", accent: iShort > 0 ? "danger" : "green", icon: "sap-icon://alert" },
            { label: "Avg Fill Rate", displayTitle: "Avg Fill Rate", value: fAvgFill !== null ? String(fAvgFill) : NO_DATA, unit: fAvgFill !== null ? "%" : "", hint: "RequiredQty 대비 StockQty", accent: fAvgFill === null ? "teal" : (fAvgFill < 30 ? "danger" : (fAvgFill < 80 ? "amber" : "green")), icon: "sap-icon://line-chart" }
        ];
    }

    function _buildAnalysisCharts(aItems) {
        var mStatus = {};
        var mTypeStock = {};
        var aShortTop;
        var aFillRows;
        var aTypeRows;

        aItems.forEach(function (oItem) {
            var sKey = oItem.FilterStatus || oItem.Status || "UNKNOWN";
            mStatus[sKey] = (mStatus[sKey] || 0) + 1;
            var sType = oItem.TypeLabel || "자재";
            mTypeStock[sType] = (mTypeStock[sType] || 0) + Number(oItem.StockQty || 0);
        });

        aTypeRows = Object.keys(mTypeStock).map(function (sKey) {
            return { label: sKey, value: mTypeStock[sKey] };
        }).sort(function (a, b) { return b.value - a.value; });

        aShortTop = aItems.filter(_isShortageItem).slice().sort(function (a, b) {
            return Number(b.ShortageQty || 0) - Number(a.ShortageQty || 0);
        }).slice(0, 6).map(function (oItem) {
            return {
                label: oItem.Component || oItem.MaterialCode,
                value: Number(oItem.ShortageQty || 0)
            };
        });

        aFillRows = aItems.slice().sort(function (a, b) {
            var iShortA = _isShortageItem(a) ? 1 : 0;
            var iShortB = _isShortageItem(b) ? 1 : 0;
            if (iShortB !== iShortA) {
                return iShortB - iShortA;
            }
            var fA = _calcFillRate(a);
            var fB = _calcFillRate(b);
            return (fA === null ? 999 : fA) - (fB === null ? 999 : fB);
        }).slice(0, 6).map(function (oItem) {
            var fFill = _calcFillRate(oItem);
            return {
                label: oItem.Component || oItem.MaterialCode,
                value: fFill !== null ? fFill : 0,
                isLow: fFill !== null && fFill < 70
            };
        }).filter(function (oRow) { return oRow.value > 0 || oRow.isLow; });

        return [
            {
                title: "Stock by TypeLabel",
                subtitle: "TypeLabel별 StockQty",
                html: aTypeRows.length ? MmChartHtmlUtil.buildInventoryAnalysisTypeBar(aTypeRows) : _emptyChart(NO_DATA),
                cardKey: "type",
                icon: "sap-icon://pie-chart"
            },
            {
                title: "Fill Rate by Material",
                subtitle: "RequiredQty 대비 Fill Rate",
                html: aFillRows.length ? MmChartHtmlUtil.buildInventoryAnalysisFillRateBar(aFillRows) : _emptyChart(NO_DATA),
                cardKey: "fill",
                icon: "sap-icon://horizontal-bar-chart"
            },
            {
                title: "Status Distribution",
                subtitle: "OK / SHORT 분포",
                html: Object.keys(mStatus).length
                    ? MmChartHtmlUtil.buildInventoryAnalysisStatusDonut(mStatus, aItems.length)
                    : _emptyChart(NO_DATA),
                cardKey: "status",
                icon: "sap-icon://pie-chart"
            },
            {
                title: "Top Shortage Materials",
                subtitle: "ShortageQty 상위",
                html: aShortTop.length
                    ? MmChartHtmlUtil.buildInventoryAnalysisShortageBar(aShortTop)
                    : _emptyChart("부족 자재 없음"),
                cardKey: "shortage",
                icon: "sap-icon://vertical-bar-chart"
            }
        ];
    }

    function _buildDetail(oItem, mInventory) {
        if (!oItem) {
            return {
                hasSelection: false,
                title: "",
                materialNo: "",
                materialName: "",
                typeLabel: "",
                stockQty: "",
                requiredQty: "",
                shortageQty: "",
                fillRate: "",
                fillRatePercent: 0,
                fillRateState: "None",
                status: "",
                statusState: "None",
                availableStock: "",
                dataSource: "",
                warningMessage: "",
                successMessage: "",
                emptyMessage: "왼쪽 자재 목록에서 자재를 선택하면 상세 정보가 표시됩니다."
            };
        }

        var fFill = _calcFillRate(oItem);
        var fAvail = _getAvailableStock(oItem.Component || oItem.MaterialCode, mInventory);
        var bShort = _isShortageItem(oItem);

        return {
            hasSelection: true,
            title: oItem.MaterialName || oItem.Component || NO_DATA,
            materialNo: oItem.Component || oItem.MaterialCode || NO_DATA,
            materialName: oItem.MaterialName || oItem.ComponentText || NO_DATA,
            typeLabel: oItem.TypeLabel || NO_DATA,
            stockQty: String(Number(oItem.StockQty || 0)) + " EA",
            requiredQty: String(Number(oItem.RequiredQty || oItem.BomQty || 0)) + " EA",
            shortageQty: String(Number(oItem.ShortageQty || 0)) + " EA",
            fillRate: fFill !== null ? fFill + "%" : NO_DATA,
            fillRatePercent: fFill !== null ? fFill : 0,
            fillRateState: fFill === null ? "None" : (fFill < 30 ? "Error" : (fFill < 80 ? "Warning" : "Success")),
            status: oItem.StatusText || oItem.Status || NO_DATA,
            statusState: oItem.StatusState || "None",
            availableStock: fAvail !== null ? String(Math.round(fAvail)) + " EA" : NO_DATA,
            dataSource: "BomStockSet / Z_C_InventoryStatus",
            warningMessage: bShort ? "해당 자재는 필요 수량 대비 재고가 부족합니다." : "",
            successMessage: !bShort && oItem.FilterStatus === "OK"
                ? "해당 자재의 재고 수량이 필요 수량을 충족합니다."
                : "",
            emptyMessage: ""
        };
    }

    function _findSelectedItem(aFiltered, sSelectedId, aAll) {
        var aSource = aFiltered.length ? aFiltered : aAll;
        var i;

        if (sSelectedId) {
            for (i = 0; i < aSource.length; i++) {
                if ((aSource[i].Component || aSource[i].MaterialCode) === sSelectedId) {
                    return aSource[i];
                }
            }
        }

        return null;
    }

    function buildInventoryState(oCache, oFilters, sSelectedId) {
        var aAll = oCache.bomItems || [];
        var aFiltered = _applyFilters(aAll, oFilters);
        var aTable = aFiltered.slice().sort(function (a, b) {
            return Number(b.ShortageQty || 0) - Number(a.ShortageQty || 0);
        }).map(_mapTableRow);
        var oSelectedRaw = _findSelectedItem(aFiltered, sSelectedId, aAll);

        return {
            loading: false,
            loaded: true,
            error: "",
            criteriaLabel: _criteriaLabel(oFilters),
            lastUpdated: oCache.lastUpdated || _formatTime(),
            materialSearch: oFilters.materialSearch || "",
            statusFilter: oFilters.statusFilter || "ALL",
            typeLabelFilter: oFilters.typeLabelFilter || "ALL",
            shortageOnly: oFilters.shortageOnly === true,
            statusOptions: STATUS_OPTIONS,
            typeLabelOptions: _buildTypeLabelOptions(aAll),
            kpis: _buildKpis(aFiltered),
            materials: aTable,
            selectedMaterialId: oSelectedRaw ? (oSelectedRaw.Component || oSelectedRaw.MaterialCode) : "",
            detail: _buildDetail(oSelectedRaw, oCache.inventoryMap),
            analysisCharts: _buildAnalysisCharts(aFiltered)
        };
    }

    return {
        NO_DATA: NO_DATA,

        loadInventoryData: function (oComponent, sImageBase) {
            return MmOverviewDataService.loadOverviewData(oComponent, sImageBase);
        },

        buildInventoryState: buildInventoryState,

        getEmptyState: function () {
            return {
                loading: false,
                loaded: false,
                error: "",
                criteriaLabel: "전체 자재",
                lastUpdated: NO_DATA,
                materialSearch: "",
                statusFilter: "ALL",
                typeLabelFilter: "ALL",
                shortageOnly: false,
                statusOptions: STATUS_OPTIONS,
                typeLabelOptions: [{ key: "ALL", text: "전체" }],
                kpis: [],
                materials: [],
                selectedMaterialId: "",
                detail: _buildDetail(null, {}),
                analysisCharts: []
            };
        },

        getDefaultFilters: function () {
            return {
                materialSearch: "",
                statusFilter: "ALL",
                typeLabelFilter: "ALL",
                shortageOnly: false
            };
        }
    };
});
