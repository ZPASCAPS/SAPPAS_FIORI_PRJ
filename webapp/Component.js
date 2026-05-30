/**
 * Component.js
 *
 * 역할:
 * - UI5 앱 Component. manifest RootView 로드, OData·device 모델 초기화.
 *
 * 대시보드 구조: Component → App.view.xml → Main.view.xml
 *
 * 협업:
 * - manifest.json, OData 모델 → init() / dashboard JSONModel → Main.controller.js
 */
sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/capstone/dashboard/fioridashboard/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.capstone.dashboard.fioridashboard.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});