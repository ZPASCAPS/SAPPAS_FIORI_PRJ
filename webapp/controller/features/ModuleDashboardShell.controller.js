/**
 * ModuleDashboardShell.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.ModuleDashboardShell
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.ModuleDashboardShell
 *
 * 역할:
 * - SD/MM/PP/FI 모듈 상단 CareOps UI 이벤트 처리.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "com/capstone/dashboard/fioridashboard/util/ModuleViewConfig"
], function (Controller, MessageToast, ModuleViewConfig) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.ModuleDashboardShell", {

        onInit: function () {
            var oModel = this.getView().getModel("dashboard");

            if (oModel) {
                ModuleViewConfig.syncModuleView(oModel, oModel.getProperty("/ui/navKey"));
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
        },

        onPeriodChange: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem") && oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getView().getModel("dashboard");

            if (oModel && sKey) {
                oModel.setProperty("/moduleView/period", sKey);
            }
        },

        onExport: function () {
            MessageToast.show("내보내기 기능은 추후 연결 예정입니다");
        },

        onModuleSettings: function () {
            MessageToast.show("모듈 설정은 추후 연결 예정입니다");
        }
    });
});
