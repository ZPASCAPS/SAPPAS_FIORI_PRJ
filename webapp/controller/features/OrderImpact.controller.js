/**
 * OrderImpact.controller.js
 *
 * 역할:
 * - Sales Overview 차트 영역의 UI 이벤트를 처리한다.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.OrderImpact", {

        onFilterPress: function () {
            MessageToast.show("필터 패널은 추후 연결 예정");
        }
    });
});
