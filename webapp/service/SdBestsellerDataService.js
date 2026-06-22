/**
 * SdBestsellerDataService.js — SD 시즌 베스트셀러 BP별 집계 (Z_C_SD_BESTSELLER_SJ)
 */
sap.ui.define([
    "sap/ui/thirdparty/jquery",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil"
], function (jQuery, SapErrorUtil) {
    "use strict";

    var SERVICE_BASE = "/sap/opu/odata/sap/Z_C_SD_BESTSELLER_SJ_CDS/";
    var ENTITY_SET = "/Z_C_SD_BESTSELLER_SJ";
    var ENTITY_SET_ALTERNATES = [
        "/Z_C_SD_BESTSELLER_SJ",
        "/Z_C_SD_BESTSELLER_SJSet"
    ];
    var MATERIAL_HIT = "UP-F-HIT-001";
    var MATERIAL_BAG = "UP-F-BAG-001";
    var BP_ORDER = [
        "UP-C-I-MIA",
        "UP-C-I-SSG",
        "UP-C-I-GAN",
        "UP-C-I-LOT",
        "UP-C-I-ONI"
    ];
    // 데이터가 없어 OData에서 매장명이 내려오지 않는 BP는 한글명으로 대체
    var BP_NAME_FALLBACK = {
        "UP-C-I-SSG": "유니클로 직영점 신세계점",
        "UP-C-I-ONI": "유니클로 직영점 온라인몰"
    };

    // 누적 구매량 카드는 수량 단위를 PC로 표기
    function _displayUnit(sUnit) {
        var s = String(sUnit || "").trim().toUpperCase();
        if (!s || s === "EA") {
            return "PC";
        }
        return sUnit;
    }

    function _normalizeCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function _formatQty(nQty) {
        var n = Number(nQty);
        if (isNaN(n)) {
            return "0";
        }
        return Math.round(n).toLocaleString("ko-KR");
    }

    function _seasonLabel(sSeason) {
        var s = String(sSeason || "00003").trim();
        if (s === "00003") {
            return "26";
        }
        if (s.length >= 2) {
            return s.slice(-2);
        }
        return s || "26";
    }

    function _resolveBpIcon(sCustomer) {
        var sCode = _normalizeCode(sCustomer);

        if (sCode.indexOf("ONI") >= 0) {
            return "sap-icon://internet-browser";
        }
        if (sCode.indexOf("SSG") >= 0) {
            return "sap-icon://building";
        }
        if (sCode.indexOf("GAN") >= 0 || sCode.indexOf("LOT") >= 0) {
            return "sap-icon://retail-store";
        }
        if (sCode.indexOf("MIA") >= 0) {
            return "sap-icon://home";
        }
        return "sap-icon://customer";
    }

    function _isHitMaterial(sMaterial) {
        var sMat = _normalizeCode(sMaterial);
        return sMat === MATERIAL_HIT || sMat.indexOf("HIT") >= 0;
    }

    function _isBagMaterial(sMaterial) {
        var sMat = _normalizeCode(sMaterial);
        return sMat === MATERIAL_BAG || sMat.indexOf("BAG") >= 0;
    }

    function _isDashboardMaterial(sMaterial) {
        return _isHitMaterial(sMaterial) || _isBagMaterial(sMaterial);
    }

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
            if (/Z_C_SD_BESTSELLER/i.test(aNames[i])) {
                return "/" + aNames[i];
            }
        }

        return ENTITY_SET;
    }

    function ensureMetadataReady(oModel) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error("sdBestsellerModel not available"));
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
                reject(oEvent.getParameter("message") || new Error("sdBestsellerModel metadata load failed"));
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
        if (oData.d && oData.d.Customer !== undefined) {
            return [oData.d];
        }
        if (oData.Customer !== undefined) {
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
        if (oData.Customer !== undefined) {
            return [oData];
        }
        return [];
    }

    function _readViaModel(oModel, sEntitySet) {
        return new Promise(function (resolve, reject) {
            oModel.read(sEntitySet, {
                urlParameters: {
                    "$top": "200"
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
                    "$top": "200"
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

    function _createCustomerBucket(sCustomer) {
        return {
            customer: sCustomer,
            customerName: BP_NAME_FALLBACK[sCustomer] || sCustomer,
            season: "00003",
            hitQty: 0,
            bagQty: 0,
            salesUnit: "EA"
        };
    }

    function _mapCustomerToRow(oBucket, nRank) {
        var nTotal = oBucket.hitQty + oBucket.bagQty;
        var sUnit = oBucket.salesUnit || "EA";
        var sDisplayUnit = _displayUnit(sUnit);

        return {
            rank: nRank,
            customer: oBucket.customer,
            customerName: oBucket.customerName,
            season: oBucket.season,
            hitQty: oBucket.hitQty,
            bagQty: oBucket.bagQty,
            totalQty: nTotal,
            salesQty: nTotal,
            salesUnit: sDisplayUnit,
            breakdownText: "히트텍 " + _formatQty(oBucket.hitQty) + " / 가방 " + _formatQty(oBucket.bagQty),
            infoText: _formatQty(nTotal) + " " + sDisplayUnit,
            qtyEndLabel: _formatQty(nTotal) + " " + sDisplayUnit,
            footerText: "히트텍 " + _formatQty(oBucket.hitQty) + " / 가방 " + _formatQty(oBucket.bagQty) + " " + sDisplayUnit,
            bpIcon: _resolveBpIcon(oBucket.customer),
            raceBarPercent: 0,
            hitSharePercent: 0,
            bagSharePercent: 0,
            barPercent: 0,
            isTopRank: nRank === 1
        };
    }

    function _aggregateByCustomer(aODataRows) {
        var mCustomers = {};
        var aRows = [];
        var sSeason = "00003";
        var i;
        var oRow;
        var sCustomer;
        var sMaterial;
        var nQty;
        var oBucket;

        for (i = 0; i < BP_ORDER.length; i++) {
            mCustomers[BP_ORDER[i]] = _createCustomerBucket(BP_ORDER[i]);
        }

        for (i = 0; i < (aODataRows || []).length; i++) {
            oRow = aODataRows[i];
            sMaterial = _normalizeCode(oRow.Material);

            if (!_isDashboardMaterial(sMaterial)) {
                continue;
            }

            sCustomer = _normalizeCode(oRow.Customer);
            if (!sCustomer) {
                continue;
            }

            if (!mCustomers[sCustomer]) {
                mCustomers[sCustomer] = _createCustomerBucket(sCustomer);
            }

            oBucket = mCustomers[sCustomer];
            if (oRow.CustomerName) {
                oBucket.customerName = oRow.CustomerName;
            }
            if (oRow.Season) {
                oBucket.season = oRow.Season;
                sSeason = oRow.Season;
            }
            if (oRow.SalesUnit) {
                oBucket.salesUnit = oRow.SalesUnit;
            }

            nQty = Number(oRow.SalesQty) || 0;
            if (_isHitMaterial(sMaterial)) {
                oBucket.hitQty += nQty;
            } else if (_isBagMaterial(sMaterial)) {
                oBucket.bagQty += nQty;
            }
        }

        for (i = 0; i < BP_ORDER.length; i++) {
            aRows.push(_mapCustomerToRow(mCustomers[BP_ORDER[i]], 0));
        }

        aRows.sort(function (a, b) {
            return b.totalQty - a.totalQty;
        });

        for (i = 0; i < aRows.length; i++) {
            aRows[i].rank = i + 1;
            aRows[i].isTopRank = aRows[i].rank === 1;
        }

        return {
            season: sSeason,
            seasonLabel: _seasonLabel(sSeason),
            rows: aRows
        };
    }

    function _enrichViewRows(aRows) {
        var nMax = 0;
        var nTotal = 0;
        var sUnit = "PC";
        var i;

        for (i = 0; i < aRows.length; i++) {
            if (aRows[i].totalQty > nMax) {
                nMax = aRows[i].totalQty;
            }
            nTotal += aRows[i].totalQty;
            if (aRows[i].salesUnit) {
                sUnit = _displayUnit(aRows[i].salesUnit);
            }
        }

        for (i = 0; i < aRows.length; i++) {
            var nTotalQty = aRows[i].totalQty || 0;
            var nHit = aRows[i].hitQty || 0;
            var nBag = aRows[i].bagQty || 0;

            aRows[i].raceBarPercent = nMax ? Math.round((nTotalQty / nMax) * 100) : 0;
            aRows[i].barPercent = aRows[i].raceBarPercent;
            aRows[i].hitSharePercent = nTotalQty ? Math.round((nHit / nTotalQty) * 100) : 0;
            aRows[i].bagSharePercent = nTotalQty ? Math.round((nBag / nTotalQty) * 100) : 0;

            if (nTotalQty > 0 && aRows[i].hitSharePercent + aRows[i].bagSharePercent !== 100) {
                if (nHit >= nBag) {
                    aRows[i].hitSharePercent = 100 - aRows[i].bagSharePercent;
                } else {
                    aRows[i].bagSharePercent = 100 - aRows[i].hitSharePercent;
                }
            }
        }

        return {
            maxTotalQty: nMax,
            totalAllQty: nTotal,
            totalAllQtyDisplay: _formatQty(nTotal) + " " + sUnit,
            rows: aRows
        };
    }

    function _emptyViewData() {
        return {
            loading: true,
            error: "",
            title: "누적 구매량",
            subtitle: "BP별 히트텍 · 가방 주문",
            emptyText: "누적 구매량 데이터가 없습니다.",
            rows: []
        };
    }

    function _mapRowsToViewData(aODataRows) {
        var oAgg = _aggregateByCustomer(aODataRows);
        var oEnriched = _enrichViewRows(oAgg.rows);

        return {
            loading: false,
            error: "",
            title: "누적 구매량",
            subtitle: "BP별 히트텍 · 가방 · 합계 " + oEnriched.totalAllQtyDisplay,
            emptyText: "누적 구매량 데이터가 없습니다.",
            totalAllQtyDisplay: oEnriched.totalAllQtyDisplay,
            rows: oEnriched.rows
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
            var oModel = oComponent && oComponent.getModel("sdBestsellerModel");

            return _readAllRows(oModel)
                .then(function (aRows) {
                    return _mapRowsToViewData(aRows);
                })
                .catch(function (oError) {
                    var oViewData = _emptyViewData();
                    oViewData.loading = false;
                    oViewData.error = SapErrorUtil.extractMessage(oError, "베스트셀러 조회에 실패했습니다.");
                    return oViewData;
                });
        }
    };
});
