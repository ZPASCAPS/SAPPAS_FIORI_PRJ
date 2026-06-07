/**
 * DashboardSearchHelper.js
 *
 * 헤더·툴바 검색 공통 로직.
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService",
    "com/capstone/dashboard/fioridashboard/util/ModuleViewConfig"
], function (DashboardDataService, ModuleViewConfig) {
    "use strict";

    var NAV_LABELS = {
        DASHBOARD: "Dashboard",
        SD_SALES: "SD Sales",
        MM_MATERIALS: "MM Materials",
        PP_PRODUCTION: "Production Planning",
        FI_CO_FINANCE: "Financial Accounting",
        TCODE_GUIDE: "T-code Guide",
        ERROR_HELPER: "Error Helper",
        ODATA_STATUS: "OData Status",
        SYSTEM_LOG: "System Log"
    };

    var NAV_DESCRIPTIONS = {
        DASHBOARD: "SAP 통합 프로세스 전체 현황을 확인합니다.",
        SD_SALES: "수주·매출 현황과 판매 프로세스를 확인합니다.",
        MM_MATERIALS: "자재 마스터와 재고 연동 정보를 확인합니다.",
        PP_PRODUCTION: "생산 프로세스 흐름과 재고 활동을 확인합니다.",
        FI_CO_FINANCE: "재무·회계 관련 매출 및 재고 가치를 확인합니다.",
        TCODE_GUIDE: "자주 사용하는 T-code 가이드를 확인합니다.",
        ERROR_HELPER: "SAP 오류 메시지 해결 방법을 확인합니다.",
        ODATA_STATUS: "OData 서비스 연결 상태를 확인합니다.",
        SYSTEM_LOG: "시스템 로그와 이벤트 기록을 확인합니다."
    };

    var NAV_ICONS = {
        DASHBOARD: "sap-icon://bbyd-dashboard",
        SD_SALES: "sap-icon://sales-order",
        MM_MATERIALS: "sap-icon://product",
        PP_PRODUCTION: "sap-icon://factory",
        FI_CO_FINANCE: "sap-icon://money-bills",
        TCODE_GUIDE: "sap-icon://syntax",
        ERROR_HELPER: "sap-icon://message-error",
        ODATA_STATUS: "sap-icon://connected",
        SYSTEM_LOG: "sap-icon://document-text"
    };

    var NAV_ALIASES = {
        DASHBOARD: ["대시보드", "dashboard", "통합"],
        SD_SALES: ["sd", "sales", "수주", "매출", "판매"],
        MM_MATERIALS: ["mm", "material", "자재", "재고", "materials"],
        PP_PRODUCTION: ["pp", "production", "생산"],
        FI_CO_FINANCE: ["fi", "finance", "재무", "회계", "financial"]
    };

    function _matchesQuery(sText, sLower) {
        return (sText || "").toLowerCase().indexOf(sLower) >= 0;
    }

    return {
        applyFilter: function (oModel, sQuery) {
            var aResults;

            if (!oModel) {
                return [];
            }

            sQuery = (sQuery || "").trim();
            oModel.setProperty("/filters/query", sQuery);
            DashboardDataService.applySearchFilter(oModel);
            aResults = this.buildResults(oModel, sQuery);
            oModel.setProperty("/search/results", aResults);
            oModel.setProperty("/search/resultCount", aResults.length);
            return aResults;
        },

        buildResults: function (oModel, sQuery) {
            var aResults = [];
            var sLower;
            var aNavKeys;

            if (!oModel || !sQuery) {
                return aResults;
            }

            sLower = sQuery.toLowerCase();
            aNavKeys = ["DASHBOARD", "SD_SALES", "MM_MATERIALS", "PP_PRODUCTION", "FI_CO_FINANCE"];

            aNavKeys.forEach(function (sKey) {
                var sLabel = NAV_LABELS[sKey] || sKey;
                var sDesc = NAV_DESCRIPTIONS[sKey] || "";
                var bMatch = _matchesQuery(sLabel, sLower)
                    || _matchesQuery(sDesc, sLower)
                    || _matchesQuery(sKey, sLower);

                if (!bMatch) {
                    (NAV_ALIASES[sKey] || []).forEach(function (sAlias) {
                        if (_matchesQuery(sAlias, sLower) || sLower.indexOf(sAlias) >= 0) {
                            bMatch = true;
                        }
                    });
                }

                if (bMatch) {
                    aResults.push({
                        key: sKey,
                        type: "nav",
                        title: sLabel,
                        description: sDesc,
                        icon: NAV_ICONS[sKey] || "sap-icon://home"
                    });
                }
            });

            (oModel.getProperty("/moduleView/subTabs") || []).forEach(function (oTab) {
                var sText = oTab.text || oTab.key || "";
                if (_matchesQuery(sText, sLower) || _matchesQuery(oTab.key, sLower)) {
                    aResults.push({
                        key: oTab.key,
                        type: "subTab",
                        title: sText,
                        description: (oModel.getProperty("/moduleView/title") || "모듈") + " · 서브탭",
                        icon: "sap-icon://filter"
                    });
                }
            });

            (oModel.getProperty("/moduleView/kpis") || []).forEach(function (oKpi) {
                var sLabel = oKpi.label || "";
                if (_matchesQuery(sLabel, sLower)) {
                    aResults.push({
                        key: sLabel,
                        type: "kpi",
                        title: sLabel,
                        description: (oKpi.valueMain || "") + (oKpi.valueSuffix || ""),
                        icon: "sap-icon://chart-axis"
                    });
                }
            });

            (oModel.getProperty("/teamOptions") || []).forEach(function (oTeam) {
                if (_matchesQuery(oTeam.text, sLower) || _matchesQuery(oTeam.key, sLower)) {
                    aResults.push({
                        key: oTeam.key,
                        type: "team",
                        title: oTeam.text,
                        description: "팀 선택",
                        icon: "sap-icon://building"
                    });
                }
            });

            (oModel.getProperty("/helpItems") || []).forEach(function (oItem) {
                if (_matchesQuery(oItem.title, sLower) || _matchesQuery(oItem.description, sLower)) {
                    aResults.push({
                        key: oItem.key,
                        type: "nav",
                        title: oItem.title,
                        description: oItem.description,
                        icon: NAV_ICONS[oItem.key] || "sap-icon://sys-help-2"
                    });
                }
            });

            (oModel.getProperty("/notifications") || []).forEach(function (oItem) {
                if (_matchesQuery(oItem.title, sLower) || _matchesQuery(oItem.description, sLower)) {
                    aResults.push({
                        key: oItem.id,
                        type: "notification",
                        title: oItem.title,
                        description: oItem.description,
                        icon: oItem.icon || "sap-icon://bell"
                    });
                }
            });

            (oModel.getProperty("/allItems") || []).forEach(function (oItem) {
                var sName = oItem.MaterialName || "";
                var sCode = oItem.MaterialCode || oItem.ParentMatnr || "";
                if (sName.toLowerCase().indexOf(sLower) >= 0
                    || String(sCode).toLowerCase().indexOf(sLower) >= 0) {
                    aResults.push({
                        key: String(sCode || sName),
                        type: "material",
                        title: sName || sCode,
                        description: sCode ? "자재 · " + sCode : "자재",
                        icon: "sap-icon://product"
                    });
                }
            });

            return aResults.slice(0, 12);
        },

        handleResultPress: function (oModel, oData, fnSetNavKey, fnApplyQuery) {
            if (!oData || !oModel) {
                return;
            }

            if (oData.type === "nav" && oData.key) {
                if (fnSetNavKey) {
                    fnSetNavKey(oData.key);
                }
                if (ModuleViewConfig.isModuleKey(oData.key)) {
                    ModuleViewConfig.syncModuleView(oModel, oData.key);
                }
            } else if (oData.type === "subTab" && oData.key) {
                oModel.setProperty("/moduleView/activeSubTab", oData.key);
            } else if (oData.type === "team" && oData.key) {
                var aTeams = oModel.getProperty("/teamOptions") || [];
                var oTeam = aTeams.filter(function (t) { return t.key === oData.key; })[0];
                if (oTeam) {
                    oModel.setProperty("/team/key", oTeam.key);
                    oModel.setProperty("/team/name", oTeam.text);
                }
            } else if (oData.type === "material" && fnApplyQuery) {
                fnApplyQuery(oData.title || oData.key || "");
            }
        },

        getNavMeta: function (sKey) {
            return {
                label: NAV_LABELS[sKey] || sKey,
                description: NAV_DESCRIPTIONS[sKey] || "",
                icon: NAV_ICONS[sKey] || "sap-icon://home"
            };
        }
    };
});
