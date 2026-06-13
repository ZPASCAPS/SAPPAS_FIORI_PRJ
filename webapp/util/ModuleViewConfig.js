/**
 * ModuleViewConfig.js
 *
 * 역할:
 * - SD/MM/PP/FI 모듈 상단 UI(moduleView) 더미 데이터 생성·동기화.
 * - DashboardModuleNav, ModuleDashboardShell에서 공통 사용.
 */
sap.ui.define([], function () {
    "use strict";

    var MODULE_KEYS = ["SD_SALES", "MM_MATERIALS", "PP_PRODUCTION", "FI_CO_FINANCE"];

    var PERIOD_OPTIONS = [
        { key: "THIS_WEEK", text: "1주" },
        { key: "THIS_MONTH", text: "1달" },
        { key: "THIS_QUARTER", text: "1년" }
    ];

    var COMMON_SUB_TABS = [
        { key: "OVERVIEW", text: "Overview" },
        { key: "OPERATIONS", text: "Operations" },
        { key: "DISTRIBUTION", text: "Source distribution" },
        { key: "INSURANCE", text: "Insurance" },
        { key: "REPORTS", text: "Reports" }
    ];

    var COMMON_KPIS = [
        { label: "Revenue", valueMain: "$1 248", valueSuffix: ",320", trendHint: "per last week", trend: "14%", trendUp: true },
        { label: "Expenses", valueMain: "$642", valueSuffix: ",800", trendHint: "per last week", trend: "6.2%", trendUp: false },
        { label: "Profit", valueMain: "$605", valueSuffix: ",520", trendHint: "per last week", trend: "18.9%", trendUp: true },
        { label: "Outstanding Invoices", valueMain: "$42", valueSuffix: ",800", trendHint: "per last week", trend: "11.3%", trendUp: false }
    ];

    var MM_KPIS = [
        { label: "Stock Value", valueMain: "98", valueSuffix: ".0 M", trendHint: "KRW · all plants", trend: "4.2%", trendUp: true },
        { label: "Open PO Value", valueMain: "42", valueSuffix: ".8 M", trendHint: "per last month", trend: "6.1%", trendUp: false },
        { label: "Safety Stock Breach", valueMain: "18", valueSuffix: " EA", trendHint: "below threshold", trend: "3", trendUp: false },
        { label: "GR This Month", valueMain: "1,284", valueSuffix: " EA", trendHint: "goods receipt", trend: "9.4%", trendUp: true }
    ];

    var MODULE_TITLES = {
        SD_SALES: "Sales and Distribution",
        MM_MATERIALS: "Materials Management",
        PP_PRODUCTION: "Production Planning",
        FI_CO_FINANCE: "Financial Accounting"
    };

    function buildModuleConfig(sNavKey) {
        var aKpis = sNavKey === "MM_MATERIALS" ? MM_KPIS : COMMON_KPIS;
        var aSubTabs = sNavKey === "MM_MATERIALS"
            ? [{ key: "REPORTS", text: "Reports" }]
            : COMMON_SUB_TABS.slice();

        return {
            title: MODULE_TITLES[sNavKey] || sNavKey,
            period: "THIS_WEEK",
            periodOptions: PERIOD_OPTIONS.slice(),
            activeSubTab: sNavKey === "MM_MATERIALS" ? "REPORTS" : "OVERVIEW",
            subTabs: aSubTabs,
            kpis: aKpis.map(function (oKpi) {
                return JSON.parse(JSON.stringify(oKpi));
            }),
            settings: {
                showKpiTrends: true,
                includeTrendsInExport: true
            }
        };
    }

    var MODULE_CONFIGS = {
        SD_SALES: buildModuleConfig("SD_SALES"),
        MM_MATERIALS: buildModuleConfig("MM_MATERIALS"),
        PP_PRODUCTION: buildModuleConfig("PP_PRODUCTION"),
        FI_CO_FINANCE: buildModuleConfig("FI_CO_FINANCE")
    };

    return {
        isModuleKey: function (sNavKey) {
            return MODULE_KEYS.indexOf(sNavKey) >= 0;
        },

        syncModuleView: function (oModel, sNavKey) {
            var oConfig;

            if (!oModel || !MODULE_CONFIGS[sNavKey]) {
                return;
            }

            oConfig = JSON.parse(JSON.stringify(MODULE_CONFIGS[sNavKey]));
            oModel.setProperty("/moduleView", oConfig);
        }
    };
});
