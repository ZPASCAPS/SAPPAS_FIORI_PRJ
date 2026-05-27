/**
 * MaterialShortage.controller.js
 *
 * 역할:
 * - SAP Material Integrations 테이블과 재고 상태 요약 스트립 이벤트를 처리한다.
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
