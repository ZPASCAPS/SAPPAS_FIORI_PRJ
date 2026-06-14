/**
 * MmPurchasingDataService.js
 *
 * MM Purchasing Control Tower — OrderTracker + BomStockSet + InventoryStatus.
 * OData read는 MmOverviewDataService.loadOverviewData 재사용.
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/service/MmOverviewDataService",
    "com/capstone/dashboard/fioridashboard/util/MmChartHtmlUtil"
], function (MmOverviewDataService, MmChartHtmlUtil) {
    "use strict";

    var NO_DATA = "데이터 없음";

    var LINK_FILTER_OPTIONS = [
        { key: "ALL", text: "전체" },
        { key: "LINKED", text: "연결됨" },
        { key: "NO_DATA", text: "데이터 없음" }
    ];

    function _formatTime(dDate) {
        var d = dDate || new Date();
        return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }

    function _normalizeCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function _hasPo(oRow) {
        return !!String(oRow.PurchaseOrder || "").trim();
    }

    function _hasMigo(oRow) {
        return !!(String(oRow.POMigoDoc || "").trim() || String(oRow.ProdMigoDoc || "").trim());
    }

    function _getMigoDoc(oRow) {
        return String(oRow.POMigoDoc || oRow.ProdMigoDoc || "").trim();
    }

    function _isShortageItem(oItem) {
        if (!oItem) {
            return false;
        }
        return oItem.FilterStatus === "SHORT"
            || String(oItem.Status || "").toUpperCase() === "SHORT"
            || Number(oItem.ShortageQty || 0) > 0;
    }

    function _calcFillRate(oItem) {
        if (!oItem) {
            return null;
        }
        var fRequired = Number(oItem.RequiredQty || oItem.BomQty || 0);
        var fStock = Number(oItem.StockQty || 0);
        if (fRequired <= 0) {
            return null;
        }
        return Math.min(100, Math.round((fStock / fRequired) * 100));
    }

    function _buildBomMap(aBom) {
        var m = {};
        aBom.forEach(function (oItem) {
            var sKey = _normalizeCode(oItem.Component || oItem.MaterialCode);
            if (sKey) {
                m[sKey] = oItem;
            }
        });
        return m;
    }

    function _buildShortageSet(aBom) {
        var m = {};
        aBom.filter(_isShortageItem).forEach(function (oItem) {
            var sKey = _normalizeCode(oItem.Component || oItem.MaterialCode);
            if (sKey) {
                m[sKey] = true;
            }
        });
        return m;
    }

    function _resolveRisk(bHasPo, bHasMigo, bShortage) {
        if (bShortage && (!bHasPo || !bHasMigo)) {
            return { label: "Risk", state: "Error" };
        }
        if (bHasPo && bHasMigo) {
            return { label: "Complete", state: "Success" };
        }
        if (bHasPo || bHasMigo) {
            return { label: "Partial", state: "Warning" };
        }
        return { label: "Missing", state: "None" };
    }

    function _mapTrackerRow(oRow, mBom, mShortage, idx) {
        var sMat = _normalizeCode(oRow.Material);
        var oBom = mBom[sMat];
        var bHasPo = _hasPo(oRow);
        var bHasMigo = _hasMigo(oRow);
        var bShortage = !!(mShortage[sMat]);
        var oRisk = _resolveRisk(bHasPo, bHasMigo, bShortage);
        var sMigo = _getMigoDoc(oRow);

        return {
            id: [
                oRow.PurchaseOrder || "NOPO",
                sMat || "NOMAT",
                sMigo || "NOMIGO",
                String(idx)
            ].join("|"),
            poNo: bHasPo ? String(oRow.PurchaseOrder) : NO_DATA,
            materialNo: sMat ? String(oRow.Material) : NO_DATA,
            migoDoc: bHasMigo ? sMigo : NO_DATA,
            poLinked: bHasPo ? "Linked" : NO_DATA,
            poLinkedState: bHasPo ? "Success" : "None",
            migoLinked: bHasMigo ? "Linked" : NO_DATA,
            migoLinkedState: bHasMigo ? "Success" : "None",
            poStatus: bHasPo ? "Linked" : NO_DATA,
            poStatusState: bHasPo ? "Success" : "None",
            migoStatus: bHasMigo ? "Linked" : (bHasPo ? "Missing" : NO_DATA),
            migoStatusState: bHasMigo ? "Success" : (bHasPo ? "Warning" : "None"),
            procurementStatus: oRisk.label,
            procurementStatusState: oRisk.state,
            materialRisk: oRisk.label,
            materialRiskState: oRisk.state,
            status: oRisk.label,
            statusState: oRisk.state,
            shortageQty: oBom ? Number(oBom.ShortageQty || 0) : null,
            isShortageMaterial: bShortage,
            hasPo: bHasPo,
            hasMigo: bHasMigo,
            raw: oRow
        };
    }

    function _applyFilters(aTracker, oFilters, mShortage) {
        var aResult = aTracker.slice();
        var sPo;
        var sMat;
        var sMigo;

        if (oFilters.poSearch) {
            sPo = String(oFilters.poSearch).trim();
            aResult = aResult.filter(function (oRow) {
                return String(oRow.PurchaseOrder || "").indexOf(sPo) >= 0;
            });
        }

        if (oFilters.materialSearch) {
            sMat = _normalizeCode(oFilters.materialSearch);
            aResult = aResult.filter(function (oRow) {
                return _normalizeCode(oRow.Material).indexOf(sMat) >= 0;
            });
        }

        if (oFilters.migoSearch) {
            sMigo = String(oFilters.migoSearch).trim();
            aResult = aResult.filter(function (oRow) {
                return _getMigoDoc(oRow).indexOf(sMigo) >= 0;
            });
        }

        if (oFilters.poLinkedFilter === "LINKED") {
            aResult = aResult.filter(_hasPo);
        } else if (oFilters.poLinkedFilter === "NO_DATA") {
            aResult = aResult.filter(function (oRow) { return !_hasPo(oRow); });
        }

        if (oFilters.migoLinkedFilter === "LINKED") {
            aResult = aResult.filter(_hasMigo);
        } else if (oFilters.migoLinkedFilter === "NO_DATA") {
            aResult = aResult.filter(function (oRow) { return !_hasMigo(oRow); });
        }

        if (oFilters.shortageOnly) {
            aResult = aResult.filter(function (oRow) {
                return mShortage[_normalizeCode(oRow.Material)];
            });
        }

        return aResult;
    }

    function _criteriaLabel(oFilters) {
        var aParts = [];

        if (oFilters.poSearch) {
            aParts.push("PO " + oFilters.poSearch);
        }
        if (oFilters.materialSearch) {
            aParts.push("자재 " + oFilters.materialSearch);
        }
        if (oFilters.migoSearch) {
            aParts.push("MIGO " + oFilters.migoSearch);
        }
        if (oFilters.poLinkedFilter === "LINKED") {
            aParts.push("PO 연결됨");
        } else if (oFilters.poLinkedFilter === "NO_DATA") {
            aParts.push("PO 데이터 없음");
        }
        if (oFilters.migoLinkedFilter === "LINKED") {
            aParts.push("MIGO 연결됨");
        } else if (oFilters.migoLinkedFilter === "NO_DATA") {
            aParts.push("MIGO 데이터 없음");
        }
        if (oFilters.shortageOnly) {
            aParts.push("부족 자재만");
        }

        return aParts.length ? aParts.join(" · ") : "전체 Tracker";
    }

    function _sortTrackerRows(aRows) {
        return aRows.slice().sort(function (a, b) {
            if (a.isShortageMaterial !== b.isShortageMaterial) {
                return a.isShortageMaterial ? -1 : 1;
            }
            if (a.hasPo !== b.hasPo) {
                return a.hasPo ? -1 : 1;
            }
            if (a.materialRisk === "Risk" && b.materialRisk !== "Risk") {
                return -1;
            }
            if (b.materialRisk === "Risk" && a.materialRisk !== "Risk") {
                return 1;
            }
            return String(a.poNo).localeCompare(String(b.poNo));
        });
    }

    function _countLinkedMaterials(aTracker) {
        var m = {};
        aTracker.forEach(function (oRow) {
            var sMat = _normalizeCode(oRow.Material);
            if (sMat) {
                m[sMat] = true;
            }
        });
        return Object.keys(m).length;
    }

    function _calcProcurementRisk(aBom, aTracker) {
        var mPoByMat = {};
        var iRisk = 0;

        aTracker.forEach(function (oRow) {
            if (_hasPo(oRow)) {
                mPoByMat[_normalizeCode(oRow.Material)] = true;
            }
        });

        aBom.filter(_isShortageItem).forEach(function (oItem) {
            var sMat = _normalizeCode(oItem.Component || oItem.MaterialCode);
            if (sMat && !mPoByMat[sMat]) {
                iRisk++;
            }
        });

        return iRisk;
    }

    function _buildPipeline(aTracker, aBom) {
        var iPo = aTracker.filter(_hasPo).length;
        var iMigo = aTracker.filter(_hasMigo).length;
        var iMat = _countLinkedMaterials(aTracker);
        var iRisk = _calcProcurementRisk(aBom, aTracker);

        return [
            {
                key: "po",
                title: "PO Linked",
                value: String(iPo),
                unit: "EA",
                hint: "PurchaseOrder 존재",
                accent: iPo > 0 ? "blue" : "neutral",
                icon: "sap-icon://sales-order",
                showArrow: true
            },
            {
                key: "migo",
                title: "MIGO Linked",
                value: String(iMigo),
                unit: "EA",
                hint: "POMigoDoc / ProdMigoDoc",
                accent: iMigo > 0 ? "success" : "neutral",
                icon: "sap-icon://shipping-status",
                showArrow: true
            },
            {
                key: "material",
                title: "Material Linked",
                value: String(iMat),
                unit: "EA",
                hint: "Tracker 고유 Material",
                accent: iMat > 0 ? "blue" : "neutral",
                icon: "sap-icon://product",
                showArrow: true
            },
            {
                key: "risk",
                title: "Procurement Risk",
                value: String(iRisk),
                unit: "EA",
                hint: "부족 자재 PO 미연결",
                accent: iRisk > 0 ? "danger" : "success",
                icon: "sap-icon://alert",
                showArrow: false
            }
        ];
    }

    function _buildRiskQueue(aTable) {
        return aTable.filter(function (oRow) {
            return oRow.isShortageMaterial;
        }).map(function (oRow) {
            var sAction;
            var sRiskLevel;
            var sRiskState;
            var sAccent;

            if (!oRow.hasPo) {
                sAction = "PO 연결 확인 필요";
                sRiskLevel = "High";
                sRiskState = "Error";
                sAccent = "danger";
            } else if (!oRow.hasMigo) {
                sAction = "MIGO 전표 연결 확인 필요";
                sRiskLevel = "Medium";
                sRiskState = "Warning";
                sAccent = "warning";
            } else {
                sAction = "구매 흐름 정상";
                sRiskLevel = "Low";
                sRiskState = "Success";
                sAccent = "success";
            }

            return {
                id: "risk|" + oRow.id,
                trackerId: oRow.id,
                materialNo: oRow.materialNo,
                shortageQty: oRow.shortageQty !== null ? String(oRow.shortageQty) : NO_DATA,
                poLinked: oRow.poLinked,
                poLinkedState: oRow.poLinkedState,
                migoLinked: oRow.migoLinked,
                migoLinkedState: oRow.migoLinkedState,
                riskLevel: sRiskLevel,
                riskLevelState: sRiskState,
                actionText: sAction,
                accentClass: sAccent
            };
        }).sort(function (a, b) {
            var mRank = { High: 0, Medium: 1, Low: 2 };
            return (mRank[a.riskLevel] || 9) - (mRank[b.riskLevel] || 9);
        });
    }

    function _buildRiskMaterialRows(aBom) {
        return aBom.filter(_isShortageItem).map(function (oItem) {
            return {
                label: _normalizeCode(oItem.Component || oItem.MaterialCode),
                value: Number(oItem.ShortageQty || 0) || 1
            };
        }).sort(function (a, b) {
            return b.value - a.value;
        }).slice(0, 6);
    }

    function _buildKpis(aTracker, aBom) {
        var iPo = aTracker.filter(_hasPo).length;
        var iMigo = aTracker.filter(_hasMigo).length;
        var iMat = _countLinkedMaterials(aTracker);
        var iRisk = _calcProcurementRisk(aBom, aTracker);

        return [
            {
                displayTitle: "Tracker Rows",
                value: String(aTracker.length),
                unit: "EA",
                hint: "Z_C_E2E_OrderTracker",
                accent: "blue",
                icon: "sap-icon://activity-items"
            },
            {
                displayTitle: "PO Linked",
                value: String(iPo),
                unit: "EA",
                hint: "PurchaseOrder 존재",
                accent: "blue",
                icon: "sap-icon://sales-order"
            },
            {
                displayTitle: "MIGO Linked",
                value: String(iMigo),
                unit: "EA",
                hint: "POMigoDoc / ProdMigoDoc",
                accent: "success",
                icon: "sap-icon://shipping-status"
            },
            {
                displayTitle: "Linked Materials",
                value: String(iMat),
                unit: "EA",
                hint: "Tracker 고유 Material",
                accent: "blue",
                icon: "sap-icon://product"
            },
            {
                displayTitle: "Procurement Risk",
                value: String(iRisk),
                unit: "EA",
                hint: "부족 자재 PO 미연결",
                accent: iRisk > 0 ? "danger" : "blue",
                icon: "sap-icon://alert"
            }
        ];
    }

    function _emptyChart(sMsg) {
        return "<div class='nxMmOverviewChartEmpty'>" + (sMsg || NO_DATA) + "</div>";
    }

    function _buildAnalysis(aTracker, aBom) {
        var iPoLinked = aTracker.filter(_hasPo).length;
        var iPoNot = aTracker.length - iPoLinked;
        var iMigoLinked = aTracker.filter(_hasMigo).length;
        var iMigoNot = aTracker.length - iMigoLinked;
        var aRiskRows = _buildRiskMaterialRows(aBom || []);

        return [
            {
                title: "PO Link Coverage",
                subtitle: "PurchaseOrder 연결 비율",
                html: aTracker.length
                    ? MmChartHtmlUtil.buildPurchasingLinkDonut(iPoLinked, iPoNot, "PO Linked", "Not Linked")
                    : _emptyChart(NO_DATA),
                cardKey: "po",
                icon: "sap-icon://pie-chart"
            },
            {
                title: "MIGO Link Coverage",
                subtitle: "MIGO Document 연결 비율",
                html: aTracker.length
                    ? MmChartHtmlUtil.buildPurchasingLinkDonut(iMigoLinked, iMigoNot, "MIGO Linked", "Not Linked")
                    : _emptyChart(NO_DATA),
                cardKey: "migo",
                icon: "sap-icon://pie-chart"
            },
            {
                title: "Procurement Risk Materials",
                subtitle: "부족 자재 ShortageQty",
                html: aRiskRows.length
                    ? MmChartHtmlUtil.buildInventoryAnalysisTypeBar(aRiskRows)
                    : _emptyChart(NO_DATA),
                cardKey: "risk",
                icon: "sap-icon://horizontal-bar-chart"
            },
            {
                title: "Purchasing Data Availability",
                subtitle: "OData 필드 제공 현황",
                html: MmChartHtmlUtil.buildPurchasingDataAvailability(),
                cardKey: "data",
                icon: "sap-icon://checklist"
            }
        ];
    }

    function _findTrackerRow(aRows, sSelectedId) {
        var i;
        if (sSelectedId) {
            for (i = 0; i < aRows.length; i++) {
                if (aRows[i].id === sSelectedId) {
                    return aRows[i];
                }
            }
        }
        return null;
    }

    function _buildDetail(oRow, mBom, mInventory) {
        if (!oRow) {
            return {
                hasSelection: false,
                emptyMessage: "Procurement Risk Queue 또는 Tracker Board에서 항목을 선택하면 상세 정보가 표시됩니다.",
                footerNote: ""
            };
        }

        var oRaw = oRow.raw || {};
        var sMat = _normalizeCode(oRaw.Material);
        var oBom = mBom[sMat];
        var fFill = oBom ? _calcFillRate(oBom) : null;
        var fAvail = null;
        var bShortage = oBom ? _isShortageItem(oBom) : false;
        var oRisk = _resolveRisk(oRow.hasPo, oRow.hasMigo, bShortage);

        if (sMat && mInventory && mInventory[sMat] !== undefined) {
            fAvail = mInventory[sMat];
        }

        return {
            hasSelection: true,
            poNo: oRow.poNo,
            materialNo: oRow.materialNo,
            migoDoc: oRow.migoDoc,
            poLinked: oRow.poLinked,
            poLinkedState: oRow.poLinkedState,
            migoLinked: oRow.migoLinked,
            migoLinkedState: oRow.migoLinkedState,
            materialRisk: oRow.materialRisk,
            materialRiskState: oRow.materialRiskState,
            status: oRow.status,
            statusState: oRow.statusState,
            stockQty: oBom ? String(Number(oBom.StockQty || 0)) + " EA" : NO_DATA,
            shortageQty: oBom ? String(Number(oBom.ShortageQty || 0)) + " EA" : NO_DATA,
            bomStatus: oBom ? (oBom.StatusText || oBom.Status || NO_DATA) : NO_DATA,
            bomStatusState: oBom ? (oBom.StatusState || "None") : "None",
            fillRate: fFill !== null ? fFill + "%" : NO_DATA,
            fillRatePercent: fFill !== null ? fFill : 0,
            fillRateState: fFill === null ? "None" : (fFill < 40 ? "Error" : (fFill < 70 ? "Warning" : "Success")),
            availableStock: fAvail !== null ? String(Math.round(fAvail)) + " EA" : NO_DATA,
            vendor: NO_DATA,
            deliveryDate: NO_DATA,
            poValue: NO_DATA,
            openQty: NO_DATA,
            receivedQty: NO_DATA,
            dataSource: "Z_C_E2E_OrderTracker / BomStockSet / Z_C_InventoryStatus",
            warningMessage: oRisk.label === "Risk"
                ? "부족 자재의 PO/MIGO 연결 확인이 필요합니다."
                : "",
            successMessage: oRisk.label === "Complete"
                ? "PO와 MIGO 전표가 모두 연결된 추적 항목입니다."
                : "",
            footerNote: "현재 CDS에서 제공되는 PO/MIGO 추적 필드만 표시합니다.",
            emptyMessage: ""
        };
    }

    function buildPurchasingState(oCache, oFilters, sSelectedId) {
        var aBom = oCache.bomItems || [];
        var aTrackerRaw = oCache.trackerRows || [];
        var mBom = _buildBomMap(aBom);
        var mShortage = _buildShortageSet(aBom);
        var aFiltered = _applyFilters(aTrackerRaw, oFilters, mShortage);
        var aTable = _sortTrackerRows(aFiltered.map(function (oRow, idx) {
            return _mapTrackerRow(oRow, mBom, mShortage, idx);
        }));
        var oSelected = _findTrackerRow(aTable, sSelectedId);

        return {
            loading: false,
            loaded: true,
            error: "",
            criteriaLabel: _criteriaLabel(oFilters),
            lastUpdated: oCache.lastUpdated || _formatTime(),
            poSearch: oFilters.poSearch || "",
            materialSearch: oFilters.materialSearch || "",
            migoSearch: oFilters.migoSearch || "",
            poLinkedFilter: oFilters.poLinkedFilter || "ALL",
            migoLinkedFilter: oFilters.migoLinkedFilter || "ALL",
            shortageOnly: oFilters.shortageOnly === true,
            linkFilterOptions: LINK_FILTER_OPTIONS,
            pipeline: _buildPipeline(aFiltered, aBom),
            riskQueue: _buildRiskQueue(aTable),
            trackers: aTable,
            selectedTrackerId: oSelected ? oSelected.id : "",
            detail: _buildDetail(oSelected, mBom, oCache.inventoryMap),
            analysisCards: _buildAnalysis(aFiltered, aBom)
        };
    }

    return {
        NO_DATA: NO_DATA,

        loadPurchasingData: function (oComponent, sImageBase) {
            return MmOverviewDataService.loadOverviewData(oComponent, sImageBase);
        },

        buildPurchasingState: buildPurchasingState,

        getEmptyState: function () {
            return {
                loading: false,
                loaded: false,
                error: "",
                criteriaLabel: "전체 Tracker",
                lastUpdated: NO_DATA,
                poSearch: "",
                materialSearch: "",
                migoSearch: "",
                poLinkedFilter: "ALL",
                migoLinkedFilter: "ALL",
                shortageOnly: false,
                linkFilterOptions: LINK_FILTER_OPTIONS,
                pipeline: [],
                riskQueue: [],
                trackers: [],
                selectedTrackerId: "",
                detail: _buildDetail(null, {}, {}),
                analysisCards: []
            };
        },

        getDefaultFilters: function () {
            return {
                poSearch: "",
                materialSearch: "",
                migoSearch: "",
                poLinkedFilter: "ALL",
                migoLinkedFilter: "ALL",
                shortageOnly: false
            };
        }
    };
});
