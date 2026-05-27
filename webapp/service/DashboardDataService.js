/**
 * DashboardDataService.js
 *
 * 역할:
 * - SAP BomStock OData 데이터를 대시보드 JSONModel 구조로 변환한다.
 * - KPI, 차트, 테이블 등 화면 표시용 데이터를 생성한다.
 *
 * 주요 기능:
 * - OData 항목 매핑 및 상태 분류
 * - summary / salesOverview / subscribers / distribution / integrations 갱신
 * - 검색 필터 적용
 */
sap.ui.define([], function () {
    "use strict";

    var REGION_KEYS = ["china", "ue", "usa", "canada", "other"];
    var PANTS_BOM_MATNR = "UP-F-PNT-001";

    function formatCurrency(nValue) {
        return "$ " + Number(nValue || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function resolveTypeLabel(oItem) {
        var sCode = (oItem.Component || "").toUpperCase();
        if (sCode.indexOf("COT") >= 0) {
            return "원단";
        }
        if (sCode.indexOf("ZIP") >= 0) {
            return "부자재";
        }
        if (sCode.indexOf("BRG") >= 0 || sCode.indexOf("MOT") >= 0) {
            return "기계";
        }
        return "자재";
    }

    function calcFillRate(oItem) {
        var fRequired = Number(oItem.RequiredQty || oItem.BomQty || 1);
        var fStock = Number(oItem.StockQty || 0);
        if (fRequired <= 0) {
            return 100;
        }
        return Math.min(100, Math.round((fStock / fRequired) * 100));
    }

    function assignMaterialVisual(oItem, sImageBase) {
        var sCode = (oItem.Component || "").toUpperCase();
        var sName = (oItem.MaterialName || "").toUpperCase();
        var sImg = "product.svg";
        var sIcon = "sap-icon://product";

        if (sCode.indexOf("COT") >= 0 || sName.indexOf("COTTON") >= 0 || sName.indexOf("면") >= 0) {
            sImg = "fabric.svg";
            sIcon = "sap-icon://palette";
        } else if (sCode.indexOf("ZIP") >= 0 || sName.indexOf("ZIP") >= 0) {
            sImg = "zipper.svg";
            sIcon = "sap-icon://chain-link";
        } else if (sCode.indexOf("BRG") >= 0) {
            sImg = "part.svg";
            sIcon = "sap-icon://lathe";
        }

        oItem.ImageUrl = sImageBase + sImg;
        oItem.Icon = sIcon;
    }

    function buildSalesOverview(aItems, fTotal) {
        var aMonths = ["Oct", "Nov", "Dec"];
        var aBars = aMonths.map(function (sMonth, mIdx) {
            var aSegments = REGION_KEYS.map(function (sKey, idx) {
                var fBase = (fTotal / 5) * (0.65 + idx * 0.08);
                return {
                    height: Math.max(18, Math.round(28 + fBase / 140 + mIdx * 14 + idx * 8)),
                    tone: "nxBarSeg" + ((idx + mIdx) % 5 + 1)
                };
            });
            return { month: sMonth, segments: aSegments };
        });

        return {
            total: formatCurrency(fTotal || 9257.51),
            trend: "+15.8%",
            trendUp: true,
            bars: aBars,
            legend: ["China", "UE", "USA", "Canada", "Other"].map(function (sLabel, i) {
                return { label: sLabel, tone: "nxLegend" + (i + 1) };
            })
        };
    }

    function buildStockActivity(aItems) {
        var aBomItems = aItems.filter(function (oItem) {
            return String(oItem.ParentMatnr || "").toUpperCase() === PANTS_BOM_MATNR;
        });

        if (!aBomItems.length) {
            aBomItems = aItems.slice();
        }

        var fTotalStock = aBomItems.reduce(function (sum, oItem) {
            return sum + Number(oItem.StockQty || 0);
        }, 0);

        var fTotalRequired = aBomItems.reduce(function (sum, oItem) {
            return sum + Number(oItem.RequiredQty || 0);
        }, 0);

        var fCoverage = fTotalRequired > 0
            ? Math.min(999.9, (fTotalStock / fTotalRequired) * 100)
            : (fTotalStock > 0 ? 100 : 0);

        var iShort = aBomItems.filter(function (oItem) {
            return oItem.FilterStatus === "SHORT";
        }).length;

        var sTrendState = "Success";
        if (iShort > 0) {
            sTrendState = iShort === aBomItems.length ? "Error" : "Warning";
        }

        var aStocks = aBomItems.map(function (oItem) {
            return Number(oItem.StockQty || 0);
        });
        var fMaxStock = Math.max.apply(null, aStocks.concat([1]));

        var aBars = aBomItems.map(function (oItem) {
            var fStock = Number(oItem.StockQty || 0);
            var sComponent = oItem.Component || oItem.MaterialCode || "-";
            var sShortLabel = sComponent.replace(/^UP-[RH]-/, "");

            return {
                day: sShortLabel.length > 8 ? sShortLabel.slice(0, 8) : sShortLabel,
                tooltip: (oItem.MaterialName || sComponent) + ": " + fStock + " EA",
                value: fStock,
                height: Math.max(10, Math.round((fStock / fMaxStock) * 100)),
                active: oItem.FilterStatus === "SHORT"
            };
        });

        return {
            total: Math.round(fTotalStock).toLocaleString("en-US"),
            trend: fCoverage.toFixed(1) + "%",
            trendUp: fCoverage >= 70,
            trendState: sTrendState,
            subtitle: PANTS_BOM_MATNR + " BOM · MMBE " + aBomItems.length + "건",
            days: aBars
        };
    }

    function buildDistribution(aItems) {
        var mGroups = {
            website: { key: "website", label: "완제품 BOM", amount: 0, color: "nxDonut1" },
            mobile: { key: "mobile", label: "부자재", amount: 0, color: "nxDonut2" },
            other: { key: "other", label: "기타", amount: 0, color: "nxDonut3" }
        };

        aItems.forEach(function (oItem) {
            var fAmt = Number(oItem.StockQty || 0) * Number(oItem.OrderQty || 1) * 12.5;
            var sType = oItem.TypeLabel;
            if (sType === "원단" || sType === "자재") {
                mGroups.website.amount += fAmt;
            } else if (sType === "부자재") {
                mGroups.mobile.amount += fAmt;
            } else {
                mGroups.other.amount += fAmt;
            }
        });

        var aChannels = Object.keys(mGroups).map(function (sKey) {
            var o = mGroups[sKey];
            return {
                key: o.key,
                label: o.label,
                amountLabel: "$" + o.amount.toFixed(2),
                amount: o.amount
            };
        });

        var fSum = aChannels.reduce(function (s, c) { return s + c.amount; }, 0) || 1;
        var fCursor = 0;
        var aSegments = aChannels.map(function (c) {
            var fPct = (c.amount / fSum) * 100;
            var oSeg = {
                color: mGroups[c.key].color,
                start: fCursor,
                size: fPct
            };
            fCursor += fPct;
            return oSeg;
        });

        return { channels: aChannels, segments: aSegments };
    }

    function buildIntegrations(aItems) {
        return aItems.slice().sort(function (a, b) {
            return b.RatePercent - a.RatePercent;
        }).slice(0, 6).map(function (oItem, idx) {
            return {
                id: oItem.Component || String(idx),
                name: oItem.MaterialName,
                code: oItem.MaterialCode,
                type: oItem.TypeLabel,
                rate: oItem.RatePercent,
                profit: oItem.ProfitLabel,
                icon: oItem.Icon,
                imageUrl: oItem.ImageUrl,
                statusText: oItem.StatusText,
                statusState: oItem.StatusState,
                selected: false
            };
        });
    }

    return {
        /**
         * OData 원본 항목을 대시보드 표시용 객체로 변환한다.
         */
        mapODataItem: function (oItem, sImageBase) {
            oItem.BomQty = Number(oItem.BomQty || 0);
            oItem.OrderQty = Number(oItem.OrderQty || 0);
            oItem.RequiredQty = Number(oItem.RequiredQty || 0);
            oItem.StockQty = Number(oItem.StockQty || 0);
            oItem.ShortageQty = Number(oItem.ShortageQty || 0);

            var sStatus = oItem.Status || "";
            if (sStatus === "OK") {
                oItem.StatusText = "정상";
                oItem.StatusState = "Success";
                oItem.FilterStatus = "OK";
            } else if (sStatus === "SHORT") {
                oItem.StatusText = "부족";
                oItem.StatusState = "Error";
                oItem.FilterStatus = "SHORT";
            } else {
                oItem.StatusText = "확인";
                oItem.StatusState = "Warning";
                oItem.FilterStatus = "WARN";
            }

            oItem.MaterialName = oItem.ComponentText || oItem.Component || "-";
            oItem.MaterialCode = oItem.Component || "";
            oItem.CategoryLine = (oItem.ParentMatnr || "-") + " · 재고 " + oItem.StockQty + " EA";
            oItem.IsLowStock = oItem.ShortageQty > 0;
            oItem.LocationText = oItem.ParentMatnr
                ? "Depo " + String(oItem.ParentMatnr).slice(-1)
                : "Depo A";
            oItem.TypeLabel = resolveTypeLabel(oItem);
            oItem.RatePercent = calcFillRate(oItem);
            oItem.ProfitLabel = formatCurrency(oItem.StockQty * oItem.OrderQty * 12.5);

            assignMaterialVisual(oItem, sImageBase);
            return oItem;
        },

        /**
         * 전체 자재 목록을 기준으로 dashboard 모델 속성을 갱신한다.
         */
        refreshDashboard: function (oModel, aItems) {
            var iTotal = aItems.length;
            var iActive = aItems.filter(function (i) { return i.FilterStatus === "OK"; }).length;
            var iWarn = aItems.filter(function (i) { return i.FilterStatus === "WARN"; }).length;
            var iShort = aItems.filter(function (i) { return i.FilterStatus === "SHORT"; }).length;
            var fStockValue = aItems.reduce(function (s, i) {
                return s + (Number(i.StockQty || 0) * Number(i.OrderQty || 1) * 12.5);
            }, 0);
            var fShortageRate = iTotal ? (iShort / iTotal) * 100 : 0;
            var fPrevShortage = Math.max(0, fShortageRate - 8.3);

            oModel.setProperty("/allItems", aItems);
            oModel.setProperty("/counts", {
                all: iTotal,
                active: iActive,
                warning: iWarn,
                shortage: iShort
            });

            oModel.setProperty("/summary", {
                totalMaterials: iTotal,
                totalMaterialsTrend: iTotal ? "+15.8%" : "0%",
                totalMaterialsTrendUp: true,
                stockValue: formatCurrency(fStockValue),
                stockValueTrend: iShort ? (Math.round((iShort / Math.max(iTotal, 1)) * 100) + "%") : "0%",
                stockValueTrendUp: false,
                shortageRate: fShortageRate.toFixed(1) + "%",
                shortageRateTrend: "+" + Math.abs(fShortageRate - fPrevShortage).toFixed(1) + "%",
                shortageRateTrendUp: fShortageRate >= fPrevShortage
            });

            oModel.setProperty("/salesOverview", buildSalesOverview(aItems, fStockValue));
            oModel.setProperty("/subscribers", buildStockActivity(aItems));
            oModel.setProperty("/distribution", buildDistribution(aItems));
            oModel.setProperty("/integrations", buildIntegrations(aItems));
            oModel.setProperty("/displayItems", aItems.slice(0, 8));

            this.applySearchFilter(oModel);
        },

        /**
         * 검색어에 따라 integrations / displayItems 를 필터링한다.
         */
        applySearchFilter: function (oModel) {
            var sQuery = (oModel.getProperty("/filters/query") || "").trim().toLowerCase();
            var aItems = (oModel.getProperty("/allItems") || []).slice();

            if (sQuery) {
                aItems = aItems.filter(function (i) {
                    return (i.MaterialName || "").toLowerCase().indexOf(sQuery) >= 0
                        || (i.MaterialCode || "").toLowerCase().indexOf(sQuery) >= 0
                        || (i.ParentMatnr || "").toLowerCase().indexOf(sQuery) >= 0;
                });
            }

            oModel.setProperty("/displayItems", aItems.slice(0, 8));
            oModel.setProperty("/integrations", buildIntegrations(aItems));
        },

        getItemCount: function (oModel) {
            return (oModel.getProperty("/allItems") || []).length;
        }
    };
});
