/**
 * DashboardHeader.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardHeader
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader
 *
 * 역할:
 * - 상단 헤더: 로고·PasCal, 팀 선택, 검색, 알림·도움말 Popover, 프로필 Dialog.
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
    "com/capstone/dashboard/fioridashboard/util/DashboardSearchHelper",
    "com/capstone/dashboard/fioridashboard/util/ModuleViewConfig",
    "com/capstone/dashboard/fioridashboard/util/DashboardThemeHelper",
    "com/capstone/dashboard/fioridashboard/util/ProfileBlogConfig"
], function (Controller, MessageToast, DashboardSearchHelper, ModuleViewConfig, DashboardThemeHelper, ProfileBlogConfig) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader", {

        onInit: function () {
            this._attachProfileQrHandler();
        },

        onExit: function () {
            this._oProfileDialog = null;
            this._oNotificationPopover = null;
            this._oHelpPopover = null;
            this._oSettingsPopover = null;
            this._oTeamPopover = null;
            this._oSearchPopover = null;
        },

        _applySearch: function (sQuery) {
            var oModel = this.getView().getModel("dashboard");
            var oPopover = this.byId("searchPopover");
            var oWrap = this.byId("globalSearchWrap");

            if (!oModel) {
                return;
            }

            sQuery = (sQuery || "").trim();
            aResults = DashboardSearchHelper.applyFilter(oModel, sQuery);

            if (!oPopover || !oWrap) {
                return aResults;
            }

            if (sQuery) {
                if (!oPopover.isOpen()) {
                    oPopover.openBy(oWrap);
                }
            } else if (oPopover.isOpen()) {
                oPopover.close();
            }

            return aResults;
        },

        onSearchResultPress: function (oEvent) {
            var oContext = oEvent.getParameter("listItem") && oEvent.getParameter("listItem").getBindingContext("dashboard");
            var oData = oContext && oContext.getObject();
            var oPopover = this.byId("searchPopover");

            if (!oData) {
                return;
            }

            DashboardSearchHelper.handleResultPress(
                this.getView().getModel("dashboard"),
                oData,
                this._setNavKey.bind(this),
                this._applySearch.bind(this)
            );

            if (oData.type === "nav") {
                MessageToast.show(oData.title + "(으)로 이동했습니다");
            } else if (oData.type === "subTab") {
                MessageToast.show(oData.title + " 탭으로 이동했습니다");
            } else if (oData.type === "team") {
                MessageToast.show("팀이 " + oData.title + "(으)로 변경되었습니다");
            } else if (oData.type === "notification") {
                MessageToast.show(oData.title);
            } else if (oData.type === "material") {
                MessageToast.show("자재 검색 결과를 반영했습니다");
            }

            if (oPopover && oPopover.isOpen()) {
                oPopover.close();
            }
            this._clearSearchFocus();
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("value")
                || oEvent.getSource().getValue()
                || "";
            this._applySearch(sQuery);
        },

        onSearchSubmit: function (oEvent) {
            var sQuery = (oEvent.getParameter("value") || "").trim();
            var aResults = this._applySearch(sQuery);

            if (!sQuery) {
                return;
            }

            if (aResults && aResults.length) {
                MessageToast.show("\"" + sQuery + "\" · " + aResults.length + "건");
            } else {
                MessageToast.show("\"" + sQuery + "\" 검색 결과가 없습니다");
            }
        },

        onSearchIconPress: function () {
            var oInput = this.byId("globalSearch");
            this._applySearch(oInput ? oInput.getValue() : "");
        },

        _clearSearchFocus: function () {
            var oWrap = this.byId("globalSearchWrap");
            var oInput = this.byId("globalSearch");
            var oInputDom = oInput && oInput.getFocusDomRef();
            var oWrapDom = oWrap && oWrap.getDomRef();

            if (oInputDom && oInputDom.blur) {
                oInputDom.blur();
            }
            if (oWrapDom && oWrapDom.blur) {
                oWrapDom.blur();
            }
        },

        onTeamSelectorPress: function (oEvent) {
            var oPopover = this.byId("teamPopover");
            var oModel = this.getView().getModel("dashboard");
            var oList = this.byId("teamList");
            var oOpener = this.byId("teamSelectorBtn") || oEvent.getSource();
            var sKey;

            if (!oPopover) {
                return;
            }

            if (oPopover.isOpen()) {
                oPopover.close();
                return;
            }

            if (oModel && oList) {
                sKey = oModel.getProperty("/team/key") || "HSAPIENT";
                this._selectTeamListItem(sKey);
            }

            oPopover.openBy(oOpener);
        },

        onTeamSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem && oItem.getBindingContext("dashboard");
            var sKey = oContext && oContext.getProperty("key");
            var sText = oContext && oContext.getProperty("text");
            var oModel = this.getView().getModel("dashboard");

            if (!oModel || !sKey) {
                return;
            }

            oModel.setProperty("/team/key", sKey);
            oModel.setProperty("/team/name", sText || sKey);
            this.byId("teamPopover").close();
            MessageToast.show("팀이 " + (sText || sKey) + "(으)로 변경되었습니다");
        },

        onTeamPopoverAfterClose: function () {
            setTimeout(this._clearTeamSelectorFocus.bind(this), 0);
        },

        _clearTeamSelectorFocus: function () {
            ["teamSelectorBtn", "teamSelectorArrowBtn"].forEach(function (sId) {
                var oControl = this.byId(sId);
                var oDom = oControl && oControl.getDomRef();
                if (oDom && oDom.blur) {
                    oDom.blur();
                }
            }.bind(this));
        },

        _selectTeamListItem: function (sKey) {
            var oList = this.byId("teamList");
            var aItems;
            var i;
            var oContext;

            if (!oList) {
                return;
            }

            aItems = oList.getItems();
            for (i = 0; i < aItems.length; i++) {
                oContext = aItems[i].getBindingContext("dashboard");
                if (oContext && oContext.getProperty("key") === sKey) {
                    oList.setSelectedItem(aItems[i]);
                    return;
                }
            }
        },

        _setNavKey: function (sKey) {
            var oModel = this.getView().getModel("dashboard");
            var oMeta;

            if (!oModel) {
                return;
            }

            oMeta = DashboardSearchHelper.getNavMeta(sKey);
            oModel.setProperty("/ui/navKey", sKey);
            oModel.setProperty("/ui/navLabel", oMeta.label);
            oModel.setProperty("/ui/navDescription", oMeta.description);
            oModel.setProperty("/ui/navIcon", oMeta.icon);

            if (ModuleViewConfig.isModuleKey(sKey)) {
                ModuleViewConfig.syncModuleView(oModel, sKey);
            }
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

        onNotificationPopoverAfterClose: function () {
            setTimeout(function () {
                this._clearIconBtnFocus("notificationBtn");
            }.bind(this), 0);
        },

        onHelpPopoverAfterClose: function () {
            setTimeout(function () {
                this._clearIconBtnFocus("helpBtn");
            }.bind(this), 0);
        },

        onSettingsPopoverAfterClose: function () {
            setTimeout(function () {
                this._clearIconBtnFocus("settingsBtn");
            }.bind(this), 0);
        },

        _clearIconBtnFocus: function (sBtnId) {
            var oBtn = this.byId(sBtnId);
            var oDom = oBtn && oBtn.getDomRef();
            if (oDom && oDom.blur) {
                oDom.blur();
            }
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
            if (bState) {
                sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
            }
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

        onDarkModeChange: function (oEvent) {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }
            var bState = oEvent.getParameter("state");
            oModel.setProperty("/settings/darkMode", bState);
            DashboardThemeHelper.apply(bState);
            MessageToast.show(bState ? "다크 모드를 켰습니다" : "다크 모드를 껐습니다");
        },

        onOpenDashboardSettings: function () {
            this.byId("settingsPopover").close();
        },

        onProfile: function () {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }

            oModel.setProperty("/user/editName", this._normalizeNameKey(oModel.getProperty("/user/name")));
            oModel.setProperty("/user/editModule", this._normalizeModuleKey(oModel.getProperty("/user/role")));
            this._syncProfileBlog(oModel.getProperty("/user/editName"));
            this._getProfileDialog().open();
            setTimeout(this._attachProfileQrHandler.bind(this), 0);
        },

        onProfileNameChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem") && oEvent.getParameter("selectedItem").getKey();

            if (sKey) {
                this._syncProfileBlog(sKey);
            }
        },

        _syncProfileBlog: function (sName) {
            var oModel = this.getView().getModel("dashboard");
            var oBlog = ProfileBlogConfig.getBlogByName(sName);

            if (!oModel || !oBlog) {
                return;
            }

            oModel.setProperty("/user/blogUrl", oBlog.url);
            oModel.setProperty("/user/blogQrSrc", oBlog.qrSrc);
        },

        onProfileQrPress: function () {
            var oModel = this.getView().getModel("dashboard");
            var sUrl = oModel && oModel.getProperty("/user/blogUrl");

            if (sUrl) {
                sap.m.URLHelper.redirect(sUrl, true);
            }
        },

        _attachProfileQrHandler: function () {
            var oQrImage = this.byId("profileBlogQr");

            if (!oQrImage || this._bProfileQrHandlerAttached) {
                return;
            }

            oQrImage.attachBrowserEvent("click", this.onProfileQrPress.bind(this));
            oQrImage.attachBrowserEvent("keydown", function (oEvent) {
                if (oEvent.key === "Enter" || oEvent.key === " ") {
                    oEvent.preventDefault();
                    this.onProfileQrPress();
                }
            }.bind(this));

            var oDom = oQrImage.getDomRef();
            if (oDom) {
                oDom.setAttribute("tabindex", "0");
                oDom.setAttribute("role", "link");
                oDom.setAttribute("aria-label", "블로그 QR 코드 — 스캔 또는 클릭");
            }

            this._bProfileQrHandlerAttached = true;
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
            this._syncProfileBlog(sName);
            this._getProfileDialog().close();
            MessageToast.show("프로필이 저장되었습니다");
        },

        _normalizeNameKey: function (sName) {
            var aNames = ["김용민", "신성진", "박찬영"];
            return aNames.indexOf(sName) >= 0 ? sName : "박찬영";
        },

        _normalizeModuleKey: function (sModule) {
            var sValue = (sModule || "").replace(/\//g, ".").trim().toUpperCase();
            var aModules = ["SD", "PP", "MM", "FI"];

            if (aModules.indexOf(sValue) >= 0) {
                return sValue;
            }
            if (/^FI(\.CO)?$/i.test(sValue) || /FI\.?CO/i.test(sValue)) {
                return "FI";
            }
            return "FI";
        },

        onProfileCancel: function () {
            this._getProfileDialog().close();
        },

        onProfileDialogAfterClose: function () {
            setTimeout(this._clearProfileFocus.bind(this), 0);
        },

        _clearProfileFocus: function () {
            var oProfileBtn = this.byId("profileMenuBtn");
            var oBtnDom = oProfileBtn && oProfileBtn.getDomRef();

            if (oBtnDom && oBtnDom.blur) {
                oBtnDom.blur();
            }

            var oDialogDom = this._getProfileDialog().getDomRef();
            if (oDialogDom) {
                oDialogDom.querySelectorAll(":focus").forEach(function (el) {
                    el.blur();
                });
            }
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
