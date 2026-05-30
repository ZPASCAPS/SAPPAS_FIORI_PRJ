/**
 * DashboardHeader.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardHeader
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader
 *
 * 역할:
 * - 상단 헤더: 전역 검색, 알림, 프로필, 프로필 설정 Dialog(이름·모듈 Select).
 *
 * 대시보드 구조: DashboardMain → DashboardHeader (최상단)
 *
 * 협업:
 * - 검색·프로필 Dialog → 이 Controller + DashboardHeader.view.xml
 * - profileOptions 목록 → Main.controller.js (_initModels)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService"
], function (Controller, MessageToast, DashboardDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader", {

        onExit: function () {
            this._oProfileDialog = null;
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
            var sQuery = oEvent.getParameter("query")
                || oEvent.getParameter("newValue")
                || oEvent.getSource().getValue()
                || "";
            this._applySearch(sQuery);
        },

        onMenuPress: function () {
            MessageToast.show("메뉴는 추후 연결 예정입니다");
        },

        onNotifications: function () {
            MessageToast.show("알림함은 추후 연결 예정입니다");
        },

        onHelp: function () {
            MessageToast.show("도움말은 추후 연결 예정입니다");
        },

        /**
         * 프로필 설정 Dialog를 연다.
         */
        onProfile: function () {
            var oModel = this.getView().getModel("dashboard");
            if (!oModel) {
                return;
            }

            oModel.setProperty("/user/editName", this._normalizeNameKey(oModel.getProperty("/user/name")));
            oModel.setProperty("/user/editModule", this._normalizeModuleKey(oModel.getProperty("/user/role")));
            this._getProfileDialog().open();
        },

        /**
         * Dialog 선택값을 프로필에 즉시 반영한다.
         */
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
