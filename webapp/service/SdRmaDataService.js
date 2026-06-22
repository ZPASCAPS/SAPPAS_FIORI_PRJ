/**
 * SdRmaDataService.js — SD RMA 입고 모니터링 OData read (Z_C_SD_RMA_SJ)
 */
sap.ui.define([
    "sap/ui/thirdparty/jquery",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/model/formatter"
], function (jQuery, SapErrorUtil, formatter) {
    "use strict";

    var SERVICE_BASE = "/sap/opu/odata/sap/Z_C_SD_RMA_SJ_CDS/";
    var ENTITY_SET = "/Z_C_SD_RMA_SJ";
    var ENTITY_SET_ALTERNATES = [
        "/Z_C_SD_RMA_SJ",
        "/Z_C_SD_RMA_SJSet"
    ];

    function _collectEntitySetNames(oModel) {
        var oMeta = oModel && oModel.getServiceMetadata();
        var aSchema = oMeta && oMeta.dataServices && oMeta.dataServices.schema;
        var aContainers;
        var aSets;
        var aNames = [];
        var i;

        if (!aSchema || !aSchema.length) {
            return aNames;
        }

        aContainers = aSchema[0].entityContainer;
        if (!aContainers || !aContainers.length) {
            return aNames;
        }

        aSets = aContainers[0].entitySet || [];
        for (i = 0; i < aSets.length; i++) {
            if (aSets[i] && aSets[i].name) {
                aNames.push(aSets[i].name);
            }
        }

        return aNames;
    }

    function resolveEntitySet(oModel) {
        var aNames = _collectEntitySetNames(oModel);
        var i;
        var sName;

        for (i = 0; i < ENTITY_SET_ALTERNATES.length; i++) {
            sName = ENTITY_SET_ALTERNATES[i].replace(/^\//, "");
            if (aNames.indexOf(sName) >= 0) {
                return "/" + sName;
            }
        }

        for (i = 0; i < aNames.length; i++) {
            if (/Z_C_SD_RMA/i.test(aNames[i])) {
                return "/" + aNames[i];
            }
        }

        return ENTITY_SET;
    }

    function ensureMetadataReady(oModel) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error("sdRmaModel not available"));
                return;
            }

            if (oModel.getServiceMetadata()) {
                resolve();
                return;
            }

            var fnLoaded = function () {
                oModel.detachMetadataLoaded(fnLoaded);
                oModel.detachMetadataFailed(fnFailed);
                resolve();
            };
            var fnFailed = function (oEvent) {
                oModel.detachMetadataLoaded(fnLoaded);
                oModel.detachMetadataFailed(fnFailed);
                reject(oEvent.getParameter("message") || new Error("sdRmaModel metadata load failed"));
            };

            oModel.attachMetadataLoaded(fnLoaded);
            oModel.attachMetadataFailed(fnFailed);
        });
    }

    function _parseJsonCollection(oData) {
        if (!oData) {
            return [];
        }
        if (oData.d && Array.isArray(oData.d.results)) {
            return oData.d.results;
        }
        if (Array.isArray(oData.results)) {
            return oData.results;
        }
        if (Array.isArray(oData.value)) {
            return oData.value;
        }
        if (oData.d && oData.d.ReturnOrder !== undefined) {
            return [oData.d];
        }
        if (oData.ReturnOrder !== undefined) {
            return [oData];
        }
        return [];
    }

    function _normalizeReadResults(oData) {
        if (!oData) {
            return [];
        }
        if (Array.isArray(oData.results)) {
            return oData.results;
        }
        if (Array.isArray(oData)) {
            return oData;
        }
        if (oData.ReturnOrder !== undefined) {
            return [oData];
        }
        return [];
    }

    function _readViaModel(oModel, sEntitySet) {
        return new Promise(function (resolve, reject) {
            oModel.read(sEntitySet, {
                urlParameters: {
                    "$top": "50"
                },
                success: function (oData) {
                    resolve(_normalizeReadResults(oData));
                },
                error: function (oError) {
                    reject(oError);
                }
            });
        });
    }

    function _readViaJsonAjax(sEntitySet) {
        var sPath = String(sEntitySet || ENTITY_SET).replace(/^\//, "");

        return new Promise(function (resolve, reject) {
            jQuery.ajax({
                type: "GET",
                url: SERVICE_BASE + sPath,
                dataType: "json",
                data: {
                    "$format": "json",
                    "$top": "50"
                },
                success: function (oData) {
                    resolve(_parseJsonCollection(oData));
                },
                error: function (jqXHR) {
                    reject(jqXHR);
                }
            });
        });
    }

    function _readAllRows(oModel) {
        return ensureMetadataReady(oModel).then(function () {
            var sEntitySet = resolveEntitySet(oModel);

            return _readViaModel(oModel, sEntitySet).then(function (aRows) {
                if (aRows.length > 0) {
                    return aRows;
                }
                return _readViaJsonAjax(sEntitySet);
            });
        });
    }

    function _mapRow(oRow) {
        var sReturnOrder = String(oRow.ReturnOrder || "");

        return {
            returnOrder: sReturnOrder,
            returnOrderDisplay: formatter.formatSalesOrderDisplay(sReturnOrder),
            customerName: oRow.CustomerName || "-",
            returnReasonText: oRow.ReturnReasonText || "-",
            returnReasonState: formatter.formatSdRmaReasonState(oRow.ReturnReasonText),
            processingStatus: String(oRow.ProcessingStatus || "").toUpperCase(),
            statusText: oRow.StatusText || "-",
            statusState: formatter.formatSdRmaProcessingState(oRow.ProcessingStatus),
            statusPillClass: String(oRow.ProcessingStatus || "").toUpperCase() === "PROCESSED"
                ? "nxSdDashPill--up"
                : "nxSdDashPill--warn"
        };
    }

    function _buildSummary(aRows) {
        var nProcessed = 0;
        var nPending = 0;
        var nTotal;
        var nRate;
        var i;

        for (i = 0; i < (aRows || []).length; i++) {
            if (aRows[i].processingStatus === "PROCESSED") {
                nProcessed += 1;
            } else if (aRows[i].processingStatus === "PENDING") {
                nPending += 1;
            }
        }

        nTotal = nProcessed + nPending;
        nRate = nTotal ? Math.round((nProcessed / nTotal) * 100) : 0;

        return {
            processedCount: nProcessed,
            pendingCount: nPending,
            totalCount: nTotal,
            conversionRate: nRate,
            conversionText: nRate + "%",
            processedLabel: "입고 완료 " + nProcessed + "건",
            pendingLabel: "입고 대기 " + nPending + "건"
        };
    }

    function _emptyViewData() {
        return {
            loading: true,
            error: "",
            title: "최근 반품 입고 내역",
            emptyText: "반품 입고 내역이 없습니다.",
            summary: _buildSummary([]),
            rows: []
        };
    }

    function _mapRowsToViewData(aODataRows) {
        var aMapped = (aODataRows || []).map(_mapRow);
        var aRows;

        aMapped.sort(function (a, b) {
            return String(b.returnOrder).localeCompare(String(a.returnOrder));
        });

        aRows = aMapped;

        return {
            loading: false,
            error: "",
            title: "최근 반품 입고 내역",
            emptyText: "반품 입고 내역이 없습니다.",
            summary: _buildSummary(aRows),
            rows: aRows
        };
    }

    return {
        ENTITY_SET: ENTITY_SET,
        SERVICE_BASE: SERVICE_BASE,
        resolveEntitySet: resolveEntitySet,
        ensureMetadataReady: ensureMetadataReady,
        getEmptyViewData: _emptyViewData,

        /**
         * @param {sap.ui.core.Component} oComponent
         * @returns {Promise<object>}
         */
        load: function (oComponent) {
            var oModel = oComponent && oComponent.getModel("sdRmaModel");

            return _readAllRows(oModel)
                .then(function (aRows) {
                    var oViewData = _mapRowsToViewData(aRows);

                    if (!aRows.length) {
                        oViewData.error = "";
                    }

                    return oViewData;
                })
                .catch(function (oError) {
                    var oViewData = _emptyViewData();
                    oViewData.loading = false;
                    oViewData.error = SapErrorUtil.extractMessage(oError, "반품 입고 내역 조회에 실패했습니다.");
                    return oViewData;
                });
        }
    };
});
