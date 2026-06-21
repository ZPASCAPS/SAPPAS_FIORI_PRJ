/**
 * MmOverviewDataService.js
 *
 * MM Overview — 히트텍/가방 BOM + Z_C_MM_INVENTORY 재고 비교.
 * Purchasing/Goods Movement 공용 OData는 loadSharedMmData() 사용.
 */
sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmUpMaterialFilterUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmBomOverviewConfig"
], function (Filter, FilterOperator, SapErrorUtil, MmUpMaterialFilterUtil, MmBomOverviewConfig) {
    "use strict";

    var NO_DATA = "데이터 없음";
    var MM_INVENTORY_SET = "/Z_C_MM_INVENTORY";
    var QUERY_MODES = { ALL: "ALL" };

    function _formatTime(dDate) {
        var d = dDate || new Date();
        return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }

    function _readCollection(oModel, sPath, aFilters) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                resolve([]);
                return;
            }
            oModel.read(sPath, {
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

    function _readOptional(oModel, sPath, aFilters) {
        return _readCollection(oModel, sPath, aFilters).catch(function () {
            return [];
        });
    }

    function _buildMaterialOrFilter(aCodes, sField) {
        var aFilters = aCodes.map(function (sCode) {
            return new Filter(sField, FilterOperator.EQ, sCode);
        });

        return new Filter({
            filters: aFilters,
            and: false
        });
    }

    function _sumStockByMaterial(aRows) {
        var m = {};
        aRows.forEach(function (oRow) {
            var sMat = String(oRow.Material || "").trim().toUpperCase();
            if (!sMat) {
                return;
            }
            if (!m[sMat]) {
                m[sMat] = {
                    stockQty: 0,
                    qaStock: 0,
                    blockedStock: 0,
                    materialName: oRow.MaterialName || "",
                    hasData: false
                };
            }
            m[sMat].stockQty += Number(oRow.StockQty || 0);
            m[sMat].qaStock += Number(oRow.QualityInspectionStock || 0);
            m[sMat].blockedStock += Number(oRow.BlockedStock || 0);
            m[sMat].hasData = true;
            if (oRow.MaterialName) {
                m[sMat].materialName = oRow.MaterialName;
            }
        });
        return m;
    }

    function _kpi(label, value, unit, hint, accent) {
        return {
            label: label,
            displayTitle: label,
            value: value === null || value === undefined || value === "" ? NO_DATA : String(value),
            unit: unit || "",
            hint: hint || "",
            accent: accent || "blue"
        };
    }

    function _buildBomStructure() {
        return MmBomOverviewConfig.FINISHED_PRODUCTS.map(function (oProduct) {
            var aComponents = MmBomOverviewConfig.getProductBom(oProduct.code).map(function (oComp) {
                var oMeta = MmBomOverviewConfig.getMaterialMeta(oComp.material);
                return {
                    material: oComp.material,
                    materialName: oMeta ? oMeta.name : oComp.material,
                    qty: oComp.qty,
                    unit: oProduct.unit,
                    isShared: oComp.material === MmBomOverviewConfig.SHARED_MATERIAL
                };
            });

            return {
                productCode: oProduct.code,
                productName: oProduct.name,
                baseQty: oProduct.baseQty,
                unit: oProduct.unit,
                components: aComponents
            };
        });
    }

    function _buildRequirementMatrix(mStock) {
        return MmBomOverviewConfig.RAW_MATERIALS.map(function (oMeta) {
            var oReq = MmBomOverviewConfig.getRequirement(oMeta.code);
            var iTotal = oReq.heattech + oReq.bag;
            var oStock = mStock[oMeta.code];
            var iStock = null;
            var iShortage = null;
            var sStatus = NO_DATA;
            var sStatusState = "None";

            if (oStock && oStock.hasData) {
                iStock = Math.round(oStock.stockQty);
                iShortage = Math.max(0, iTotal - iStock);
                if (iShortage > 0) {
                    sStatus = "부족";
                    sStatusState = "Error";
                } else if (iStock <= 0) {
                    sStatus = "재고 0";
                    sStatusState = "Warning";
                } else if (oStock.blockedStock > 0 || oStock.qaStock > 0) {
                    sStatus = "확인 필요";
                    sStatusState = "Warning";
                } else {
                    sStatus = "충분";
                    sStatusState = "Success";
                }
            }

            return {
                material: oMeta.code,
                materialName: oMeta.name,
                isShared: oMeta.shared === true,
                heattechQty: oReq.heattech,
                bagQty: oReq.bag,
                totalQty: iTotal,
                stockQty: iStock,
                stockDisplay: iStock !== null ? String(iStock) + " PC" : NO_DATA,
                shortageQty: iShortage,
                shortageDisplay: iShortage !== null ? String(iShortage) + " PC" : NO_DATA,
                status: sStatus,
                statusState: sStatusState,
                qaStock: oStock && oStock.hasData ? Math.round(oStock.qaStock) : null,
                blockedStock: oStock && oStock.hasData ? Math.round(oStock.blockedStock) : null
            };
        });
    }

    function _buildProductionReadiness(aMatrix) {
        var mByCode = {};
        aMatrix.forEach(function (oRow) {
            mByCode[oRow.material] = oRow;
        });

        return MmBomOverviewConfig.FINISHED_PRODUCTS.map(function (oProduct) {
            var aBom = MmBomOverviewConfig.getProductBom(oProduct.code);
            var aMissing = [];
            var bAllKnown = true;
            var bReady = true;
            var i;

            for (i = 0; i < aBom.length; i++) {
                var oComp = aBom[i];
                var oRow = mByCode[oComp.material];
                var iRequired = oComp.qty;

                if (!oRow || oRow.stockQty === null) {
                    bAllKnown = false;
                    bReady = false;
                    aMissing.push(oComp.material);
                } else if (oRow.stockQty < iRequired) {
                    bReady = false;
                    aMissing.push(oComp.material);
                }
            }

            return {
                productCode: oProduct.code,
                productName: oProduct.name,
                status: !bAllKnown ? NO_DATA : (bReady ? "생산 가능" : "확인 필요"),
                statusState: !bAllKnown ? "None" : (bReady ? "Success" : "Warning"),
                message: !bAllKnown
                    ? "재고 OData 데이터가 없어 생산 가능 여부를 확인할 수 없습니다."
                    : (bReady
                        ? "필요 원자재 재고가 BOM 소요량(" + oProduct.baseQty + " " + oProduct.unit + ")을 충족합니다."
                        : "부족 또는 확인이 필요한 원자재: " + aMissing.join(", ")),
                shortageMaterials: aMissing.join(", ")
            };
        });
    }

    function _buildPriorityAction(aMatrix) {
        var aCandidates = [];
        var oShared;
        var oPick = null;
        var i;

        aMatrix.forEach(function (oRow) {
            var iScore = 0;
            if (oRow.shortageQty !== null && oRow.shortageQty > 0) {
                iScore += 1000 + oRow.shortageQty;
            }
            if (oRow.isShared) {
                iScore += 500;
            }
            if (oRow.stockQty !== null && oRow.stockQty <= 0) {
                iScore += 300;
            }
            if (oRow.qaStock > 0 || oRow.blockedStock > 0) {
                iScore += 100;
            }
            if (oRow.stockQty === null) {
                return;
            }
            aCandidates.push({ row: oRow, score: iScore });
        });

        if (!aCandidates.length) {
            oShared = aMatrix.filter(function (oRow) {
                return oRow.isShared;
            })[0];
            if (oShared) {
                return {
                    hasData: true,
                    material: oShared.material,
                    materialName: oShared.materialName,
                    isShared: true,
                    reason: "공통 자재",
                    message: "폴리에스터는 히트텍·가방 공통 자재입니다. 재고 OData를 확인해 주세요."
                };
            }
            return {
                hasData: false,
                material: "",
                materialName: "",
                isShared: false,
                reason: "",
                message: NO_DATA
            };
        }

        aCandidates.sort(function (a, b) {
            return b.score - a.score;
        });
        oPick = aCandidates[0].row;

        return {
            hasData: true,
            material: oPick.material,
            materialName: oPick.materialName,
            isShared: oPick.isShared,
            reason: oPick.shortageQty > 0
                ? "부족 수량 " + oPick.shortageDisplay
                : (oPick.stockQty <= 0 ? "재고 0" : "품질/보류 재고 확인"),
            message: oPick.isShared
                ? "공통 자재 우선 확인: " + oPick.materialName + " (" + oPick.material + ")"
                : (oPick.materialName + " (" + oPick.material + ") 재고·입고 계획을 확인하세요.")
        };
    }

    function _countShortageRisk(aMatrix) {
        var iCount = 0;
        aMatrix.forEach(function (oRow) {
            if (oRow.shortageQty !== null && oRow.shortageQty > 0) {
                iCount += 1;
            }
        });
        return iCount;
    }

    function _hasAnyStockData(aMatrix) {
        return aMatrix.some(function (oRow) {
            return oRow.stockQty !== null;
        });
    }

    function buildBomOverviewState(oCache) {
        var mStock = _sumStockByMaterial(oCache.inventoryRows || []);
        var aMatrix = _buildRequirementMatrix(mStock);
        var iShortageRisk = _hasAnyStockData(aMatrix) ? _countShortageRisk(aMatrix) : null;

        return {
            loading: false,
            loaded: true,
            error: oCache.error || "",
            lastUpdated: oCache.lastUpdated || NO_DATA,
            odataBadge: "Z_C_MM_INVENTORY",
            primaryKpis: [
                _kpi("대상 완제품", MmBomOverviewConfig.FINISHED_PRODUCTS.length, "EA", "히트텍 · 가방", "blue"),
                _kpi("BOM 자재", MmBomOverviewConfig.RAW_MATERIALS.length, "EA", "원자재 6종", "blue"),
                _kpi("총 소요 수량", MmBomOverviewConfig.TOTAL_REQUIREMENT_QTY, "PC", "히트텍 13 + 가방 25 (1PC 기준)", "blue"),
                _kpi("공통 자재", 1, "EA", MmBomOverviewConfig.SHARED_MATERIAL, "amber"),
                _kpi(
                    "부족 위험 자재",
                    iShortageRisk !== null ? iShortageRisk : NO_DATA,
                    iShortageRisk !== null ? "EA" : "",
                    "StockQty vs BOM 소요량",
                    iShortageRisk > 0 ? "danger" : "blue"
                )
            ],
            bomStructure: _buildBomStructure(),
            requirementMatrix: aMatrix,
            productionReadiness: _buildProductionReadiness(aMatrix),
            priorityAction: _buildPriorityAction(aMatrix)
        };
    }

    function loadBomOverviewData(oComponent) {
        var oMmInventoryModel = oComponent.getModel("mmInventory");
        var aCodes = MmBomOverviewConfig.getMaterialCodes();

        if (!oMmInventoryModel) {
            return Promise.resolve({
                inventoryRows: [],
                lastUpdated: NO_DATA,
                error: "mmInventory OData 모델을 찾을 수 없습니다."
            });
        }

        return _readCollection(
            oMmInventoryModel,
            MM_INVENTORY_SET,
            [_buildMaterialOrFilter(aCodes, "Material")]
        ).then(function (aRows) {
            var aFiltered = aRows.filter(function (oRow) {
                return aCodes.indexOf(String(oRow.Material || "").trim().toUpperCase()) >= 0;
            });

            return {
                inventoryRows: aFiltered,
                lastUpdated: _formatTime(new Date()),
                error: ""
            };
        }).catch(function (oError) {
            return {
                inventoryRows: [],
                lastUpdated: NO_DATA,
                error: SapErrorUtil.extractMessage(oError, "Z_C_MM_INVENTORY 조회에 실패했습니다.")
            };
        });
    }

    function _buildVirtualBomItems(mStock) {
        return MmBomOverviewConfig.RAW_MATERIALS.map(function (oMeta) {
            var iTotal = MmBomOverviewConfig.getTotalRequirement(oMeta.code);
            var oStock = mStock[oMeta.code];
            var iStockQty = oStock && oStock.hasData ? Math.round(oStock.stockQty) : null;
            var iShortage = iStockQty !== null ? Math.max(0, iTotal - iStockQty) : null;

            return {
                Component: oMeta.code,
                MaterialCode: oMeta.code,
                MaterialName: oMeta.name,
                RequiredQty: iTotal,
                BomQty: iTotal,
                StockQty: iStockQty,
                ShortageQty: iShortage,
                Status: iShortage === null ? "" : (iShortage > 0 ? "SHORT" : "OK"),
                FilterStatus: iShortage === null ? "" : (iShortage > 0 ? "SHORT" : "OK"),
                StatusText: iShortage === null ? NO_DATA : (iShortage > 0 ? "부족" : "충분"),
                StatusState: iShortage === null ? "None" : (iShortage > 0 ? "Error" : "Success")
            };
        });
    }

    function _buildInventoryMap(mStock) {
        var m = {};
        Object.keys(mStock).forEach(function (sKey) {
            if (mStock[sKey].hasData) {
                m[sKey] = mStock[sKey].stockQty;
            }
        });
        return m;
    }

    function loadSharedMmData(oComponent) {
        var oTrackerModel = oComponent.getModel("trackerModel");
        var oMmInventoryModel = oComponent.getModel("mmInventory");
        var aRawCodes = MmBomOverviewConfig.getMaterialCodes();

        if (!oTrackerModel) {
            return Promise.reject(new Error("trackerModel OData 모델을 찾을 수 없습니다."));
        }

        if (!oMmInventoryModel) {
            return Promise.reject(new Error("mmInventory OData 모델을 찾을 수 없습니다."));
        }

        return Promise.all([
            _readCollection(oTrackerModel, "/Z_C_E2E_OrderTracker", MmUpMaterialFilterUtil.getODataFilters("Material")),
            _readCollection(
                oMmInventoryModel,
                MM_INVENTORY_SET,
                [_buildMaterialOrFilter(aRawCodes, "Material")]
            )
        ]).then(function (aResults) {
            var aTracker = MmUpMaterialFilterUtil.filterRows(aResults[0], function (oRow) {
                return MmUpMaterialFilterUtil.getRowMaterialCode(oRow, "Material");
            });
            var aInventoryRows = aResults[1].filter(function (oRow) {
                return aRawCodes.indexOf(String(oRow.Material || "").trim().toUpperCase()) >= 0;
            });
            var mStock = _sumStockByMaterial(aInventoryRows);
            var aBomItems = _buildVirtualBomItems(mStock);

            return {
                bomItems: aBomItems,
                trackerRows: aTracker,
                inventoryMap: _buildInventoryMap(mStock),
                inventoryRows: aInventoryRows,
                lastUpdated: _formatTime(new Date())
            };
        }).catch(function (oError) {
            throw new Error(SapErrorUtil.extractMessage(oError, "SAP OData 조회에 실패했습니다."));
        });
    }

    return {
        QUERY_MODES: QUERY_MODES,
        NO_DATA: NO_DATA,
        loadBomOverviewData: loadBomOverviewData,
        loadSharedMmData: loadSharedMmData,
        buildBomOverviewState: buildBomOverviewState,
        getEmptyState: function () {
            return {
                loading: false,
                loaded: false,
                error: "",
                lastUpdated: NO_DATA,
                odataBadge: "Z_C_MM_INVENTORY",
                primaryKpis: [],
                bomStructure: [],
                requirementMatrix: [],
                productionReadiness: [],
                priorityAction: {
                    hasData: false,
                    material: "",
                    materialName: "",
                    isShared: false,
                    reason: "",
                    message: NO_DATA
                }
            };
        }
    };
});
