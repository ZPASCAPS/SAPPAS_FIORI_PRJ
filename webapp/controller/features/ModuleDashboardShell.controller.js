/**
 * ModuleDashboardShell.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.ModuleDashboardShell
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.ModuleDashboardShell
 *
 * 역할:
 * - SD/MM/PP/FI 모듈 상단 CareOps UI 이벤트 처리.
 * - 기간 변경, 서브탭, KPI 내보내기(CSV), 모듈 설정 Popover.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "com/capstone/dashboard/fioridashboard/util/ModuleViewConfig"
], function (Controller, MessageToast, ModuleViewConfig) {
    "use strict";

    var SUB_TAB_BTN_IDS = {
        OVERVIEW: "subTabOverview",
        OPERATIONS: "subTabOperations",
        DISTRIBUTION: "subTabDistribution",
        INSURANCE: "subTabInsurance",
        INVENTORY: "subTabMmInventory",
        PURCHASING: "subTabMmPurchasing",
        GOODS_MOVEMENT: "subTabMmGoodsMovement",
        REPORTS: "subTabReports"
    };

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.ModuleDashboardShell", {

        onInit: function () {
            var oModel = this.getView().getModel("dashboard");
            var oView = this.getView();

            if (oModel) {
                ModuleViewConfig.syncModuleView(oModel, oModel.getProperty("/ui/navKey"));
                oModel.attachPropertyChange(this._onDashboardPropertyChange, this);
            }

            oView.addEventDelegate({
                onAfterRendering: this._onSubTabsAfterRendering
            }, this);

            this._fnSubTabResize = this._updateSubTabIndicator.bind(this, true);
            window.addEventListener("resize", this._fnSubTabResize);
        },

        onExit: function () {
            var oModel = this.getView().getModel("dashboard");

            if (oModel) {
                oModel.detachPropertyChange(this._onDashboardPropertyChange, this);
            }

            if (this._fnSubTabResize) {
                window.removeEventListener("resize", this._fnSubTabResize);
            }

            this._oSubTabIndicator = null;
            this._bSubTabIndicatorReady = false;
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/moduleView/activeSubTab" || sPath === "/ui/navKey") {
                this._updateSubTabIndicator(true);
            }
        },

        _onSubTabsAfterRendering: function () {
            this._ensureSubTabIndicator();

            if (!this._bSubTabIndicatorReady) {
                this._updateSubTabIndicator(false);
                this._bSubTabIndicatorReady = true;
            } else {
                this._updateSubTabIndicator(true);
            }
        },

        _ensureSubTabIndicator: function () {
            var oWrap = this.byId("moduleSubTabsWrap");
            var oDom = oWrap && oWrap.getDomRef();

            if (!oDom || oDom.querySelector(".nxModuleSubTabIndicator")) {
                this._oSubTabIndicator = oDom && oDom.querySelector(".nxModuleSubTabIndicator");
                return;
            }

            this._oSubTabIndicator = document.createElement("div");
            this._oSubTabIndicator.className = "nxModuleSubTabIndicator";
            oDom.appendChild(this._oSubTabIndicator);
        },

        _getSubTabButton: function (sKey) {
            var sId = SUB_TAB_BTN_IDS[sKey];
            return sId ? this.byId(sId) : null;
        },

        _updateSubTabIndicator: function (bAnimate) {
            var oModel = this.getView().getModel("dashboard");
            var oWrap = this.byId("moduleSubTabsWrap");
            var sActive = oModel && oModel.getProperty("/moduleView/activeSubTab");
            var oActiveBtn = this._getSubTabButton(sActive);
            var oWrapDom = oWrap && oWrap.getDomRef();
            var oBtnDom = oActiveBtn && oActiveBtn.getDomRef();
            var oIndicator = this._oSubTabIndicator;
            var oInner;
            var oWrapRect;
            var oBtnRect;
            var nLeft;
            var nWidth;

            if (!oIndicator || !oWrapDom || !oBtnDom) {
                return;
            }

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

        onSubTabPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var aCustom = oButton.getCustomData();
            var sKey = aCustom && aCustom[0] && aCustom[0].getValue();
            var oModel = this.getView().getModel("dashboard");

            if (!oModel || !sKey) {
                return;
            }

            oModel.setProperty("/moduleView/activeSubTab", sKey);
            this._updateSubTabIndicator(true);

            setTimeout(function () {
                var oDom = oButton.getDomRef();
                if (oDom && oDom.blur) {
                    oDom.blur();
                }
            }, 0);
        },

        onPeriodChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem") && oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel("dashboard");

            if (oModel && sKey) {
                oModel.setProperty("/moduleView/period", sKey);
            }
        },

        /**
         * 현재 모듈 KPI를 CSV로 내보낸다.
         */
        onExport: function () {
            var oModel = this.getView().getModel("dashboard");

            if (!oModel) {
                return;
            }

            var sTitle = oModel.getProperty("/moduleView/title") || "Module";
            var sPeriodKey = oModel.getProperty("/moduleView/period") || "";
            var sPeriodText = this._getPeriodLabel(oModel, sPeriodKey);
            var bIncludeTrends = oModel.getProperty("/moduleView/settings/includeTrendsInExport") !== false;
            var aKpis = oModel.getProperty("/moduleView/kpis") || [];
            var aLines = [];
            var sCsv;
            var oBlob;
            var oLink;

            aLines.push(["Module", "Period", "Label", "Value"].concat(bIncludeTrends ? ["Trend", "TrendUp"] : []).join(","));

            aKpis.forEach(function (oKpi) {
                var aRow = [
                    this._escapeCsv(sTitle),
                    this._escapeCsv(sPeriodText),
                    this._escapeCsv(oKpi.label || ""),
                    this._escapeCsv((oKpi.valueMain || "") + (oKpi.valueSuffix || ""))
                ];

                if (bIncludeTrends) {
                    aRow.push(this._escapeCsv(oKpi.trend || ""));
                    aRow.push(oKpi.trendUp ? "up" : "down");
                }

                aLines.push(aRow.join(","));
            }.bind(this));

            sCsv = "\uFEFF" + aLines.join("\r\n");
            oBlob = new Blob([sCsv], { type: "text/csv;charset=utf-8;" });
            oLink = document.createElement("a");
            oLink.href = URL.createObjectURL(oBlob);
            oLink.download = this._buildExportFileName(sTitle);
            oLink.click();
            URL.revokeObjectURL(oLink.href);

            MessageToast.show(sTitle + " KPI " + aKpis.length + "건을 내보냈습니다");
        },

        onModuleSettings: function (oEvent) {
            var oPopover = this.byId("moduleSettingsPopover");
            var oBtn = this.byId("moduleSettingsBtn") || oEvent.getSource();

            if (!oPopover) {
                return;
            }

            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }

            oPopover.openBy(oBtn);
        },

        onModuleSettingsAfterClose: function () {
            var oBtn = this.byId("moduleSettingsBtn");
            var oDom = oBtn && oBtn.getDomRef();

            if (oDom && oDom.blur) {
                oDom.blur();
            }
        },

        onShowKpiTrendsChange: function (oEvent) {
            var oModel = this.getView().getModel("dashboard");
            var bState = oEvent.getParameter("state");

            if (oModel) {
                oModel.setProperty("/moduleView/settings/showKpiTrends", bState);
            }

            MessageToast.show(bState ? "KPI 추세를 표시합니다" : "KPI 추세를 숨깁니다");
        },

        onIncludeTrendsInExportChange: function (oEvent) {
            var oModel = this.getView().getModel("dashboard");
            var bState = oEvent.getParameter("state");

            if (oModel) {
                oModel.setProperty("/moduleView/settings/includeTrendsInExport", bState);
            }

            MessageToast.show(bState ? "내보내기에 추세를 포함합니다" : "내보내기에서 추세를 제외합니다");
        },

        _getPeriodLabel: function (oModel, sPeriodKey) {
            var aOptions = oModel.getProperty("/moduleView/periodOptions") || [];
            var i;

            for (i = 0; i < aOptions.length; i++) {
                if (aOptions[i].key === sPeriodKey) {
                    return aOptions[i].text;
                }
            }

            return sPeriodKey;
        },

        _escapeCsv: function (sValue) {
            var sText = String(sValue == null ? "" : sValue);

            if (sText.indexOf(",") >= 0 || sText.indexOf("\"") >= 0 || sText.indexOf("\n") >= 0) {
                return "\"" + sText.replace(/"/g, "\"\"") + "\"";
            }

            return sText;
        },

        _buildExportFileName: function (sTitle) {
            var sSafe = (sTitle || "module").replace(/[^\w\uAC00-\uD7A3-]+/g, "_");
            var sDate = new Date().toISOString().slice(0, 10);

            return sSafe + "_KPI_" + sDate + ".csv";
        },

        onMmOverviewFilterOpen: function (oEvent) {
            var oPopover = this.byId("mmOverviewFilterPopover");
            var oBtn = oEvent.getSource();

            if (!oPopover) {
                return;
            }

            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }

            oPopover.openBy(oBtn);
        },

        onMmOverviewFilterQueryModeChange: function (oEvent) {
            var sKey = oEvent.getParameter("item") && oEvent.getParameter("item").getKey();

            sap.ui.getCore().getEventBus().publish("dashboard", "mmOverviewAction", {
                action: "queryMode",
                key: sKey
            });
        },

        onMmOverviewFilterSearch: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "mmOverviewAction", { action: "search" });
            this.byId("mmOverviewFilterPopover").close();
        },

        onMmOverviewFilterReset: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "mmOverviewAction", { action: "reset" });
            this.byId("mmOverviewFilterPopover").close();
        },

        onMmOverviewRefresh: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "mmOverviewAction", { action: "refresh" });
        }
    });
});
