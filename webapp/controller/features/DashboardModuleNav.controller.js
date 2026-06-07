/**
 * DashboardModuleNav.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardModuleNav
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardModuleNav
 *
 * 역할:
 * - 상단 모듈 탭 바(Dashboard / SD / MM / PP / FI) 클릭 시 navKey·moduleView 갱신.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/ModuleViewConfig"
], function (Controller, ModuleViewConfig) {
    "use strict";

    var NAV_LABELS = {
        DASHBOARD: "Dashboard",
        SD_SALES: "Sales and Distribution",
        MM_MATERIALS: "Materials Management",
        PP_PRODUCTION: "Production Planning",
        FI_CO_FINANCE: "Financial Accounting"
    };

    var NAV_DESCRIPTIONS = {
        DASHBOARD: "SAP 통합 프로세스 전체 현황을 확인합니다.",
        SD_SALES: "수주·매출 현황과 판매 프로세스를 확인합니다.",
        MM_MATERIALS: "자재 마스터와 재고 연동 정보를 확인합니다.",
        PP_PRODUCTION: "생산 프로세스 흐름과 재고 활동을 확인합니다.",
        FI_CO_FINANCE: "재무·회계 관련 매출 및 재고 가치를 확인합니다."
    };

    var NAV_ICONS = {
        DASHBOARD: "sap-icon://bbyd-dashboard",
        SD_SALES: "sap-icon://sales-order",
        MM_MATERIALS: "sap-icon://product",
        PP_PRODUCTION: "sap-icon://factory",
        FI_CO_FINANCE: "sap-icon://money-bills"
    };

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardModuleNav", {

        onModuleNavPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var aCustom = oButton.getCustomData();
            var sKey = (aCustom && aCustom[0] && aCustom[0].getValue()) || "DASHBOARD";
            this._setNavKey(sKey);
        },

        _setNavKey: function (sKey) {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            oModel.setProperty("/ui/navKey", sKey);
            oModel.setProperty("/ui/navLabel", NAV_LABELS[sKey] || sKey);
            oModel.setProperty("/ui/navDescription", NAV_DESCRIPTIONS[sKey] || "");
            oModel.setProperty("/ui/navIcon", NAV_ICONS[sKey] || "sap-icon://home");

            if (ModuleViewConfig.isModuleKey(sKey)) {
                ModuleViewConfig.syncModuleView(oModel, sKey);
            }
        }
    });
});
