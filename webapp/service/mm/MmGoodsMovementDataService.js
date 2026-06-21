/**
 * MmGoodsMovementDataService.js
 *
 * MM Goods Movement Monitor — MIGO/PO/Material tracking + BomStock + InventoryStatus.
 * OData read는 MmOverviewDataService.loadOverviewData 재사용.
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/service/mm/MmOverviewDataService",
    "com/capstone/dashboard/fioridashboard/util/mm/MmChartHtmlUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmHeroUiUtil"
], function (MmOverviewDataService, MmChartHtmlUtil, MmHeroUiUtil) {
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

    function _buildMigoMatSet(aTracker) {
        var m = {};
        aTracker.forEach(function (oRow) {
            if (_hasMigo(oRow)) {
                var sMat = _normalizeCode(oRow.Material);
                if (sMat) {
                    m[sMat] = true;
                }
            }
        });
        return m;
    }

    function _resolveStatus(bHasPo, bHasMigo, bShortage) {
        if (bShortage && !bHasMigo) {
            return { label: "Risk", state: "Error" };
        }
        if (bHasPo && bHasMigo) {
            return { label: "Complete", state: "Success" };
        }
        if (bHasMigo || bHasPo) {
            return { label: "Partial", state: "Warning" };
        }
        return { label: "Missing", state: "None" };
    }

    function _mapMovementRow(oRow, mBom, mShortage, idx) {
        var sMat = _normalizeCode(oRow.Material);
        var oBom = mBom[sMat];
        var bHasPo = _hasPo(oRow);
        var bHasMigo = _hasMigo(oRow);
        var bShortage = !!(mShortage[sMat]);
        var oStatus = _resolveStatus(bHasPo, bHasMigo, bShortage);
        var sMigo = _getMigoDoc(oRow);
        var sMatStatus = oBom ? (oBom.StatusText || oBom.Status || NO_DATA) : NO_DATA;
        var sMatStatusState = oBom ? (oBom.StatusState || "None") : "None";

        return {
            id: [
                sMigo || "NOMIGO",
                oRow.PurchaseOrder || "NOPO",
                sMat || "NOMAT",
                String(idx)
            ].join("|"),
            migoDoc: bHasMigo ? sMigo : NO_DATA,
            poNo: bHasPo ? String(oRow.PurchaseOrder) : NO_DATA,
            materialNo: sMat ? String(oRow.Material) : NO_DATA,
            migoLinked: bHasMigo ? "Linked" : NO_DATA,
            migoLinkedState: bHasMigo ? "Success" : "None",
            materialStatus: sMatStatus,
            materialStatusState: sMatStatusState,
            stockQty: oBom ? Number(oBom.StockQty || 0) : null,
            shortageQty: oBom ? Number(oBom.ShortageQty || 0) : null,
            status: oStatus.label,
            statusState: oStatus.state,
            hasMigo: bHasMigo,
            isShortageMaterial: bShortage,
            raw: oRow
        };
    }

    function _applyFilters(aTracker, oFilters, mShortage) {
        var aResult = aTracker.slice();
        var sPo;
        var sMat;
        var sMigo;

        if (oFilters.migoSearch) {
            sMigo = String(oFilters.migoSearch).trim();
            aResult = aResult.filter(function (oRow) {
                return _getMigoDoc(oRow).indexOf(sMigo) >= 0;
            });
        }

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

        if (oFilters.migoSearch) {
            aParts.push("MIGO " + oFilters.migoSearch);
        }
        if (oFilters.poSearch) {
            aParts.push("PO " + oFilters.poSearch);
        }
        if (oFilters.materialSearch) {
            aParts.push("자재 " + oFilters.materialSearch);
        }
        if (oFilters.migoLinkedFilter === "LINKED") {
            aParts.push("MIGO 연결됨");
        } else if (oFilters.migoLinkedFilter === "NO_DATA") {
            aParts.push("MIGO 데이터 없음");
        }
        if (oFilters.shortageOnly) {
            aParts.push("부족 자재만");
        }

        return aParts.length ? MmHeroUiUtil.buildCriteriaBase(aParts.join(" · ")) : MmHeroUiUtil.UNIQLO_LABEL;
    }

    function _sortMovementRows(aRows) {
        return aRows.slice().sort(function (a, b) {
            if (a.hasMigo !== b.hasMigo) {
                return a.hasMigo ? -1 : 1;
            }
            if (a.isShortageMaterial !== b.isShortageMaterial) {
                return a.isShortageMaterial ? -1 : 1;
            }
            if (a.status === "Risk" && b.status !== "Risk") {
                return -1;
            }
            if (b.status === "Risk" && a.status !== "Risk") {
                return 1;
            }
            return String(a.migoDoc).localeCompare(String(b.migoDoc));
        });
    }

    function _countLinkedMaterials(aTracker) {
        var m = {};
        aTracker.forEach(function (oRow) {
            if (_hasMigo(oRow) || _hasPo(oRow)) {
                var sMat = _normalizeCode(oRow.Material);
                if (sMat) {
                    m[sMat] = true;
                }
            }
        });
        return Object.keys(m).length;
    }

    function _calcShortageWithMigo(aBom, mMigoMat) {
        var iCount = 0;
        aBom.filter(_isShortageItem).forEach(function (oItem) {
            var sMat = _normalizeCode(oItem.Component || oItem.MaterialCode);
            if (sMat && mMigoMat[sMat]) {
                iCount++;
            }
        });
        return iCount;
    }

    function _buildStockImpactSummary(aBom, aTracker) {
        var mMigoMat = _buildMigoMatSet(aTracker);
        var mShortage = _buildShortageSet(aBom);
        var iShortWithMigo = 0;
        var iShortWithoutMigo = 0;
        var iOkWithMigo = 0;

        aBom.forEach(function (oItem) {
            var sMat = _normalizeCode(oItem.Component || oItem.MaterialCode);
            if (!sMat || !mMigoMat[sMat]) {
                return;
            }
            if (_isShortageItem(oItem)) {
                iShortWithMigo++;
            } else if (oItem.FilterStatus === "OK" || String(oItem.Status || "").toUpperCase() === "OK") {
                iOkWithMigo++;
            }
        });

        Object.keys(mShortage).forEach(function (sMat) {
            if (!mMigoMat[sMat]) {
                iShortWithoutMigo++;
            }
        });

        return {
            migoLinkedMaterials: Object.keys(mMigoMat).length,
            shortageWithMigo: iShortWithMigo,
            shortageWithoutMigo: iShortWithoutMigo,
            okWithMigo: iOkWithMigo
        };
    }

    function _buildStatusStrip(aTracker, aBom) {
        var iMigo = aTracker.filter(_hasMigo).length;
        var iMissing = aTracker.length - iMigo;
        var iMat = _countLinkedMaterials(aTracker);
        var mMigoMat = _buildMigoMatSet(aTracker);
        var iShortWithMigo = _calcShortageWithMigo(aBom, mMigoMat);
        var iShortTotal = aBom.filter(_isShortageItem).length;

        return [
            {
                key: "migoLinked",
                title: "MIGO Linked",
                value: String(iMigo),
                unit: "EA",
                hint: "전표 연결됨",
                accent: "success",
                icon: "sap-icon://shipping-status"
            },
            {
                key: "missingMigo",
                title: "Missing MIGO",
                value: String(iMissing),
                unit: "EA",
                hint: "전표 없음",
                accent: iMissing > 0 ? "danger" : "blue",
                icon: "sap-icon://warning"
            },
            {
                key: "linkedMaterials",
                title: "Linked Materials",
                value: String(iMat),
                unit: "EA",
                hint: "MIGO/PO 연결",
                accent: "blue",
                icon: "sap-icon://product"
            },
            {
                key: "stockImpact",
                title: "Stock Impact Check",
                value: String(iShortWithMigo) + " / " + String(iShortTotal),
                unit: "EA",
                hint: "부족(MIGO연결/전체)",
                accent: iShortWithMigo < iShortTotal ? "amber" : "success",
                icon: "sap-icon://inspection"
            }
        ];
    }

    function _buildDocumentQueueItem(oRow) {
        return {
            id: oRow.id,
            migoDoc: oRow.migoDoc,
            poNo: oRow.poNo,
            materialNo: oRow.materialNo,
            linkStatus: oRow.hasMigo ? "Linked" : "Missing",
            linkStatusState: oRow.hasMigo ? "Success" : "Warning",
            accentClass: oRow.hasMigo ? "linked" : "missing"
        };
    }

    function _buildDocumentQueue(aMovements) {
        var aLinked = [];
        var aMissing = [];

        aMovements.forEach(function (oRow) {
            var oItem = _buildDocumentQueueItem(oRow);
            if (oRow.hasMigo) {
                aLinked.push(oItem);
            } else {
                aMissing.push(oItem);
            }
        });

        return {
            linkedDocuments: aLinked,
            missingDocuments: aMissing,
            linkedCount: aLinked.length,
            missingCount: aMissing.length
        };
    }

    function _buildMovementFlow(oRow, oDetail) {
        if (!oRow || !oDetail || !oDetail.hasSelection) {
            return {
                hasFlow: false,
                emptyMessage: "Movement Document Queue에서 항목을 선택하면 흐름이 표시됩니다.",
                steps: [],
                missingFields: []
            };
        }

        var bPoOk = oRow.hasPo;
        var bMigoOk = oRow.hasMigo;
        var bMatOk = oDetail.materialNo !== NO_DATA;
        var bStockOk = oDetail.materialStatus !== NO_DATA
            && String(oDetail.materialStatusState || "").toUpperCase() !== "ERROR";

        return {
            hasFlow: true,
            emptyMessage: "",
            steps: [
                {
                    key: "po",
                    label: "PO No",
                    value: oDetail.poNo,
                    state: bPoOk ? "Success" : "Warning",
                    icon: "sap-icon://sales-order"
                },
                {
                    key: "migo",
                    label: "MIGO Document No",
                    value: oDetail.migoDoc,
                    state: bMigoOk ? "Success" : "Warning",
                    icon: "sap-icon://shipping-status"
                },
                {
                    key: "material",
                    label: "Material No",
                    value: oDetail.materialNo,
                    state: bMatOk ? "Success" : "None",
                    icon: "sap-icon://product"
                },
                {
                    key: "stock",
                    label: "Stock Status",
                    value: oDetail.materialStatus,
                    state: oDetail.materialStatusState || "None",
                    icon: "sap-icon://inventory"
                }
            ],
            stockQty: oDetail.stockQty,
            requiredQty: oDetail.requiredQty,
            shortageQty: oDetail.shortageQty,
            fillRate: oDetail.fillRate,
            fillRatePercent: oDetail.fillRatePercent,
            fillRateState: oDetail.fillRateState,
            missingFields: [
                { label: "Movement Type", value: NO_DATA },
                { label: "Posting Date", value: NO_DATA },
                { label: "Movement Qty", value: NO_DATA },
                { label: "Plant", value: NO_DATA },
                { label: "Storage Location", value: NO_DATA },
                { label: "GR/GI 구분", value: NO_DATA }
            ]
        };
    }

    function _buildStockPanel(oDetail) {
        if (!oDetail || !oDetail.hasSelection) {
            return {
                hasSelection: false,
                emptyMessage: "문서를 선택하면 재고 영향이 표시됩니다.",
                dataAvailability: []
            };
        }

        var bHasStock = oDetail.stockQty !== NO_DATA;

        return {
            hasSelection: true,
            emptyMessage: "",
            materialStatus: oDetail.materialStatus,
            materialStatusState: oDetail.materialStatusState,
            stockQty: oDetail.stockQty,
            shortageQty: oDetail.shortageQty,
            availableStock: oDetail.availableStock,
            fillRate: oDetail.fillRate,
            fillRatePercent: oDetail.fillRatePercent,
            fillRateState: oDetail.fillRateState,
            warningMessage: oDetail.warningMessage,
            successMessage: oDetail.successMessage,
            dataAvailability: [
                { label: "MIGO Document No", value: "가능", ok: true },
                { label: "PO No", value: "가능", ok: true },
                { label: "Material No", value: "가능", ok: true },
                { label: "StockQty", value: bHasStock ? "가능" : NO_DATA, ok: bHasStock },
                { label: "Movement Type", value: NO_DATA, ok: false },
                { label: "Posting Date", value: NO_DATA, ok: false },
                { label: "Movement Qty", value: NO_DATA, ok: false }
            ]
        };
    }

    function _buildHeroKpis(aTracker) {
        var iPo = aTracker.filter(_hasPo).length;
        var iMigo = aTracker.filter(_hasMigo).length;
        var iMat = _countLinkedMaterials(aTracker);

        return [
            {
                displayTitle: "Document Rows",
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
                displayTitle: "Materials",
                value: String(iMat),
                unit: "EA",
                hint: "MIGO/PO 연결 Material",
                accent: "blue",
                icon: "sap-icon://product"
            }
        ];
    }

    function _buildKpis(aTracker, aBom) {
        var iMigo = aTracker.filter(_hasMigo).length;
        var iMissingMigo = aTracker.length - iMigo;
        var mMigoMat = _buildMigoMatSet(aTracker);
        var iShortWithMigo = _calcShortageWithMigo(aBom, mMigoMat);

        return [
            {
                displayTitle: "MIGO Linked",
                value: String(iMigo),
                unit: "EA",
                hint: "POMigoDoc / ProdMigoDoc",
                accent: "success",
                icon: "sap-icon://shipping-status"
            },
            {
                displayTitle: "Tracker Rows",
                value: String(aTracker.length),
                unit: "EA",
                hint: "Z_C_E2E_OrderTracker",
                accent: "blue",
                icon: "sap-icon://activity-items"
            },
            {
                displayTitle: "Linked Materials",
                value: String(_countLinkedMaterials(aTracker)),
                unit: "EA",
                hint: "MIGO 또는 PO 연결",
                accent: "blue",
                icon: "sap-icon://product"
            },
            {
                displayTitle: "Shortage with MIGO",
                value: String(iShortWithMigo),
                unit: "EA",
                hint: "부족 자재 MIGO 연결",
                accent: iShortWithMigo > 0 ? "danger" : "blue",
                icon: "sap-icon://alert"
            },
            {
                displayTitle: "Missing MIGO",
                value: String(iMissingMigo),
                unit: "EA",
                hint: "MIGO 전표 없음",
                accent: iMissingMigo > 0 ? "amber" : "blue",
                icon: "sap-icon://warning"
            }
        ];
    }

    function _emptyChart(sMsg) {
        return "<div class='nxMmOverviewChartEmpty'>" + (sMsg || NO_DATA) + "</div>";
    }

    function _buildAnalysis(aTracker, aBom) {
        var iMigoLinked = aTracker.filter(_hasMigo).length;
        var iMigoNot = aTracker.length - iMigoLinked;
        var mMatCount = {};
        var aMatRows;
        var oImpact = _buildStockImpactSummary(aBom, aTracker);

        aTracker.forEach(function (oRow) {
            var sMat = _normalizeCode(oRow.Material);
            if (sMat && (_hasMigo(oRow) || _hasPo(oRow))) {
                mMatCount[sMat] = (mMatCount[sMat] || 0) + 1;
            }
        });

        aMatRows = Object.keys(mMatCount).map(function (sKey) {
            return { label: sKey, value: mMatCount[sKey] };
        }).sort(function (a, b) { return b.value - a.value; }).slice(0, 6);

        return [
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
                title: "Material Movement Coverage",
                subtitle: "자재별 MIGO/Tracker 연결",
                html: aMatRows.length
                    ? MmChartHtmlUtil.buildInventoryAnalysisTypeBar(aMatRows)
                    : _emptyChart(NO_DATA),
                cardKey: "material",
                icon: "sap-icon://horizontal-bar-chart"
            },
            {
                title: "Stock Impact Summary",
                subtitle: "MIGO 연결 자재 재고 영향",
                html: MmChartHtmlUtil.buildGoodsMovementStockImpact(oImpact),
                cardKey: "impact",
                icon: "sap-icon://inspection"
            },
            {
                title: "Missing Movement Fields",
                subtitle: "CDS 미제공 이동 필드",
                html: MmChartHtmlUtil.buildMissingMovementFields(),
                cardKey: "missing",
                icon: "sap-icon://decline"
            }
        ];
    }

    function _findMovementRow(aRows, sSelectedId) {
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
                emptyMessage: "Movement Document Queue에서 항목을 선택하면 상세 정보가 표시됩니다.",
                footerNote: ""
            };
        }

        var oRaw = oRow.raw || {};
        var sMat = _normalizeCode(oRaw.Material);
        var oBom = mBom[sMat];
        var fFill = oBom ? _calcFillRate(oBom) : null;
        var fAvail = null;
        var bShortage = oBom ? _isShortageItem(oBom) : false;

        if (sMat && mInventory && mInventory[sMat] !== undefined) {
            fAvail = mInventory[sMat];
        }

        return {
            hasSelection: true,
            migoDoc: oRow.migoDoc,
            poNo: oRow.poNo,
            materialNo: oRow.materialNo,
            migoLinked: oRow.migoLinked,
            migoLinkedState: oRow.migoLinkedState,
            materialStatus: oRow.materialStatus,
            materialStatusState: oRow.materialStatusState,
            stockQty: oBom ? String(Number(oBom.StockQty || 0)) + " EA" : NO_DATA,
            requiredQty: oBom ? String(Number(oBom.RequiredQty || oBom.BomQty || 0)) + " EA" : NO_DATA,
            shortageQty: oBom ? String(Number(oBom.ShortageQty || 0)) + " EA" : NO_DATA,
            fillRate: fFill !== null ? fFill + "%" : NO_DATA,
            fillRatePercent: fFill !== null ? fFill : 0,
            fillRateState: fFill === null ? "None" : (fFill < 40 ? "Error" : (fFill < 70 ? "Warning" : "Success")),
            availableStock: fAvail !== null ? String(Math.round(fAvail)) + " EA" : NO_DATA,
            movementType: NO_DATA,
            postingDate: NO_DATA,
            movementQty: NO_DATA,
            plant: NO_DATA,
            storageLocation: NO_DATA,
            grGiType: NO_DATA,
            status: oRow.status,
            statusState: oRow.statusState,
            dataSource: "Z_C_E2E_OrderTracker / BomStockSet / Z_C_InventoryStatus",
            warningMessage: bShortage && !oRow.hasMigo
                ? "부족 자재에 MIGO 전표 연결이 없습니다."
                : "",
            successMessage: oRow.hasMigo && !bShortage
                ? "MIGO 전표가 연결되었고 자재 재고 상태가 정상입니다."
                : (oRow.hasMigo ? "MIGO 전표가 자재와 연결되어 있습니다." : ""),
            footerNote: "현재 CDS에서 제공되는 MIGO/PO/자재 추적 필드만 표시합니다.",
            emptyMessage: ""
        };
    }

    function buildGoodsMovementState(oCache, oFilters, sSelectedId) {
        var aBom = oCache.bomItems || [];
        var aTrackerRaw = oCache.trackerRows || [];
        var mBom = _buildBomMap(aBom);
        var mShortage = _buildShortageSet(aBom);
        var aFiltered = _applyFilters(aTrackerRaw, oFilters, mShortage);
        var aTable = _sortMovementRows(aFiltered.map(function (oRow, idx) {
            return _mapMovementRow(oRow, mBom, mShortage, idx);
        }));
        var oSelected = _findMovementRow(aTable, sSelectedId);
        var oDetail = _buildDetail(oSelected, mBom, oCache.inventoryMap);

        return {
            loading: false,
            loaded: true,
            error: "",
            criteriaLabel: _criteriaLabel(oFilters),
            heroFilterLine: MmHeroUiUtil.buildFilterLine(aTable.length),
            recordCount: aTable.length,
            odataBadge: "Z_C_E2E_OrderTracker",
            lastUpdated: oCache.lastUpdated || _formatTime(),
            migoSearch: oFilters.migoSearch || "",
            poSearch: oFilters.poSearch || "",
            materialSearch: oFilters.materialSearch || "",
            migoLinkedFilter: oFilters.migoLinkedFilter || "ALL",
            shortageOnly: oFilters.shortageOnly === true,
            linkFilterOptions: LINK_FILTER_OPTIONS,
            heroKpis: _buildHeroKpis(aFiltered),
            statusStrip: _buildStatusStrip(aFiltered, aBom),
            documentQueue: _buildDocumentQueue(aTable),
            movements: aTable,
            selectedMovementId: oSelected ? oSelected.id : "",
            detail: oDetail,
            movementFlow: _buildMovementFlow(oSelected, oDetail),
            stockPanel: _buildStockPanel(oDetail),
            analysisCards: _buildAnalysis(aFiltered, aBom)
        };
    }

    return {
        NO_DATA: NO_DATA,

        loadGoodsMovementData: function (oComponent, sImageBase) {
            return MmOverviewDataService.loadSharedMmData(oComponent);
        },

        buildGoodsMovementState: buildGoodsMovementState,

        getEmptyState: function () {
            return {
                loading: false,
                loaded: false,
                error: "",
                criteriaLabel: MmHeroUiUtil.UNIQLO_LABEL,
                heroFilterLine: MmHeroUiUtil.buildFilterLine(0),
                recordCount: 0,
                odataBadge: "Z_C_E2E_OrderTracker",
                lastUpdated: NO_DATA,
                migoSearch: "",
                poSearch: "",
                materialSearch: "",
                migoLinkedFilter: "ALL",
                shortageOnly: false,
                linkFilterOptions: LINK_FILTER_OPTIONS,
                heroKpis: [],
                statusStrip: [],
                documentQueue: {
                    linkedDocuments: [],
                    missingDocuments: [],
                    linkedCount: 0,
                    missingCount: 0
                },
                movements: [],
                selectedMovementId: "",
                detail: _buildDetail(null, {}, {}),
                movementFlow: _buildMovementFlow(null, _buildDetail(null, {}, {})),
                stockPanel: _buildStockPanel(_buildDetail(null, {}, {})),
                analysisCards: []
            };
        },

        getDefaultFilters: function () {
            return {
                migoSearch: "",
                poSearch: "",
                materialSearch: "",
                migoLinkedFilter: "ALL",
                shortageOnly: false
            };
        }
    };
});
