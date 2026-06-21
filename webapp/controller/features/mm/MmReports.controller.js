/**
 * MmReports.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.mm.MmReports
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.mm.MmReports
 *
 * 역할:
 * - MM Reports SAP BomStock 실데이터 차트 화면
 * - 새로고침 시 Main.controller EventBus refreshData 발행
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.mm.MmReports", {

        onRefreshPress: function () {
            sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
        }
    });
});
