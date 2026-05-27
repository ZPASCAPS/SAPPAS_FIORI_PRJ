/**
 * ModuleSideNav.controller.js
 *
 * 역할:
 * - 왼쪽 사이드바 모듈 네비게이션 UI와 선택 이벤트를 처리한다.
 *
 * 주요 기능:
 * - Dashboard / Materials 등 네비게이션 선택
 * - 선택 상태를 dashboard 모델 ui/navKey 에 반영
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.ModuleSideNav", {

        onInit: function () {
            var oModel = this.getView().getModel("dashboard");
            var sKey = (oModel && oModel.getProperty("/ui/navKey")) || "DASHBOARD";
            this._syncDashboardHeroState(sKey);
        },

        onNavSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var aCustom = oItem && oItem.getCustomData();
            var sKey = (aCustom && aCustom[0] && aCustom[0].getValue()) || "DASHBOARD";
            this._setNavKey(sKey);

            if (sKey === "MATERIALS") {
                MessageToast.show("SAP 자재 목록은 하단 Integrations 테이블을 확인하세요");
            }
        },

        onDashboardNav: function () {
            var oList = this.byId("mainNavList");
            if (oList) {
                oList.removeSelections(true);
            }
            this._setNavKey("DASHBOARD");
        },

        /**
         * navKey 변경 및 Dashboard 버튼 활성 스타일 동기화
         */
        _setNavKey: function (sKey) {
            var oModel = this.getView().getModel("dashboard");
            if (oModel) {
                oModel.setProperty("/ui/navKey", sKey);
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
        }
    });
});
