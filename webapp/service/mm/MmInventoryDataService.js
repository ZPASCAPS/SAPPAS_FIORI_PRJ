/**
 * MmInventoryDataService.js
 *
 * MM Inventory 2x2 Dashboard — Z_C_MM_INVENTORY + Z_C_MM_STOCK_POSITION (MMBE).
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmChartHtmlUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmUpMaterialFilterUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmHeroUiUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmBomOverviewConfig",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (SapErrorUtil, MmChartHtmlUtil, MmUpMaterialFilterUtil, MmHeroUiUtil, MmBomOverviewConfig, Filter, FilterOperator) {
    "use strict";

    var NO_DATA = "데이터 없음";
    var DATA_SHORT = "데이터 부족";
    var INVENTORY_SET = "/Z_C_MM_INVENTORY";
    var STOCK_POSITION_SET = "/Z_C_MM_STOCK_POSITION";
    var PRODUCT_HEATTECH = "UP-F-HIT-001";
    var PRODUCT_BAG = "UP-F-BAG-001";

    var BAG_BOM_INVENTORY = [
        { material: "UP-R-NYL-001", qty: 18 },
        { material: "UP-R-PES-001", qty: 6 },
        { material: "UP-R-BZP-001", qty: 1 }
    ];

    var MMBE_TABLE_STOCK_TYPES = [
        { StockType: "UNRESTRICTED", StockTypeName: "Unrestricted Use", SortOrder: 10 },
        { StockType: "ON_ORDER", StockTypeName: "On-order Stock", SortOrder: 20 },
        { StockType: "RESERVED", StockTypeName: "Reserved Stock", SortOrder: 30 },
        { StockType: "SALES_ORDER", StockTypeName: "Sales Order", SortOrder: 40 }
    ];

    function _normalizeCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function _resolveMaterialDisplayName(sCode, sFallback) {
        var oMeta = MmBomOverviewConfig.getMaterialMeta(_normalizeCode(sCode));

        if (oMeta && oMeta.name) {
            return oMeta.name;
        }

        return String(sFallback || sCode || "").trim() || sCode;
    }

    function _formatDisplayQty(fQty) {
        var n;

        if (fQty === null || fQty === undefined || isNaN(fQty)) {
            return 0;
        }

        n = Math.round(fQty * 100) / 100;
        return n % 1 === 0 ? n : parseFloat(n.toFixed(2));
    }

    function _assignStockTypeQty(oSummary, sType, fQty) {
        var s = _normalizeCode(sType);

        if (s === "UNRESTRICTED") {
            oSummary.UnrestrictedStock += fQty;
        } else if (s === "ON_ORDER") {
            oSummary.OnOrderStock += fQty;
        } else if (s === "RESERVED") {
            oSummary.ReservedStock += fQty;
        } else if (s === "SALES_ORDER_UNRE" || s === "SALES_ORDER_UNRESTRICTED") {
            oSummary.SalesOrderUnrestrictedStock += fQty;
        } else if (s === "SALES_ORDER" || s === "SALES_ORDER_STOCK") {
            oSummary.SalesOrderStock += fQty;
        } else if (s === "QUALITY") {
            oSummary.QualityStock += fQty;
        } else if (s === "BLOCKED") {
            oSummary.BlockedStock += fQty;
        } else if (s === "TRANSFER_SLOC") {
            oSummary.TransferStock += fQty;
        } else {
            oSummary.OtherStock += fQty;
        }

        oSummary.TotalStock += fQty;
    }

    function _parseQty(vValue) {
        if (vValue === null || vValue === undefined || vValue === "") {
            return 0;
        }
        var n = parseFloat(String(vValue).replace(/,/g, ""));
        return isNaN(n) ? 0 : n;
    }

    function _readCollection(oModel, sPath, aFilters, sErrorMsg) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error(sErrorMsg || "OData 모델을 찾을 수 없습니다."));
                return;
            }
            oModel.read(sPath, {
                filters: aFilters || [],
                success: function (oData) {
                    resolve(oData.results || []);
                },
                error: function (oError) {
                    reject(new Error(SapErrorUtil.extractMessage(oError, sErrorMsg || "OData 조회에 실패했습니다.")));
                }
            });
        });
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

    function _applyFilters(aItems, oFilters, fnGetFields) {
        var aResult = aItems.slice();
        var sSearch;

        if (oFilters.materialSearch) {
            sSearch = String(oFilters.materialSearch).trim().toUpperCase();
            if (sSearch) {
                aResult = aResult.filter(function (oItem) {
                    var aFields = fnGetFields ? fnGetFields(oItem) : [
                        oItem.Material,
                        oItem.MaterialName,
                        oItem.Plant,
                        oItem.StorageLocation,
                        oItem.MaterialType
                    ];
                    return aFields.some(function (v) {
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

    function _emptySummary(sCode) {
        return {
            Material: sCode,
            MaterialName: "",
            MaterialType: "",
            BaseUnit: "PC",
            UnrestrictedStock: 0,
            OnOrderStock: 0,
            ReservedStock: 0,
            SalesOrderStock: 0,
            SalesOrderUnrestrictedStock: 0,
            QualityStock: 0,
            BlockedStock: 0,
            TransferStock: 0,
            OtherStock: 0,
            TotalStock: 0,
            HasAnyStock: false
        };
    }

    function _buildStockSummaryByMaterial(aStockRows, oFilters) {
        var m = {};
        var aFiltered = _applyFilters(aStockRows, oFilters || {}, function (oItem) {
            return [oItem.Material, oItem.MaterialName, oItem.Plant, oItem.StorageLocation, oItem.MaterialType];
        });

        aFiltered.forEach(function (oRow) {
            var sCode = _normalizeCode(oRow.Material);
            var sType = _normalizeCode(oRow.StockType);
            var fQty = _parseQty(oRow.Quantity);

            if (!sCode) {
                return;
            }

            if (!m[sCode]) {
                m[sCode] = _emptySummary(sCode);
                m[sCode].MaterialName = String(oRow.MaterialName || "").trim();
                m[sCode].MaterialType = String(oRow.MaterialType || "").trim();
                m[sCode].BaseUnit = String(oRow.BaseUnit || "").trim() || "PC";
            }

            if (fQty <= 0) {
                return;
            }

            _assignStockTypeQty(m[sCode], sType, fQty);
        });

        Object.keys(m).forEach(function (sKey) {
            m[sKey].HasAnyStock = m[sKey].TotalStock > 0;
        });

        return m;
    }

    function _aggregateInventoryMaterials(aItems) {
        var m = {};

        aItems.forEach(function (oRow) {
            var sCode = _normalizeCode(oRow.Material);
            if (!sCode) {
                return;
            }
            if (!m[sCode]) {
                var bRaw = MmBomOverviewConfig.getMaterialCodes().indexOf(sCode) >= 0;
                m[sCode] = {
                    material: sCode,
                    materialName: String(oRow.MaterialName || "").trim() || sCode,
                    displayName: _resolveMaterialDisplayName(sCode, String(oRow.MaterialName || "").trim() || sCode),
                    materialType: String(oRow.MaterialType || "").trim() || NO_DATA,
                    baseUnit: String(oRow.BaseUnit || "").trim() || "PC",
                    isRawMaterial: bRaw,
                    isFinishedProduct: !bRaw && MmBomOverviewConfig.getAllMaterialCodes().indexOf(sCode) >= 0
                };
            }
        });

        return m;
    }

    function _mergeInventoryWithStockPosition(aInventoryItems, mStockSummary) {
        var mInv = _aggregateInventoryMaterials(aInventoryItems);
        var mMerged = {};
        var aCodes = [];

        Object.keys(mInv).forEach(function (sCode) {
            aCodes.push(sCode);
        });
        Object.keys(mStockSummary).forEach(function (sCode) {
            if (aCodes.indexOf(sCode) < 0) {
                aCodes.push(sCode);
            }
        });

        aCodes.sort().forEach(function (sCode) {
            var oInv = mInv[sCode];
            var oSum = mStockSummary[sCode] || _emptySummary(sCode);
            var fUnrestricted = oSum.UnrestrictedStock;
            var fTotal = oSum.TotalStock;
            var sDisplay = _formatDisplayQty(fTotal);
            var sHint = "";
            var sUnit = oSum.BaseUnit || (oInv && oInv.baseUnit) || "PC";

            if (fUnrestricted > 0 && Math.abs(fUnrestricted - fTotal) > 0.0001) {
                sHint = "가용 " + _formatDisplayQty(fUnrestricted) + " " + sUnit;
            }

            mMerged[sCode] = {
                id: sCode,
                material: sCode,
                materialName: (oInv && oInv.materialName) || oSum.MaterialName || sCode,
                displayName: _resolveMaterialDisplayName(
                    sCode,
                    (oInv && oInv.materialName) || oSum.MaterialName || sCode
                ),
                materialType: (oInv && oInv.materialType) || oSum.MaterialType || NO_DATA,
                baseUnit: sUnit,
                unrestrictedStock: fUnrestricted,
                totalStock: fTotal,
                salesOrderStock: oSum.SalesOrderStock,
                otherStock: oSum.OtherStock,
                displayStock: sDisplay,
                stockHint: sHint,
                hasAnyStock: oSum.HasAnyStock,
                isRawMaterial: oInv ? oInv.isRawMaterial : MmBomOverviewConfig.getMaterialCodes().indexOf(sCode) >= 0,
                isFinishedProduct: oInv ? oInv.isFinishedProduct : false
            };
        });

        return Object.keys(mMerged).sort().map(function (sKey) {
            return mMerged[sKey];
        });
    }

    function _buildStockPositionFilters(sMaterial, oFilters) {
        var aFilters = [
            new Filter("Material", FilterOperator.EQ, _normalizeCode(sMaterial))
        ];

        if (oFilters && oFilters.plantFilter && oFilters.plantFilter !== "ALL") {
            aFilters.push(new Filter("Plant", FilterOperator.EQ, oFilters.plantFilter));
        }

        if (oFilters && oFilters.storageLocationFilter && oFilters.storageLocationFilter !== "ALL") {
            aFilters.push(new Filter("StorageLocation", FilterOperator.EQ, oFilters.storageLocationFilter));
        }

        return aFilters;
    }

    function _sortStockPositionRows(aRows) {
        return aRows.slice().sort(function (a, b) {
            if (a.SortOrder !== b.SortOrder) {
                return a.SortOrder - b.SortOrder;
            }
            return String(a.StockTypeName).localeCompare(String(b.StockTypeName));
        });
    }

    function _buildStockTypeCatalog(aStockRows) {
        var m = {};

        (aStockRows || []).forEach(function (oRow) {
            var sType = _normalizeCode(oRow.StockType);
            if (!sType) {
                return;
            }
            if (!m[sType]) {
                m[sType] = {
                    StockType: String(oRow.StockType || "").trim(),
                    StockTypeName: String(oRow.StockTypeName || oRow.StockType || "").trim(),
                    SortOrder: Number(oRow.SortOrder || 999)
                };
            } else if (Number(oRow.SortOrder || 999) < m[sType].SortOrder) {
                m[sType].SortOrder = Number(oRow.SortOrder);
            }
        });

        return Object.keys(m).map(function (sKey) {
            return m[sKey];
        }).sort(function (a, b) {
            return a.SortOrder - b.SortOrder;
        });
    }

    function _mergeStockTypeCatalogs() {
        var m = {};
        var aMerged = [];
        var iArg;

        function fnAdd(aList) {
            (aList || []).forEach(function (oType) {
                var sType = _normalizeCode(oType.StockType);
                if (!sType) {
                    return;
                }
                if (!m[sType]) {
                    m[sType] = {
                        StockType: oType.StockType,
                        StockTypeName: oType.StockTypeName,
                        SortOrder: Number(oType.SortOrder || 999)
                    };
                } else if (Number(oType.SortOrder || 999) < m[sType].SortOrder) {
                    m[sType].SortOrder = Number(oType.SortOrder);
                }
            });
        }

        for (iArg = 0; iArg < arguments.length; iArg++) {
            if (Array.isArray(arguments[iArg])) {
                fnAdd(arguments[iArg]);
            }
        }

        Object.keys(m).forEach(function (sKey) {
            aMerged.push(m[sKey]);
        });

        aMerged.sort(function (a, b) {
            return a.SortOrder - b.SortOrder;
        });

        return aMerged;
    }

    function _canonicalMmbeTableStockType(sType) {
        var s = _normalizeCode(sType);

        if (s === "SALES_ORDER_STOCK") {
            return "SALES_ORDER";
        }

        return s;
    }

    function _isMmbeTableStockType(sType) {
        var sCanon = _canonicalMmbeTableStockType(sType);

        return MMBE_TABLE_STOCK_TYPES.some(function (oType) {
            return oType.StockType === sCanon;
        });
    }

    function _buildMmbeTableCatalog() {
        var mBase = {};
        var i;

        MMBE_TABLE_STOCK_TYPES.forEach(function (oType) {
            mBase[oType.StockType] = {
                StockType: oType.StockType,
                StockTypeName: oType.StockTypeName,
                SortOrder: oType.SortOrder
            };
        });

        function fnEnrich(aList) {
            (aList || []).forEach(function (oType) {
                var sCanon = _canonicalMmbeTableStockType(oType.StockType);

                if (!mBase[sCanon]) {
                    return;
                }

                if (oType.StockTypeName) {
                    mBase[sCanon].StockTypeName = String(oType.StockTypeName).trim();
                }
                if (Number(oType.SortOrder || 0) > 0) {
                    mBase[sCanon].SortOrder = Number(oType.SortOrder);
                }
            });
        }

        for (i = 0; i < arguments.length; i++) {
            if (Array.isArray(arguments[i])) {
                fnEnrich(arguments[i]);
            }
        }

        return MMBE_TABLE_STOCK_TYPES.map(function (oType) {
            return mBase[oType.StockType];
        });
    }

    function _filterRowsForMmbeTable(aRows, aCatalog) {
        var mCatalog = {};
        var aResult = [];

        (aCatalog || []).forEach(function (oType) {
            mCatalog[_normalizeCode(oType.StockType)] = oType;
        });

        (aRows || []).forEach(function (oRow) {
            var sCanon = _canonicalMmbeTableStockType(oRow.StockType);
            var oCat;

            if (!_isMmbeTableStockType(sCanon)) {
                return;
            }

            oCat = mCatalog[sCanon] || {};

            aResult.push({
                Material: oRow.Material,
                Plant: oRow.Plant,
                StorageLocation: oRow.StorageLocation,
                StockType: oCat.StockType || sCanon,
                StockTypeName: oCat.StockTypeName || sCanon,
                SortOrder: Number(oCat.SortOrder || oRow.SortOrder || 999),
                MaterialName: oRow.MaterialName,
                MaterialType: oRow.MaterialType,
                BaseUnit: oRow.BaseUnit,
                Quantity: oRow.Quantity
            });
        });

        return aResult;
    }

    function _buildMmbeTableRows(aSourceRows, aCatalog, aLocations, oMeta) {
        return _fillMissingStockTypeRows(
            _filterRowsForMmbeTable(aSourceRows, aCatalog),
            aCatalog,
            aLocations,
            oMeta
        );
    }

    function _getMaterialMetaFromInventory(aInventoryItems, sMaterial) {
        var sMat = _normalizeCode(sMaterial);
        var oFound = null;

        (aInventoryItems || []).some(function (oRow) {
            if (_normalizeCode(oRow.Material) === sMat) {
                oFound = oRow;
                return true;
            }
            return false;
        });

        return {
            material: sMat,
            materialName: oFound ? String(oFound.MaterialName || "").trim() || sMat : sMat,
            materialType: oFound ? String(oFound.MaterialType || "").trim() : "",
            baseUnit: oFound ? String(oFound.BaseUnit || "").trim() || "PC" : "PC"
        };
    }

    function _collapseMaterialLocations(aLocations) {
        var mByPlant = {};
        var aResult = [];

        (aLocations || []).forEach(function (oLoc) {
            var sPlant = String(oLoc.Plant || "").trim();
            var sSloc = String(oLoc.StorageLocation || "").trim();

            if (!sPlant && !sSloc) {
                return;
            }

            if (!mByPlant[sPlant]) {
                mByPlant[sPlant] = {};
            }
            mByPlant[sPlant][sSloc || ""] = true;
        });

        Object.keys(mByPlant).sort().forEach(function (sPlant) {
            var aSlocs = Object.keys(mByPlant[sPlant]);
            var aNonEmpty = aSlocs.filter(function (sSloc) {
                return !!sSloc;
            });

            if (aNonEmpty.length) {
                aNonEmpty.sort().forEach(function (sSloc) {
                    aResult.push({
                        Plant: sPlant,
                        StorageLocation: sSloc
                    });
                });
            } else {
                aResult.push({
                    Plant: sPlant,
                    StorageLocation: ""
                });
            }
        });

        return aResult;
    }

    function _pickPreferredStockRow(oCurrent, oCandidate) {
        var sCurrentSloc = String(oCurrent.StorageLocation || "").trim();
        var sCandidateSloc = String(oCandidate.StorageLocation || "").trim();
        var fCurrentQty = _parseQty(oCurrent.Quantity);
        var fCandidateQty = _parseQty(oCandidate.Quantity);

        if (!sCurrentSloc && sCandidateSloc) {
            return oCandidate;
        }
        if (sCurrentSloc && !sCandidateSloc) {
            return oCurrent;
        }
        if (fCandidateQty > fCurrentQty) {
            return oCandidate;
        }
        if (fCandidateQty < fCurrentQty) {
            return oCurrent;
        }
        if (sCandidateSloc && !sCurrentSloc) {
            return oCandidate;
        }
        if (String(oCandidate.StockTypeName || "").length > String(oCurrent.StockTypeName || "").length) {
            return oCandidate;
        }
        return oCurrent;
    }

    function _dedupeStockPositionRows(aRows) {
        var m = {};
        var aResult = [];

        (aRows || []).forEach(function (oRow) {
            var sKey = _normalizeCode(oRow.Plant) + "|" + _normalizeCode(oRow.StockType);

            if (!m[sKey]) {
                m[sKey] = oRow;
                return;
            }

            m[sKey] = _pickPreferredStockRow(m[sKey], oRow);
        });

        Object.keys(m).forEach(function (sKey) {
            aResult.push(m[sKey]);
        });

        return _sortStockPositionRows(aResult);
    }

    function _resolveMaterialLocations(aMaterialRows, aInventoryItems, sMaterial, oFilters) {
        var sMat = _normalizeCode(sMaterial);
        var mLoc = {};
        var aLocations = [];

        function fnAddLoc(sPlant, sSloc) {
            var sPlantVal = String(sPlant || "").trim();
            var sSlocVal = String(sSloc || "").trim();
            var sKey;

            if (!sPlantVal && !sSlocVal) {
                return;
            }

            sKey = sPlantVal + "|" + sSlocVal;
            if (!mLoc[sKey]) {
                mLoc[sKey] = true;
                aLocations.push({
                    Plant: sPlantVal,
                    StorageLocation: sSlocVal
                });
            }
        }

        (aMaterialRows || []).forEach(function (oRow) {
            fnAddLoc(oRow.Plant, oRow.StorageLocation);
        });

        (aInventoryItems || []).forEach(function (oRow) {
            if (_normalizeCode(oRow.Material) !== sMat) {
                return;
            }
            fnAddLoc(oRow.Plant, oRow.StorageLocation);
        });

        if (oFilters && oFilters.plantFilter && oFilters.plantFilter !== "ALL") {
            aLocations = aLocations.filter(function (oLoc) {
                return oLoc.Plant === oFilters.plantFilter;
            });
        }

        if (oFilters && oFilters.storageLocationFilter && oFilters.storageLocationFilter !== "ALL") {
            aLocations = aLocations.filter(function (oLoc) {
                return oLoc.StorageLocation === oFilters.storageLocationFilter;
            });
        }

        if (!aLocations.length && oFilters) {
            if (oFilters.plantFilter && oFilters.plantFilter !== "ALL") {
                fnAddLoc(oFilters.plantFilter, oFilters.storageLocationFilter !== "ALL" ? oFilters.storageLocationFilter : "");
            }
        }

        return _collapseMaterialLocations(aLocations);
    }

    function _fillMissingStockTypeRows(aMaterialRows, aCatalog, aLocations, oMeta) {
        var aResult = (aMaterialRows || []).slice();
        var mExisting = {};
        var i;
        var j;

        if (!aCatalog || !aCatalog.length) {
            return _dedupeStockPositionRows(aResult);
        }

        aResult.forEach(function (oRow) {
            mExisting[_normalizeCode(oRow.Plant) + "|" + _normalizeCode(oRow.StockType)] = true;
        });

        if (!aLocations.length) {
            aLocations = [{ Plant: "", StorageLocation: "" }];
        }

        for (i = 0; i < aLocations.length; i++) {
            for (j = 0; j < aCatalog.length; j++) {
                var oLoc = aLocations[i];
                var oType = aCatalog[j];
                var sKey = _normalizeCode(oLoc.Plant) + "|" + _normalizeCode(oType.StockType);

                if (mExisting[sKey]) {
                    continue;
                }

                aResult.push({
                    Material: oMeta.material,
                    Plant: oLoc.Plant,
                    StorageLocation: oLoc.StorageLocation,
                    StockType: oType.StockType,
                    StockTypeName: oType.StockTypeName,
                    SortOrder: oType.SortOrder,
                    MaterialName: oMeta.materialName,
                    MaterialType: oMeta.materialType,
                    BaseUnit: oMeta.baseUnit,
                    Quantity: 0
                });
                mExisting[sKey] = true;
            }
        }

        return _dedupeStockPositionRows(aResult);
    }

    function _normalizeStockPositionRows(aStockRows, oFilters, sMaterial) {
        var sMat = _normalizeCode(sMaterial);
        var aFiltered = _applyFilters(aStockRows, oFilters || {}, function (oItem) {
            return [oItem.Material, oItem.MaterialName, oItem.Plant, oItem.StorageLocation, oItem.MaterialType];
        });

        return _sortStockPositionRows(aFiltered.filter(function (oRow) {
            return _normalizeCode(oRow.Material) === sMat;
        }).map(function (oRow) {
            return {
                Material: String(oRow.Material || "").trim(),
                Plant: String(oRow.Plant || "").trim(),
                StorageLocation: String(oRow.StorageLocation || "").trim(),
                StockType: String(oRow.StockType || "").trim(),
                StockTypeName: String(oRow.StockTypeName || oRow.StockType || "").trim(),
                SortOrder: Number(oRow.SortOrder || 0),
                MaterialName: String(oRow.MaterialName || "").trim(),
                MaterialType: String(oRow.MaterialType || "").trim(),
                BaseUnit: String(oRow.BaseUnit || "").trim() || "PC",
                Quantity: oRow.Quantity
            };
        }));
    }

    function _getSelectedStockPosition(aStockRows, sMaterial, oFilters) {
        return _normalizeStockPositionRows(aStockRows, oFilters, sMaterial);
    }

    function _getUnrestrictedMap(mStockSummary) {
        var m = {};
        var aCodes = MmBomOverviewConfig.getMaterialCodes();

        aCodes.forEach(function (sCode) {
            m[sCode] = mStockSummary[sCode] ? mStockSummary[sCode].UnrestrictedStock : 0;
        });

        return m;
    }

    function _calcProductAvailability(aBom, mUnrestricted) {
        var aRatios = [];
        var iMin = null;
        var sBottleneck = "재고 없음";
        var i;

        for (i = 0; i < aBom.length; i++) {
            var oComp = aBom[i];
            var oMeta = MmBomOverviewConfig.getMaterialMeta(oComp.material);
            var fStock = mUnrestricted[oComp.material];

            if (fStock === null || fStock === undefined) {
                fStock = 0;
            }

            aRatios.push({
                material: oComp.material,
                name: oMeta ? oMeta.name : oComp.material,
                ratio: fStock / oComp.qty
            });
        }

        if (!aRatios.length) {
            return {
                qty: null,
                display: DATA_SHORT,
                bottleneck: DATA_SHORT
            };
        }

        aRatios.sort(function (a, b) {
            return a.ratio - b.ratio;
        });

        iMin = Math.floor(aRatios[0].ratio);
        sBottleneck = aRatios[0].name + " (" + aRatios[0].material + ")";

        return {
            qty: iMin,
            display: String(iMin),
            bottleneck: sBottleneck
        };
    }

    function _calculateCurrentProduction(mUnrestricted) {
        var oHeat = _calcProductAvailability(MmBomOverviewConfig.getProductBom(PRODUCT_HEATTECH), mUnrestricted);
        var oBag = _calcProductAvailability(BAG_BOM_INVENTORY, mUnrestricted);

        return {
            heattechQty: oHeat.qty,
            heattechDisplay: oHeat.display,
            bagQty: oBag.qty,
            bagDisplay: oBag.display,
            heattechBottleneck: oHeat.bottleneck,
            bagBottleneck: oBag.bottleneck,
            description: "현재 사용 가능 재고(UnrestrictedStock) 기준으로 계산된 생산 가능 수량입니다."
        };
    }

    function _sanitizeTarget(nValue) {
        var n = Math.floor(Number(nValue || 0));
        if (isNaN(n) || n < 0) {
            return 0;
        }
        return n;
    }

    function _buildWhatIfRequirements(iHeat, iBag) {
        return {
            "UP-R-PES-001": (iHeat * 5) + (iBag * 6),
            "UP-R-ACR-001": iHeat * 4,
            "UP-R-RAY-001": iHeat * 3,
            "UP-R-PUR-001": iHeat * 1,
            "UP-R-NYL-001": iBag * 18,
            "UP-R-BZP-001": iBag * 1
        };
    }

    function _calculateWhatIf(mUnrestricted, oTargets) {
        var iHeat = _sanitizeTarget(oTargets.heattechTarget);
        var iBag = _sanitizeTarget(oTargets.bagTarget);
        var mRequired = _buildWhatIfRequirements(iHeat, iBag);
        var aMaterials = [];
        var aInsufficient = [];
        var aSufficient = [];
        var bHasTarget = iHeat > 0 || iBag > 0;
        var bCanProduce = true;

        Object.keys(mRequired).forEach(function (sCode) {
            var iRequired = mRequired[sCode];
            if (iRequired <= 0) {
                return;
            }

            var oMeta = MmBomOverviewConfig.getMaterialMeta(sCode);
            var fStock = mUnrestricted[sCode] !== undefined && mUnrestricted[sCode] !== null
                ? mUnrestricted[sCode]
                : 0;
            var iShortage = Math.max(0, iRequired - fStock);
            var fFulfillment = iRequired > 0 ? (fStock / iRequired) * 100 : 0;
            var fDisplayPct = Math.min(100, Math.round(fFulfillment));
            var sState = "None";
            var bSufficient = fStock >= iRequired;

            if (fFulfillment >= 100) {
                sState = "Success";
            } else if (fFulfillment >= 50) {
                sState = "Warning";
            } else {
                sState = "Error";
            }

            if (!bSufficient) {
                bCanProduce = false;
                aInsufficient.push(oMeta ? oMeta.name : sCode);
            } else {
                aSufficient.push(oMeta ? oMeta.name : sCode);
            }

            aMaterials.push({
                material: sCode,
                materialName: oMeta ? oMeta.name : sCode,
                requiredQty: iRequired,
                stockQty: Math.round(fStock),
                stockDisplay: String(Math.round(fStock)) + " PC",
                shortageQty: iShortage,
                shortageDisplay: String(iShortage) + " PC",
                fulfillmentPct: fDisplayPct,
                fulfillmentActual: Math.round(fFulfillment * 10) / 10,
                fulfillmentDisplay: fDisplayPct + "% (실제 " + (Math.round(fFulfillment * 10) / 10) + "%)",
                progressState: sState,
                statusText: bSufficient ? "충분" : "부족"
            });
        });

        return {
            heattechTarget: iHeat,
            bagTarget: iBag,
            hasTarget: bHasTarget,
            hasResult: bHasTarget && aMaterials.length > 0,
            canProduce: bHasTarget && bCanProduce,
            statusMessage: !bHasTarget
                ? "MRP 생산량을 입력해 주세요."
                : (bCanProduce ? "MRP 생산량 기준 자재가 충분합니다." : "부족 자재가 있어 MRP 생산에 추가 확인이 필요합니다."),
            insufficient: aInsufficient,
            sufficient: aSufficient,
            materials: aMaterials
        };
    }

    function _buildMaterialDistribution(aMergedMaterials, sDistributionCategory, sSelectedMaterial) {
        var sCategory = String(sDistributionCategory || "ALL").toUpperCase();
        var aFiltered = _filterMaterialsByCategory(aMergedMaterials, sCategory);
        var sSel = _normalizeCode(sSelectedMaterial);
        var aRows = [];
        var iTotalQty = 0;
        var sDesc;

        aFiltered.forEach(function (oMat) {
            var fStock = Number(oMat.totalStock || 0);

            if (fStock <= 0) {
                return;
            }

            iTotalQty += fStock;
            aRows.push({
                material: oMat.material,
                label: oMat.materialName || oMat.material,
                value: fStock,
                unit: oMat.baseUnit || "PC",
                isSelected: !!sSel && sSel === oMat.material,
                isFinished: !!oMat.isFinishedProduct,
                isRaw: !!oMat.isRawMaterial
            });
        });

        aRows.sort(function (a, b) {
            return b.value - a.value;
        });

        if (!aRows.length) {
            return {
                categoryFilter: sCategory,
                materialCount: aFiltered.length,
                totalStock: 0,
                description: "",
                hasChart: false,
                emptyMessage: sCategory === "FINISHED"
                    ? "완제품 재고가 없습니다."
                    : (sCategory === "RAW" ? "원자재 재고가 없습니다." : "표시할 재고가 없습니다."),
                html: ""
            };
        }

        if (sCategory === "FINISHED") {
            sDesc = "완제품 " + aRows.length + "종 · 총 " + _formatDisplayQty(iTotalQty) + " PC";
        } else if (sCategory === "RAW") {
            sDesc = "원자재 " + aRows.length + "종 · 총 " + _formatDisplayQty(iTotalQty) + " PC";
        } else {
            sDesc = "자재 " + aRows.length + "종 · 총 " + _formatDisplayQty(iTotalQty) + " PC";
        }

        return {
            categoryFilter: sCategory,
            materialCount: aRows.length,
            totalStock: iTotalQty,
            description: sDesc,
            hasChart: true,
            emptyMessage: "",
            html: MmChartHtmlUtil.buildInventoryMaterialDistributionBar(aRows)
        };
    }

    function _buildMmbeCompositionDonut(sSelectedMaterial, mStockSummary, oSelectedMeta) {
        var mCounts = {};
        var iTotal = 0;
        var sMat = _normalizeCode(sSelectedMaterial);
        var sName = oSelectedMeta ? (oSelectedMeta.materialName || sMat) : sMat;
        var sDesc = sMat
            ? sName + " · MMBE Stock Type별 재고 구성"
            : "자재를 선택하면 Stock Type별 재고 구성이 표시됩니다.";

        if (sMat && mStockSummary[sMat]) {
            var oSel = mStockSummary[sMat];

            if (oSel.UnrestrictedStock > 0) {
                mCounts["사용 가능 재고"] = oSel.UnrestrictedStock;
            }
            if (oSel.ReservedStock > 0) {
                mCounts["Reserved Stock"] = oSel.ReservedStock;
            }
            if (oSel.QualityStock > 0) {
                mCounts["품질검사 재고"] = oSel.QualityStock;
            }
            if (oSel.BlockedStock > 0) {
                mCounts["보류 재고"] = oSel.BlockedStock;
            }
            if (oSel.TransferStock > 0) {
                mCounts["이전/이송 재고"] = oSel.TransferStock;
            }
            if (oSel.SalesOrderStock > 0) {
                mCounts["Sales Order 재고"] = oSel.SalesOrderStock;
            }
            if (oSel.OtherStock > 0) {
                mCounts["기타 재고"] = oSel.OtherStock;
            }
            iTotal = oSel.TotalStock;
        }

        if (iTotal <= 0) {
            return {
                description: sDesc,
                hasChart: false,
                emptyMessage: sMat ? "선택한 자재의 보유 재고가 없습니다." : "자재를 선택해 주세요.",
                html: ""
            };
        }

        return {
            description: sDesc,
            hasChart: true,
            emptyMessage: "",
            html: MmChartHtmlUtil.buildInventoryAnalysisStatusDonut(mCounts, iTotal)
        };
    }

    function _buildStockComposition(aMergedMaterials, sDistributionCategory, sSelectedMaterial, mStockSummary, sCompositionTab) {
        var sTab = String(sCompositionTab || "DISTRIBUTION").toUpperCase();
        var oSelectedMeta = null;
        var sMat = _normalizeCode(sSelectedMaterial);
        var oDistribution;
        var oMmbe;
        var oActive;

        if (sMat) {
            oSelectedMeta = aMergedMaterials.filter(function (m) {
                return m.material === sMat;
            })[0] || null;
        }

        oDistribution = _buildMaterialDistribution(aMergedMaterials, sDistributionCategory, sSelectedMaterial);
        oMmbe = _buildMmbeCompositionDonut(sSelectedMaterial, mStockSummary, oSelectedMeta);
        oActive = sTab === "MMBE" ? oMmbe : oDistribution;

        return {
            activeTab: sTab,
            categoryFilter: oDistribution.categoryFilter,
            distribution: oDistribution,
            mmbe: oMmbe,
            description: oActive.description,
            hasChart: oActive.hasChart,
            emptyMessage: oActive.emptyMessage,
            html: oActive.html
        };
    }

    function _buildUnitBomPanel(sProductCode, sProductName, aBom, sTheme) {
        var aComponents = [];
        var iTotalQty = 0;
        var i;

        for (i = 0; i < aBom.length; i++) {
            var oComp = aBom[i];
            var oMeta = MmBomOverviewConfig.getMaterialMeta(oComp.material);
            var sName = oMeta ? oMeta.name : oComp.material;

            iTotalQty += oComp.qty;
            aComponents.push({
                material: oComp.material,
                materialName: sName,
                qtyPerUnit: oComp.qty,
                unit: "PC",
                shared: !!(oMeta && oMeta.shared),
                qtyDisplay: String(oComp.qty) + " PC"
            });
        }

        return {
            productCode: sProductCode,
            productName: sProductName,
            theme: sTheme,
            componentCount: aComponents.length,
            totalQtyPerUnit: iTotalQty,
            summaryText: "원자재 " + aComponents.length + "종 · 1PC당 총 " + iTotalQty + " PC 투입",
            components: aComponents
        };
    }

    function _buildUnitBomStockMix(aComponents, mUnrestricted) {
        var iTotalStock = 0;
        var aRows;

        aComponents.forEach(function (oComp) {
            var fStock = Number(mUnrestricted[_normalizeCode(oComp.material)] || 0);

            if (fStock > 0) {
                iTotalStock += fStock;
            }
        });

        aRows = aComponents.map(function (oComp) {
            var fStock = Number(mUnrestricted[_normalizeCode(oComp.material)] || 0);
            var fPct = iTotalStock > 0 ? (fStock / iTotalStock) * 100 : 0;

            return {
                material: oComp.material,
                materialName: oComp.materialName,
                qtyPerUnit: oComp.qtyPerUnit,
                stockQty: fStock,
                unit: oComp.unit || "PC",
                shared: !!oComp.shared,
                mixPct: Math.round(fPct * 10) / 10,
                barPct: iTotalStock > 0 && fStock > 0 ? Math.max(6, Math.round(fPct)) : 0,
                qtyDisplay: _formatDisplayQty(fStock) + " PC",
                mixDisplay: fPct.toFixed(1) + "%"
            };
        }).filter(function (oRow) {
            return oRow.stockQty > 0;
        });

        aRows.sort(function (a, b) {
            return b.stockQty - a.stockQty;
        });

        return {
            rows: aRows,
            totalStock: iTotalStock,
            hasChart: iTotalStock > 0
        };
    }

    function _buildUnitBomMix(aComponents) {
        var iTotal = 0;
        var i;

        for (i = 0; i < aComponents.length; i++) {
            iTotal += Number(aComponents[i].qtyPerUnit || 0);
        }

        return aComponents.map(function (oComp) {
            var iQty = Number(oComp.qtyPerUnit || 0);
            var fPct = iTotal > 0 ? (iQty / iTotal) * 100 : 0;

            return {
                material: oComp.material,
                materialName: oComp.materialName,
                qtyPerUnit: iQty,
                unit: oComp.unit || "PC",
                shared: !!oComp.shared,
                mixPct: Math.round(fPct * 10) / 10,
                barPct: iTotal > 0 ? Math.max(6, Math.round(fPct)) : 0,
                qtyDisplay: String(iQty) + " PC",
                mixDisplay: fPct.toFixed(1) + "%"
            };
        });
    }

    function _buildUnitBomComparison(aHeatComponents, aBagComponents) {
        var m = {};
        var aRows = [];
        var fMax = 1;

        function fnAdd(aList, sField) {
            aList.forEach(function (oComp) {
                if (!m[oComp.material]) {
                    m[oComp.material] = {
                        material: oComp.material,
                        materialName: oComp.materialName,
                        heattechQty: 0,
                        bagQty: 0,
                        shared: !!oComp.shared
                    };
                }
                m[oComp.material][sField] = oComp.qtyPerUnit;
                if (oComp.shared) {
                    m[oComp.material].shared = true;
                }
            });
        }

        fnAdd(aHeatComponents, "heattechQty");
        fnAdd(aBagComponents, "bagQty");

        Object.keys(m).sort().forEach(function (sKey) {
            aRows.push(m[sKey]);
        });

        aRows.forEach(function (oRow) {
            fMax = Math.max(fMax, oRow.heattechQty, oRow.bagQty);
        });

        aRows.forEach(function (oRow) {
            oRow.maxQty = fMax;
            oRow.heattechPct = oRow.heattechQty > 0 ? Math.max(8, Math.round((oRow.heattechQty / fMax) * 100)) : 0;
            oRow.bagPct = oRow.bagQty > 0 ? Math.max(8, Math.round((oRow.bagQty / fMax) * 100)) : 0;
            oRow.heattechDisplay = oRow.heattechQty > 0 ? String(oRow.heattechQty) + " PC" : "-";
            oRow.bagDisplay = oRow.bagQty > 0 ? String(oRow.bagQty) + " PC" : "-";
            oRow.sharedLabel = oRow.shared ? "공용" : "";
        });

        return aRows;
    }

    function buildUnitBomReference() {
        var oHeat = _buildUnitBomPanel(
            PRODUCT_HEATTECH,
            "히트텍",
            MmBomOverviewConfig.getProductBom(PRODUCT_HEATTECH),
            "heat"
        );
        var oBag = _buildUnitBomPanel(
            PRODUCT_BAG,
            "가방",
            BAG_BOM_INVENTORY,
            "bag"
        );

        return {
            description: "완제품 1PC 생산 시 투입되는 원자재 수량입니다. 생산 가능·MRP 계산과 동일한 BOM 기준입니다.",
            note: "폴리에스터 N(UP-R-PES-001)은 히트텍·가방 BOM에서 공용으로 사용됩니다.",
            heattech: oHeat,
            bag: oBag,
            comparison: _buildUnitBomComparison(oHeat.components, oBag.components)
        };
    }

    function _buildProductionBarHtml(oCurrent) {
        var aRows = [];

        if (oCurrent.heattechQty !== null && oCurrent.heattechDisplay !== DATA_SHORT) {
            aRows.push({ label: "히트텍", value: oCurrent.heattechQty });
        } else if (oCurrent.heattechDisplay === "0") {
            aRows.push({ label: "히트텍", value: 0 });
        }

        if (oCurrent.bagQty !== null && oCurrent.bagDisplay !== DATA_SHORT) {
            aRows.push({ label: "가방", value: oCurrent.bagQty });
        } else if (oCurrent.bagDisplay === "0") {
            aRows.push({ label: "가방", value: 0 });
        }

        if (!aRows.length) {
            return "";
        }

        return MmChartHtmlUtil.buildInventoryAnalysisShortageBar(aRows);
    }

    function _buildVisualization(sActiveTab, oCurrent, oWhatIf, oUnitBom, sBomVizTab, mUnrestricted) {
        if (sActiveTab === "BOM") {
            var oHeatStock = _buildUnitBomStockMix(
                (oUnitBom && oUnitBom.heattech && oUnitBom.heattech.components) || [],
                mUnrestricted || {}
            );
            var oBagStock = _buildUnitBomStockMix(
                (oUnitBom && oUnitBom.bag && oUnitBom.bag.components) || [],
                mUnrestricted || {}
            );
            var sTab = String(sBomVizTab || "HEATTECH").toUpperCase();
            var oHeatPanel = {
                description: "히트텍 BOM 원자재 가용 재고 · 총 " + _formatDisplayQty(oHeatStock.totalStock) + " PC",
                hasChart: oHeatStock.hasChart,
                emptyMessage: "히트텍 BOM 원자재의 가용 재고가 없습니다.",
                html: MmChartHtmlUtil.buildInventoryUnitBomMixChart(oHeatStock.rows, "heat", true)
            };
            var oBagPanel = {
                description: "가방 BOM 원자재 가용 재고 · 총 " + _formatDisplayQty(oBagStock.totalStock) + " PC",
                hasChart: oBagStock.hasChart,
                emptyMessage: "가방 BOM 원자재의 가용 재고가 없습니다.",
                html: MmChartHtmlUtil.buildInventoryUnitBomMixChart(oBagStock.rows, "bag", true)
            };
            var oActive = sTab === "BAG" ? oBagPanel : oHeatPanel;

            return {
                mode: "BOM",
                title: "완제품별 BOM 가용 재고 비율",
                description: "BOM 원자재별 현재 UnrestrictedStock 구성 비율입니다.",
                activeTab: sTab,
                hasChart: oHeatPanel.hasChart || oBagPanel.hasChart,
                emptyMessage: "가용 재고가 없습니다.",
                html: oActive.html,
                bom: {
                    activeTab: sTab,
                    heattech: oHeatPanel,
                    bag: oBagPanel
                },
                fulfillmentBars: []
            };
        }

        if (sActiveTab === "WHATIF") {
            if (!oWhatIf.hasTarget) {
                return {
                    mode: "WHATIF",
                    title: "MRP 자재 충족률",
                    description: "MRP 목표 생산 기준 원자재 충족률입니다.",
                    hasChart: false,
                    emptyMessage: "목표 생산량을 입력하면 MRP 자재 충족률이 표시됩니다.",
                    html: "",
                    fulfillmentBars: []
                };
            }

            return {
                mode: "WHATIF",
                title: "MRP 자재 충족률",
                description: "MRP 목표 생산 기준 UnrestrictedStock 충족률입니다.",
                hasChart: oWhatIf.materials.length > 0,
                emptyMessage: NO_DATA,
                html: "",
                fulfillmentBars: oWhatIf.materials
            };
        }

        var sHtml = _buildProductionBarHtml(oCurrent);
        return {
            mode: "CURRENT",
            title: "현재 생산 가능 수량",
            description: "UnrestrictedStock 기준으로 계산된 완제품별 생산 가능 수량입니다.",
            hasChart: !!sHtml,
            emptyMessage: DATA_SHORT,
            html: sHtml,
            fulfillmentBars: []
        };
    }

    function _filterMaterialsByCategory(aMaterials, sCategory) {
        var sFilter = String(sCategory || "ALL").toUpperCase();

        if (sFilter === "RAW") {
            return (aMaterials || []).filter(function (oMat) {
                return !!oMat.isRawMaterial;
            });
        }

        if (sFilter === "FINISHED") {
            return (aMaterials || []).filter(function (oMat) {
                return !!oMat.isFinishedProduct;
            });
        }

        return (aMaterials || []).slice();
    }

    function buildInventoryAnalysis(oCache, oFilters, sSelectedMaterial, oWhatIf, sActiveTab, sMaterialCategoryFilter, sDistributionCategoryFilter, sCompositionTab, sBomVizTab) {
        var aAllInv = oCache.items || [];
        var aAllStock = oCache.stockPositionRows || [];
        var aFilteredInv = _applyFilters(aAllInv, oFilters);
        var mStockSummary = _buildStockSummaryByMaterial(aAllStock, oFilters);
        var aMerged = _mergeInventoryWithStockPosition(aFilteredInv, mStockSummary);
        var sCategory = String(sMaterialCategoryFilter || "ALL").toUpperCase();
        var aMaterialList = _filterMaterialsByCategory(aMerged, sCategory);
        var sSelected = _normalizeCode(sSelectedMaterial);
        var aSelectedStock = sSelected ? _getSelectedStockPosition(aAllStock, sSelected, oFilters) : [];
        var oSelectedMeta = null;
        var mUnrestricted = _getUnrestrictedMap(_buildStockSummaryByMaterial(aAllStock, {}));
        var oComposition;
        var oCurrent;
        var oWhatIfResult;

        if (!sSelected && aMaterialList.length > 0) {
            sSelected = aMaterialList[0].material;
        } else if (sSelected && aMaterialList.length && !aMaterialList.some(function (m) {
            return m.material === sSelected;
        })) {
            sSelected = aMaterialList[0].material;
        }

        if (sSelected) {
            oSelectedMeta = aMaterialList.filter(function (m) {
                return m.material === sSelected;
            })[0] || aMerged.filter(function (m) {
                return m.material === sSelected;
            })[0] || null;
            aSelectedStock = _getSelectedStockPosition(aAllStock, sSelected, oFilters);
        }

        oComposition = _buildStockComposition(
            aMerged,
            sDistributionCategoryFilter || "ALL",
            sSelected,
            mStockSummary,
            sCompositionTab || "DISTRIBUTION"
        );
        oCurrent = _calculateCurrentProduction(mUnrestricted);
        oWhatIfResult = _calculateWhatIf(mUnrestricted, oWhatIf || {});
        var oUnitBom = buildUnitBomReference();

        return {
            hasData: aAllInv.length > 0 || aAllStock.length > 0,
            emptyMessage: "조회된 재고 데이터가 없습니다.",
            mergedMaterials: aMerged,
            materialList: aMaterialList,
            materialCategoryFilter: sCategory,
            stockPositionRows: aAllStock,
            stockSummaryByMaterial: mStockSummary,
            selectedMaterial: sSelected,
            selectedMaterialName: oSelectedMeta ? oSelectedMeta.materialName : "",
            selectedMaterialDisplayName: oSelectedMeta ? oSelectedMeta.displayName : "",
            selectedStockPosition: aSelectedStock,
            stockPosition: {
                hasSelection: !!sSelected,
                emptyMessage: "자재를 선택하면 재고 위치와 상태가 표시됩니다.",
                showNoStock: !!sSelected && aSelectedStock.length === 0,
                noStockMessage: "표시할 재고가 없습니다.",
                stockTypes: aSelectedStock
            },
            stockComposition: oComposition,
            productionAvailability: oCurrent,
            production: {
                activeTab: sActiveTab || "CURRENT",
                current: oCurrent,
                whatIf: oWhatIfResult,
                unitBom: oUnitBom
            },
            whatIfResults: oWhatIfResult.materials,
            visualization: _buildVisualization(
                sActiveTab || "CURRENT",
                oCurrent,
                oWhatIfResult,
                oUnitBom,
                sBomVizTab || "HEATTECH",
                mUnrestricted
            )
        };
    }

    function buildInventoryState(oCache, oFilters, sSelectedMaterial) {
        var aAll = oCache.items || [];
        var aFiltered = _applyFilters(aAll, oFilters);

        return {
            loading: false,
            loaded: true,
            error: "",
            criteriaLabel: _criteriaLabel(oFilters),
            heroFilterLine: MmHeroUiUtil.buildFilterLine(aFiltered.length),
            recordCount: aFiltered.length,
            odataBadge: "Z_C_MM_INVENTORY + Z_C_MM_STOCK_POSITION",
            lastUpdated: oCache.lastUpdated || NO_DATA,
            materialSearch: oFilters.materialSearch || "",
            plantFilter: oFilters.plantFilter || "ALL",
            storageLocationFilter: oFilters.storageLocationFilter || "ALL",
            materialTypeFilter: oFilters.materialTypeFilter || "ALL",
            plantOptions: _buildDistinctOptions(aAll, "Plant"),
            storageLocationOptions: _buildDistinctOptions(aAll, "StorageLocation"),
            materialTypeOptions: _buildDistinctOptions(aAll, "MaterialType"),
            selectedMaterial: _normalizeCode(sSelectedMaterial)
        };
    }

    function _loadInventoryItems(oComponent) {
        var oModel = oComponent.getModel("mmInventory");
        return _readCollection(
            oModel,
            INVENTORY_SET,
            MmUpMaterialFilterUtil.getODataFilters("Material"),
            "mmInventory OData 조회에 실패했습니다."
        ).then(function (aItems) {
            return MmUpMaterialFilterUtil.filterRows(aItems, function (oRow) {
                return MmUpMaterialFilterUtil.getRowMaterialCode(oRow, "Material");
            });
        });
    }

    function _readStockPositionCollection(oModel, aFilters) {
        function fnRead(sPath) {
            return _readCollection(
                oModel,
                sPath,
                aFilters || [],
                "mmStockPosition OData 조회에 실패했습니다."
            );
        }

        return fnRead(STOCK_POSITION_SET).catch(function (oFirstError) {
            return new Promise(function (resolve, reject) {
                if (!oModel) {
                    reject(oFirstError);
                    return;
                }
                oModel.read("/$metadata", {
                    success: function (oMeta) {
                        var sEntitySet = "";
                        var aSchemas = (oMeta.dataServices && oMeta.dataServices.schema) || [];

                        aSchemas.some(function (oSchema) {
                            var aSets = oSchema.entityContainer && oSchema.entityContainer.entitySet;
                            if (!aSets) {
                                return false;
                            }
                            return aSets.some(function (oSet) {
                                if (oSet.name && /STOCK_POSITION/i.test(oSet.name)) {
                                    sEntitySet = "/" + oSet.name;
                                    return true;
                                }
                                return false;
                            });
                        });

                        if (!sEntitySet) {
                            reject(oFirstError);
                            return;
                        }

                        fnRead(sEntitySet).then(resolve).catch(function () {
                            reject(oFirstError);
                        });
                    },
                    error: function () {
                        reject(oFirstError);
                    }
                });
            });
        });
    }

    function buildMmbeRowsForMaterial(oCache, sMaterial, oFilters) {
        var oOpts = oCache || {};
        var aCacheRows = oOpts.stockPositionRows || [];
        var aRows = _normalizeStockPositionRows(aCacheRows, oFilters, sMaterial);
        var aCatalog = _buildMmbeTableCatalog(
            oOpts.stockTypeCatalog || [],
            _buildStockTypeCatalog(aCacheRows)
        );
        var oMeta = _getMaterialMetaFromInventory(oOpts.items || [], sMaterial);
        var aLocations = _resolveMaterialLocations(aRows, oOpts.items || [], sMaterial, oFilters);

        if (aRows.length) {
            oMeta.materialName = aRows[0].MaterialName || oMeta.materialName;
            oMeta.materialType = aRows[0].MaterialType || oMeta.materialType;
            oMeta.baseUnit = aRows[0].BaseUnit || oMeta.baseUnit;
        }

        return _buildMmbeTableRows(aRows, aCatalog, aLocations, oMeta);
    }

    function loadStockPositionForMaterial(oComponent, sMaterial, oFilters, oOptions) {
        var oModel = oComponent.getModel("mmStockPosition");
        var aFilters = _buildStockPositionFilters(sMaterial, oFilters);
        var oOpts = oOptions || {};

        return _readStockPositionCollection(oModel, aFilters).then(function (aItems) {
            var aCacheRows = oOpts.allStockPositionRows || [];
            var aCombinedSource = aCacheRows.concat(aItems || []);
            var aRows = _normalizeStockPositionRows(aCombinedSource, oFilters, sMaterial);
            var aCatalog = _buildMmbeTableCatalog(
                oOpts.stockTypeCatalog || [],
                _buildStockTypeCatalog(aCacheRows),
                _buildStockTypeCatalog(aItems)
            );
            var oMeta = _getMaterialMetaFromInventory(oOpts.inventoryItems || [], sMaterial);
            var aLocations = _resolveMaterialLocations(aRows, oOpts.inventoryItems || [], sMaterial, oFilters);

            if (aRows.length) {
                oMeta.materialName = aRows[0].MaterialName || oMeta.materialName;
                oMeta.materialType = aRows[0].MaterialType || oMeta.materialType;
                oMeta.baseUnit = aRows[0].BaseUnit || oMeta.baseUnit;
            }

            return _buildMmbeTableRows(aRows, aCatalog, aLocations, oMeta);
        });
    }

    return {
        NO_DATA: NO_DATA,
        DATA_SHORT: DATA_SHORT,

        loadInventoryData: function (oComponent) {
            return Promise.all([
                _loadInventoryItems(oComponent),
                _readStockPositionCollection(oComponent.getModel("mmStockPosition"), MmUpMaterialFilterUtil.getODataFilters("Material"))
                    .then(function (aItems) {
                        return MmUpMaterialFilterUtil.filterRows(aItems, function (oRow) {
                            return MmUpMaterialFilterUtil.getRowMaterialCode(oRow, "Material");
                        });
                    })
            ]).then(function (aResults) {
                var aItems = aResults[0];
                var aStockRows = aResults[1];
                var sTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                return {
                    items: aItems,
                    stockPositionRows: aStockRows,
                    stockTypeCatalog: _buildStockTypeCatalog(aStockRows),
                    lastUpdated: (aItems.length || aStockRows.length)
                        ? "Inv " + aItems.length + " · StockPos " + aStockRows.length + " · " + sTime
                        : NO_DATA
                };
            });
        },

        buildStockSummaryByMaterial: _buildStockSummaryByMaterial,
        buildInventoryState: buildInventoryState,
        buildInventoryAnalysis: buildInventoryAnalysis,
        buildUnitBomReference: buildUnitBomReference,
        buildMmbeRowsForMaterial: buildMmbeRowsForMaterial,
        loadStockPositionForMaterial: loadStockPositionForMaterial,

        getEmptyStockPositionViewState: function () {
            return {
                loading: false,
                material: "",
                materialName: "",
                hasSelection: false,
                showNoRows: false,
                emptyMessage: "자재를 선택하면 재고 위치와 상태가 표시됩니다.",
                noRowsMessage: "표시할 재고가 없습니다.",
                rows: []
            };
        },

        getEmptyAnalysisState: function () {
            return buildInventoryAnalysis(
                { items: [], stockPositionRows: [] },
                {
                    materialSearch: "",
                    plantFilter: "ALL",
                    storageLocationFilter: "ALL",
                    materialTypeFilter: "ALL"
                },
                "",
                { heattechTarget: 0, bagTarget: 0 },
                "CURRENT"
            );
        },

        getEmptyState: function () {
            return {
                loading: false,
                loaded: false,
                error: "",
                criteriaLabel: MmHeroUiUtil.UNIQLO_LABEL,
                heroFilterLine: MmHeroUiUtil.buildFilterLine(0),
                recordCount: 0,
                odataBadge: "Z_C_MM_INVENTORY + Z_C_MM_STOCK_POSITION",
                lastUpdated: NO_DATA,
                materialSearch: "",
                plantFilter: "ALL",
                storageLocationFilter: "ALL",
                materialTypeFilter: "ALL",
                plantOptions: [{ key: "ALL", text: "전체" }],
                storageLocationOptions: [{ key: "ALL", text: "전체" }],
                materialTypeOptions: [{ key: "ALL", text: "전체" }],
                selectedMaterial: ""
            };
        },

        getDefaultFilters: function () {
            return {
                materialSearch: "",
                plantFilter: "ALL",
                storageLocationFilter: "ALL",
                materialTypeFilter: "ALL"
            };
        },

        getDefaultWhatIf: function () {
            return {
                heattechTarget: 0,
                bagTarget: 0
            };
        }
    };
});
