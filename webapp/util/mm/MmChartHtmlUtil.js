/**
 * MmChartHtmlUtil.js
 *
 * 역할:
 * - MM Reports 차트 HTML 생성 (SAP BomStock 실데이터, core:HTML 렌더링용)
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/util/mm/MmUpMaterialFilterUtil",
    "com/capstone/dashboard/fioridashboard/util/mm/MmHeroUiUtil"
], function (MmUpMaterialFilterUtil, MmHeroUiUtil) {
    "use strict";

    function _esc(sText) {
        return String(sText || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    var TYPE_COLORS = {
        "원단": "#7C3AED",
        "부자재": "#6366F1",
        "기계": "#0891B2",
        "자재": "#8B5CF6"
    };

    var REPORT_BAR_COLORS = ["#6366F1", "#8B5CF6", "#7C3AED", "#4F46E5", "#0891B2", "#A855F7"];

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
            var sColor = TYPE_COLORS[sType] || ["#6366F1", "#8B5CF6", "#7C3AED", "#4F46E5"][idx % 4];
            sGradient += sColor + " " + fCursor + "% " + (fCursor + fPct) + "%";
            if (idx < aTypes.length - 1) {
                sGradient += ",";
            }
            sLegend += "<div><span style='display:inline-block;width:10px;height:10px;background:" + sColor +
                ";border-radius:2px;margin-right:6px'></span>" + _esc(sType) + " " + fPct.toFixed(1) +
                "% (" + Math.round(mStock[sType]).toLocaleString() + " EA)</div>";
            fCursor += fPct;
        });

        return "<div style='display:flex;align-items:center;gap:1.75rem;padding:1.1rem 1.25rem;justify-content:center;background:linear-gradient(135deg,#F5F3FF 0%,#FFFFFF 55%,#EEF2FF 100%);border-radius:10px;border:1px solid #DDD6FE;box-shadow:0 8px 24px rgba(99,102,241,.12)'>" +
            "<div style='width:148px;height:148px;border-radius:50%;background:conic-gradient(" + sGradient +
            ");position:relative;box-shadow:0 10px 28px rgba(124,58,237,.28),inset 0 0 0 6px rgba(255,255,255,.9)'>" +
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
            var sBarColor = REPORT_BAR_COLORS[idx % REPORT_BAR_COLORS.length];
            return "<div style='display:flex;align-items:center;gap:10px;margin-bottom:10px'>" +
                "<div style='width:5.5rem;font-size:10px;font-weight:600;color:#4B5563;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' title='" +
                _esc(oItem.MaterialName) + "'>" + _esc(_shortCode(oItem.Component)) + "</div>" +
                "<div style='flex:1;height:18px;background:#EDE9FE;border-radius:99px;overflow:hidden;box-shadow:inset 0 1px 3px rgba(0,0,0,.06)'>" +
                "<div style='width:" + iW + "%;height:100%;background:linear-gradient(90deg," + sBarColor + ",#6366F1);border-radius:99px;box-shadow:0 2px 8px " + sBarColor + "55'></div></div>" +
                "<div style='width:3.5rem;font-size:10px;font-weight:700;color:#111827;text-align:right'>" +
                fStock.toLocaleString() + "</div></div>";
        }).join("");

        return "<div style='padding:1.1rem 1.25rem;background:linear-gradient(180deg,#F5F3FF,#FFFFFF);border:1px solid #DDD6FE;border-radius:10px;box-shadow:0 6px 18px rgba(99,102,241,.08)'>" + sRows + "</div>";
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

        return "<div style='padding:0.65rem;background:linear-gradient(180deg,#EEF2FF,#FFFFFF);border:1px solid #C7D2FE;border-radius:10px;box-shadow:0 6px 18px rgba(99,102,241,.1)'>" +
            "<svg width='100%' height='150' viewBox='0 0 320 150' xmlns='http://www.w3.org/2000/svg'>" +
            "<defs><linearGradient id='nxLineGrad' x1='0' y1='0' x2='0' y2='1'><stop offset='0%' stop-color='#6366F1'/><stop offset='100%' stop-color='#6366F100'/></linearGradient></defs>" +
            "<line x1='30' y1='115' x2='300' y2='115' stroke='#CBD5E1' stroke-width='1'/>" +
            "<line x1='30' y1='18' x2='30' y2='115' stroke='#CBD5E1' stroke-width='1'/>" +
            "<text x='4' y='68' font-size='8' fill='#64748B' transform='rotate(-90 12 68)'>Fill %</text>" +
            sArea +
            "<polyline points='" + aPoints.join(" ") + "' fill='none' stroke='#6366F1' stroke-width='3' stroke-linecap='round'/>" +
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

        return "<div style='position:relative;width:100%;height:230px;background:linear-gradient(135deg,#F5F3FF 0%,#FFFFFF 45%,#EEF2FF 100%);border:1px solid #DDD6FE;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.8),0 6px 18px rgba(99,102,241,.08)'>" +
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
            "background:linear-gradient(180deg,#F5F3FF,#FFFFFF);border:1px solid #DDD6FE;border-radius:10px;box-shadow:0 6px 18px rgba(99,102,241,.08)'>" +
            sItems + "</div>";
    }

    var STATUS_COLORS = {
        OK: "#36A41D",
        WARN: "#EAC20B",
        SHORT: "#BB0000",
        UNKNOWN: "#94A3B8"
    };

    var TYPE_COLORS_OVERVIEW = ["#0070F2", "#5899DA", "#36A41D", "#EAC20B", "#8B5CF6", "#06B6D4"];

    var MMBE_STOCK_TYPE_COLORS = {
        "UNRESTRICTED USE": "#0070F2",
        "RESERVED": "#5899DA",
        "ON-ORDER STOCK": "#14B8A6",
        "SALES ORDER STOCK": "#F59E0B"
    };

    var BOM_STOCK_CRITERIA_NOTE = "Unrestricted Use = MMBE 자유 사용 재고 · % = 해당 BOM 원자재 가용 합계 대비 비중";

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

    function buildInventoryFillRateBar(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("데이터 없음");
        }

        var fMax = 100;
        var sRows = aRows.slice(0, 6).map(function (oRow, idx) {
            var fVal = Number(oRow.value || 0);
            var iW = Math.max(4, Math.round((fVal / fMax) * 100));
            var sTone = oRow.isLow || fVal < 40 ? "nxMmOverviewBarFill--danger"
                : (fVal < 70 ? "nxMmOverviewBarFill--warn" : "");
            var sLabel = _shortLabel(oRow.label, 14);

            return "<div class='nxMmOverviewBarRow'>" +
                "<div class='nxMmOverviewBarLabel' title='" + _esc(oRow.label) + "'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmOverviewBarTrack'><div class='nxMmOverviewBarFill " + sTone +
                "' style='width:" + iW + "%'></div></div>" +
                "<div class='nxMmOverviewBarValue'>" + fVal + "%</div></div>";
        }).join("");

        return "<div class='nxMmOverviewBarChart nxMmOverviewBarChart--fillrate'>" + sRows + "</div>";
    }

    function _formatDistKpi(nValue, sUnit) {
        var n = Number(nValue || 0);
        if (isNaN(n)) {
            return "0";
        }
        if (n >= 1000000) {
            return (n / 1000000).toFixed(1) + "M";
        }
        if (n >= 1000) {
            return (n / 1000).toFixed(1) + "k";
        }
        return n.toLocaleString();
    }

    function _buildDistYAxis(fMax) {
        var fTop = Math.max(Number(fMax || 0), 1);
        var iPow = Math.pow(10, Math.floor(Math.log10(fTop)));
        var fNorm = fTop / iPow;

        if (fNorm <= 1) {
            fTop = iPow;
        } else if (fNorm <= 2) {
            fTop = 2 * iPow;
        } else if (fNorm <= 5) {
            fTop = 5 * iPow;
        } else {
            fTop = 10 * iPow;
        }

        return {
            max: fTop,
            ticks: [fTop, Math.round(fTop * 0.75), Math.round(fTop * 0.5), Math.round(fTop * 0.25), 0]
        };
    }

    function buildInventoryMaterialDistributionBar(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("재고 분포 데이터 없음");
        }

        var fMax = Math.max.apply(null, aRows.map(function (r) {
            return Number(r.value || 0);
        }).concat([1]));
        var oYAxis = _buildDistYAxis(fMax);
        var fTop = oYAxis.max;
        var iTotal = aRows.reduce(function (sum, r) {
            return sum + Number(r.value || 0);
        }, 0);
        var sUnit = (aRows[0] && aRows[0].unit) || "PC";
        var iCount = aRows.length;
        var sBarsClass = "nxMmInvDistModernBars nxMmInvDistModernBars--spread nxMmInvDistModernBars--count-" +
            Math.min(iCount, 12) + (iCount > 12 ? " nxMmInvDistModernBars--scroll" : "");

        var sGrid = oYAxis.ticks.slice(0, 4).map(function (tick, idx) {
            var iPct = 100 - (idx * 25);
            return "<div class='nxMmInvDistModernGridLine' style='bottom:" + iPct + "%'></div>";
        }).join("");

        var sYAxis = oYAxis.ticks.map(function (tick) {
            return "<span class='nxMmInvDistModernYTick'>" + _formatDonutQty(tick) + "</span>";
        }).join("");

        var sBars = aRows.map(function (oRow) {
            var fVal = Number(oRow.value || 0);
            var iH = fVal > 0 ? Math.max(6, Math.round((fVal / fTop) * 100)) : 0;
            var sLabel = String(oRow.label || "").trim();
            var sStockTypeLabel = String(oRow.stockTypeLabel || sLabel + " 재고 유형").trim();
            var sSelectedClass = oRow.isSelected ? " nxMmInvDistModernBar--active" : "";
            var sValueDisplay = _formatDonutQty(fVal);

            return "<button type='button' class='nxMmInvDistModernBar" + sSelectedClass + "'" +
                " data-material='" + _esc(oRow.material) + "'" +
                " data-label='" + _esc(oRow.label) + "'" +
                " data-value='" + _esc(sValueDisplay) + "'" +
                " data-unit='" + _esc(oRow.unit || sUnit) + "'" +
                " data-type='" + _esc(sStockTypeLabel) + "'" +
                " aria-label='" + _esc(oRow.label + " " + sValueDisplay + " " + (oRow.unit || sUnit)) + "'>" +
                "<div class='nxMmInvDistModernPopover" + (oRow.isSelected ? "" : " nxMmInvDistModernPopover--hidden") + "'>" +
                "<div class='nxMmInvDistModernPopoverValue'>" + sValueDisplay + "</div>" +
                "<div class='nxMmInvDistModernPopoverName'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmInvDistModernPopoverMeta'>" + _esc(sStockTypeLabel) + "</div>" +
                "</div>" +
                "<div class='nxMmInvDistModernBarStem" + (oRow.isSelected ? " nxMmInvDistModernBarStem--active" : "") + "'></div>" +
                "<div class='nxMmInvDistModernBarTrack'>" +
                "<div class='nxMmInvDistModernBarFill" + sSelectedClass + "' style='height:" + iH + "%'></div>" +
                "</div>" +
                "<div class='nxMmInvDistModernBarLabel' title='" + _esc(sLabel) + "'>" + _esc(sLabel) + "</div>" +
                "</button>";
        }).join("");

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--dist nxMmInvDistModern' data-dist-chart='true'>" +
            "<div class='nxMmInvDistModernHead'>" +
            "<div class='nxMmInvDistModernKpi'>" +
            "<div class='nxMmInvDistModernKpiLabel'>총 재고</div>" +
            "<div class='nxMmInvDistModernKpiValue'>" + _formatDistKpi(iTotal, sUnit) +
            " <span class='nxMmInvDistModernKpiUnit'>" + _esc(sUnit) + "</span></div>" +
            "<div class='nxMmInvDistModernKpiSub'>" + iCount + " 자재</div>" +
            "</div></div>" +
            "<div class='nxMmInvDistModernChartWrap'>" +
            "<div class='nxMmInvDistModernYAxis'>" + sYAxis + "</div>" +
            "<div class='nxMmInvDistModernPlot'>" +
            "<div class='nxMmInvDistModernGrid'>" + sGrid + "</div>" +
            "<div class='" + sBarsClass + "'>" + sBars + "</div>" +
            "</div></div>" +
            "<div class='nxMmInvDistModernFloatTip' aria-hidden='true'></div>" +
            "</div>";
    }

    function buildInventoryAnalysisTypeBar(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("데이터 없음");
        }

        var fMax = Math.max.apply(null, aRows.map(function (r) {
            return Number(r.value || 0);
        }).concat([1]));

        var sRows = aRows.map(function (oRow, idx) {
            var fVal = Number(oRow.value || 0);
            var iW = Math.max(8, Math.round((fVal / fMax) * 100));
            var sColor = TYPE_COLORS_OVERVIEW[idx % TYPE_COLORS_OVERVIEW.length];
            var sLabel = _shortLabel(oRow.label, 18);

            return "<div class='nxMmInvAnalysisBarRow'>" +
                "<div class='nxMmInvAnalysisBarLabel' title='" + _esc(oRow.label) + "'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmInvAnalysisBarTrack'><div class='nxMmInvAnalysisBarFill' style='width:" + iW +
                "%;background:" + sColor + "'></div></div>" +
                "<div class='nxMmInvAnalysisBarValue'>" + fVal.toLocaleString() + "</div></div>";
        }).join("");

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--type'>" +
            "<div class='nxMmInvAnalysisBarChart'>" + sRows + "</div></div>";
    }

    function buildInventoryAnalysisFillRateBar(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("데이터 없음");
        }

        var fMax = 100;
        var sRows = aRows.slice(0, 6).map(function (oRow) {
            var fVal = Number(oRow.value || 0);
            var iW = Math.max(6, Math.round((fVal / fMax) * 100));
            var sTone = oRow.isLow || fVal < 40 ? "nxMmInvAnalysisBarFill--danger"
                : (fVal < 70 ? "nxMmInvAnalysisBarFill--warn" : "nxMmInvAnalysisBarFill--success");
            var sLabel = _shortLabel(oRow.label, 16);

            return "<div class='nxMmInvAnalysisBarRow'>" +
                "<div class='nxMmInvAnalysisBarLabel' title='" + _esc(oRow.label) + "'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmInvAnalysisBarTrack'><div class='nxMmInvAnalysisBarFill " + sTone +
                "' style='width:" + iW + "%'></div></div>" +
                "<div class='nxMmInvAnalysisBarValue'>" + fVal + "%</div></div>";
        }).join("");

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--fill'>" +
            "<div class='nxMmInvAnalysisBarChart'>" + sRows + "</div></div>";
    }

    function _polarToCartesian(cx, cy, r, angleDeg) {
        var rad = (angleDeg - 90) * Math.PI / 180;
        return {
            x: cx + (r * Math.cos(rad)),
            y: cy + (r * Math.sin(rad))
        };
    }

    function _describeDonutSlice(cx, cy, rOuter, rInner, startAngle, endAngle) {
        var p1 = _polarToCartesian(cx, cy, rOuter, endAngle);
        var p2 = _polarToCartesian(cx, cy, rOuter, startAngle);
        var p3 = _polarToCartesian(cx, cy, rInner, startAngle);
        var p4 = _polarToCartesian(cx, cy, rInner, endAngle);
        var iLarge = (endAngle - startAngle) <= 180 ? 0 : 1;

        return [
            "M", p1.x, p1.y,
            "A", rOuter, rOuter, 0, iLarge, 0, p2.x, p2.y,
            "L", p3.x, p3.y,
            "A", rInner, rInner, 0, iLarge, 1, p4.x, p4.y,
            "Z"
        ].join(" ");
    }

    function _formatDonutQty(nValue) {
        var n = Number(nValue || 0);
        if (isNaN(n)) {
            return "0";
        }
        if (n % 1 === 0) {
            return String(n);
        }
        return n.toFixed(2);
    }

    function buildInventoryAnalysisStatusDonut(mCounts, iCenterTotal) {
        var aKeys = Object.keys(mCounts || {});

        if (!aKeys.length) {
            return _overviewEmpty("데이터 없음");
        }

        var iSum = aKeys.reduce(function (s, k) { return s + mCounts[k]; }, 0) || 1;
        var fCursor = 0;
        var sLegend = "";
        var sSlices = "";
        var cx = 100;
        var cy = 100;
        var rOuter = 88;
        var rInner = 54;

        aKeys.forEach(function (sKey, idx) {
            var iCount = mCounts[sKey];
            var fPct = (iCount / iSum) * 100;
            var fStart = fCursor;
            var fEnd = fCursor + (fPct / 100) * 360;
            var sColor = _mmbeStockTypeColor(sKey) || _statusColor(sKey);
            var sTip = _esc(sKey) + " · " + fPct.toFixed(1) + "% · " + _formatDonutQty(iCount);
            var sPath;

            if (sColor === STATUS_COLORS.UNKNOWN) {
                sColor = TYPE_COLORS_OVERVIEW[idx % TYPE_COLORS_OVERVIEW.length];
            }

            if (fPct > 0) {
                sPath = _describeDonutSlice(cx, cy, rOuter, rInner, fStart, fEnd);
                sSlices += "<path class='nxMmInvDonutSlice' d='" + sPath + "' fill='" + sColor +
                    "' stroke='#FFFFFF' stroke-width='2' data-tip='" + sTip + "'><title>" + sTip + "</title></path>";
            }

            sLegend += "<div class='nxMmInvAnalysisLegendItem nxMmInvAnalysisLegendItem--mmbe' title='" + sTip + "'>" +
                "<span class='nxMmInvAnalysisLegendSwatch' style='background:" + sColor + "'></span>" +
                "<span class='nxMmInvAnalysisLegendText'>" + _esc(sKey) + " · " + _formatDonutQty(iCount) +
                " (" + fPct.toFixed(1) + "%)</span></div>";
            fCursor = fEnd;
        });

        var sCenter = iCenterTotal !== null && iCenterTotal !== undefined
            ? _formatDonutQty(iCenterTotal)
            : _formatDonutQty(iSum);

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--status nxMmInvAnalysisHost--donutTip nxMmInvAnalysisHost--mmbeDonut'>" +
            "<div class='nxMmInvAnalysisDonutWrap nxMmInvAnalysisDonutWrap--mmbe'>" +
            "<div class='nxMmInvAnalysisDonutSvgWrap nxMmInvAnalysisDonutSvgWrap--mmbe'>" +
            "<svg class='nxMmInvAnalysisDonutSvg' viewBox='0 0 200 200' role='img' aria-label='재고 유형 구성'>" +
            "<defs><filter id='nxMmInvDonutShadow' x='-20%' y='-20%' width='140%' height='140%'>" +
            "<feDropShadow dx='0' dy='2' stdDeviation='3' flood-color='#0F172A' flood-opacity='0.12'/>" +
            "</filter></defs>" +
            "<g filter='url(#nxMmInvDonutShadow)'>" + sSlices + "</g>" +
            "<circle cx='" + cx + "' cy='" + cy + "' r='" + rInner + "' fill='#FFFFFF'></circle>" +
            "<text x='" + cx + "' y='" + (cy - 4) + "' text-anchor='middle' class='nxMmInvDonutSvgValue'>" + _esc(sCenter) + "</text>" +
            "<text x='" + cx + "' y='" + (cy + 14) + "' text-anchor='middle' class='nxMmInvDonutSvgLabel'>Total Stock</text>" +
            "</svg>" +
            "<div class='nxMmInvDonutTooltip' aria-hidden='true'></div>" +
            "</div>" +
            "<div class='nxMmInvAnalysisLegend nxMmInvAnalysisLegend--mmbe'>" + sLegend + "</div></div></div>";
    }

    function _mmbeStockTypeShortLabel(sKey) {
        var sNorm = String(sKey || "").toUpperCase();
        if (sNorm.indexOf("UNRESTRICTED") >= 0) {
            return "Unrestricted Use";
        }
        if (sNorm === "RESERVED") {
            return "Reserved";
        }
        if (sNorm.indexOf("ON-ORDER") >= 0 || sNorm.indexOf("ON ORDER") >= 0) {
            return "On-Order Stock";
        }
        if (sNorm.indexOf("SALES ORDER") >= 0) {
            return "Sales Order Stock";
        }
        return String(sKey || "-");
    }

    function buildInventoryMmbeSankeyFlow(mCounts, iCenterTotal, sMaterialName, sMaterialCode) {
        var aKeys = Object.keys(mCounts || {});

        if (!aKeys.length) {
            return _overviewEmpty("데이터 없음");
        }

        var iSum = iCenterTotal !== null && iCenterTotal !== undefined
            ? Number(iCenterTotal)
            : aKeys.reduce(function (s, k) { return s + Number(mCounts[k] || 0); }, 0);

        if (iSum <= 0) {
            return _overviewEmpty("데이터 없음");
        }

        var sMatName = String(sMaterialName || "자재").trim();
        var sMatCode = String(sMaterialCode || "").trim();
        var aRows = aKeys.map(function (sKey, idx) {
            var fVal = Number(mCounts[sKey] || 0);
            var sColor = _mmbeStockTypeColor(sKey) || TYPE_COLORS_OVERVIEW[idx % TYPE_COLORS_OVERVIEW.length];

            return {
                key: sKey,
                shortLabel: _mmbeStockTypeShortLabel(sKey),
                value: fVal,
                pct: (fVal / iSum) * 100,
                color: sColor
            };
        }).filter(function (oRow) {
            return oRow.value > 0;
        }).sort(function (a, b) {
            return b.value - a.value;
        });

        if (!aRows.length) {
            return _overviewEmpty("데이터 없음");
        }

        var sStackSegs = "";
        var sRows = "";
        var sLegend = "";
        var i;

        for (i = 0; i < aRows.length; i++) {
            var oRow = aRows[i];
            var iPctDisp = oRow.pct.toFixed(1);
            var sTip = _esc(oRow.key) + " · " + _formatDonutQty(oRow.value) + " PC · " + iPctDisp + "%";

            sStackSegs += "<div class='nxMmInvMmbeFlowStackSeg' style='width:" + iPctDisp +
                "%;background:" + oRow.color + "' title='" + sTip + "'></div>";

            sRows += "<div class='nxMmInvMmbeFlowRow' title='" + sTip + "'>" +
                "<div class='nxMmInvMmbeFlowRowHead'>" +
                "<span class='nxMmInvMmbeFlowRowDot' style='background:" + oRow.color + "'></span>" +
                "<span class='nxMmInvMmbeFlowRowName'>" + _esc(oRow.shortLabel) + "</span>" +
                "<span class='nxMmInvMmbeFlowRowQty'>" + _esc(_formatDonutQty(oRow.value)) + " PC</span>" +
                "<span class='nxMmInvMmbeFlowRowPct'>" + iPctDisp + "%</span>" +
                "</div>" +
                "<div class='nxMmInvMmbeFlowRowTrack'>" +
                "<div class='nxMmInvMmbeFlowRowBar' style='width:" + iPctDisp +
                "%;background:linear-gradient(90deg," + oRow.color + " 0%," + oRow.color + "CC 100%)'></div>" +
                "</div></div>";

            sLegend += "<div class='nxMmInvMmbeFlowLegendItem' title='" + sTip + "'>" +
                "<span class='nxMmInvMmbeFlowLegendDot' style='background:" + oRow.color + "'></span>" +
                "<span class='nxMmInvMmbeFlowLegendText'>" + _esc(oRow.key) + " · " +
                _formatDonutQty(oRow.value) + " (" + iPctDisp + "%)</span></div>";
        }

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--mmbeFlow'>" +
            "<div class='nxMmInvMmbeFlow'>" +
            "<div class='nxMmInvMmbeFlowHead'>" +
            "<div class='nxMmInvMmbeFlowKpi'>" +
            "<div class='nxMmInvMmbeFlowKpiLabel'>Total Stock</div>" +
            "<div class='nxMmInvMmbeFlowKpiValue'>" + _esc(_formatDonutQty(iSum)) +
            " <span class='nxMmInvMmbeFlowKpiUnit'>PC</span></div>" +
            "<div class='nxMmInvMmbeFlowKpiSub'>" + aRows.length + " 재고 유형 · " + _esc(sMatName) + "</div>" +
            "</div>" +
            "<div class='nxMmInvMmbeFlowAxis nxMmInvMmbeFlowAxis--left'>재고 유형</div>" +
            "<div class='nxMmInvMmbeFlowAxis nxMmInvMmbeFlowAxis--right'>자재 유형</div>" +
            "</div>" +
            "<div class='nxMmInvMmbeFlowBody'>" +
            "<div class='nxMmInvMmbeFlowRowsCol'>" +
            "<div class='nxMmInvMmbeFlowColLabel'>재고 유형별 수량</div>" +
            "<div class='nxMmInvMmbeFlowRows'>" + sRows + "</div>" +
            "</div>" +
            "<div class='nxMmInvMmbeFlowMatPanel'>" +
            "<div class='nxMmInvMmbeFlowMatPanelInner'>" +
            "<span class='nxMmInvMmbeFlowMatTag'>자재</span>" +
            "<span class='nxMmInvMmbeFlowMatName'>" + _esc(sMatName) + "</span>" +
            (sMatCode ? "<span class='nxMmInvMmbeFlowMatCode'>" + _esc(sMatCode) + "</span>" : "") +
            "<span class='nxMmInvMmbeFlowMatTotal'>" + _esc(_formatDonutQty(iSum)) + " PC</span>" +
            "<span class='nxMmInvMmbeFlowMatHint'>" + aRows.length + " 유형 합산</span>" +
            "</div></div></div>" +
            "<div class='nxMmInvMmbeFlowStackWrap'>" +
            "<div class='nxMmInvMmbeFlowStackLabel'>재고 구성 비율</div>" +
            "<div class='nxMmInvMmbeFlowStack' aria-label='재고 유형 비율'>" + sStackSegs + "</div>" +
            "</div>" +
            "<div class='nxMmInvMmbeFlowLegend'>" + sLegend + "</div>" +
            "</div></div>";
    }

    function buildInventoryUnitBomMixChart(aRows, sTheme, bStockMode) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("BOM 데이터 없음");
        }

        var aHeatColors = ["#EA580C", "#F97316", "#FB923C", "#FDBA74"];
        var aBagColors = ["#0284C7", "#0D9488", "#6366F1", "#0891B2"];
        var aColors = sTheme === "bag" ? aBagColors : aHeatColors;
        var sThemeClass = sTheme === "bag" ? "nxMmInvBomMixChart--bag" : "nxMmInvBomMixChart--heat";

        var sRows = aRows.map(function (oRow, idx) {
            var sColor = aColors[idx % aColors.length];
            var sShared = oRow.shared
                ? "<span class='nxMmInvBomMixShared'>공용</span>"
                : "";
            var sMeta = bStockMode
                ? _esc(oRow.qtyDisplay) + " · Unrestricted Use · " + _esc(oRow.mixDisplay)
                : _esc(oRow.qtyDisplay) + " · " + _esc(oRow.mixDisplay);

            return "<div class='nxMmInvBomMixRow'>" +
                "<div class='nxMmInvBomMixHead'>" +
                "<span class='nxMmInvBomMixName'>" + _esc(oRow.materialName) + "</span>" +
                sShared +
                "</div>" +
                "<div class='nxMmInvBomMixTrackRow'>" +
                "<div class='nxMmInvBomMixTrack'><div class='nxMmInvBomMixFill' style='width:" + oRow.barPct +
                "%;background:" + sColor + "'></div></div>" +
                "<span class='nxMmInvBomMixMeta'>" + sMeta + "</span>" +
                "</div></div>";
        }).join("");

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--bomMix " + sThemeClass + "'>" +
            "<div class='nxMmInvBomMixChart'>" + sRows + "</div></div>";
    }

    function buildInventoryUnitBomCardViz(aRows, sTheme, iTotalQty) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("BOM 구성 데이터 없음");
        }

        var aHeatColors = ["#EA580C", "#F97316", "#FB923C", "#FDBA74"];
        var aBagColors = ["#0284C7", "#0D9488", "#6366F1", "#0891B2"];
        var aColors = sTheme === "bag" ? aBagColors : aHeatColors;
        var sThemeClass = sTheme === "bag" ? "nxMmInvBomCardViz--bag" : "nxMmInvBomCardViz--heat";
        var sStackSegs = "";
        var sRows = "";
        var i;

        for (i = 0; i < aRows.length; i++) {
            var oRow = aRows[i];
            var sColor = aColors[i % aColors.length];
            var sShared = oRow.shared
                ? "<span class='nxMmInvBomMixShared'>공용</span>"
                : "";
            var sTip = _esc(oRow.materialName) + " · " + _esc(oRow.qtyDisplay) + " · " + _esc(oRow.mixDisplay);

            sStackSegs += "<div class='nxMmInvBomCardVizStackSeg' style='width:" + oRow.barPct +
                "%;background:" + sColor + "' title='" + sTip + "'></div>";

            sRows += "<div class='nxMmInvBomMixRow' title='" + sTip + "'>" +
                "<div class='nxMmInvBomMixHead'>" +
                "<span class='nxMmInvBomMixName'>" + _esc(oRow.materialName) + "</span>" +
                sShared +
                "</div>" +
                "<div class='nxMmInvBomMixTrackRow'>" +
                "<div class='nxMmInvBomMixTrack'><div class='nxMmInvBomMixFill' style='width:" + oRow.barPct +
                "%;background:" + sColor + "'></div></div>" +
                "<span class='nxMmInvBomMixMeta'>" + _esc(oRow.qtyDisplay) + " · " + _esc(oRow.mixDisplay) + "</span>" +
                "</div></div>";
        }

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--bomCardViz " + sThemeClass + "'>" +
            "<div class='nxMmInvBomCardViz'>" +
            "<div class='nxMmInvBomCardVizHead'>" +
            "<span class='nxMmInvBomCardVizLabel'>1PC당 소요 구성</span>" +
            "<span class='nxMmInvBomCardVizKpi'>총 " + Number(iTotalQty || 0) + " PC · " + aRows.length + "종</span>" +
            "</div>" +
            "<div class='nxMmInvBomCardVizStack' aria-label='1PC당 원자재 구성 비율'>" + sStackSegs + "</div>" +
            "<div class='nxMmInvBomMixChart nxMmInvBomMixChart--card'>" + sRows + "</div>" +
            "</div></div>";
    }

    function buildInventoryUnitBomCompare(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("BOM 데이터 없음");
        }

        var sRows = aRows.map(function (oRow) {
            var sShared = oRow.shared
                ? "<span class='nxMmInvBomCompareShared'>공용</span>"
                : "";
            return "<div class='nxMmInvBomCompareRow'>" +
                "<div class='nxMmInvBomCompareHead'>" +
                "<span class='nxMmInvBomCompareName'>" + _esc(oRow.materialName) + "</span>" +
                sShared +
                "<span class='nxMmInvBomCompareCode'>" + _esc(oRow.material) + "</span>" +
                "</div>" +
                "<div class='nxMmInvBomCompareBars'>" +
                "<div class='nxMmInvBomCompareTrack'>" +
                "<span class='nxMmInvBomCompareTag nxMmInvBomCompareTag--heat'>히트텍</span>" +
                "<div class='nxMmInvBomCompareBarWrap'><div class='nxMmInvBomCompareBar nxMmInvBomCompareBar--heat' style='width:" +
                oRow.heattechPct + "%'></div></div>" +
                "<span class='nxMmInvBomCompareVal'>" + _esc(oRow.heattechDisplay) + "</span>" +
                "</div>" +
                "<div class='nxMmInvBomCompareTrack'>" +
                "<span class='nxMmInvBomCompareTag nxMmInvBomCompareTag--bag'>가방</span>" +
                "<div class='nxMmInvBomCompareBarWrap'><div class='nxMmInvBomCompareBar nxMmInvBomCompareBar--bag' style='width:" +
                oRow.bagPct + "%'></div></div>" +
                "<span class='nxMmInvBomCompareVal'>" + _esc(oRow.bagDisplay) + "</span>" +
                "</div></div></div>";
        }).join("");

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--bomCompare'>" +
            "<div class='nxMmInvBomCompareChart'>" + sRows + "</div></div>";
    }

    function _polarPoint(cx, cy, r, deg) {
        var rad = (deg - 90) * Math.PI / 180;

        return {
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad)
        };
    }

    function _donutSegmentPath(cx, cy, rOut, rIn, startDeg, endDeg) {
        var pOutStart = _polarPoint(cx, cy, rOut, startDeg);
        var pOutEnd = _polarPoint(cx, cy, rOut, endDeg);
        var pInEnd = _polarPoint(cx, cy, rIn, endDeg);
        var pInStart = _polarPoint(cx, cy, rIn, startDeg);
        var bLarge = (endDeg - startDeg) > 180 ? 1 : 0;

        return "M " + pOutStart.x.toFixed(2) + " " + pOutStart.y.toFixed(2) +
            " A " + rOut + " " + rOut + " 0 " + bLarge + " 1 " + pOutEnd.x.toFixed(2) + " " + pOutEnd.y.toFixed(2) +
            " L " + pInEnd.x.toFixed(2) + " " + pInEnd.y.toFixed(2) +
            " A " + rIn + " " + rIn + " 0 " + bLarge + " 0 " + pInStart.x.toFixed(2) + " " + pInStart.y.toFixed(2) +
            " Z";
    }

    function buildInventoryProductionCompareChart(oHeat, oBag) {
        var fHeat = Math.max(0, Number(oHeat && oHeat.value != null ? oHeat.value : 0));
        var fBag = Math.max(0, Number(oBag && oBag.value != null ? oBag.value : 0));
        var fTotal = fHeat + fBag;
        var sHeatLabel = (oHeat && oHeat.label) || "히트텍";
        var sBagLabel = (oBag && oBag.label) || "가방";
        var sHeatImg = _esc((oHeat && oHeat.imageSrc) || "./img/mm/product-heattech.png");
        var sBagImg = _esc((oBag && oBag.imageSrc) || "./img/mm/product-bag.png");
        var sHeatDisplay;
        var sBagDisplay;
        var fGap = 7;
        var fUsable = 360 - fGap * 2;
        var fHeatSweep;
        var fBagSweep;
        var fStartHeat;
        var fEndHeat;
        var fStartBag;
        var fEndBag;
        var iHeatPct;
        var iBagPct;
        var cx = 118;
        var cy = 118;
        var rOut = 92;
        var rIn = 54;
        var rMid = 73;
        var oHeatMid;
        var oBagMid;
        var iHeatImg;
        var iBagImg;

        if (fTotal <= 0) {
            return _overviewEmpty("생산 가능 수량 없음");
        }

        fHeatSweep = fUsable * (fHeat / fTotal);
        fBagSweep = fUsable * (fBag / fTotal);
        fStartHeat = -90 + fGap;
        fEndHeat = fStartHeat + fHeatSweep;
        fStartBag = fEndHeat + fGap;
        fEndBag = fStartBag + fBagSweep;
        iHeatPct = Math.round((fHeat / fTotal) * 100);
        iBagPct = Math.max(0, 100 - iHeatPct);
        sHeatDisplay = (oHeat && oHeat.display != null) ? String(oHeat.display) : String(fHeat);
        sBagDisplay = (oBag && oBag.display != null) ? String(oBag.display) : String(fBag);
        oHeatMid = _polarPoint(cx, cy, rMid, (fStartHeat + fEndHeat) / 2);
        oBagMid = _polarPoint(cx, cy, rMid, (fStartBag + fEndBag) / 2);
        iHeatImg = Math.round(24 + (fHeat / fTotal) * 42);
        iBagImg = Math.round(24 + (fBag / fTotal) * 42);

        var sHeatTip = _esc(sHeatLabel) + " · " + _esc(sHeatDisplay) + " PC · " + iHeatPct + "%";
        var sBagTip = _esc(sBagLabel) + " · " + _esc(sBagDisplay) + " PC · " + iBagPct + "%";
        var iHeatBarPct = fHeat > 0 ? Math.round((fHeat / fTotal) * 100) : 0;
        var iBagBarPct = fBag > 0 ? (100 - iHeatBarPct) : 0;
        var sLeadLabel = fHeat >= fBag ? sHeatLabel : sBagLabel;
        var sLeadDisplay = fHeat >= fBag ? sHeatDisplay : sBagDisplay;
        var iLeadPct = fHeat >= fBag ? iHeatPct : iBagPct;

        function _prodCompareMidSeg(sTone, sLabel, iPct, iWidthPct, sTip, sLabelAttr, sQty, sImg) {
            var sInner = iWidthPct >= 14
                ? "<span class='nxMmInvProdCompareMidSegLabel'>" + _esc(sLabel) + " " + iPct + "%</span>"
                : "<span class='nxMmInvProdCompareMidSegLabel'>" + iPct + "%</span>";

            return "<button type='button' class='nxMmInvProdCompareMidSeg nxMmInvProdCompareMidSeg--" + sTone + "' " +
                "style='width:" + iWidthPct + "%' data-prod-key='" + sTone + "' data-tip='" + sTip + "' " +
                "data-label='" + sLabelAttr + "' data-qty='" + sQty + "' data-pct='" + iPct + "' data-img='" + sImg + "' " +
                "aria-label='" + sTip + "'>" + sInner + "</button>";
        }

        var sMidStrip = (fHeat > 0 ? _prodCompareMidSeg("heat", sHeatLabel, iHeatPct, iHeatBarPct, sHeatTip,
            _esc(sHeatLabel), _esc(sHeatDisplay), sHeatImg) : "") +
            (fBag > 0 ? _prodCompareMidSeg("bag", sBagLabel, iBagPct, iBagBarPct, sBagTip,
            _esc(sBagLabel), _esc(sBagDisplay), sBagImg) : "");

        var sMidInsight = "<strong>" + _esc(sLeadLabel) + "</strong> · " + _esc(sLeadDisplay) +
            " PC · 전체 " + iLeadPct + "% · BOM 기준";

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--prodCompare nxMmInvAnalysisHost--prodCompareTip' data-prod-compare-chart='true'>" +
            "<div class='nxMmInvProdCompare'>" +
            "<div class='nxMmInvProdCompareTop'>" +
            "<div class='nxMmInvProdCompareSide'>" +
            "<div class='nxMmInvProdCompareKpiLabel'>총 생산 가능 수량</div>" +
            "<div class='nxMmInvProdCompareKpiValue'>" + _formatDonutQty(fTotal) +
            " <span class='nxMmInvProdCompareKpiUnit'>PC</span></div>" +
            "<div class='nxMmInvProdCompareKpiSub'>2 제품 · BOM 기준</div>" +
            "<div class='nxMmInvProdCompareLegend'>" +
            "<div class='nxMmInvProdCompareLegendItem nxMmInvProdCompareLegendItem--heat' data-prod-key='heat' data-tip='" + sHeatTip +
            "' data-label='" + _esc(sHeatLabel) + "' data-qty='" + _esc(sHeatDisplay) + "' data-pct='" + iHeatPct +
            "' data-img='" + sHeatImg + "' tabindex='0' role='button'>" +
            "<span class='nxMmInvProdCompareLegendDot'></span>" +
            "<img class='nxMmInvProdCompareLegendThumb' src='" + sHeatImg + "' alt='" + _esc(sHeatLabel) + "' />" +
            "<div class='nxMmInvProdCompareLegendText'>" +
            "<span class='nxMmInvProdCompareLegendName'>" + _esc(sHeatLabel) + "</span>" +
            "<span class='nxMmInvProdCompareLegendMeta'>" + _esc(sHeatDisplay) + " PC · " + iHeatPct + "%</span>" +
            "</div></div>" +
            "<div class='nxMmInvProdCompareLegendItem nxMmInvProdCompareLegendItem--bag' data-prod-key='bag' data-tip='" + sBagTip +
            "' data-label='" + _esc(sBagLabel) + "' data-qty='" + _esc(sBagDisplay) + "' data-pct='" + iBagPct +
            "' data-img='" + sBagImg + "' tabindex='0' role='button'>" +
            "<span class='nxMmInvProdCompareLegendDot'></span>" +
            "<img class='nxMmInvProdCompareLegendThumb' src='" + sBagImg + "' alt='" + _esc(sBagLabel) + "' />" +
            "<div class='nxMmInvProdCompareLegendText'>" +
            "<span class='nxMmInvProdCompareLegendName'>" + _esc(sBagLabel) + "</span>" +
            "<span class='nxMmInvProdCompareLegendMeta'>" + _esc(sBagDisplay) + " PC · " + iBagPct + "%</span>" +
            "</div></div></div></div>" +
            "<div class='nxMmInvProdCompareChartWrap'>" +
            "<div class='nxMmInvProdCompareChartMain'>" +
            "<svg class='nxMmInvProdCompareSvg' viewBox='0 0 236 236' role='img' aria-label='생산 가능 수량 비교'>" +
            "<defs>" +
            "<linearGradient id='nxMmInvProdHeatGrad' x1='0%' y1='0%' x2='100%' y2='100%'>" +
            "<stop offset='0%' stop-color='#FB7185' /><stop offset='100%' stop-color='#DC2626' />" +
            "</linearGradient>" +
            "<linearGradient id='nxMmInvProdBagGrad' x1='0%' y1='0%' x2='100%' y2='100%'>" +
            "<stop offset='0%' stop-color='#7DD3FC' /><stop offset='100%' stop-color='#0284C7' />" +
            "</linearGradient>" +
            "<filter id='nxMmInvProdSegShadow' x='-20%' y='-20%' width='140%' height='140%'>" +
            "<feDropShadow dx='0' dy='4' stdDeviation='4' flood-color='#0F172A' flood-opacity='0.12' />" +
            "</filter></defs>" +
            "<path class='nxMmInvProdCompareSeg nxMmInvProdCompareSeg--heat nxMmInvProdCompareSeg--interactive' filter='url(#nxMmInvProdSegShadow)' " +
            "d='" + _donutSegmentPath(cx, cy, rOut, rIn, fStartHeat, fEndHeat) + "' fill='url(#nxMmInvProdHeatGrad)' " +
            "data-prod-key='heat' data-tip='" + sHeatTip + "' data-label='" + _esc(sHeatLabel) + "' data-qty='" + _esc(sHeatDisplay) +
            "' data-pct='" + iHeatPct + "' data-img='" + sHeatImg + "' tabindex='0' role='button' aria-label='" + sHeatTip + "' />" +
            "<path class='nxMmInvProdCompareSeg nxMmInvProdCompareSeg--bag nxMmInvProdCompareSeg--interactive' filter='url(#nxMmInvProdSegShadow)' " +
            "d='" + _donutSegmentPath(cx, cy, rOut, rIn, fStartBag, fEndBag) + "' fill='url(#nxMmInvProdBagGrad)' " +
            "data-prod-key='bag' data-tip='" + sBagTip + "' data-label='" + _esc(sBagLabel) + "' data-qty='" + _esc(sBagDisplay) +
            "' data-pct='" + iBagPct + "' data-img='" + sBagImg + "' tabindex='0' role='button' aria-label='" + sBagTip + "' />" +
            "<foreignObject x='" + (oHeatMid.x - iHeatImg / 2).toFixed(2) + "' y='" + (oHeatMid.y - iHeatImg / 2).toFixed(2) +
            "' width='" + iHeatImg + "' height='" + iHeatImg + "' pointer-events='none'>" +
            "<div xmlns='http://www.w3.org/1999/xhtml' class='nxMmInvProdCompareSegPhoto nxMmInvProdCompareSegPhoto--heat'>" +
            "<img src='" + sHeatImg + "' alt='" + _esc(sHeatLabel) + "' style='width:100%;height:100%;object-fit:contain;' />" +
            "</div></foreignObject>" +
            "<foreignObject x='" + (oBagMid.x - iBagImg / 2).toFixed(2) + "' y='" + (oBagMid.y - iBagImg / 2).toFixed(2) +
            "' width='" + iBagImg + "' height='" + iBagImg + "' pointer-events='none'>" +
            "<div xmlns='http://www.w3.org/1999/xhtml' class='nxMmInvProdCompareSegPhoto nxMmInvProdCompareSegPhoto--bag'>" +
            "<img src='" + sBagImg + "' alt='" + _esc(sBagLabel) + "' style='width:100%;height:100%;object-fit:contain;' />" +
            "</div></foreignObject>" +
            "</svg>" +
            "<div class='nxMmInvProdCompareSegInfo' aria-live='polite'>" +
            "<div class='nxMmInvProdCompareSegInfoPlaceholder'>차트를 클릭하면 제품 정보가 표시됩니다</div>" +
            "<div class='nxMmInvProdCompareSegInfoBody' hidden>" +
            "<img class='nxMmInvProdCompareSegInfoImg' src='' alt='' />" +
            "<div class='nxMmInvProdCompareSegInfoText'>" +
            "<span class='nxMmInvProdCompareSegInfoName'></span>" +
            "<span class='nxMmInvProdCompareSegInfoMeta'></span>" +
            "</div></div></div>" +
            "<div class='nxMmInvProdCompareFloatTip' aria-hidden='true'></div>" +
            "</div></div></div>" +
            "<div class='nxMmInvProdCompareMid'>" +
            "<div class='nxMmInvProdCompareMidLabel'>제품별 생산 가능 비율</div>" +
            "<div class='nxMmInvProdCompareMidStrip' aria-label='제품별 생산 가능 비율'>" + sMidStrip + "</div>" +
            "<div class='nxMmInvProdCompareMidInsight'>" + sMidInsight + "</div>" +
            "</div></div></div>";
    }

    function buildInventoryMrpFulfillmentChart(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("충족률 데이터 없음");
        }

        var iOk = 0;
        var iShort = 0;
        var fPctSum = 0;
        var sRows = aRows.map(function (oRow) {
            var sState = String(oRow.progressState || "None");
            var sTone = sState === "Success" ? "ok" : (sState === "Warning" ? "warn" : "short");
            var iPct = Math.min(100, Math.max(0, Number(oRow.fulfillmentPct || 0)));
            var fActual = oRow.fulfillmentActual != null ? oRow.fulfillmentActual : iPct;
            var sStatus = String(oRow.statusText || (sTone === "ok" ? "충분" : "부족"));
            var sIcon = sTone === "ok" ? "&#10003;" : (sTone === "warn" ? "!" : "&#10007;");

            if (sTone === "ok") {
                iOk += 1;
            } else {
                iShort += 1;
            }
            fPctSum += iPct;

            return "<div class='nxMmInvMrpFillRow nxMmInvMrpFillRow--" + sTone + "'>" +
                "<div class='nxMmInvMrpFillHead'>" +
                "<div class='nxMmInvMrpFillMeta'>" +
                "<span class='nxMmInvMrpFillName'>" + _esc(oRow.materialName) + "</span>" +
                "<span class='nxMmInvMrpFillCode'>" + _esc(oRow.material || "") + "</span>" +
                "</div>" +
                "<div class='nxMmInvMrpFillStatus nxMmInvMrpFillStatus--" + sTone + "'>" +
                "<span class='nxMmInvMrpFillStatusIcon' aria-hidden='true'>" + sIcon + "</span>" +
                "<span class='nxMmInvMrpFillStatusText'>" + _esc(sStatus) + "</span>" +
                "</div></div>" +
                "<div class='nxMmInvMrpFillTrackRow'>" +
                "<div class='nxMmInvMrpFillTrack'>" +
                "<div class='nxMmInvMrpFillBar nxMmInvMrpFillBar--" + sTone + "' style='width:" + iPct + "%'></div>" +
                "</div>" +
                "<div class='nxMmInvMrpFillPctWrap'>" +
                "<span class='nxMmInvMrpFillPct'>" + iPct + "%</span>" +
                "<span class='nxMmInvMrpFillPctSub'>실제 " + fActual + "%</span>" +
                "</div></div>" +
                "<div class='nxMmInvMrpFillDetail'>" +
                "<span class='nxMmInvMrpFillDetailItem'><em>필요</em> " + Number(oRow.requiredQty || 0) + " PC</span>" +
                "<span class='nxMmInvMrpFillDetailItem'><em>재고</em> " + _esc(oRow.stockDisplay || "0 PC") + "</span>" +
                "<span class='nxMmInvMrpFillDetailItem nxMmInvMrpFillDetailItem--short'><em>부족</em> " +
                _esc(oRow.shortageDisplay || "0 PC") + "</span>" +
                "</div></div>";
        }).join("");

        var iAvg = Math.round(fPctSum / aRows.length);

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--mrpFill'>" +
            "<div class='nxMmInvMrpFillChart'>" +
            "<div class='nxMmInvMrpFillSummary'>" +
            "<div class='nxMmInvMrpFillSummaryItem nxMmInvMrpFillSummaryItem--avg'>" +
            "<span class='nxMmInvMrpFillSummaryLabel'>평균 충족률</span>" +
            "<span class='nxMmInvMrpFillSummaryValue'>" + iAvg + "%</span></div>" +
            "<div class='nxMmInvMrpFillSummaryItem nxMmInvMrpFillSummaryItem--ok'>" +
            "<span class='nxMmInvMrpFillSummaryLabel'>충분</span>" +
            "<span class='nxMmInvMrpFillSummaryValue'>" + iOk + "</span></div>" +
            "<div class='nxMmInvMrpFillSummaryItem nxMmInvMrpFillSummaryItem--short'>" +
            "<span class='nxMmInvMrpFillSummaryLabel'>부족</span>" +
            "<span class='nxMmInvMrpFillSummaryValue'>" + iShort + "</span></div>" +
            "</div>" +
            "<div class='nxMmInvMrpFillList'>" + sRows + "</div></div></div>";
    }

    function buildInventoryAnalysisShortageBar(aRows) {
        if (!aRows || !aRows.length) {
            return _overviewEmpty("부족 자재 없음");
        }

        var fMax = Math.max.apply(null, aRows.map(function (r) {
            return Number(r.value || 0);
        }).concat([1]));

        var sRows = aRows.slice(0, 6).map(function (oRow, idx) {
            var fVal = Number(oRow.value || 0);
            var iW = Math.max(8, Math.round((fVal / fMax) * 100));
            var sTone = idx === 0 ? "nxMmInvAnalysisBarFill--danger"
                : (idx === 1 ? "nxMmInvAnalysisBarFill--warn" : "");
            var sLabel = _shortLabel(oRow.label, 16);

            return "<div class='nxMmInvAnalysisBarRow'>" +
                "<div class='nxMmInvAnalysisBarLabel' title='" + _esc(oRow.label) + "'>" + _esc(sLabel) + "</div>" +
                "<div class='nxMmInvAnalysisBarTrack'><div class='nxMmInvAnalysisBarFill " + sTone +
                "' style='width:" + iW + "%'></div></div>" +
                "<div class='nxMmInvAnalysisBarValue'>" + fVal.toLocaleString() + "</div></div>";
        }).join("");

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--shortage'>" +
            "<div class='nxMmInvAnalysisBarChart'>" + sRows + "</div></div>";
    }

    function buildPurchasingLinkDonut(iLinked, iNotLinked, sLinkedLabel, sNotLabel) {
        var iTotal = iLinked + iNotLinked;
        if (iTotal <= 0) {
            return _overviewEmpty("데이터 없음");
        }

        var fLinkedPct = (iLinked / iTotal) * 100;
        var sGradient = "#36A41D 0% " + fLinkedPct.toFixed(2) + "%, #E5E7EB " + fLinkedPct.toFixed(2) + "% 100%";
        var sLegend = "<div class='nxMmInvAnalysisLegendItem'>" +
            "<span class='nxMmInvAnalysisLegendSwatch' style='background:#36A41D'></span>" +
            "<span class='nxMmInvAnalysisLegendText'>" + _esc(sLinkedLabel) + " · " + iLinked +
            " (" + Math.round(fLinkedPct) + "%)</span></div>" +
            "<div class='nxMmInvAnalysisLegendItem'>" +
            "<span class='nxMmInvAnalysisLegendSwatch' style='background:#E5E7EB'></span>" +
            "<span class='nxMmInvAnalysisLegendText'>" + _esc(sNotLabel) + " · " + iNotLinked +
            " (" + Math.round(100 - fLinkedPct) + "%)</span></div>";

        return "<div class='nxMmInvAnalysisHost nxMmInvAnalysisHost--status'>" +
            "<div class='nxMmInvAnalysisDonutWrap'>" +
            "<div class='nxMmInvAnalysisDonut' style='background:conic-gradient(" + sGradient + ")'>" +
            "<div class='nxMmInvAnalysisDonutHole'>" +
            "<div class='nxMmInvAnalysisDonutValue'>" + iTotal + "</div>" +
            "<div class='nxMmInvAnalysisDonutLabel'>Total Rows</div></div></div>" +
            "<div class='nxMmInvAnalysisLegend'>" + sLegend + "</div></div></div>";
    }

    function buildPurchasingDataAvailability() {
        var aItems = [
            { label: "PO No", value: "가능", ok: true },
            { label: "MIGO Document", value: "가능", ok: true },
            { label: "Material", value: "가능", ok: true },
            { label: "Vendor", value: "데이터 없음", ok: false },
            { label: "Delivery Date", value: "데이터 없음", ok: false },
            { label: "PO Value", value: "데이터 없음", ok: false },
            { label: "Open Qty", value: "데이터 없음", ok: false }
        ];

        var sTiles = aItems.map(function (oItem) {
            var sClass = oItem.ok ? "nxMmPurchDataTile--ok" : "nxMmPurchDataTile--na";
            return "<div class='nxMmPurchDataTile " + sClass + "'>" +
                "<div class='nxMmPurchDataTileLabel'>" + _esc(oItem.label) + "</div>" +
                "<div class='nxMmPurchDataTileValue'>" + _esc(oItem.value) + "</div></div>";
        }).join("");

        return "<div class='nxMmPurchDataGrid'>" + sTiles + "</div>";
    }

    function buildMissingMovementFields() {
        var aItems = [
            { label: "Movement Type", value: "데이터 없음" },
            { label: "Posting Date", value: "데이터 없음" },
            { label: "Movement Qty", value: "데이터 없음" },
            { label: "Plant", value: "데이터 없음" },
            { label: "Storage Location", value: "데이터 없음" }
        ];

        var sTiles = aItems.map(function (oItem) {
            return "<div class='nxMmPurchDataTile nxMmPurchDataTile--na'>" +
                "<div class='nxMmPurchDataTileLabel'>" + _esc(oItem.label) + "</div>" +
                "<div class='nxMmPurchDataTileValue'>" + _esc(oItem.value) + "</div></div>";
        }).join("");

        return "<div class='nxMmPurchDataGrid nxMmGmMissingFieldsGrid'>" + sTiles + "</div>";
    }

    function buildGoodsMovementStockImpact(oSummary) {
        if (!oSummary) {
            return _overviewEmpty("데이터 없음");
        }

        var aItems = [
            { label: "MIGO Linked Materials", value: oSummary.migoLinkedMaterials, tone: "ok" },
            { label: "Shortage with MIGO", value: oSummary.shortageWithMigo, tone: "warn" },
            { label: "Shortage without MIGO", value: oSummary.shortageWithoutMigo, tone: "danger" },
            { label: "OK Materials with MIGO", value: oSummary.okWithMigo, tone: "ok" }
        ];

        var sTiles = aItems.map(function (oItem) {
            var sClass = "nxMmGmImpactTile--" + (oItem.tone || "neutral");
            return "<div class='nxMmGmImpactTile " + sClass + "'>" +
                "<div class='nxMmGmImpactTileLabel'>" + _esc(oItem.label) + "</div>" +
                "<div class='nxMmGmImpactTileValue'>" + _esc(String(oItem.value)) + "</div></div>";
        }).join("");

        return "<div class='nxMmGmImpactGrid'>" + sTiles + "</div>";
    }

    function buildGoodsMovementDataAvailability() {
        var aItems = [
            { label: "MIGO Document No", value: "가능", ok: true },
            { label: "PO No", value: "가능", ok: true },
            { label: "Material No", value: "가능", ok: true },
            { label: "StockQty", value: "가능", ok: true },
            { label: "ShortageQty", value: "가능", ok: true },
            { label: "Movement Type", value: "데이터 없음", ok: false },
            { label: "Posting Date", value: "데이터 없음", ok: false },
            { label: "Movement Qty", value: "데이터 없음", ok: false },
            { label: "Plant", value: "데이터 없음", ok: false },
            { label: "Storage Location", value: "데이터 없음", ok: false }
        ];

        var sTiles = aItems.map(function (oItem) {
            var sClass = oItem.ok ? "nxMmPurchDataTile--ok" : "nxMmPurchDataTile--na";
            return "<div class='nxMmPurchDataTile " + sClass + "'>" +
                "<div class='nxMmPurchDataTileLabel'>" + _esc(oItem.label) + "</div>" +
                "<div class='nxMmPurchDataTileValue'>" + _esc(oItem.value) + "</div></div>";
        }).join("");

        return "<div class='nxMmPurchDataGrid'>" + sTiles + "</div>";
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

    function _mmbeStockTypeColor(sKey) {
        return MMBE_STOCK_TYPE_COLORS[String(sKey || "").toUpperCase()] || null;
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
            var sUpdated;
            var aTable;

            if (!oModel) {
                return;
            }

            aItems = MmUpMaterialFilterUtil.filterRows(aItems || [], MmUpMaterialFilterUtil.getBomMaterialCode);
            sUpdated = oModel.getProperty("/ui/lastUpdated") || "";
            var iShortCount = aItems.filter(function (oItem) {
                return oItem.FilterStatus === "SHORT";
            }).length;
            var iTotal = aItems.length;
            var iOkCount = 0;
            var fAvgFill = null;
            var aRates = [];
            var oTopShort = null;
            var sShortRate = "데이터 없음";

            aItems.forEach(function (oItem) {
                if (oItem.FilterStatus === "SHORT") {
                    if (!oTopShort || Number(oItem.ShortageQty || 0) > Number(oTopShort.ShortageQty || 0)) {
                        oTopShort = oItem;
                    }
                } else if (oItem.FilterStatus !== "WARN") {
                    iOkCount += 1;
                }
                var fRate = Number(oItem.RatePercent || 0);
                if (fRate > 0 || Number(oItem.RequiredQty || 0) > 0) {
                    aRates.push(fRate);
                }
            });

            if (iTotal > 0) {
                sShortRate = Math.round((iShortCount / iTotal) * 100) + "%";
            }
            if (aRates.length) {
                fAvgFill = Math.round(aRates.reduce(function (s, v) { return s + v; }, 0) / aRates.length);
            }

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
                title: "MM Analytics Report",
                subtitle: "MM Analytics Report Center · BomStockSet · UP* 자재 " + aItems.length + "건",
                dataSource: "SAP OData BomStockSet (UP* · UP-R-COT-001·UP-F-ONT-001 제외)",
                heroFilterLine: MmHeroUiUtil.buildFilterLine(aItems.length),
                recordCount: aItems.length,
                odataBadge: "BomStockSet",
                lastUpdated: sUpdated,
                loaded: aItems.length > 0,
                insightSummary: {
                    shortageRate: iTotal ? sShortRate : "데이터 없음",
                    topShortageMaterial: oTopShort
                        ? (oTopShort.Component || oTopShort.MaterialCode || "데이터 없음")
                        : (iShortCount ? "데이터 없음" : "-"),
                    topShortageQty: oTopShort
                        ? String(Number(oTopShort.ShortageQty || 0)) + " EA"
                        : (iShortCount ? "데이터 없음" : "0 EA"),
                    okMaterials: iTotal ? String(iOkCount) + " EA" : "데이터 없음",
                    dataSourceNote: "데이터 기준: BomStockSet · UP* 자재 (UP-R-COT-001, UP-F-ONT-001 제외)"
                },
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
                        { text: "참고: 재고가치(KRW/USD)는 OData 미제공 — Stock Value KPI는 표시하지 않습니다" }
                    ]
                },
                kpis: [
                    {
                        label: "Total Materials",
                        value: String(iTotal),
                        unit: "EA",
                        icon: "sap-icon://product",
                        accent: "indigo",
                        hint: "UP* BomStockSet 건수"
                    },
                    {
                        label: "Shortage Items",
                        value: String(iShortCount),
                        unit: "EA",
                        icon: "sap-icon://alert",
                        accent: iShortCount > 0 ? "red" : "indigo",
                        hint: "부족 Status 자재"
                    },
                    {
                        label: "Shortage Rate",
                        value: iTotal ? String(Math.round((iShortCount / iTotal) * 100)) : "데이터 없음",
                        unit: iTotal ? "%" : "",
                        icon: "sap-icon://warning",
                        accent: iShortCount > 0 ? "amber" : "indigo",
                        hint: "부족 자재 비율"
                    },
                    {
                        label: "Avg Fill Rate",
                        value: fAvgFill !== null ? String(fAvgFill) : "데이터 없음",
                        unit: fAvgFill !== null ? "%" : "",
                        icon: "sap-icon://line-chart",
                        accent: fAvgFill === null ? "violet" : (fAvgFill < 30 ? "red" : (fAvgFill < 80 ? "amber" : "violet")),
                        hint: "RatePercent / RequiredQty 기준"
                    }
                ],
                pie: {
                    title: "Stock by Material Type",
                    chartHtml: buildReportsPieFromItems(aItems)
                },
                bar: {
                    title: "Top Materials by Stock Qty",
                    chartHtml: buildReportsBarFromItems(aItems)
                },
                line: {
                    title: "Fill Rate by Material",
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
        buildInventoryFillRateBar: buildInventoryFillRateBar,
        buildInventoryMaterialDistributionBar: buildInventoryMaterialDistributionBar,
        buildInventoryAnalysisTypeBar: buildInventoryAnalysisTypeBar,
        buildInventoryAnalysisFillRateBar: buildInventoryAnalysisFillRateBar,
        buildInventoryAnalysisStatusDonut: buildInventoryAnalysisStatusDonut,
        buildInventoryMmbeSankeyFlow: buildInventoryMmbeSankeyFlow,
        buildInventoryUnitBomMixChart: buildInventoryUnitBomMixChart,
        buildInventoryUnitBomCardViz: buildInventoryUnitBomCardViz,
        buildInventoryUnitBomCompare: buildInventoryUnitBomCompare,
        buildInventoryProductionCompareChart: buildInventoryProductionCompareChart,
        buildInventoryMrpFulfillmentChart: buildInventoryMrpFulfillmentChart,
        buildInventoryAnalysisShortageBar: buildInventoryAnalysisShortageBar,
        buildPurchasingLinkDonut: buildPurchasingLinkDonut,
        buildPurchasingDataAvailability: buildPurchasingDataAvailability,
        buildGoodsMovementStockImpact: buildGoodsMovementStockImpact,
        buildGoodsMovementDataAvailability: buildGoodsMovementDataAvailability,
        buildMissingMovementFields: buildMissingMovementFields,
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
