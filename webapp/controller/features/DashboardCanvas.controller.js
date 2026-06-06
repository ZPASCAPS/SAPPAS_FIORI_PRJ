/**
 * DashboardCanvas.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.DashboardCanvas
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas
 *
 * 역할:
 * - 중앙 콘텐츠 영역. navKey별 View 전환.
 * - navKey=DASHBOARD: A/B 분할
 * - navKey=MM_MATERIALS: MmCockpit 지연 로드 (앱 초기화 실패 방지)
 * - 그 외: SectionPlaceholder
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/mvc/XMLView"
], function (Controller, XMLView) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardCanvas", {

        onInit: function () {
            var oModel = this.getView().getModel("dashboard");

            if (oModel) {
                this._fnNavKeyHandler = this._onNavKeyChanged.bind(this);
                oModel.attachPropertyChange(this._fnNavKeyHandler);
                this._syncMmCockpitView(oModel.getProperty("/ui/navKey"));
            }
        },

        onExit: function () {
            var oModel = this.getView().getModel("dashboard");

            if (oModel && this._fnNavKeyHandler) {
                oModel.detachPropertyChange(this._fnNavKeyHandler);
            }
            this._destroyMmCockpitView();
        },

        /**
         * dashboard/ui/navKey 변경 시 MM 콕핏 View 생성/제거
         */
        _onNavKeyChanged: function (oEvent) {
            if (oEvent.getParameter("path") === "/ui/navKey") {
                this._syncMmCockpitView(oEvent.getSource().getProperty("/ui/navKey"));
            }
        },

        _syncMmCockpitView: function (sNavKey) {
            if (sNavKey === "MM_MATERIALS") {
                this._createMmCockpitView();
            } else {
                this._destroyMmCockpitView();
            }
        },

        /**
         * MM Materials 탭 진입 시에만 MmCockpit Nested View 로드
         */
        _createMmCockpitView: function () {
            if (this._oMmCockpitView) {
                return;
            }

            var oHost = this.byId("mmCockpitHost");
            if (!oHost) {
                return;
            }

            this._oMmCockpitView = new XMLView({
                viewName: "com.capstone.dashboard.fioridashboard.view.features.MmCockpit",
                async: true
            });
            oHost.addItem(this._oMmCockpitView);
        },

        _destroyMmCockpitView: function () {
            if (this._oMmCockpitView) {
                this._oMmCockpitView.destroy();
                this._oMmCockpitView = null;
            }
        }
    });
});
