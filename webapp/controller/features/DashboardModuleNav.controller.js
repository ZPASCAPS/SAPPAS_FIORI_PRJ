/**
 * DashboardModuleNav.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardModuleNav
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardModuleNav
 *
 * 역할:
 * - 상단 모듈 탭 바(Dashboard / SD / MM / PP / FI) 클릭 시 navKey·moduleView 갱신.
 * - MM 등 Flyout 내부 메뉴가 있는 모듈은 hover/click 시 카드형 Flyout 표시.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "com/capstone/dashboard/fioridashboard/util/ModuleViewConfig"
], function (Controller, ModuleViewConfig) {
    "use strict";

    var FLYOUT_OPEN_DELAY_MS = 140;
    var FLYOUT_CLOSE_DELAY_MS = 240;

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
                if (!oModel.getProperty("/ui/moduleFlyoutMenu")) {
                    oModel.setProperty("/ui/moduleFlyoutMenu", []);
                }
            }

            oView.addEventDelegate({
                onAfterRendering: this._onNavTabsAfterRendering
            }, this);

            this._fnNavTabResize = function () {
                this._updateNavTabIndicator(true);
                this._closeModuleFlyout();
            }.bind(this);
            window.addEventListener("resize", this._fnNavTabResize);
            this._fnPopoverMouseEnter = this._onFlyoutPopoverEnter.bind(this);
            this._fnPopoverMouseLeave = this._onFlyoutPopoverLeave.bind(this);
        },

        onExit: function () {
            var oModel = this.getView().getModel("dashboard");

            if (oModel) {
                oModel.detachPropertyChange(this._onDashboardPropertyChange, this);
            }

            if (this._fnNavTabResize) {
                window.removeEventListener("resize", this._fnNavTabResize);
            }

            this._clearFlyoutTimers();
            this._detachFlyoutDelegates();
            this._detachPopoverHoverHandlers();
            this._oNavTabIndicator = null;
            this._bNavTabIndicatorReady = false;
        },

        _onDashboardPropertyChange: function (oEvent) {
            if (oEvent.getPath() === "/ui/navKey") {
                this._updateNavTabIndicator(true);
                this._closeModuleFlyout();
            }
        },

        _onNavTabsAfterRendering: function () {
            this._ensureNavTabIndicator();
            this._attachFlyoutDelegates();

            if (!this._bNavTabIndicatorReady) {
                this._updateNavTabIndicator(false);
                this._bNavTabIndicatorReady = true;
            } else {
                this._updateNavTabIndicator(true);
            }
        },

        _attachFlyoutDelegates: function () {
            var that = this;

            this._detachFlyoutDelegates();
            this._mFlyoutDelegates = {};

            Object.keys(NAV_BTN_IDS).forEach(function (sNavKey) {
                var oBtn;
                var oDelegate;

                if (!ModuleViewConfig.hasFlyout(sNavKey)) {
                    return;
                }

                oBtn = that.byId(NAV_BTN_IDS[sNavKey]);
                if (!oBtn) {
                    return;
                }

                oDelegate = {
                    onmouseover: function () {
                        that._onModuleNavHover(sNavKey);
                    },
                    onmouseout: function () {
                        that._onModuleNavLeave(sNavKey);
                    }
                };

                oBtn.addEventDelegate(oDelegate);
                that._mFlyoutDelegates[sNavKey] = { button: oBtn, delegate: oDelegate };
            });
        },

        _detachFlyoutDelegates: function () {
            var sKey;
            var oEntry;

            if (!this._mFlyoutDelegates) {
                return;
            }

            for (sKey in this._mFlyoutDelegates) {
                if (Object.prototype.hasOwnProperty.call(this._mFlyoutDelegates, sKey)) {
                    oEntry = this._mFlyoutDelegates[sKey];
                    if (oEntry.button && oEntry.delegate) {
                        oEntry.button.removeEventDelegate(oEntry.delegate);
                    }
                }
            }

            this._mFlyoutDelegates = null;
        },

        _attachPopoverHoverHandlers: function () {
            var oPopover = this.byId("moduleFlyoutPopover");
            var oDom = oPopover && oPopover.getDomRef();

            this._detachPopoverHoverHandlers();

            if (!oDom) {
                return;
            }

            oDom.addEventListener("mouseenter", this._fnPopoverMouseEnter);
            oDom.addEventListener("mouseleave", this._fnPopoverMouseLeave);
            this._oFlyoutPopoverDom = oDom;
        },

        _detachPopoverHoverHandlers: function () {
            if (this._oFlyoutPopoverDom) {
                this._oFlyoutPopoverDom.removeEventListener("mouseenter", this._fnPopoverMouseEnter);
                this._oFlyoutPopoverDom.removeEventListener("mouseleave", this._fnPopoverMouseLeave);
                this._oFlyoutPopoverDom = null;
            }
        },

        _clearFlyoutTimers: function () {
            if (this._flyoutOpenTimer) {
                clearTimeout(this._flyoutOpenTimer);
                this._flyoutOpenTimer = null;
            }

            if (this._flyoutCloseTimer) {
                clearTimeout(this._flyoutCloseTimer);
                this._flyoutCloseTimer = null;
            }
        },

        _onModuleNavHover: function (sNavKey) {
            this._clearFlyoutTimers();
            this._pendingFlyoutNavKey = sNavKey;
            this._flyoutOpenTimer = setTimeout(function () {
                this._openModuleFlyout(sNavKey);
            }.bind(this), FLYOUT_OPEN_DELAY_MS);
        },

        _onModuleNavLeave: function () {
            if (this._flyoutOpenTimer) {
                clearTimeout(this._flyoutOpenTimer);
                this._flyoutOpenTimer = null;
            }

            this._scheduleFlyoutClose();
        },

        _onFlyoutPopoverEnter: function () {
            if (this._flyoutCloseTimer) {
                clearTimeout(this._flyoutCloseTimer);
                this._flyoutCloseTimer = null;
            }
        },

        _onFlyoutPopoverLeave: function () {
            this._scheduleFlyoutClose();
        },

        _scheduleFlyoutClose: function () {
            if (this._flyoutCloseTimer) {
                clearTimeout(this._flyoutCloseTimer);
            }

            this._flyoutCloseTimer = setTimeout(function () {
                this._closeModuleFlyout();
            }.bind(this), FLYOUT_CLOSE_DELAY_MS);
        },

        _openModuleFlyout: function (sNavKey) {
            var oPopover = this.byId("moduleFlyoutPopover");
            var oBtn = this.byId(NAV_BTN_IDS[sNavKey]);
            var oModel = this.getView().getModel("dashboard");
            var aItems;
            var sPrevKey = this._activeFlyoutNavKey;
            var bWasOpen = !!(oPopover && oPopover.isOpen());

            if (!oPopover || !oBtn || !oModel || !ModuleViewConfig.hasFlyout(sNavKey)) {
                return;
            }

            aItems = ModuleViewConfig.getFlyoutItems(sNavKey);
            oModel.setProperty("/ui/moduleFlyoutMenu", aItems);
            oModel.setProperty("/ui/moduleFlyoutNavKey", sNavKey);
            this._activeFlyoutNavKey = sNavKey;

            if (bWasOpen && sPrevKey === sNavKey) {
                return;
            }

            if (bWasOpen) {
                oPopover.close();
            }

            setTimeout(function () {
                if (this._activeFlyoutNavKey !== sNavKey) {
                    return;
                }

                oPopover.openBy(oBtn);
                this._attachPopoverHoverHandlers();
            }.bind(this), 0);
        },

        _closeModuleFlyout: function () {
            var oPopover = this.byId("moduleFlyoutPopover");

            this._clearFlyoutTimers();
            this._detachPopoverHoverHandlers();
            this._activeFlyoutNavKey = null;

            if (oPopover && oPopover.isOpen()) {
                oPopover.close();
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

            if (ModuleViewConfig.hasFlyout(sKey)) {
                this._openModuleFlyout(sKey);
            } else {
                this._closeModuleFlyout();
            }
        },

        onFlyoutItemPress: function (oEvent) {
            var oSource = oEvent.getSource();
            var oCtx = oSource.getBindingContext("dashboard");
            var sSubTabKey = oCtx && oCtx.getProperty("key");
            var oModel = this.getView().getModel("dashboard");
            var sNavKey = oModel && oModel.getProperty("/ui/moduleFlyoutNavKey");

            if (!oModel || !sSubTabKey || !sNavKey) {
                return;
            }

            if (oModel.getProperty("/ui/navKey") !== sNavKey) {
                this._setNavKey(sNavKey);
            }

            sSubTabKey = ModuleViewConfig.normalizeActiveSubTab(sNavKey, sSubTabKey);
            oModel.setProperty("/moduleView/activeSubTab", sSubTabKey);
            this._closeModuleFlyout();
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

                if (sKey === "MM_MATERIALS") {
                    oModel.setProperty("/moduleView/activeSubTab", "INVENTORY");
                } else if (sKey === "FI_CO_FINANCE") {
                    oModel.setProperty("/moduleView/activeSubTab", "CUSTOMER_RECEIPT");
                }
            }

            this._updateNavTabIndicator(true);
        }
    });
});
