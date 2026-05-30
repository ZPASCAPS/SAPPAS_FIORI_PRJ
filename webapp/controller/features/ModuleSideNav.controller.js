/**
 * ModuleSideNav.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.ModuleSideNav
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.ModuleSideNav
 *
 * 역할:
 * - 왼쪽 사이드바 메뉴 클릭 처리. navKey / navLabel / navDescription / navIcon 갱신.
 *
 * 대시보드 구조: Main.view.xml → ModuleSideNav (왼쪽)
 *
 * 협업:
 * - 메뉴 항목·라벨·안내문 → NAV_LABELS, NAV_DESCRIPTIONS, NAV_ICONS (이 파일)
 * - 메뉴 UI → ModuleSideNav.view.xml
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    var NAV_LABELS = {
        DASHBOARD: "Dashboard",
        WORKLIST: "Worklist",
        ALERTS: "Alerts",
        SD_SALES: "SD Sales",
        MM_MATERIALS: "MM Materials",
        PP_PRODUCTION: "PP Production",
        FI_CO_FINANCE: "FI/CO Finance",
        STOCK_MONITOR: "Stock Monitor",
        MASTER_DATA_CHECK: "Master Data Check",
        REPORT_CENTER: "Report Center",
        DOCUMENT_FLOW: "Document Flow",
        TCODE_GUIDE: "T-code Guide",
        ERROR_HELPER: "Error Helper",
        ODATA_STATUS: "OData Status",
        SYSTEM_LOG: "System Log",
        SETTINGS: "Settings"
    };

    var NAV_DESCRIPTIONS = {
        DASHBOARD: "SAP 통합 프로세스 전체 현황을 확인합니다.",
        WORKLIST: "처리할 작업 목록과 자재 연동 상태를 확인합니다.",
        ALERTS: "시스템 알림, 경고, 재고 이상 징후를 확인합니다.",
        SD_SALES: "수주·매출 현황과 판매 프로세스를 확인합니다.",
        MM_MATERIALS: "자재 마스터와 재고 연동 정보를 확인합니다.",
        PP_PRODUCTION: "생산 프로세스 흐름과 재고 활동을 확인합니다.",
        FI_CO_FINANCE: "재무·회계 관련 매출 및 재고 가치를 확인합니다.",
        STOCK_MONITOR: "재고 KPI와 충족률 추이를 모니터링합니다.",
        MASTER_DATA_CHECK: "마스터 데이터 정합성과 연동 상태를 점검합니다.",
        REPORT_CENTER: "리포트와 차트를 한곳에서 확인합니다.",
        DOCUMENT_FLOW: "문서 흐름과 프로세스 단계를 추적합니다.",
        TCODE_GUIDE: "자주 사용하는 T-code 가이드를 확인합니다.",
        ERROR_HELPER: "SAP 오류 메시지 해결 방법을 확인합니다.",
        ODATA_STATUS: "OData 서비스 연결 상태를 확인합니다.",
        SYSTEM_LOG: "시스템 로그와 이벤트 기록을 확인합니다.",
        SETTINGS: "대시보드 환경 설정을 관리합니다."
    };

    var NAV_ICONS = {
        DASHBOARD: "sap-icon://bbyd-dashboard",
        WORKLIST: "sap-icon://checklist",
        ALERTS: "sap-icon://alert",
        SD_SALES: "sap-icon://sales-order",
        MM_MATERIALS: "sap-icon://product",
        PP_PRODUCTION: "sap-icon://factory",
        FI_CO_FINANCE: "sap-icon://money-bills",
        STOCK_MONITOR: "sap-icon://inventory",
        MASTER_DATA_CHECK: "sap-icon://validate",
        REPORT_CENTER: "sap-icon://business-objects-experience",
        DOCUMENT_FLOW: "sap-icon://process",
        TCODE_GUIDE: "sap-icon://syntax",
        ERROR_HELPER: "sap-icon://message-error",
        ODATA_STATUS: "sap-icon://connected",
        SYSTEM_LOG: "sap-icon://document-text",
        SETTINGS: "sap-icon://action-settings"
    };

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.ModuleSideNav", {

        onInit: function () {
            var oModel = this.getView().getModel("dashboard");
            var sKey = (oModel && oModel.getProperty("/ui/navKey")) || "DASHBOARD";
            this._syncNavSelection(sKey);
            this._syncDashboardHeroState(sKey);
        },

        onMainNavSelect: function (oEvent) {
            this._handleNavSelect(oEvent, "main");
        },

        onServeNavSelect: function (oEvent) {
            this._handleNavSelect(oEvent, "serve");
        },

        onSupportNavSelect: function (oEvent) {
            this._handleNavSelect(oEvent, "support");
        },

        onDashboardNav: function () {
            this._clearNavSelections();
            this._setNavKey("DASHBOARD");
        },

        /**
         * 리스트 선택 공통 처리
         */
        _handleNavSelect: function (oEvent, sSection) {
            var oItem = oEvent.getParameter("listItem");
            var sKey = this._getNavKeyFromItem(oItem);

            if (sSection === "main") {
                this.byId("serveNavList").removeSelections(true);
                this.byId("supportNavList").removeSelections(true);
            } else if (sSection === "serve") {
                this.byId("mainNavList").removeSelections(true);
                this.byId("supportNavList").removeSelections(true);
            } else {
                this.byId("mainNavList").removeSelections(true);
                this.byId("serveNavList").removeSelections(true);
            }

            this._setNavKey(sKey);
        },

        _getNavKeyFromItem: function (oItem) {
            var aCustom = oItem && oItem.getCustomData();
            return (aCustom && aCustom[0] && aCustom[0].getValue()) || "DASHBOARD";
        },

        _setNavKey: function (sKey) {
            var oModel = this.getView().getModel("dashboard");
            if (oModel) {
                oModel.setProperty("/ui/navKey", sKey);
                oModel.setProperty("/ui/navLabel", NAV_LABELS[sKey] || sKey);
                oModel.setProperty("/ui/navDescription", NAV_DESCRIPTIONS[sKey] || "");
                oModel.setProperty("/ui/navIcon", NAV_ICONS[sKey] || "sap-icon://home");
            }
            this._syncDashboardHeroState(sKey);
        },

        _syncDashboardHeroState: function (sKey) {
            var oHero = this.byId("navDashboardHero");
            if (!oHero) {
                return;
            }
            if (sKey === "DASHBOARD") {
                oHero.setType("Emphasized");
                oHero.removeStyleClass("nxDashHeroInactive");
            } else {
                oHero.setType("Transparent");
                oHero.addStyleClass("nxDashHeroInactive");
            }
        },

        _clearNavSelections: function () {
            this.byId("mainNavList").removeSelections(true);
            this.byId("serveNavList").removeSelections(true);
            this.byId("supportNavList").removeSelections(true);
        },

        _selectMainNavByKey: function (sKey) {
            var oList = this.byId("mainNavList");
            if (!oList) {
                return;
            }
            var aItems = oList.getItems();
            var i;

            for (i = 0; i < aItems.length; i++) {
                if (this._getNavKeyFromItem(aItems[i]) === sKey) {
                    oList.setSelectedItem(aItems[i]);
                    return;
                }
            }
        },

        _syncNavSelection: function (sKey) {
            if (sKey === "DASHBOARD") {
                this._clearNavSelections();
                return;
            }

            var mSectionItems = {
                WORKLIST: { list: "mainNavList", key: "WORKLIST" },
                ALERTS: { list: "mainNavList", key: "ALERTS" },
                SD_SALES: { list: "serveNavList", key: "SD_SALES" },
                MM_MATERIALS: { list: "serveNavList", key: "MM_MATERIALS" },
                PP_PRODUCTION: { list: "serveNavList", key: "PP_PRODUCTION" },
                FI_CO_FINANCE: { list: "serveNavList", key: "FI_CO_FINANCE" },
                STOCK_MONITOR: { list: "serveNavList", key: "STOCK_MONITOR" },
                MASTER_DATA_CHECK: { list: "serveNavList", key: "MASTER_DATA_CHECK" },
                REPORT_CENTER: { list: "serveNavList", key: "REPORT_CENTER" },
                DOCUMENT_FLOW: { list: "serveNavList", key: "DOCUMENT_FLOW" },
                TCODE_GUIDE: { list: "supportNavList", key: "TCODE_GUIDE" },
                ERROR_HELPER: { list: "supportNavList", key: "ERROR_HELPER" },
                ODATA_STATUS: { list: "supportNavList", key: "ODATA_STATUS" },
                SYSTEM_LOG: { list: "supportNavList", key: "SYSTEM_LOG" },
                SETTINGS: { list: "supportNavList", key: "SETTINGS" }
            };

            var oTarget = mSectionItems[sKey];
            this._clearNavSelections();

            if (!oTarget) {
                return;
            }

            var oList = this.byId(oTarget.list);
            var aItems = oList.getItems();
            var i;

            for (i = 0; i < aItems.length; i++) {
                if (this._getNavKeyFromItem(aItems[i]) === oTarget.key) {
                    oList.setSelectedItem(aItems[i]);
                    break;
                }
            }
        }
    });
});
