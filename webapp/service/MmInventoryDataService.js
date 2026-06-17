/**
 * MmInventoryDataService.js
 *
 * MM Inventory — Z_C_MM_INVENTORY_CDS / Z_C_MM_INVENTORY (Material 필드 UP* 필터).
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/util/MmChartHtmlUtil",
    "com/capstone/dashboard/fioridashboard/util/MmUpMaterialFilterUtil",
    "com/capstone/dashboard/fioridashboard/util/MmHeroUiUtil"
], function (SapErrorUtil, MmChartHtmlUtil, MmUpMaterialFilterUtil, MmHeroUiUtil) {
    "use strict";

    var NO_DATA = "데이터 없음";
    var ENTITY_SET = "/Z_C_MM_INVENTORY";

    function _readCollection(oModel, sPath, aFilters) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error("mmInventory OData 모델을 찾을 수 없습니다."));
                return;
            }
            oModel.read(sPath, {
                filters: aFilters || [],
                success: function (oData) {
                    resolve(oData.results || []);
                },
                error: function (oError) {
                    reject(new Error(SapErrorUtil.extractMessage(oError, "재고 데이터를 불러올 수 없습니다")));
                }
            });
        });
    }

    function _rowId(oItem) {
        return [
            oItem.Material || "",
            oItem.Plant || "",
            oItem.StorageLocation || ""
        ].join("|");
    }

    function _textOrNoData(vValue) {
        return (vValue !== undefined && vValue !== null && String(vValue).trim() !== "")
            ? String(vValue)
            : NO_DATA;
    }

    function _buildDistinctOptions(aItems, sField) {
        var mValues = {};
        var aOptions = [{ key: "ALL", text: "전체" }];

        aItems.forEach(function (oItem) {
            var sVal = oItem[sField];
            if (sVal !== undefined && sVal !== null && String(sVal).trim() !== "") {
                mValues[String(sVal)] = true;
            }
        });

        Object.keys(mValues).sort().forEach(function (sKey) {
            aOptions.push({ key: sKey, text: sKey });
        });

        return aOptions;
    }

    function _applyFilters(aItems, oFilters) {
        var aResult = aItems.slice();
        var sSearch;

        if (oFilters.materialSearch) {
            sSearch = String(oFilters.materialSearch).trim().toUpperCase();
            if (sSearch) {
                aResult = aResult.filter(function (oItem) {
                    return [
                        oItem.Material,
                        oItem.MaterialName,
                        oItem.Plant,
                        oItem.StorageLocation,
                        oItem.MaterialType
                    ].some(function (v) {
                        return String(v || "").toUpperCase().indexOf(sSearch) >= 0;
                    });
                });
            }
        }

        if (oFilters.plantFilter && oFilters.plantFilter !== "ALL") {
            aResult = aResult.filter(function (oItem) {
                return String(oItem.Plant || "") === oFilters.plantFilter;
            });
        }

        if (oFilters.storageLocationFilter && oFilters.storageLocationFilter !== "ALL") {
            aResult = aResult.filter(function (oItem) {
                return String(oItem.StorageLocation || "") === oFilters.storageLocationFilter;
            });
        }

        if (oFilters.materialTypeFilter && oFilters.materialTypeFilter !== "ALL") {
            aResult = aResult.filter(function (oItem) {
                return String(oItem.MaterialType || "") === oFilters.materialTypeFilter;
            });
        }

        return aResult;
    }

    function _criteriaLabel(oFilters) {
        var aParts = [];

        if (oFilters.materialSearch) {
            aParts.push("검색 " + oFilters.materialSearch);
        }
        if (oFilters.plantFilter && oFilters.plantFilter !== "ALL") {
            aParts.push("Plant " + oFilters.plantFilter);
        }
        if (oFilters.storageLocationFilter && oFilters.storageLocationFilter !== "ALL") {
            aParts.push("Storage " + oFilters.storageLocationFilter);
        }
        if (oFilters.materialTypeFilter && oFilters.materialTypeFilter !== "ALL") {
            aParts.push("Type " + oFilters.materialTypeFilter);
        }

        return aParts.length ? MmHeroUiUtil.buildCriteriaBase(aParts.join(" · ")) : MmHeroUiUtil.UNIQLO_LABEL;
    }

    function _mapTableRow(oItem) {
        return {
            id: _rowId(oItem),
            materialNo: _textOrNoData(oItem.Material),
            materialName: _textOrNoData(oItem.MaterialName),
            plant: _textOrNoData(oItem.Plant),
            storageLocation: _textOrNoData(oItem.StorageLocation),
            materialType: _textOrNoData(oItem.MaterialType),
            stockQty: Number(oItem.StockQty || 0),
            baseUnit: _textOrNoData(oItem.BaseUnit),
            qualityInspectionStock: Number(oItem.QualityInspectionStock || 0),
            blockedStock: Number(oItem.BlockedStock || 0),
            raw: oItem
        };
    }

    function _buildKpis(aItems) {
        var fStockSum = aItems.reduce(function (s, i) { return s + Number(i.StockQty || 0); }, 0);
        var fQISum = aItems.reduce(function (s, i) { return s + Number(i.QualityInspectionStock || 0); }, 0);
        var fBlockedSum = aItems.reduce(function (s, i) { return s + Number(i.BlockedStock || 0); }, 0);

        return [
            {
                label: "Total Materials",
                displayTitle: "Total Materials",
                value: String(aItems.length),
                unit: "EA",
                hint: "Z_C_MM_INVENTORY 건수",
                accent: "teal",
                icon: "sap-icon://product"
            },
            {
                label: "Total Stock Qty",
                displayTitle: "Total Stock Qty",
                value: String(Math.round(fStockSum)),
                unit: "EA",
                hint: "StockQty 합계",
                accent: "green",
                icon: "sap-icon://inventory"
            },
            {
                label: "Quality Inspection",
                displayTitle: "Quality Inspection",
                value: String(Math.round(fQISum)),
                unit: "EA",
                hint: "QualityInspectionStock 합계",
                accent: "amber",
                icon: "sap-icon://quality-issue"
            },
            {
                label: "Blocked Stock",
                displayTitle: "Blocked Stock",
                value: String(Math.round(fBlockedSum)),
                unit: "EA",
                hint: "BlockedStock 합계",
                accent: fBlockedSum > 0 ? "danger" : "green",
                icon: "sap-icon://locked"
            }
        ];
    }

    function _emptyChart(sMsg) {
        return "<div class='nxMmOverviewChartEmpty'>" + (sMsg || NO_DATA) + "</div>";
    }

    function _buildAnalysisCharts(aItems) {
        var mTypeStock = {};
        var mPlantStock = {};
        var aTypeRows;
        var aPlantRows;

        aItems.forEach(function (oItem) {
            var sType = oItem.MaterialType || NO_DATA;
            var sPlant = oItem.Plant || NO_DATA;
            mTypeStock[sType] = (mTypeStock[sType] || 0) + Number(oItem.StockQty || 0);
            mPlantStock[sPlant] = (mPlantStock[sPlant] || 0) + Number(oItem.StockQty || 0);
        });

        aTypeRows = Object.keys(mTypeStock).map(function (sKey) {
            return { label: sKey, value: mTypeStock[sKey] };
        }).sort(function (a, b) { return b.value - a.value; });

        aPlantRows = Object.keys(mPlantStock).map(function (sKey) {
            return { label: sKey, value: mPlantStock[sKey] };
        }).sort(function (a, b) { return b.value - a.value; });

        return [
            {
                title: "Stock by Material Type",
                subtitle: "MaterialType별 StockQty",
                html: aTypeRows.length ? MmChartHtmlUtil.buildInventoryAnalysisTypeBar(aTypeRows) : _emptyChart(NO_DATA),
                cardKey: "type",
                icon: "sap-icon://pie-chart"
            },
            {
                title: "Stock by Plant",
                subtitle: "Plant별 StockQty",
                html: aPlantRows.length ? MmChartHtmlUtil.buildInventoryAnalysisTypeBar(aPlantRows) : _emptyChart(NO_DATA),
                cardKey: "fill",
                icon: "sap-icon://horizontal-bar-chart"
            }
        ];
    }

    function _buildDetail(oItem) {
        if (!oItem) {
            return {
                hasSelection: false,
                materialNo: "",
                materialName: "",
                plant: "",
                storageLocation: "",
                materialType: "",
                stockQty: "",
                qualityInspectionStock: "",
                blockedStock: "",
                dataSource: "",
                infoMessage: "",
                emptyMessage: "왼쪽 자재 목록에서 자재를 선택하면 상세 정보가 표시됩니다."
            };
        }

        var sUnit = _textOrNoData(oItem.BaseUnit);

        return {
            hasSelection: true,
            materialNo: _textOrNoData(oItem.Material),
            materialName: _textOrNoData(oItem.MaterialName),
            plant: _textOrNoData(oItem.Plant),
            storageLocation: _textOrNoData(oItem.StorageLocation),
            materialType: _textOrNoData(oItem.MaterialType),
            stockQty: _textOrNoData(oItem.StockQty) + (sUnit !== NO_DATA ? " " + sUnit : ""),
            qualityInspectionStock: _textOrNoData(oItem.QualityInspectionStock),
            blockedStock: _textOrNoData(oItem.BlockedStock),
            dataSource: "Z_C_MM_INVENTORY_CDS / Z_C_MM_INVENTORY",
            infoMessage: "BOM 부족 정보(ShortageQty·Status)는 BomStockSet 별도 연결 필요",
            emptyMessage: ""
        };
    }

    function _findSelectedItem(aFiltered, sSelectedId, aAll) {
        var aSource = aFiltered.length ? aFiltered : aAll;
        var i;

        if (sSelectedId) {
            for (i = 0; i < aSource.length; i++) {
                if (_rowId(aSource[i]) === sSelectedId) {
                    return aSource[i];
                }
            }
        }

        return null;
    }

    function buildInventoryState(oCache, oFilters, sSelectedId) {
        var aAll = oCache.items || [];
        var aFiltered = _applyFilters(aAll, oFilters);
        var aTable = aFiltered.map(_mapTableRow);
        var oSelectedRaw = _findSelectedItem(aFiltered, sSelectedId, aAll);

        if (!oSelectedRaw && aFiltered.length > 0) {
            oSelectedRaw = aFiltered[0];
        }

        return {
            loading: false,
            loaded: true,
            error: "",
            criteriaLabel: _criteriaLabel(oFilters),
            heroFilterLine: MmHeroUiUtil.buildFilterLine(aFiltered.length),
            recordCount: aFiltered.length,
            odataBadge: "Z_C_MM_INVENTORY",
            lastUpdated: oCache.lastUpdated || NO_DATA,
            materialSearch: oFilters.materialSearch || "",
            plantFilter: oFilters.plantFilter || "ALL",
            storageLocationFilter: oFilters.storageLocationFilter || "ALL",
            materialTypeFilter: oFilters.materialTypeFilter || "ALL",
            plantOptions: _buildDistinctOptions(aAll, "Plant"),
            storageLocationOptions: _buildDistinctOptions(aAll, "StorageLocation"),
            materialTypeOptions: _buildDistinctOptions(aAll, "MaterialType"),
            kpis: _buildKpis(aFiltered),
            materials: aTable,
            selectedMaterialId: oSelectedRaw ? _rowId(oSelectedRaw) : "",
            detail: _buildDetail(oSelectedRaw),
            analysisCharts: _buildAnalysisCharts(aFiltered)
        };
    }

    return {
        NO_DATA: NO_DATA,

        loadInventoryData: function (oComponent) {
            var oModel = oComponent.getModel("mmInventory");

            return _readCollection(oModel, ENTITY_SET, MmUpMaterialFilterUtil.getODataFilters("Material")).then(function (aItems) {
                aItems = MmUpMaterialFilterUtil.filterRows(aItems, function (oRow) {
                    return MmUpMaterialFilterUtil.getRowMaterialCode(oRow, "Material");
                });
                return {
                    items: aItems,
                    lastUpdated: aItems.length ? String(aItems.length) + "건" : NO_DATA
                };
            });
        },

        buildInventoryState: buildInventoryState,

        getEmptyState: function () {
            return {
                loading: false,
                loaded: false,
                error: "",
                criteriaLabel: MmHeroUiUtil.UNIQLO_LABEL,
                heroFilterLine: MmHeroUiUtil.buildFilterLine(0),
                recordCount: 0,
                odataBadge: "Z_C_MM_INVENTORY",
                lastUpdated: NO_DATA,
                materialSearch: "",
                plantFilter: "ALL",
                storageLocationFilter: "ALL",
                materialTypeFilter: "ALL",
                plantOptions: [{ key: "ALL", text: "전체" }],
                storageLocationOptions: [{ key: "ALL", text: "전체" }],
                materialTypeOptions: [{ key: "ALL", text: "전체" }],
                kpis: [],
                materials: [],
                selectedMaterialId: "",
                detail: _buildDetail(null),
                analysisCharts: []
            };
        },

        getDefaultFilters: function () {
            return {
                materialSearch: "",
                plantFilter: "ALL",
                storageLocationFilter: "ALL",
                materialTypeFilter: "ALL"
            };
        }
    };
});
