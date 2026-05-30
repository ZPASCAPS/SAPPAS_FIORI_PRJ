/**
 * MaterialShortage.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.MaterialShortage
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.MaterialShortage
 *
 * 역할:
 * - Material Integrations 테이블. See All 클릭 등 UI 이벤트.
 *
 * 대시보드 구조: (예비) MM Materials / Worklist 탭 — 현재 미사용
 *
 * 협업: UI → MaterialShortage.view.xml / 데이터 → dashboard/integrations
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService"
], function (Controller, MessageToast, DashboardDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.MaterialShortage", {

        onSeeAllIntegrations: function () {
            var oModel = this.getView().getModel("dashboard");
            var iCount = DashboardDataService.getItemCount(oModel);
            MessageToast.show("전체 SAP 자재 " + iCount + "건");
        }
    });
});
