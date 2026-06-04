/**
 * DashboardHeader.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardHeader
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader
 *
 * 역할:
 * - 상단 헤더: 로고·모듈 네비, 전역 검색, 알림·도움말·설정 Popover, 프로필 Dialog.
 *
 * 대시보드 구조: DashboardMain → DashboardHeader (최상단)
 *
 * 협업:
 * - 검색·프로필 Dialog → 이 Controller + DashboardHeader.view.xml
 * - profileOptions·notifications·helpItems → Main.controller.js (_initModels)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService"
], function (Controller, MessageToast, DashboardDataService) {
    "use strict";

    var NAV_LABELS = {
        DASHBOARD: "Dashboard",
        SD_SALES: "SD Sales",
        MM_MATERIALS: "MM Materials",
        PP_PRODUCTION: "PP Production",
        FI_CO_FINANCE: "FI/CO Finance",
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

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader", {

        onExit: function () {
            this._oProfileDialog = null;
            this._oNotificationPopover = null;
            this._oHelpPopover = null;
            this._oSettingsPopover = null;
        },

        _applySearch: function (sQuery) {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            oModel.setProperty("/filters/query", sQuery || "");
            DashboardDataService.applySearchFilter(oModel);
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("value")
                || oEvent.getSource().getValue()
                || "";
            this._applySearch(sQuery);
        },

        onSearchSubmit: function (oEvent) {
            this._applySearch(oEvent.getParameter("value") || "");
        },

        onSearchIconPress: function () {
            var oInput = this.byId("globalSearch");
            this._applySearch(oInput ? oInput.getValue() : "");
        },

        onLogoPress: function () {
            this._setNavKey("DASHBOARD");
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
        },

        _openPopover: function (sPopoverId, oSource) {
            var oPopover = this.byId(sPopoverId);
            if (!oPopover) {
                return;
            }
            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }
            oPopover.openBy(oSource);
        },

        onNotifications: function (oEvent) {
            this._openPopover("notificationPopover", oEvent.getSource());
        },

        onNotificationItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem && oItem.getBindingContext("dashboard");
            if (!oContext) {
                return;
            }
            var oData = oContext.getObject();
            if (oData && !oData.read) {
                oData.read = true;
                this._syncNotificationCount();
            }
            MessageToast.show(oData.title);
        },

        onMarkAllNotificationsRead: function () {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            var aNotifications = oModel.getProperty("/notifications") || [];
            aNotifications.forEach(function (oItem) {
                oItem.read = true;
            });
            oModel.setProperty("/notifications", aNotifications);
            oModel.setProperty("/ui/notificationCount", 0);
            MessageToast.show("모든 알림을 읽음 처리했습니다");
        },

        _syncNotificationCount: function () {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            var aNotifications = oModel.getProperty("/notifications") || [];
            var iUnread = aNotifications.filter(function (oItem) {
                return !oItem.read;
            }).length;
            oModel.setProperty("/ui/notificationCount", iUnread);
        },

        onHelp: function (oEvent) {
            this._openPopover("helpPopover", oEvent.getSource());
        },

        onHelpItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem && oItem.getBindingContext("dashboard");
            var sKey = oContext && oContext.getProperty("key");
            if (sKey) {
                this._setNavKey(sKey);
            }
            this.byId("helpPopover").close();
        },

        onSettings: function (oEvent) {
            this._openPopover("settingsPopover", oEvent.getSource());
        },

        onAutoRefreshChange: function (oEvent) {
            var bState = oEvent.getParameter("state");
            MessageToast.show(bState ? "자동 새로고침을 켰습니다" : "자동 새로고침을 껐습니다");
        },

        onShowNotificationsChange: function (oEvent) {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            var bState = oEvent.getParameter("state");
            if (!bState) {
                oModel.setProperty("/ui/notificationCount", 0);
            } else {
                this._syncNotificationCount();
            }
            MessageToast.show(bState ? "알림 표시를 켰습니다" : "알림 표시를 껐습니다");
        },

        onOpenDashboardSettings: function () {
            this.byId("settingsPopover").close();
            MessageToast.show("대시보드 설정은 화면 우측 상단 버튼에서 이용할 수 있습니다");
        },

        onProfile: function () {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }

            oModel.setProperty("/user/editName", this._normalizeNameKey(oModel.getProperty("/user/name")));
            oModel.setProperty("/user/editModule", this._normalizeModuleKey(oModel.getProperty("/user/role")));
            this._getProfileDialog().open();
        },

        onProfileSave: function () {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }

            var sName = oModel.getProperty("/user/editName") || "";
            var sModule = oModel.getProperty("/user/editModule") || "";

            if (!sName) {
                MessageToast.show("이름을 선택해주세요");
                return;
            }

            if (!sModule) {
                MessageToast.show("모듈을 선택해주세요");
                return;
            }

            oModel.setProperty("/user/name", sName);
            oModel.setProperty("/user/role", sModule);
            this._getProfileDialog().close();
            MessageToast.show("프로필이 저장되었습니다");
        },

        _normalizeNameKey: function (sName) {
            var aNames = ["김용민", "신성진", "박찬영"];
            return aNames.indexOf(sName) >= 0 ? sName : "박찬영";
        },

        _normalizeModuleKey: function (sModule) {
            var sValue = (sModule || "").replace(/\//g, ".").trim();
            var aModules = ["SD", "PP", "MM", "FI.CO"];

            if (aModules.indexOf(sValue) >= 0) {
                return sValue;
            }
            if (/FI\.?CO/i.test(sValue)) {
                return "FI.CO";
            }
            return "FI.CO";
        },

        onProfileCancel: function () {
            this._getProfileDialog().close();
        },

        _getProfileDialog: function () {
            if (!this._oProfileDialog) {
                this._oProfileDialog = this.byId("profileDialog");
            }
            return this._oProfileDialog;
        },

        onRefresh: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
        }
    });
});
