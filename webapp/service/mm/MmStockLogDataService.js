/**
 * MmStockLogDataService.js — Stock Type evidence log OData (MMBE table popover)
 */
sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil"
], function (Filter, FilterOperator, SapErrorUtil) {
    "use strict";

    var FIXED_PLANT = "1010";
    var LOAD_ERROR = "\uADFC\uAC70 \uBB38\uC11C\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABF\uD588\uC2B5\uB2C8\uB2E4.";

    var STOCK_TYPE_BY_DISPLAY_NAME = {
        "Unrestricted Use": "UNRESTRICTED",
        "Reserved": "RESERVED",
        "On-Order Stock": "ON_ORDER",
        "Sales Order Stock": "SALES_ORDER"
    };

    var STOCK_LOG_CONFIG = {
        UNRESTRICTED: {
            model: "mmMovementLog",
            entitySet: "/Z_C_MM_MOVEMENT_LOG",
            serviceUrl: "/sap/opu/odata/sap/Z_C_MM_MOVEMENT_LOG_CDS/",
            hint: "Unrestricted Use\uB294 \uD604\uC7AC \uC7AC\uACE0 \uAE30\uC900\uC774\uBBC0\uB85C \uD2B9\uC815 \uC8FC\uBB38\uC5D0 \uC9C1\uC811 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uC544\uB798\uB294 \uD574\uB2F9 \uC790\uC7AC\uC758 \uC785\uCD9C\uACE0 \uC790\uC7AC\uBB38\uC11C \uC774\uB825\uC785\uB2C8\uB2E4.",
            fields: [
                { key: "PostingDate", label: "Posting Date", width: "6.5rem" },
                { key: "MaterialDocument", label: "Mat. Doc.", width: "6rem" },
                { key: "MaterialDocumentYear", label: "Doc. Year", width: "4.5rem" },
                { key: "MaterialDocumentItem", label: "Item", width: "3.5rem" },
                { key: "MovementType", label: "MvT", width: "3.5rem" },
                { key: "DebitCreditIndicator", label: "D/C", width: "3rem" },
                { key: "PurchaseOrder", label: "PO", width: "5.5rem" },
                { key: "SalesOrder", label: "Sales Order", width: "5.5rem" },
                { key: "ReservationNumber", label: "Reservation", width: "5.5rem" },
                { key: "OrderNumber", label: "Order", width: "5.5rem" },
                { key: "Quantity", label: "Quantity", width: "4.5rem" },
                { key: "Unit", label: "Unit", width: "3.5rem" }
            ]
        },
        RESERVED: {
            model: "mmReservedLog",
            entitySet: "/Z_C_MM_RESERVED_LOG",
            serviceUrl: "/sap/opu/odata/sap/Z_C_MM_RESERVED_LOG_CDS/",
            hint: "Reserved\uB294 \uC608\uC57D/\uC624\uB354\uC5D0 \uC758\uD574 \uD655\uBCF4\uB41C \uC218\uB7C9\uC785\uB2C8\uB2E4. \uC544\uB798\uB294 \uC608\uC57D \uADFC\uAC70 \uBB38\uC11C\uC785\uB2C8\uB2E4.",
            fields: [
                { key: "ReservationNumber", label: "Reservation", width: "6rem" },
                { key: "ReservationItem", label: "Item", width: "3.5rem" },
                { key: "RequirementDate", label: "Req. Date", width: "6rem" },
                { key: "OrderNumber", label: "Order", width: "5.5rem" },
                { key: "SalesOrder", label: "Sales Order", width: "5.5rem" },
                { key: "SalesOrderItem", label: "SO Item", width: "4.5rem" },
                { key: "RequiredQuantity", label: "Required", width: "5rem" },
                { key: "WithdrawnQuantity", label: "Withdrawn", width: "5rem" },
                { key: "OpenReservedQuantity", label: "Open", width: "5rem" },
                { key: "Unit", label: "Unit", width: "3.5rem" }
            ]
        },
        ON_ORDER: {
            model: "mmOnOrderLog",
            entitySet: "/Z_C_MM_ONORDER_LOG",
            serviceUrl: "/sap/opu/odata/sap/Z_C_MM_ONORDER_LOG_CDS/",
            hint: "On-Order Stock\uC740 \uAD6C\uB9E4\uC624\uB354 \uC911 \uC544\uC9C1 \uC785\uACE0\uB418\uC9C0 \uC54A\uC740 \uC218\uB7C9\uC785\uB2C8\uB2E4. \uC544\uB798\uB294 \uAD6C\uB9E4\uC624\uB354 \uC2A4\uCF00\uC904 \uADFC\uAC70\uC785\uB2C8\uB2E4.",
            fields: [
                { key: "PurchaseOrder", label: "PO", width: "7rem", hAlign: "Begin" },
                { key: "PurchaseOrderItem", label: "Item", width: "4.5rem", hAlign: "Center" },
                { key: "ScheduleLine", label: "Sched. Line", width: "5.5rem", hAlign: "Center" },
                { key: "DeliveryDate", label: "Delivery", width: "7rem", hAlign: "Center" },
                { key: "OrderQuantity", label: "Order Qty", width: "5.5rem", hAlign: "End" },
                { key: "DeliveredQuantity", label: "Delivered", width: "5.5rem", hAlign: "End" },
                { key: "OpenQuantity", label: "Open Qty", width: "5.5rem", hAlign: "End" },
                { key: "Unit", label: "Unit", width: "3.5rem", hAlign: "Center" }
            ]
        },
        SALES_ORDER: {
            model: "mmSoStockLog",
            entitySet: "/Z_C_MM_SO_STOCK_LOG",
            serviceUrl: "/sap/opu/odata/sap/Z_C_MM_SO_STOCK_LOG_CDS/",
            hint: "Sales Order Stock\uC740 \uD310\uB9E4\uC624\uB354\uC5D0 \uC5F0\uACB0\uB41C \uD2B9\uC218\uC7AC\uACE0\uC785\uB2C8\uB2E4. \uC544\uB798\uB294 \uD310\uB9E4\uC624\uB354\uBCC4 \uC7AC\uACE0 \uADFC\uAC70\uC785\uB2C8\uB2E4.",
            fields: [
                { key: "SalesOrder", label: "SD Doc.", width: "18%", hAlign: "Begin" },
                { key: "SalesOrderItem", label: "Item", width: "14%", hAlign: "Center" },
                { key: "StockLineType", label: "Stock Type", width: "28%", hAlign: "Begin" },
                { key: "Quantity", label: "Stock", width: "18%", hAlign: "End" },
                { key: "Unit", label: "Unit", width: "12%", hAlign: "Center" }
            ]
        }
    };

    function _normalizeCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function _resolveConfigByDisplayName(sStockTypeName) {
        var sKey = STOCK_TYPE_BY_DISPLAY_NAME[String(sStockTypeName || "").trim()];

        return sKey ? STOCK_LOG_CONFIG[sKey] : null;
    }

    function _buildMaterialFilter(sMaterial) {
        var sNorm = _normalizeCode(sMaterial);
        var aValues = [];
        var aFilters;
        var iPad;

        if (!sNorm) {
            return new Filter("Material", FilterOperator.EQ, "");
        }

        aValues.push(sNorm);

        if (sNorm.length < 18) {
            iPad = 18 - sNorm.length;
            aValues.push(sNorm + new Array(iPad + 1).join(" "));
        }

        aFilters = aValues.map(function (sVal) {
            return new Filter("Material", FilterOperator.EQ, sVal);
        });

        if (aFilters.length === 1) {
            return aFilters[0];
        }

        return new Filter({
            filters: aFilters,
            and: false
        });
    }

    function _buildFilters(sMaterial, sPlant) {
        var aFilters = [
            _buildMaterialFilter(sMaterial),
            new Filter("Plant", FilterOperator.EQ, String(sPlant || FIXED_PLANT).trim())
        ];

        // StorageLocation filter is disabled for now — enable after data validation if needed.
        // if (String(sStorageLocation || "").trim()) {
        //     aFilters.push(new Filter("StorageLocation", FilterOperator.EQ, String(sStorageLocation).trim()));
        // }

        return aFilters;
    }

    function _buildMaterialOnlyFilters(sMaterial) {
        return [_buildMaterialFilter(sMaterial)];
    }

    function _readWithFallbacks(oModel, sPath, oContext) {
        var sPlant = String(oContext.plant || FIXED_PLANT).trim();
        var aPrimary = _buildFilters(oContext.material, sPlant);
        var aMaterialOnly = _buildMaterialOnlyFilters(oContext.material);

        return _readCollection(oModel, sPath, aPrimary)
            .then(function (aResults) {
                if (aResults && aResults.length > 0) {
                    return {
                        rows: aResults,
                        filters: aPrimary,
                        usedFallback: false
                    };
                }

                /* eslint-disable no-console */
                console.log("[StockLog] retry material-only", {
                    material: oContext.material,
                    plant: sPlant
                });
                /* eslint-enable no-console */

                return _readCollection(oModel, sPath, aMaterialOnly)
                    .then(function (aRetry) {
                        return {
                            rows: aRetry || [],
                            filters: aRetry && aRetry.length ? aMaterialOnly : aPrimary,
                            usedFallback: !!(aRetry && aRetry.length)
                        };
                    });
            });
    }

    function _filtersToLog(aFilters) {
        return (aFilters || []).map(function (oFilter) {
            var oValue = oFilter.getValue1 ? oFilter.getValue1() : oFilter.oValue1;

            return (oFilter.sPath || oFilter.getPath()) + " eq '" + oValue + "'";
        }).join(" and ");
    }

    function _filterMeta(aFilters) {
        return (aFilters || []).map(function (oFilter) {
            return {
                path: oFilter.sPath || (oFilter.getPath && oFilter.getPath()),
                operator: oFilter.sOperator || (oFilter.getOperator && oFilter.getOperator()),
                value1: oFilter.getValue1 ? oFilter.getValue1() : oFilter.oValue1
            };
        });
    }

    function _pad2(nValue) {
        return nValue < 10 ? "0" + nValue : String(nValue);
    }

    function _formatYmd(dDate) {
        return dDate.getFullYear() + "-" + _pad2(dDate.getMonth() + 1) + "-" + _pad2(dDate.getDate());
    }

    function _isDateField(sKey) {
        return /Date$/i.test(String(sKey || "")) || sKey === "PostingDate" || sKey === "RequirementDate";
    }

    function formatDisplayValue(sKey, vValue) {
        var sRaw;
        var mMatch;
        var dParsed;

        if (vValue === null || vValue === undefined || vValue === "") {
            return "";
        }

        if (_isDateField(sKey)) {
            if (vValue instanceof Date && !isNaN(vValue.getTime())) {
                return _formatYmd(vValue);
            }

            sRaw = String(vValue);
            mMatch = sRaw.match(/\/Date\((-?\d+)\)\//);

            if (mMatch) {
                dParsed = new Date(parseInt(mMatch[1], 10));
                if (!isNaN(dParsed.getTime())) {
                    return _formatYmd(dParsed);
                }
            }

            if (/^\d{4}-\d{2}-\d{2}/.test(sRaw)) {
                return sRaw.substring(0, 10);
            }

            dParsed = new Date(sRaw);
            if (!isNaN(dParsed.getTime())) {
                return _formatYmd(dParsed);
            }
        }

        return String(vValue);
    }

    function _readCollectionOnce(oModel, sPath, aFilters, iSkip) {
        var oUrlParams = {
            "$top": "500"
        };

        if (iSkip > 0) {
            oUrlParams["$skip"] = String(iSkip);
        }

        return new Promise(function (resolve, reject) {
            oModel.read(sPath, {
                filters: aFilters || [],
                urlParameters: oUrlParams,
                success: function (oData) {
                    resolve(oData && oData.results ? oData.results : []);
                },
                error: function (oError) {
                    reject(oError);
                }
            });
        });
    }

    function _readCollection(oModel, sPath, aFilters) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error("OData model is not available."));
                return;
            }

            function fnLoadAllPages() {
                var aAll = [];
                var iSkip = 0;
                var iPageSize = 500;

                function fnNextPage() {
                    _readCollectionOnce(oModel, sPath, aFilters, iSkip)
                        .then(function (aBatch) {
                            aAll = aAll.concat(aBatch || []);

                            if (!aBatch || aBatch.length < iPageSize) {
                                resolve(aAll);
                                return;
                            }

                            iSkip += aBatch.length;
                            fnNextPage();
                        })
                        .catch(reject);
                }

                fnNextPage();
            }

            if (oModel.getMetaModel && oModel.getMetaModel().loaded) {
                oModel.getMetaModel().loaded().then(fnLoadAllPages).catch(reject);
            } else {
                fnLoadAllPages();
            }
        });
    }

    function buildContextLine(oContext) {
        var aParts = [
            "Material: " + (oContext.material || ""),
            "Plant: " + (oContext.plant || FIXED_PLANT)
        ];

        if (oContext.storageLocation) {
            aParts.push("Storage Location: " + oContext.storageLocation);
        }

        aParts.push("Stock Type: " + (oContext.stockTypeName || ""));

        return aParts.join(" | ");
    }

    function parseRowQuantity(vValue) {
        if (vValue === null || vValue === undefined || vValue === "") {
            return 0;
        }

        var n = parseFloat(String(vValue).replace(/,/g, ""));

        return isNaN(n) ? 0 : n;
    }

    return {
        FIXED_PLANT: FIXED_PLANT,
        LOAD_ERROR: LOAD_ERROR,
        STOCK_TYPE_BY_DISPLAY_NAME: STOCK_TYPE_BY_DISPLAY_NAME,

        parseRowQuantity: parseRowQuantity,
        formatDisplayValue: formatDisplayValue,

        getStockLogConfig: function (sStockTypeName) {
            return _resolveConfigByDisplayName(sStockTypeName);
        },

        getEmptyPopoverState: function () {
            return {
                loading: false,
                error: "",
                hasData: false,
                title: "\uC7AC\uACE0 \uADFC\uAC70 \uBB38\uC11C",
                contextLine: "",
                hint: "",
                emptyMessage: "\uADFC\uAC70 \uBB38\uC11C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
                rows: []
            };
        },

        buildContextLine: buildContextLine,

        buildFilters: _buildFilters,
        buildMaterialOnlyFilters: _buildMaterialOnlyFilters,
        filtersToMeta: _filterMeta,

        loadStockLog: function (oComponent, sStockTypeName, oContext) {
            var oCfg = _resolveConfigByDisplayName(sStockTypeName);
            var aFilters;
            var sPlant;
            var oModel;

            if (!oCfg) {
                return Promise.reject(new Error("Unsupported stock type: " + sStockTypeName));
            }

            if (!oComponent) {
                return Promise.reject(new Error("Component is not available."));
            }

            oModel = oComponent.getModel(oCfg.model);

            if (!oModel) {
                return Promise.reject(new Error("OData model is not available: " + oCfg.model));
            }

            sPlant = String(oContext.plant || FIXED_PLANT).trim();
            aFilters = _buildFilters(oContext.material, sPlant);

            /* eslint-disable no-console */
            console.log("[StockLog] read", {
                modelName: oCfg.model,
                entitySet: oCfg.entitySet,
                material: oContext.material,
                filters: _filterMeta(aFilters)
            });
            /* eslint-enable no-console */

            return _readWithFallbacks(oModel, oCfg.entitySet, oContext)
                .then(function (oReadResult) {
                    var aResults = oReadResult && oReadResult.rows ? oReadResult.rows : [];

                    /* eslint-disable no-console */
                    console.log("[StockLog] success count", aResults.length, {
                        usedFallback: !!(oReadResult && oReadResult.usedFallback)
                    });
                    console.table(aResults);
                    /* eslint-enable no-console */

                    return {
                        config: oCfg,
                        rows: aResults,
                        filters: oReadResult.filters || aFilters
                    };
                })
                .catch(function (oError) {
                    /* eslint-disable no-console */
                    console.error("[StockLog] error", {
                        statusCode: oError && oError.statusCode,
                        responseText: oError && oError.responseText,
                        message: oError && oError.message
                    });
                    /* eslint-enable no-console */
                    throw new Error(SapErrorUtil.extractMessage(oError, LOAD_ERROR));
                });
        }
    };
});
