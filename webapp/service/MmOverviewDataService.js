/**
 * MmOverviewDataService.js
 *
 * MM Overview Cockpit — SAP OData read, filter, KPI/chart/worklist aggregation.
 * Uses: BomStockSet (Component), Z_C_InventoryStatus (Material), Z_C_E2E_OrderTracker (Material).
 * UP* 자재 필터: MmUpMaterialFilterUtil (UP-R-COT-001, UP-F-ONT-001 제외).
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/util/MmChartHtmlUtil",
    "com/capstone/dashboard/fioridashboard/util/MmUpMaterialFilterUtil",
    "com/capstone/dashboard/fioridashboard/util/MmHeroUiUtil"
], function (DashboardDataService, SapErrorUtil, MmChartHtmlUtil, MmUpMaterialFilterUtil, MmHeroUiUtil) {
    "use strict";

    var NO_DATA = "데이터 없음";
    var QUERY_MODES = {
        ALL: "ALL",
        MATERIAL: "MATERIAL",
        PO: "PO"
    };

    function _esc(sText) {
        return String(sText || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function _formatTime(dDate) {
        var d = dDate || new Date();
        var h = String(d.getHours()).padStart(2, "0");
        var m = String(d.getMinutes()).padStart(2, "0");
        return h + ":" + m;
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

    function _sumInventoryByMaterial(aInventory) {
        var m = {};
        aInventory.forEach(function (oRow) {
            var sMat = String(oRow.Material || "").toUpperCase();
            if (!sMat) {
                return;
            }
            m[sMat] = (m[sMat] || 0) + Number(oRow.AvailableStock || 0);
        });
        return m;
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

    function _normalizeMaterialCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function _normalizePoCode(sText) {
        var s = String(sText || "").trim();
        if (!s) {
            return "";
        }
        if (/^\d+$/.test(s)) {
            return s.padStart(10, "0");
        }
        return s.toUpperCase();
    }

    function _trackerStatus(oRow) {
        if (oRow.POMigoDoc || oRow.ProdMigoDoc) {
            return "GR Posted";
        }
        if (oRow.PurchaseOrder) {
            return "PO Linked";
        }
        if (oRow.PurchaseRequisition) {
            return "PR Linked";
        }
        return "Tracked";
    }

    function _emptyChart(sMsg) {
        return "<div class='nxMmOverviewChartEmpty'>" + _esc(sMsg || NO_DATA) + "</div>";
    }

    function _buildBarChart(aRows, sValueKey, sLabelKey, sTitle) {
        if (!aRows.length) {
            return _emptyChart(NO_DATA);
        }
        var fMax = Math.max.apply(null, aRows.map(function (r) {
            return Number(r[sValueKey] || 0);
        }).concat([1]));
        var sRows = aRows.map(function (oRow, idx) {
            var fVal = Number(oRow[sValueKey] || 0);
            var iW = Math.round((fVal / fMax) * 100);
            var sColor = ["#0070F2", "#5899DA", "#36A41D", "#EAC20B", "#BB0000", "#8B5CF6"][idx % 6];
            var sLabel = String(oRow[sLabelKey] || "-");
            if (sLabel.length > 12) {
                sLabel = sLabel.slice(0, 12);
            }
            return "<div class='nxMmOverviewBarRow'>" +
                "<div class='nxMmOverviewBarLabel' title='" + _esc(oRow[sLabelKey]) + "'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmOverviewBarTrack'><div class='nxMmOverviewBarFill' style='width:" + iW + "%;background:" + sColor + "'></div></div>" +
                "<div class='nxMmOverviewBarValue'>" + fVal.toLocaleString() + "</div></div>";
        }).join("");
        return "<div class='nxMmOverviewBarChart'>" + (sTitle ? "<div class='nxMmOverviewBarChartTitle'>" + _esc(sTitle) + "</div>" : "") + sRows + "</div>";
    }

    function _buildStatusChart(mCounts) {
        var aKeys = Object.keys(mCounts);
        if (!aKeys.length) {
            return _emptyChart(NO_DATA);
        }
        var iTotal = aKeys.reduce(function (s, k) { return s + mCounts[k]; }, 0) || 1;
        var aBars = aKeys.map(function (sKey, idx) {
            var iCount = mCounts[sKey];
            var iH = Math.max(12, Math.round((iCount / iTotal) * 100));
            var sColor = { OK: "#36A41D", WARN: "#EAC20B", SHORT: "#BB0000" }[sKey] || ["#0070F2", "#5899DA", "#EAC20B"][idx % 3];
            return "<div class='nxMmOverviewStatusCol'>" +
                "<div class='nxMmOverviewStatusBar' style='height:" + iH + "px;background:" + sColor + "'></div>" +
                "<div class='nxMmOverviewStatusCount'>" + iCount + "</div>" +
                "<div class='nxMmOverviewStatusLabel'>" + _esc(sKey) + "</div></div>";
        }).join("");
        return "<div class='nxMmOverviewStatusChart'>" + aBars + "</div>";
    }

    function _buildTrackerSummaryChart(aTracker) {
        var iPo = 0;
        var iMigo = 0;
        var iMat = 0;
        var mMat = {};
        aTracker.forEach(function (oRow) {
            if (oRow.PurchaseOrder) {
                iPo++;
            }
            if (oRow.POMigoDoc || oRow.ProdMigoDoc) {
                iMigo++;
            }
            if (oRow.Material) {
                mMat[String(oRow.Material).toUpperCase()] = true;
            }
        });
        iMat = Object.keys(mMat).length;
        if (!aTracker.length) {
            return _emptyChart(NO_DATA);
        }
        return _buildBarChart([
            { label: "Tracker Rows", value: aTracker.length },
            { label: "PO Linked", value: iPo },
            { label: "MIGO Linked", value: iMigo },
            { label: "Materials", value: iMat }
        ], "value", "label", "");
    }

    function _kpi(label, value, unit, hint) {
        return {
            label: label,
            value: value === null || value === undefined || value === "" ? NO_DATA : String(value),
            unit: unit || "",
            hint: hint || ""
        };
    }

    function _buildKpisAll(aBom, aTracker, mInventory) {
        var iShort = aBom.filter(_isShortageItem).length;
        var iTotal = aBom.length;
        var fStockSum = aBom.reduce(function (s, i) { return s + Number(i.StockQty || 0); }, 0);
        var aRates = aBom.map(_calcFillRate).filter(function (v) { return v !== null; });
        var fAvgFill = aRates.length
            ? Math.round(aRates.reduce(function (s, v) { return s + v; }, 0) / aRates.length)
            : null;
        var mStatus = {};
        aBom.forEach(function (oItem) {
            var sKey = oItem.FilterStatus || oItem.Status || "UNKNOWN";
            mStatus[sKey] = (mStatus[sKey] || 0) + 1;
        });
        var sCritical = mStatus.SHORT ? String(mStatus.SHORT) : (iShort ? String(iShort) : "0");

        return [
            _kpi("Shortage Items", iShort, "EA", "BomStockSet · Status/ShortageQty"),
            _kpi("Total Materials", iTotal, "EA", "BomStockSet 전체 자재 수"),
            _kpi("Total Stock Qty", Math.round(fStockSum), "EA", "BomStockSet StockQty 합계"),
            _kpi("Avg Fill Rate", fAvgFill !== null ? fAvgFill : NO_DATA, fAvgFill !== null ? "%" : "", "RequiredQty 대비 StockQty"),
            _kpi("Critical / Shortage", sCritical, "EA", "Status SHORT 집계"),
            _kpi("PO/MIGO Tracker Count", aTracker.length, "EA", "Z_C_E2E_OrderTracker")
        ];
    }

    function _buildKpisMaterial(aBom, aTracker, mInventory, sMaterial) {
        var oItem = aBom[0];
        var fAvail = _getAvailableStock(sMaterial, mInventory);
        var iRelated = aTracker.length;
        var fFill = oItem ? _calcFillRate(oItem) : null;

        if (!oItem && fAvail === null && !iRelated) {
            return [
                _kpi("Current Stock", NO_DATA, "", ""),
                _kpi("Available Stock", NO_DATA, "", ""),
                _kpi("Shortage Qty", NO_DATA, "", ""),
                _kpi("Fill Rate", NO_DATA, "", ""),
                _kpi("Status", NO_DATA, "", ""),
                _kpi("Related PO/MIGO Count", 0, "EA", "OrderTracker")
            ];
        }

        return [
            _kpi("Current Stock", oItem ? Number(oItem.StockQty || 0) : NO_DATA, oItem ? "EA" : "", "BomStockSet"),
            _kpi("Available Stock", fAvail !== null ? Math.round(fAvail) : NO_DATA, fAvail !== null ? "EA" : "", "Z_C_InventoryStatus"),
            _kpi("Shortage Qty", oItem ? Number(oItem.ShortageQty || 0) : NO_DATA, oItem ? "EA" : "", "BomStockSet"),
            _kpi("Fill Rate", fFill !== null ? fFill : NO_DATA, fFill !== null ? "%" : "", "RequiredQty·StockQty"),
            _kpi("Status", oItem ? (oItem.StatusText || oItem.Status || NO_DATA) : NO_DATA, "", "BomStockSet Status"),
            _kpi("Related PO/MIGO Count", iRelated, "EA", "OrderTracker")
        ];
    }

    function _buildKpisPo(aTracker, sPo) {
        var oRow = aTracker[0];
        var sMigo = oRow ? (oRow.POMigoDoc || oRow.ProdMigoDoc || NO_DATA) : NO_DATA;
        var sMat = oRow ? (oRow.Material || NO_DATA) : NO_DATA;

        return [
            _kpi("PO No", sPo || NO_DATA, "", "OrderTracker"),
            _kpi("Related Material", sMat, "", "OrderTracker"),
            _kpi("MIGO Document No", sMigo, "", "OrderTracker"),
            _kpi("Tracker Status", oRow ? _trackerStatus(oRow) : NO_DATA, "", ""),
            _kpi("Related Count", aTracker.length, "EA", "OrderTracker rows"),
            _kpi("Last Updated", _formatTime(), "", "조회 시각")
        ];
    }

    function _hasTrendDateField(aBom, aTracker) {
        var aDateKeys = [
            "PostingDate", "CreatedAt", "ChangedAt", "DocumentDate",
            "LastUpdated", "Erdat", "Aedat", "Budat", "Cpudt"
        ];
        var aSamples = [];
        var i;
        var k;

        if (aBom && aBom[0]) {
            aSamples.push(aBom[0]);
        }
        if (aTracker && aTracker[0]) {
            aSamples.push(aTracker[0]);
        }

        for (i = 0; i < aSamples.length; i++) {
            for (k = 0; k < aDateKeys.length; k++) {
                if (aSamples[i][aDateKeys[k]]) {
                    return aDateKeys[k];
                }
            }
        }

        return null;
    }

    function _buildChartsAll(aBom, aTracker) {
        var iShort = aBom.filter(_isShortageItem).length;
        var aRates = aBom.map(_calcFillRate).filter(function (v) { return v !== null; });
        var fAvgFill = aRates.length
            ? Math.round(aRates.reduce(function (s, v) { return s + v; }, 0) / aRates.length)
            : null;
        var oHighest = aBom.filter(_isShortageItem).slice().sort(function (a, b) {
            return Number(b.ShortageQty || 0) - Number(a.ShortageQty || 0);
        })[0];
        var sHighest = oHighest && Number(oHighest.ShortageQty || 0) > 0
            ? (oHighest.Component || oHighest.MaterialCode || NO_DATA)
            : NO_DATA;
        var mStatus = {};
        aBom.forEach(function (oItem) {
            var sKey = oItem.FilterStatus || oItem.Status || "UNKNOWN";
            mStatus[sKey] = (mStatus[sKey] || 0) + 1;
        });
        var sCritical = mStatus.SHORT ? String(mStatus.SHORT) : (iShort ? String(iShort) : "0");

        var aShortTop = aBom.filter(_isShortageItem).slice().sort(function (a, b) {
            return Number(b.ShortageQty || 0) - Number(a.ShortageQty || 0);
        }).slice(0, 6).map(function (oItem) {
            return {
                label: oItem.Component || oItem.MaterialCode,
                value: Number(oItem.ShortageQty || oItem.StockQty || 0)
            };
        });

        var mTypeStock = {};
        aBom.forEach(function (oItem) {
            var sType = oItem.TypeLabel || "자재";
            mTypeStock[sType] = (mTypeStock[sType] || 0) + Number(oItem.StockQty || 0);
        });
        var aTypeRows = Object.keys(mTypeStock).map(function (sKey) {
            return { label: sKey, value: mTypeStock[sKey] };
        }).sort(function (a, b) { return b.value - a.value; });

        var sTypeSubtitle = aTypeRows.length <= 3
            ? "BomStockSet TypeLabel · StockQty (Compact Bar)"
            : "BomStockSet TypeLabel · StockQty (Column)";

        var sActionText = NO_DATA;
        var sMatKey = oHighest
            ? String(oHighest.Component || oHighest.MaterialCode || "").toUpperCase()
            : "";
        var bHasTracker = sMatKey && aTracker.some(function (r) {
            return String(r.Material || "").toUpperCase() === sMatKey;
        });

        if (!oHighest || sHighest === NO_DATA) {
            sActionText = "현재 부족 자재가 없습니다.";
        } else if (bHasTracker) {
            sActionText = "관련 PO/MIGO 추적 여부를 확인하세요.";
        } else {
            sActionText = "부족 수량 및 입고 계획을 확인하세요.";
        }

        return [
            {
                title: "Top Shortage Materials",
                subtitle: "BomStockSet · ShortageQty 상위",
                tier: "row1",
                html: aShortTop.length
                    ? MmChartHtmlUtil.buildOverviewShortageBar(aShortTop)
                    : _emptyChart("부족 자재 없음")
            },
            {
                title: "Stock Status Distribution",
                subtitle: "BomStockSet Status · SHORT / OK",
                tier: "row1",
                html: Object.keys(mStatus).length
                    ? MmChartHtmlUtil.buildOverviewStatusDonut(mStatus, aBom.length)
                    : _emptyChart(NO_DATA)
            },
            {
                title: "Priority Action",
                subtitle: "가장 먼저 확인해야 할 자재",
                tier: "row2",
                html: aBom.length
                    ? MmChartHtmlUtil.buildOverviewPriorityAction({
                        material: sHighest,
                        materialName: oHighest ? (oHighest.MaterialName || "") : "",
                        shortageQty: oHighest ? Number(oHighest.ShortageQty || 0) : null,
                        status: oHighest
                            ? (oHighest.StatusText || oHighest.Status || oHighest.FilterStatus || NO_DATA)
                            : NO_DATA,
                        avgFillRate: fAvgFill,
                        actionText: sActionText
                    })
                    : _emptyChart(NO_DATA)
            },
            {
                title: "PO/MIGO Tracker Summary",
                subtitle: "Z_C_E2E_OrderTracker",
                tier: "row2",
                html: MmChartHtmlUtil.buildOverviewTrackerSummary(aTracker)
            },
            {
                title: "Stock by TypeLabel",
                subtitle: sTypeSubtitle,
                tier: "extra",
                html: aTypeRows.length
                    ? MmChartHtmlUtil.buildOverviewTypeStock(aTypeRows)
                    : _emptyChart(NO_DATA)
            }
        ];
    }

    function _buildChartsMaterial(aBom, aTracker, oItem) {
        if (!oItem && !aTracker.length) {
            return [
                { title: "Selected Material Stock Summary", subtitle: "", html: _emptyChart(NO_DATA) },
                { title: "Selected Material Status", subtitle: "", html: _emptyChart(NO_DATA) },
                { title: "Related Tracker Summary", subtitle: "", html: _emptyChart(NO_DATA) },
                { title: "Fill Rate / Shortage View", subtitle: "", html: _emptyChart(NO_DATA) }
            ];
        }

        var fFill = oItem ? _calcFillRate(oItem) : null;
        var aStock = oItem ? [{ label: "StockQty", value: Number(oItem.StockQty || 0) }] : [];
        var aStatus = oItem ? [{ label: oItem.StatusText || oItem.Status || "-", value: 1 }] : [];

        return [
            {
                title: "Selected Material Stock Summary",
                subtitle: oItem ? oItem.Component : NO_DATA,
                html: aStock.length ? _buildBarChart(aStock, "value", "label", "") : _emptyChart(NO_DATA)
            },
            {
                title: "Selected Material Status",
                subtitle: oItem ? (oItem.StatusText || oItem.Status) : NO_DATA,
                html: oItem ? _buildStatusChart({ Status: 1 }) : _emptyChart(NO_DATA)
            },
            {
                title: "Related Tracker Summary",
                subtitle: "OrderTracker",
                html: _buildTrackerSummaryChart(aTracker)
            },
            {
                title: "Fill Rate / Shortage View",
                subtitle: "RequiredQty vs StockQty",
                html: fFill !== null
                    ? _buildBarChart([
                        { label: "Fill Rate", value: fFill },
                        { label: "Shortage Qty", value: Number(oItem.ShortageQty || 0) }
                    ], "value", "label", "")
                    : _emptyChart("RequiredQty 필드 없음")
            }
        ];
    }

    function _buildChartsPo(aTracker, sPo) {
        var aMigo = aTracker.filter(function (r) { return r.POMigoDoc || r.ProdMigoDoc; });
        var mMat = {};
        aTracker.forEach(function (r) {
            if (r.Material) {
                mMat[r.Material] = (mMat[r.Material] || 0) + 1;
            }
        });
        var aMatRows = Object.keys(mMat).map(function (k) {
            return { label: k, value: mMat[k] };
        });

        return [
            {
                title: "PO Tracker Summary",
                subtitle: sPo || NO_DATA,
                html: _buildTrackerSummaryChart(aTracker)
            },
            {
                title: "Related MIGO Documents",
                subtitle: "POMigoDoc / ProdMigoDoc",
                html: aMigo.length
                    ? _buildBarChart(aMigo.slice(0, 6).map(function (r, i) {
                        return { label: r.POMigoDoc || r.ProdMigoDoc || ("Doc" + (i + 1)), value: 1 };
                    }), "value", "label", "")
                    : _emptyChart(NO_DATA)
            },
            {
                title: "Related Materials",
                subtitle: "OrderTracker Material",
                html: aMatRows.length ? _buildBarChart(aMatRows, "value", "label", "") : _emptyChart(NO_DATA)
            },
            {
                title: "Data Availability Status",
                subtitle: "OData 필드 한도",
                html: _buildBarChart([
                    { label: "Tracker Rows", value: aTracker.length },
                    { label: "PO Field", value: aTracker.some(function (r) { return r.PurchaseOrder; }) ? 1 : 0 },
                    { label: "MIGO Field", value: aMigo.length ? 1 : 0 },
                    { label: "Vendor/Delivery", value: 0 }
                ], "value", "label", "Vendor·납기일·Open Qty = " + NO_DATA)
            }
        ];
    }

    function _buildWorklistAll(aBom, aTracker) {
        var aList = [];
        var iId = 0;

        aBom.filter(_isShortageItem).forEach(function (oItem) {
            iId += 1;
            aList.push({
                id: "MAT-" + iId,
                type: "MATERIAL",
                title: oItem.MaterialName || oItem.Component,
                subtitle: oItem.Component || "-",
                info: "Shortage " + Number(oItem.ShortageQty || 0) + " EA · " + (oItem.StatusText || oItem.Status),
                status: oItem.StatusState || "Error",
                raw: oItem
            });
        });

        aTracker.slice(0, 20).forEach(function (oRow) {
            iId += 1;
            aList.push({
                id: "TRK-" + iId,
                type: "TRACKER",
                title: "PO " + (oRow.PurchaseOrder || "-"),
                subtitle: "SO " + (oRow.SalesOrder || "-") + " · " + (oRow.Material || "-"),
                info: "MIGO " + (oRow.POMigoDoc || oRow.ProdMigoDoc || NO_DATA),
                status: "Information",
                raw: oRow
            });
        });

        return aList;
    }

    function _buildWorklistMaterial(aBom, aTracker, sMaterial) {
        var aList = [];
        var iId = 0;

        aBom.forEach(function (oItem) {
            iId += 1;
            aList.push({
                id: "MAT-" + iId,
                type: "MATERIAL",
                title: oItem.MaterialName || oItem.Component,
                subtitle: oItem.Component,
                info: "Stock " + Number(oItem.StockQty || 0) + " EA · " + (oItem.StatusText || oItem.Status),
                status: oItem.StatusState || "None",
                raw: oItem
            });
        });

        aTracker.forEach(function (oRow) {
            iId += 1;
            aList.push({
                id: "TRK-" + iId,
                type: "TRACKER",
                title: "PO " + (oRow.PurchaseOrder || "-"),
                subtitle: oRow.Material || sMaterial,
                info: "MIGO " + (oRow.POMigoDoc || oRow.ProdMigoDoc || NO_DATA),
                status: "Information",
                raw: oRow
            });
        });

        return aList;
    }

    function _buildWorklistPo(aTracker) {
        return aTracker.map(function (oRow, idx) {
            return {
                id: "TRK-" + (idx + 1),
                type: "TRACKER",
                title: "PO " + (oRow.PurchaseOrder || "-"),
                subtitle: oRow.Material || "-",
                info: "MIGO " + (oRow.POMigoDoc || oRow.ProdMigoDoc || NO_DATA) + " · SO " + (oRow.SalesOrder || "-"),
                status: "Information",
                raw: oRow
            };
        });
    }

    function _buildDetail(oItem, mInventory) {
        if (!oItem) {
            return {
                visible: false,
                type: "",
                title: "",
                fields: [],
                emptyMessage: "왼쪽 목록에서 항목을 선택하면 상세 정보가 표시됩니다."
            };
        }

        if (oItem.type === "MATERIAL") {
            var oRaw = oItem.raw || {};
            var fAvail = _getAvailableStock(oRaw.Component || oRaw.MaterialCode, mInventory);
            var fFill = _calcFillRate(oRaw);
            return {
                visible: true,
                type: "MATERIAL",
                title: oRaw.MaterialName || oRaw.Component || "-",
                fields: [
                    { label: "Material No", value: oRaw.Component || oRaw.MaterialCode || NO_DATA },
                    { label: "Material Name", value: oRaw.MaterialName || NO_DATA },
                    { label: "Material Type", value: oRaw.TypeLabel || NO_DATA },
                    { label: "Current Stock", value: oRaw.StockQty !== undefined ? String(oRaw.StockQty) + " EA" : NO_DATA },
                    { label: "Available Stock", value: fAvail !== null ? String(Math.round(fAvail)) + " EA" : NO_DATA },
                    { label: "Shortage Qty", value: oRaw.ShortageQty !== undefined ? String(oRaw.ShortageQty) + " EA" : NO_DATA },
                    { label: "Status", value: oRaw.StatusText || oRaw.Status || NO_DATA },
                    { label: "Fill Rate", value: fFill !== null ? fFill + "%" : NO_DATA },
                    { label: "Parent BOM", value: oRaw.ParentMatnr || NO_DATA },
                    { label: "Plant", value: NO_DATA },
                    { label: "Storage Location", value: NO_DATA }
                ],
                emptyMessage: ""
            };
        }

        var oTrk = oItem.raw || {};
        return {
            visible: true,
            type: "TRACKER",
            title: "PO " + (oTrk.PurchaseOrder || "-"),
            fields: [
                { label: "PO No", value: oTrk.PurchaseOrder || NO_DATA },
                { label: "MIGO Document No", value: oTrk.POMigoDoc || oTrk.ProdMigoDoc || NO_DATA },
                { label: "Material No", value: oTrk.Material || NO_DATA },
                { label: "Material Name", value: oTrk.MaterialName || oTrk.MaterialText || NO_DATA },
                { label: "Sales Order", value: oTrk.SalesOrder || NO_DATA },
                { label: "Tracker Status", value: _trackerStatus(oTrk) },
                { label: "Production Order", value: oTrk.ProductionOrder || NO_DATA },
                { label: "Vendor", value: NO_DATA },
                { label: "Delivery Date", value: NO_DATA },
                { label: "Open Qty", value: NO_DATA },
                { label: "Delay Days", value: NO_DATA }
            ],
            emptyMessage: ""
        };
    }

    function _filterBom(aBom, sMode, sSearch) {
        if (sMode !== QUERY_MODES.MATERIAL || !sSearch) {
            return aBom;
        }
        var sMat = _normalizeMaterialCode(sSearch);
        return aBom.filter(function (oItem) {
            var sCode = _normalizeMaterialCode(oItem.Component || oItem.MaterialCode);
            return sCode === sMat || sCode.indexOf(sMat) >= 0;
        });
    }

    function _filterTracker(aTracker, sMode, sSearch) {
        if (sMode === QUERY_MODES.PO && sSearch) {
            var sPo = _normalizePoCode(sSearch);
            return aTracker.filter(function (oRow) {
                var sRowPo = String(oRow.PurchaseOrder || "");
                return sRowPo === sPo || sRowPo.indexOf(sSearch) >= 0;
            });
        }
        if (sMode === QUERY_MODES.MATERIAL && sSearch) {
            var sMat = _normalizeMaterialCode(sSearch);
            return aTracker.filter(function (oRow) {
                return _normalizeMaterialCode(oRow.Material) === sMat
                    || _normalizeMaterialCode(oRow.Material).indexOf(sMat) >= 0;
            });
        }
        return aTracker;
    }

    function _criteriaLabel(sMode, sSearch) {
        if (sMode === QUERY_MODES.MATERIAL && sSearch) {
            return MmHeroUiUtil.buildCriteriaBase("Material · " + sSearch);
        }
        if (sMode === QUERY_MODES.PO && sSearch) {
            return MmHeroUiUtil.buildCriteriaBase("PO · " + sSearch);
        }
        return MmHeroUiUtil.UNIQLO_LABEL;
    }

    function _searchPlaceholder(sMode) {
        if (sMode === QUERY_MODES.MATERIAL) {
            return "자재번호를 입력하세요. 예: UP-R-COT-001";
        }
        if (sMode === QUERY_MODES.PO) {
            return "PO번호를 입력하세요. 예: 4500000012";
        }
        return "전체 MM 현황을 조회합니다";
    }

    function _applyQuery(oCache, sMode, sSearch) {
        var aBom = _filterBom(oCache.bomItems, sMode, sSearch);
        var aTracker = _filterTracker(oCache.trackerRows, sMode, sSearch);
        var mInventory = oCache.inventoryMap;
        var sMat = sMode === QUERY_MODES.MATERIAL ? _normalizeMaterialCode(sSearch) : "";
        var sPo = sMode === QUERY_MODES.PO ? _normalizePoCode(sSearch) : "";
        var aKpis;
        var aCharts;
        var aWorklist;

        if (sMode === QUERY_MODES.MATERIAL) {
            aKpis = _buildKpisMaterial(aBom, aTracker, mInventory, sMat);
            aCharts = _buildChartsMaterial(aBom, aTracker, aBom[0]);
            aWorklist = _buildWorklistMaterial(aBom, aTracker, sMat);
        } else if (sMode === QUERY_MODES.PO) {
            aKpis = _buildKpisPo(aTracker, sPo || sSearch);
            aCharts = _buildChartsPo(aTracker, sPo || sSearch);
            aWorklist = _buildWorklistPo(aTracker);
        } else {
            aKpis = _buildKpisAll(aBom, aTracker, mInventory);
            aCharts = _buildChartsAll(aBom, aTracker);
            aWorklist = _buildWorklistAll(aBom, aTracker);
        }

        return {
            queryMode: sMode,
            searchText: sSearch || "",
            searchEnabled: sMode !== QUERY_MODES.ALL,
            searchPlaceholder: _searchPlaceholder(sMode),
            criteriaLabel: _criteriaLabel(sMode, sSearch),
            heroFilterLine: MmHeroUiUtil.buildOverviewFilterLine(aBom.length),
            recordCount: aBom.length,
            odataBadge: "BOM · Inventory · PO/MIGO",
            lastUpdated: oCache.lastUpdated,
            loading: false,
            error: "",
            loaded: true,
            kpis: aKpis,
            charts: aCharts,
            worklist: aWorklist,
            detail: _buildDetail(null, mInventory),
            selectedWorklistId: ""
        };
    }

    return {
        QUERY_MODES: QUERY_MODES,
        NO_DATA: NO_DATA,

        /**
         * Load all OData sources and return mmOverview view model state.
         */
        loadOverviewData: function (oComponent, sImageBase) {
            var oStockModel = oComponent.getModel();
            var oInventoryModel = oComponent.getModel("inventoryModel");
            var oTrackerModel = oComponent.getModel("trackerModel");
            var that = this;

            return Promise.all([
                _readCollection(
                    oStockModel,
                    "/BomStockSet",
                    MmUpMaterialFilterUtil.getODataFilters("Component")
                ),
                _readCollection(
                    oInventoryModel,
                    "/Z_C_InventoryStatus",
                    MmUpMaterialFilterUtil.getODataFilters("Material")
                ),
                _readCollection(
                    oTrackerModel,
                    "/Z_C_E2E_OrderTracker",
                    MmUpMaterialFilterUtil.getODataFilters("Material")
                )
            ]).then(function (aResults) {
                var aRawBom = MmUpMaterialFilterUtil.filterRows(aResults[0], MmUpMaterialFilterUtil.getBomMaterialCode);
                var aInventory = MmUpMaterialFilterUtil.filterRows(aResults[1], function (oRow) {
                    return MmUpMaterialFilterUtil.getRowMaterialCode(oRow, "Material");
                });
                var aTracker = MmUpMaterialFilterUtil.filterRows(aResults[2], function (oRow) {
                    return MmUpMaterialFilterUtil.getRowMaterialCode(oRow, "Material");
                });
                var aBomItems = aRawBom.map(function (oItem) {
                    return DashboardDataService.mapODataItem(JSON.parse(JSON.stringify(oItem)), sImageBase || "");
                });

                return {
                    bomItems: aBomItems,
                    inventoryRows: aInventory,
                    inventoryMap: _sumInventoryByMaterial(aInventory),
                    trackerRows: aTracker,
                    lastUpdated: _formatTime(new Date())
                };
            }).catch(function (oError) {
                throw new Error(SapErrorUtil.extractMessage(oError, "SAP OData 조회에 실패했습니다."));
            });
        },

        buildOverviewState: function (oCache, sMode, sSearch) {
            return _applyQuery(oCache, sMode || QUERY_MODES.ALL, sSearch || "");
        },

        buildDetailFromSelection: function (oWorklistItem, mInventory) {
            return _buildDetail(oWorklistItem, mInventory);
        },

        getEmptyState: function () {
            return {
                loading: false,
                loaded: false,
                error: "",
                queryMode: QUERY_MODES.ALL,
                searchText: "",
                searchEnabled: false,
                searchPlaceholder: _searchPlaceholder(QUERY_MODES.ALL),
                criteriaLabel: MmHeroUiUtil.UNIQLO_LABEL,
                heroFilterLine: MmHeroUiUtil.buildOverviewFilterLine(0),
                recordCount: 0,
                odataBadge: "BOM · Inventory · PO/MIGO",
                lastUpdated: NO_DATA,
                kpis: [],
                charts: [],
                worklist: [],
                detail: _buildDetail(null, {}),
                selectedWorklistId: ""
            };
        }
    };
});
