/**
 * ModuleSideNav.controller.js
 *
 * 역할:
 * - 왼쪽 사이드바 모듈 네비게이션 UI와 선택 이벤트를 처리한다.
 *
 * 주요 기능:
 * - Main / Serve / Support 메뉴 선택
 * - 선택 상태를 dashboard 모델 ui/navKey, ui/navLabel 에 반영
 * - Dashboard 히어로 버튼과 Main 목록 동기화
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
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

            if (sKey !== "DASHBOARD") {
                MessageToast.show((NAV_LABELS[sKey] || sKey) + " 메뉴는 추후 연결 예정입니다");
            }
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

            var oTarget = mSectionItems[sKey] || mSectionItems.DASHBOARD;
            this._clearNavSelections();

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
