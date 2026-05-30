/**
 * models.js
 *
 * 역할:
 * - device JSONModel 등 Component 공용 모델 factory.
 *
 * 대시보드 구조: Component.js에서 호출. dashboard 모델은 Main.controller.js가 별도 생성.
 *
 * 협업: 디바이스/공용 모델만 이 파일. dashboard 데이터는 Main.controller.js.
 */
sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], 
function (JSONModel, Device) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }
    };

});