/**
 * DashboardModuleNav.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardModuleNav
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardModuleNav
 *
 * 역할:
 * - 상단 모듈 탭 바(Dashboard / SD / MM / PP / FI) 클릭 시 navKey·moduleView 갱신.
 * - 활성 탭 슬라이딩 밑줄 표시 (ModuleDashboardShell 서브탭과 동일 패턴).
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/ModuleViewConfig"
], function (Controller, ModuleViewConfig) {
    "use strict";

    var NAV_BTN_IDS = {
        DASHBOARD: "moduleNavDashboard",
        SD_SALES: "moduleNavSd",
        MM_MATERIALS: "moduleNavMm",
        PP_PRODUCTION: "moduleNavPp",
        FI_CO_FINANCE: "moduleNavFi"
    };

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

        onInit: function () {
            var oModel = this.getView().getModel("dashboard");
            var oView = this.getView();

            if (oModel) {
                oModel.attachPropertyChange(this._onDashboardPropertyChange, this);
            }

            oView.addEventDelegate({
                onAfterRendering: this._onNavTabsAfterRendering
            }, this);

            this._fnNavTabResize = this._updateNavTabIndicator.bind(this, true);
            window.addEventListener("resize", this._fnNavTabResize);
        },

        onExit: function () {
            var oModel = this.getView().getModel("dashboard");

            if (oModel) {
                oModel.detachPropertyChange(this._onDashboardPropertyChange, this);
            }

            if (this._fnNavTabResize) {
                window.removeEventListener("resize", this._fnNavTabResize);
            }

            this._oNavTabIndicator = null;
            this._bNavTabIndicatorReady = false;
        },

        _onDashboardPropertyChange: function (oEvent) {
            if (oEvent.getPath() === "/ui/navKey") {
                this._updateNavTabIndicator(true);
            }
        },

        _onNavTabsAfterRendering: function () {
            this._ensureNavTabIndicator();

            if (!this._bNavTabIndicatorReady) {
                this._updateNavTabIndicator(false);
                this._bNavTabIndicatorReady = true;
            } else {
                this._updateNavTabIndicator(true);
            }
        },

        _ensureNavTabIndicator: function () {
            var oWrap = this.byId("moduleNavTabsWrap");
            var oDom = oWrap && oWrap.getDomRef();

            if (!oDom || oDom.querySelector(".nxModuleNavTabIndicator")) {
                this._oNavTabIndicator = oDom && oDom.querySelector(".nxModuleNavTabIndicator");
                return;
            }

            this._oNavTabIndicator = document.createElement("div");
            this._oNavTabIndicator.className = "nxModuleNavTabIndicator";
            oDom.appendChild(this._oNavTabIndicator);
        },

        _getNavTabButton: function (sKey) {
            var sId = NAV_BTN_IDS[sKey];
            return sId ? this.byId(sId) : null;
        },

        _updateNavTabIndicator: function (bAnimate) {
            var oModel = this.getView().getModel("dashboard");
            var oWrap = this.byId("moduleNavTabsWrap");
            var sActive = oModel && oModel.getProperty("/ui/navKey");
            var oActiveBtn = this._getNavTabButton(sActive);
            var oWrapDom = oWrap && oWrap.getDomRef();
            var oBtnDom = oActiveBtn && oActiveBtn.getDomRef();
            var oIndicator = this._oNavTabIndicator;
            var oInner;
            var oWrapRect;
            var oBtnRect;
            var nLeft;
            var nWidth;

            if (!oIndicator || !oWrapDom) {
                return;
            }

            if (!oBtnDom) {
                oIndicator.style.width = "0";
                oIndicator.style.opacity = "0";
                return;
            }

            oIndicator.style.opacity = "1";
            oInner = oBtnDom.querySelector(".sapMBtnInner") || oBtnDom;
            oWrapRect = oWrapDom.getBoundingClientRect();
            oBtnRect = oInner.getBoundingClientRect();
            nLeft = oBtnRect.left - oWrapRect.left;
            nWidth = oBtnRect.width;

            if (!bAnimate) {
                oIndicator.style.transition = "none";
            }

            oIndicator.style.left = nLeft + "px";
            oIndicator.style.width = nWidth + "px";

            if (!bAnimate) {
                void oIndicator.offsetWidth;
                oIndicator.style.transition = "";
            }
        },

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

            this._updateNavTabIndicator(true);
        }
    });
});
