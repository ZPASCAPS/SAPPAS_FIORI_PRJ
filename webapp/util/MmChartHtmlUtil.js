/**
 * MmChartHtmlUtil.js
 *
 * 역할:
 * - MM Reports 차트 HTML 생성 (SAP BomStock 실데이터, core:HTML 렌더링용)
 */
sap.ui.define([], function () {
    "use strict";

    function _esc(sText) {
        return String(sText || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    var TYPE_COLORS = {
        "원단": "#E6600D",
        "부자재": "#EAC20B",
        "기계": "#5899DA",
        "자재": "#36A41D"
    };

    function _shortCode(sCode) {
        var s = String(sCode || "-");
        return s.length > 10 ? s.slice(0, 10) : s;
    }

    function buildReportsPieFromItems(aItems) {
        var mStock = {};
        var fTotal = 0;

        aItems.forEach(function (oItem) {
            var sType = oItem.TypeLabel || "자재";
            var fStock = Number(oItem.StockQty || 0);
            mStock[sType] = (mStock[sType] || 0) + fStock;
            fTotal += fStock;
        });

        if (!fTotal) {
            return "<div style='padding:2rem;text-align:center;color:#666;font-size:12px'>재고 데이터 없음</div>";
        }

        var aTypes = Object.keys(mStock);
        var fCursor = 0;
        var sGradient = "";
        var sLegend = "";

        aTypes.forEach(function (sType, idx) {
            var fPct = (mStock[sType] / fTotal) * 100;
            var sColor = TYPE_COLORS[sType] || ["#E6600D", "#EAC20B", "#5899DA", "#36A41D"][idx % 4];
            sGradient += sColor + " " + fCursor + "% " + (fCursor + fPct) + "%";
            if (idx < aTypes.length - 1) {
                sGradient += ",";
            }
            sLegend += "<div><span style='display:inline-block;width:10px;height:10px;background:" + sColor +
                ";border-radius:2px;margin-right:6px'></span>" + _esc(sType) + " " + fPct.toFixed(1) +
                "% (" + Math.round(mStock[sType]).toLocaleString() + " EA)</div>";
            fCursor += fPct;
        });

        return "<div style='display:flex;align-items:center;gap:1.75rem;padding:1.1rem 1.25rem;justify-content:center;background:linear-gradient(135deg,#FFF7ED 0%,#FFFFFF 55%,#EFF6FF 100%);border-radius:10px;border:1px solid #E5E7EB;box-shadow:0 8px 24px rgba(0,112,242,.08)'>" +
            "<div style='width:148px;height:148px;border-radius:50%;background:conic-gradient(" + sGradient +
            ");position:relative;box-shadow:0 10px 28px rgba(230,96,13,.28),inset 0 0 0 6px rgba(255,255,255,.9)'>" +
            "<div style='position:absolute;inset:30%;background:#fff;border-radius:50%;box-shadow:inset 0 2px 8px rgba(0,0,0,.06)'></div>" +
            "<div style='position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,255,255,.65)'></div></div>" +
            "<div style='font-size:12px;color:#374151;line-height:1.85;font-weight:500'>" + sLegend + "</div></div>";
    }

    function buildReportsBarFromItems(aItems) {
        var aTop = aItems.slice().sort(function (a, b) {
            return Number(b.StockQty || 0) - Number(a.StockQty || 0);
        }).slice(0, 6);

        if (!aTop.length) {
            return "<div style='padding:2rem;text-align:center;color:#666;font-size:12px'>자재 데이터 없음</div>";
        }

        var fMax = Math.max.apply(null, aTop.map(function (i) { return Number(i.StockQty || 0); }).concat([1]));
        var sRows = aTop.map(function (oItem, idx) {
            var fStock = Number(oItem.StockQty || 0);
            var iW = Math.round((fStock / fMax) * 100);
            var sBarColor = ["#0070F2", "#5899DA", "#36A41D", "#EAC20B", "#E6600D", "#8B5CF6"][idx % 6];
            return "<div style='display:flex;align-items:center;gap:10px;margin-bottom:10px'>" +
                "<div style='width:5.5rem;font-size:10px;font-weight:600;color:#4B5563;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='" +
                _esc(oItem.MaterialName) + "'>" + _esc(_shortCode(oItem.Component)) + "</div>" +
                "<div style='flex:1;height:18px;background:#E5E7EB;border-radius:99px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.08)'>" +
                "<div style='width:" + iW + "%;height:100%;background:linear-gradient(90deg," + sBarColor + ",#0070F2);border-radius:99px;box-shadow:0 2px 8px " + sBarColor + "55'></div></div>" +
                "<div style='width:3.5rem;font-size:10px;font-weight:700;color:#111827;text-align:right'>" +
                fStock.toLocaleString() + "</div></div>";
        }).join("");

        return "<div style='padding:1.1rem 1.25rem;background:linear-gradient(180deg,#F8FAFC,#FFFFFF);border:1px solid #E5E7EB;border-radius:10px;box-shadow:0 6px 18px rgba(0,112,242,.06)'>" + sRows + "</div>";
    }

    function buildReportsLineFromItems(aItems) {
        var aSeries = aItems.slice().sort(function (a, b) {
            return Number(b.StockQty || 0) - Number(a.StockQty || 0);
        }).slice(0, 8);

        if (!aSeries.length) {
            return "<div style='padding:2rem;text-align:center;color:#666;font-size:12px'>충족률 데이터 없음</div>";
        }

        var iW = 280;
        var iH = 90;
        var iBaseY = 110;
        var iStep = aSeries.length > 1 ? iW / (aSeries.length - 1) : iW;
        var aPoints = [];
        var sLabels = "";
        var i;

        for (i = 0; i < aSeries.length; i++) {
            var fRate = Number(aSeries[i].RatePercent || 0);
            var iX = 40 + Math.round(i * iStep);
            var iY = iBaseY - Math.round((fRate / 100) * iH);
            aPoints.push(iX + "," + iY);
            sLabels += "<text x='" + (iX - 8) + "' y='128' font-size='8' fill='#666'>" +
                _esc(_shortCode(aSeries[i].Component)) + "</text>";
        }

        var sArea = "";
        if (aPoints.length > 1) {
            var sLast = aPoints[aPoints.length - 1].split(",");
            sArea = "<polygon points='40,110 " + aPoints.join(" ") + " " + sLast[0] + ",110' fill='url(#nxLineGrad)' opacity='.35'/>";
        }

        var sCircles = aSeries.map(function (oItem, idx) {
            var aPt = aPoints[idx].split(",");
            var fRate = Number(oItem.RatePercent || 0);
            var sDotColor = fRate >= 80 ? "#36A41D" : (fRate >= 40 ? "#EAC20B" : "#BB0000");
            return "<circle cx='" + aPt[0] + "' cy='" + aPt[1] + "' r='5' fill='" + sDotColor + "' stroke='#fff' stroke-width='2'/>";
        }).join("");

        return "<div style='padding:0.65rem;background:linear-gradient(180deg,#EFF6FF,#FFFFFF);border:1px solid #BFDBFE;border-radius:10px;box-shadow:0 6px 18px rgba(0,112,242,.08)'>" +
            "<svg width='100%' height='150' viewBox='0 0 320 150' xmlns='http://www.w3.org/2000/svg'>" +
            "<defs><linearGradient id='nxLineGrad' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#0070F2'/><stop offset='100%' stop-color='#0070F200'/></linearGradient></defs>" +
            "<line x1='30' y1='115' x2='300' y2='115' stroke='#CBD5E1' stroke-width='1'/>" +
            "<line x1='30' y1='18' x2='30' y2='115' stroke='#CBD5E1' stroke-width='1'/>" +
            "<text x='4' y='68' font-size='8' fill='#64748B' transform='rotate(-90 12 68)'>Fill %</text>" +
            sArea +
            "<polyline points='" + aPoints.join(" ") + "' fill='none' stroke='#0070F2' stroke-width='3' stroke-linecap='round'/>" +
            sCircles + sLabels + "</svg></div>";
    }

    function buildReportsQuadrantFromItems(aItems) {
        var aPlot = aItems.slice().filter(function (i) {
            return Number(i.StockQty || 0) > 0 || Number(i.ShortageQty || 0) > 0;
        }).slice(0, 20);

        if (!aPlot.length) {
            return "<div style='padding:2rem;text-align:center;color:#666;font-size:12px'>리스크 분포 데이터 없음</div>";
        }

        var fMaxStock = Math.max.apply(null, aPlot.map(function (i) { return Number(i.StockQty || 0); }).concat([1]));
        var sDots = aPlot.map(function (oItem) {
            var fStock = Number(oItem.StockQty || 0);
            var fRate = Number(oItem.RatePercent || 0);
            var iRisk = 100 - fRate;
            var iLeft = 14 + Math.round((fStock / fMaxStock) * 72);
            var iTop = 14 + Math.round((iRisk / 100) * 72);
            var iSize = Math.max(8, Math.min(22, 8 + Number(oItem.ShortageQty || 0) * 2));
            var sColor = oItem.FilterStatus === "SHORT" ? "#BB0000"
                : (oItem.FilterStatus === "WARN" ? "#EAC20B" : "#36A41D");

            return "<div style='position:absolute;left:" + iLeft + "%;top:" + iTop +
                "%;width:" + iSize + "px;height:" + iSize + "px;border-radius:50%;background:radial-gradient(circle at 30% 30%," + sColor + ",#111827);" +
                "opacity:.92;box-shadow:0 0 0 2px #fff,0 4px 12px " + sColor + "88' title='" + _esc(oItem.MaterialName) + " · " + fStock + " EA · " +
                fRate + "%'></div>";
        }).join("");

        return "<div style='position:relative;width:100%;height:230px;background:linear-gradient(135deg,#F0FDF4 0%,#FFFFFF 45%,#FEF2F2 100%);border:1px solid #E5E7EB;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.8),0 6px 18px rgba(0,0,0,.05)'>" +
            "<div style='position:absolute;left:50%;top:14px;bottom:14px;width:2px;background:linear-gradient(180deg,#E5E7EB,#9CA3AF,#E5E7EB)'></div>" +
            "<div style='position:absolute;top:50%;left:14px;right:14px;height:2px;background:linear-gradient(90deg,#E5E7EB,#9CA3AF,#E5E7EB)'></div>" +
            "<div style='position:absolute;left:16px;top:16px;font-size:9px;font-weight:600;color:#6B7280;background:rgba(255,255,255,.8);padding:2px 6px;border-radius:4px'>Low Stock / High Risk</div>" +
            "<div style='position:absolute;right:16px;top:16px;font-size:9px;font-weight:600;color:#6B7280;background:rgba(255,255,255,.8);padding:2px 6px;border-radius:4px'>High Stock / High Risk</div>" +
            "<div style='position:absolute;left:16px;bottom:12px;font-size:9px;font-weight:600;color:#6B7280;background:rgba(255,255,255,.8);padding:2px 6px;border-radius:4px'>Low Stock / Stable</div>" +
            "<div style='position:absolute;right:16px;bottom:12px;font-size:9px;font-weight:600;color:#6B7280;background:rgba(255,255,255,.8);padding:2px 6px;border-radius:4px'>High Stock / Stable</div>" +
            sDots +
            "<div style='position:absolute;left:6px;top:50%;transform:translateY(-50%) rotate(-90deg);font-size:9px;font-weight:600;color:#6B7280'>Risk (100-Fill%)</div>" +
            "<div style='position:absolute;bottom:4px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:600;color:#6B7280'>Stock Qty (EA)</div></div>";
    }

    function buildReportsStatusBar(aItems) {
        var iOk = 0;
        var iWarn = 0;
        var iShort = 0;

        aItems.forEach(function (oItem) {
            if (oItem.FilterStatus === "SHORT") {
                iShort += 1;
            } else if (oItem.FilterStatus === "WARN") {
                iWarn += 1;
            } else {
                iOk += 1;
            }
        });

        var iTotal = Math.max(aItems.length, 1);
        var aBars = [
            { label: "정상", h: Math.max(24, Math.round((iOk / iTotal) * 110)), color: "#36A41D", count: iOk },
            { label: "확인", h: Math.max(16, Math.round((iWarn / iTotal) * 110)), color: "#EAC20B", count: iWarn },
            { label: "부족", h: Math.max(12, Math.round((iShort / iTotal) * 110)), color: "#BB0000", count: iShort }
        ];
        var sItems = aBars.map(function (oBar) {
            return "<div style='text-align:center;flex:1;min-width:3rem'>" +
                "<div style='width:34px;height:" + oBar.h + "px;background:linear-gradient(180deg," + oBar.color + ",#11182722);" +
                "border-radius:8px 8px 2px 2px;margin:0 auto;box-shadow:0 6px 16px " + oBar.color + "55'></div>" +
                "<div style='font-size:11px;font-weight:700;color:#111827;margin-top:6px'>" + oBar.count + "</div>" +
                "<div style='font-size:10px;color:#6B7280;margin-top:2px'>" + oBar.label + "</div></div>";
        }).join("");

        return "<div style='display:flex;align-items:flex-end;justify-content:space-around;height:150px;padding:14px 10px;" +
            "background:linear-gradient(180deg,#F8FAFC,#FFFFFF);border:1px solid #E5E7EB;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.05)'>" +
            sItems + "</div>";
    }

    var STATUS_COLORS = {
        OK: "#36A41D",
        WARN: "#EAC20B",
        SHORT: "#BB0000",
        UNKNOWN: "#94A3B8"
    };

    var TYPE_COLORS_OVERVIEW = ["#0070F2", "#5899DA", "#36A41D", "#EAC20B", "#8B5CF6", "#06B6D4"];

    function _overviewEmpty(sMsg) {
        return "<div class='nxMmOverviewChartEmpty'>" + _esc(sMsg || "데이터 없음") + "</div>";
    }

    function _shortLabel(sText, iMax) {
        var s = String(sText || "-");
        iMax = iMax || 10;
        return s.length > iMax ? s.slice(0, iMax) + "…" : s;
    }

    function buildOverviewShortageBar(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("부족 자재 없음");
        }

        var fMax = Math.max.apply(null, aRows.map(function (r) {
            return Number(r.value || 0);
        }).concat([1]));

        var sRows = aRows.slice(0, 5).map(function (oRow, idx) {
            var fVal = Number(oRow.value || 0);
            var iW = Math.max(4, Math.round((fVal / fMax) * 100));
            var sTone = idx === 0 ? "nxMmOverviewBarFill--danger" : (idx === 1 ? "nxMmOverviewBarFill--warn" : "");
            var sLabel = _shortLabel(oRow.label, 14);

            return "<div class='nxMmOverviewBarRow'>" +
                "<div class='nxMmOverviewBarLabel' title='" + _esc(oRow.label) + "'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmOverviewBarTrack'><div class='nxMmOverviewBarFill " + sTone +
                "' style='width:" + iW + "%'></div></div>" +
                "<div class='nxMmOverviewBarValue'>" + fVal.toLocaleString() + "</div></div>";
        }).join("");

        return "<div class='nxMmOverviewBarChart nxMmOverviewBarChart--shortage'>" + sRows + "</div>";
    }

    function buildOverviewTypeCompactBar(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("데이터 없음");
        }

        var fMax = Math.max.apply(null, aRows.map(function (r) {
            return Number(r.value || 0);
        }).concat([1]));

        var sRows = aRows.map(function (oRow, idx) {
            var fVal = Number(oRow.value || 0);
            var iW = Math.max(6, Math.round((fVal / fMax) * 100));
            var sColor = TYPE_COLORS_OVERVIEW[idx % TYPE_COLORS_OVERVIEW.length];
            var sLabel = _shortLabel(oRow.label, 16);

            return "<div class='nxMmOverviewBarRow nxMmOverviewBarRow--compact'>" +
                "<div class='nxMmOverviewBarLabel' title='" + _esc(oRow.label) + "'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmOverviewBarTrack'><div class='nxMmOverviewBarFill' style='width:" + iW +
                "%;background:" + sColor + "'></div></div>" +
                "<div class='nxMmOverviewBarValue'>" + fVal.toLocaleString() + "</div></div>";
        }).join("");

        return "<div class='nxMmOverviewBarChart nxMmOverviewBarChart--type'>" + sRows + "</div>";
    }

    function buildOverviewTypeStock(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("데이터 없음");
        }

        if (aRows.length <= 3) {
            return buildOverviewTypeCompactBar(aRows);
        }

        return buildOverviewTypeColumn(aRows);
    }

    function _statusColor(sKey) {
        var sNorm = String(sKey || "").toUpperCase();
        if (sNorm === "OK" || sNorm === "NORMAL") {
            return STATUS_COLORS.OK;
        }
        if (sNorm === "SHORT") {
            return STATUS_COLORS.SHORT;
        }
        if (sNorm === "WARN" || sNorm === "WARNING") {
            return STATUS_COLORS.WARN;
        }
        return STATUS_COLORS.UNKNOWN;
    }

    function buildOverviewStatusDonut(mCounts, iCenterTotal) {
        var aKeys = Object.keys(mCounts || {});

        if (!aKeys.length) {
            return _overviewEmpty("데이터 없음");
        }

        var iSum = aKeys.reduce(function (s, k) { return s + mCounts[k]; }, 0) || 1;
        var fCursor = 0;
        var sGradient = "";
        var sLegend = "";

        aKeys.forEach(function (sKey, idx) {
            var iCount = mCounts[sKey];
            var fPct = (iCount / iSum) * 100;
            var sColor = _statusColor(sKey);
            if (sColor === STATUS_COLORS.UNKNOWN) {
                sColor = TYPE_COLORS_OVERVIEW[idx % TYPE_COLORS_OVERVIEW.length];
            }
            sGradient += sColor + " " + fCursor.toFixed(2) + "% " + (fCursor + fPct).toFixed(2) + "%";
            if (idx < aKeys.length - 1) {
                sGradient += ",";
            }
            sLegend += "<div class='nxMmOverviewDonutLegendItem'>" +
                "<span class='nxMmOverviewDonutSwatch' style='background:" + sColor + "'></span>" +
                "<span class='nxMmOverviewDonutLegendText'>" + _esc(sKey) + " · " + iCount +
                " (" + fPct.toFixed(0) + "%)</span></div>";
            fCursor += fPct;
        });

        var sCenter = iCenterTotal !== null && iCenterTotal !== undefined
            ? String(iCenterTotal)
            : String(iSum);

        return "<div class='nxMmOverviewDonutWrap'>" +
            "<div class='nxMmOverviewDonutChart' style='background:conic-gradient(" + sGradient + ")'>" +
            "<div class='nxMmOverviewDonutHole'>" +
            "<div class='nxMmOverviewDonutCenterValue'>" + _esc(sCenter) + "</div>" +
            "<div class='nxMmOverviewDonutCenterLabel'>Materials</div></div></div>" +
            "<div class='nxMmOverviewDonutLegend'>" + sLegend + "</div></div>";
    }

    function buildOverviewTypeColumn(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("데이터 없음");
        }

        var fMax = Math.max.apply(null, aRows.map(function (r) {
            return Number(r.value || 0);
        }).concat([1]));

        var sBars = aRows.map(function (oRow, idx) {
            var fVal = Number(oRow.value || 0);
            var iH = Math.max(8, Math.round((fVal / fMax) * 100));
            var sColor = TYPE_COLORS_OVERVIEW[idx % TYPE_COLORS_OVERVIEW.length];
            var sLabel = _shortLabel(oRow.label, 8);

            return "<div class='nxMmOverviewColItem'>" +
                "<div class='nxMmOverviewColValue'>" + fVal.toLocaleString() + "</div>" +
                "<div class='nxMmOverviewColBarWrap'>" +
                "<div class='nxMmOverviewColBar' style='height:" + iH + "%;background:" + sColor + "'></div></div>" +
                "<div class='nxMmOverviewColLabel' title='" + _esc(oRow.label) + "'>" + _esc(sLabel) + "</div></div>";
        }).join("");

        return "<div class='nxMmOverviewColChart'>" + sBars + "</div>";
    }

    function buildOverviewTrackerSummary(aTracker) {
        var iPo = 0;
        var iMigo = 0;
        var mMat = {};

        if (!aTracker || !aTracker.length) {
            return _overviewEmpty("데이터 없음");
        }

        aTracker.forEach(function (oRow) {
            if (oRow.PurchaseOrder) {
                iPo += 1;
            }
            if (oRow.POMigoDoc || oRow.ProdMigoDoc) {
                iMigo += 1;
            }
            if (oRow.Material) {
                mMat[String(oRow.Material).toUpperCase()] = true;
            }
        });

        var iMat = Object.keys(mMat).length;
        var iTotal = aTracker.length;
        var aSegments = [
            { label: "Tracker Rows", value: iTotal, color: "#0070F2" },
            { label: "PO Linked", value: iPo, color: "#5899DA" },
            { label: "MIGO Linked", value: iMigo, color: "#36A41D" },
            { label: "Materials", value: iMat, color: "#8B5CF6" }
        ];
        var iSegSum = aSegments.reduce(function (s, seg) { return s + seg.value; }, 0) || 1;
        var fCursor = 0;
        var sGradient = "";
        var sTiles = "";

        aSegments.forEach(function (oSeg, idx) {
            var fPct = (oSeg.value / iSegSum) * 100;
            sGradient += oSeg.color + " " + fCursor.toFixed(2) + "% " + (fCursor + fPct).toFixed(2) + "%";
            if (idx < aSegments.length - 1) {
                sGradient += ",";
            }
            fCursor += fPct;
            sTiles += "<div class='nxMmOverviewTrackerTile'>" +
                "<span class='nxMmOverviewTrackerTileDot' style='background:" + oSeg.color + "'></span>" +
                "<span class='nxMmOverviewTrackerTileLabel'>" + _esc(oSeg.label) + "</span>" +
                "<span class='nxMmOverviewTrackerTileValue'>" + oSeg.value.toLocaleString() + "</span></div>";
        });

        return "<div class='nxMmOverviewTrackerSummary'>" +
            "<div class='nxMmOverviewTrackerDonutCol'>" +
            "<div class='nxMmOverviewDonutChart nxMmOverviewDonutChart--sm' style='background:conic-gradient(" + sGradient + ")'>" +
            "<div class='nxMmOverviewDonutHole nxMmOverviewDonutHole--sm'>" +
            "<div class='nxMmOverviewDonutCenterValue nxMmOverviewDonutCenterValue--sm'>" + iTotal + "</div>" +
            "<div class='nxMmOverviewDonutCenterLabel'>Rows</div></div></div></div>" +
            "<div class='nxMmOverviewTrackerTiles'>" + sTiles + "</div></div>";
    }

    function buildOverviewPriorityAction(oData) {
        var sNoData = "데이터 없음";
        var sMaterial = oData.material && oData.material !== sNoData ? oData.material : sNoData;
        var iShortage = oData.shortageQty;
        var sStatus = oData.status || sNoData;
        var sFill = oData.avgFillRate !== null && oData.avgFillRate !== undefined
            ? String(oData.avgFillRate) + "%" : sNoData;
        var sAction = oData.actionText || sNoData;
        var sShortageDisplay = iShortage !== null && iShortage !== undefined
            ? Number(iShortage).toLocaleString() + " EA" : sNoData;

        if (sMaterial === sNoData) {
            return "<div class='nxMmOverviewPriorityAction nxMmOverviewPriorityAction--empty'>" +
                "<div class='nxMmOverviewPriorityEmpty'>" + _esc(sNoData) + "</div>" +
                "<div class='nxMmOverviewPriorityCallout'>" + _esc(sAction) + "</div></div>";
        }

        return "<div class='nxMmOverviewPriorityAction'>" +
            "<div class='nxMmOverviewPriorityRow'>" +
            "<span class='nxMmOverviewPriorityLabel'>가장 먼저 확인할 자재</span>" +
            "<span class='nxMmOverviewPriorityValue nxMmOverviewPriorityValue--material'>" + _esc(sMaterial) + "</span></div>" +
            (oData.materialName ? "<div class='nxMmOverviewPriorityMaterialName'>" + _esc(oData.materialName) + "</div>" : "") +
            "<div class='nxMmOverviewPriorityMetrics'>" +
            "<div class='nxMmOverviewPriorityMetric nxMmOverviewPriorityMetric--danger'>" +
            "<span class='nxMmOverviewPriorityMetricLabel'>부족 수량</span>" +
            "<span class='nxMmOverviewPriorityMetricValue'>" + _esc(sShortageDisplay) + "</span></div>" +
            "<div class='nxMmOverviewPriorityMetric'>" +
            "<span class='nxMmOverviewPriorityMetricLabel'>상태</span>" +
            "<span class='nxMmOverviewPriorityMetricValue'>" + _esc(sStatus) + "</span></div>" +
            "<div class='nxMmOverviewPriorityMetric'>" +
            "<span class='nxMmOverviewPriorityMetricLabel'>평균 충족률</span>" +
            "<span class='nxMmOverviewPriorityMetricValue'>" + _esc(sFill) + "</span></div></div>" +
            "<div class='nxMmOverviewPriorityCallout'>" + _esc(sAction) + "</div></div>";
    }

    function buildOverviewRiskSummary(oData) {
        var sNoData = "데이터 없음";
        var aRows = [
            {
                label: "Shortage Items",
                value: oData.shortageItems !== null && oData.shortageItems !== undefined
                    ? String(oData.shortageItems) : sNoData,
                unit: oData.shortageItems !== null && oData.shortageItems !== undefined ? "EA" : "",
                tone: "danger"
            },
            {
                label: "Avg Fill Rate",
                value: oData.avgFillRate !== null && oData.avgFillRate !== undefined
                    ? String(oData.avgFillRate) : sNoData,
                unit: oData.avgFillRate !== null && oData.avgFillRate !== undefined ? "%" : "",
                tone: oData.avgFillRate !== null && oData.avgFillRate < 40 ? "danger"
                    : (oData.avgFillRate !== null && oData.avgFillRate < 70 ? "warn" : "ok")
            },
            {
                label: "Highest Risk Material",
                value: oData.highestRiskMaterial || sNoData,
                unit: "",
                tone: "neutral"
            },
            {
                label: "Critical / Shortage",
                value: oData.criticalCount !== null && oData.criticalCount !== undefined
                    ? String(oData.criticalCount) : sNoData,
                unit: oData.criticalCount !== null && oData.criticalCount !== undefined ? "EA" : "",
                tone: "danger"
            }
        ];

        var sItems = aRows.map(function (oRow) {
            var sToneClass = "nxMmOverviewRiskSummaryItem--" + (oRow.tone || "neutral");
            var sValueHtml = "<span class='nxMmOverviewRiskSummaryValue'>" + _esc(oRow.value) + "</span>";
            if (oRow.unit) {
                sValueHtml += "<span class='nxMmOverviewRiskSummaryUnit'>" + _esc(oRow.unit) + "</span>";
            }
            return "<div class='nxMmOverviewRiskSummaryItem " + sToneClass + "'>" +
                "<div class='nxMmOverviewRiskSummaryLabel'>" + _esc(oRow.label) + "</div>" +
                "<div class='nxMmOverviewRiskSummaryValueRow'>" + sValueHtml + "</div></div>";
        }).join("");

        return "<div class='nxMmOverviewRiskSummary'>" + sItems + "</div>";
    }

    function buildOverviewRiskMatrix(aItems) {
        var aPlot = (aItems || []).filter(function (oItem) {
            return Number(oItem.StockQty || 0) > 0 || Number(oItem.ShortageQty || 0) > 0;
        }).slice(0, 30);

        if (!aPlot.length) {
            return _overviewEmpty("데이터 없음");
        }

        var fMaxStock = Math.max.apply(null, aPlot.map(function (i) {
            return Number(i.StockQty || 0);
        }).concat([1]));
        var fMaxShort = Math.max.apply(null, aPlot.map(function (i) {
            return Number(i.ShortageQty || 0);
        }).concat([1]));

        var sDots = aPlot.map(function (oItem) {
            var fStock = Number(oItem.StockQty || 0);
            var fShort = Number(oItem.ShortageQty || 0);
            var iLeft = 10 + Math.round((fStock / fMaxStock) * 78);
            var iTop = 88 - Math.round((fShort / fMaxShort) * 76);
            var iSize = Math.max(7, Math.min(18, 7 + Math.round(fShort * 1.5)));
            var sStatus = String(oItem.FilterStatus || oItem.Status || "").toUpperCase();
            var sColor = sStatus === "SHORT" ? "#BB0000"
                : (sStatus === "WARN" ? "#E9730C" : "#36A41D");
            var sTitle = _esc(oItem.Component || oItem.MaterialCode || "-") + " · Stock " +
                fStock + " · Shortage " + fShort;

            return "<div class='nxMmOverviewRiskDot' style='left:" + iLeft + "%;top:" + iTop +
                "%;width:" + iSize + "px;height:" + iSize + "px;background:" + sColor +
                "' title='" + sTitle + "'></div>";
        }).join("");

        return "<div class='nxMmOverviewRiskMatrix'>" +
            "<div class='nxMmOverviewRiskAxis nxMmOverviewRiskAxis--y'>ShortageQty</div>" +
            "<div class='nxMmOverviewRiskPlot'>" +
            "<div class='nxMmOverviewRiskGridLine nxMmOverviewRiskGridLine--h'></div>" +
            "<div class='nxMmOverviewRiskGridLine nxMmOverviewRiskGridLine--v'></div>" +
            "<div class='nxMmOverviewRiskZone nxMmOverviewRiskZone--high'>High Risk</div>" +
            "<div class='nxMmOverviewRiskZone nxMmOverviewRiskZone--low'>Low Risk</div>" +
            sDots + "</div>" +
            "<div class='nxMmOverviewRiskAxis nxMmOverviewRiskAxis--x'>StockQty</div>" +
            "<div class='nxMmOverviewRiskLegend'>" +
            "<span class='nxMmOverviewRiskLegendItem'><i class='nxMmOverviewRiskSwatch' style='background:#BB0000'></i>SHORT</span>" +
            "<span class='nxMmOverviewRiskLegendItem'><i class='nxMmOverviewRiskSwatch' style='background:#E9730C'></i>WARN</span>" +
            "<span class='nxMmOverviewRiskLegendItem'><i class='nxMmOverviewRiskSwatch' style='background:#36A41D'></i>OK</span>" +
            "</div></div>";
    }

    return {
        /**
         * SAP BomStock(allItems) 실데이터로 MM Reports 차트·KPI 갱신
         */
        enrichMmReports: function (oModel, aItems) {
            var oSummary;
            var sUpdated;
            var aTable;

            if (!oModel) {
                return;
            }

            aItems = aItems || [];
            oSummary = oModel.getProperty("/summary") || {};
            sUpdated = oModel.getProperty("/ui/lastUpdated") || "";

            aTable = aItems.slice().sort(function (a, b) {
                return Number(b.StockQty || 0) - Number(a.StockQty || 0);
            }).slice(0, 12).map(function (oItem) {
                return {
                    materialCode: oItem.Component || oItem.MaterialCode || "-",
                    materialName: oItem.MaterialName || "-",
                    parentMatnr: oItem.ParentMatnr || "-",
                    typeLabel: oItem.TypeLabel || "-",
                    stockQty: Number(oItem.StockQty || 0),
                    requiredQty: Number(oItem.RequiredQty || 0),
                    shortageQty: Number(oItem.ShortageQty || 0),
                    fillRate: Number(oItem.RatePercent || 0) + "%",
                    statusText: oItem.StatusText || "-",
                    statusState: oItem.StatusState || "None"
                };
            });

            oModel.setProperty("/mmReports", {
                title: "MM Reports",
                subtitle: "UNIQLO BOM Stock · ZUP_PNT_STOCK_SRV / BomStockSet · " + aItems.length + "건",
                dataSource: "SAP OData BomStockSet",
                lastUpdated: sUpdated,
                loaded: aItems.length > 0,
                migoInfo: {
                    title: "MIGO 입고/출고와 데이터 연동",
                    stripType: aItems.length > 0 ? "Success" : "Information",
                    summary: aItems.length > 0
                        ? "StockQty는 SAP 저장 재고 스냅샷입니다. MIGO에서 입고·출고 전표를 저장하면 SAP 재고가 갱신되고, 이 화면에서 새로고침 시 반영됩니다."
                        : "OData 연결 후 MIGO 전표 반영 여부를 확인할 수 있습니다.",
                    details: [
                        { text: "반영됨: MIGO Goods Receipt/Issue → SAP 재고(MARD 등) 갱신 → BomStockSet의 StockQty·Status·ShortageQty" },
                        { text: "반영 방식: MIGO 전표를 직접 읽지 않고, ABAP OData가 BOM+재고를 합산해 제공" },
                        { text: "갱신 시점: 실시간 Push 아님 — SAP 새로고침 또는 페이지 재진입 시 OData 재조회" },
                        { text: "참고: Stock Value KPI는 UI 추정치(StockQty × OrderQty × 12.5), SAP 평가금액과 다를 수 있음" }
                    ]
                },
                kpis: [
                    {
                        label: "Total Materials",
                        value: String(oSummary.totalMaterials || aItems.length),
                        unit: "EA",
                        icon: "sap-icon://product",
                        accent: "blue",
                        hint: "BomStockSet 전체 건수"
                    },
                    {
                        label: "Stock Value",
                        value: (oSummary.stockValue || "0").replace("$ ", ""),
                        unit: "USD",
                        icon: "sap-icon://money-bills",
                        accent: "violet",
                        hint: "UI 추정 재고가치"
                    },
                    {
                        label: "Shortage Rate",
                        value: (oSummary.shortageRate || "0%").replace("%", ""),
                        unit: "%",
                        icon: "sap-icon://alert",
                        accent: "amber",
                        hint: "부족 자재 비율"
                    },
                    {
                        label: "Shortage Items",
                        value: String((oModel.getProperty("/counts") || {}).shortage || 0),
                        unit: "EA",
                        icon: "sap-icon://warning",
                        accent: "red",
                        hint: "MIGO 입고로 개선 가능"
                    }
                ],
                pie: {
                    title: "Stock by Material Type (실데이터)",
                    chartHtml: buildReportsPieFromItems(aItems)
                },
                bar: {
                    title: "Top Materials by Stock Qty",
                    chartHtml: buildReportsBarFromItems(aItems)
                },
                line: {
                    title: "Fill Rate by Material (RequiredQty 대비)",
                    chartHtml: buildReportsLineFromItems(aItems)
                },
                quadrant: {
                    title: "Stock vs Risk Quadrant",
                    chartHtml: buildReportsQuadrantFromItems(aItems)
                },
                status: {
                    title: "Inventory Status Distribution",
                    chartHtml: buildReportsStatusBar(aItems)
                },
                tableItems: aTable
            });
        },

        buildOverviewShortageBar: buildOverviewShortageBar,
        buildOverviewStatusDonut: buildOverviewStatusDonut,
        buildOverviewTypeColumn: buildOverviewTypeColumn,
        buildOverviewTypeCompactBar: buildOverviewTypeCompactBar,
        buildOverviewTypeStock: buildOverviewTypeStock,
        buildOverviewTrackerSummary: buildOverviewTrackerSummary,
        buildOverviewPriorityAction: buildOverviewPriorityAction,
        buildOverviewRiskSummary: buildOverviewRiskSummary,
        buildOverviewRiskMatrix: buildOverviewRiskMatrix
    };
});
