/**
 * DashboardToolbar.controller.js
 *
 * 역할:
 * - 대시보드 제목 영역의 기간 선택, 필터, 내보내기, 자재 추가 버튼을 처리한다.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardToolbar", {

        onPeriodChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            this.getView().getModel("dashboard").setProperty("/ui/period", sKey);
        },

        onExport: function () {
            MessageToast.show("SAP 데이터보내기 준비 중");
        },

        onFilterPress: function () {
            MessageToast.show("필터 패널은 추후 연결 예정");
        },

        onAddMaterial: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "openMaterialCreate");
        }
    });
});
