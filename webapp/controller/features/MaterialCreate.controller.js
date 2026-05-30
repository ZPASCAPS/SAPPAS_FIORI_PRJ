/**
 * MaterialCreate.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.MaterialCreate
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.MaterialCreate
 *
 * 역할:
 * - SAP OData 자재 등록 Dialog. EventBus 수신, create 호출, refreshData 발행.
 *
 * 대시보드 구조: DashboardMain → MaterialCreate (Dialog 오버레이)
 *
 * 협업:
 * - 폼 UI → MaterialCreate.view.xml / OData 저장 → 이 Controller
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil"
], function (Controller, MessageToast, MessageBox, SapErrorUtil) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.MaterialCreate", {

        onInit: function () {
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("dashboard", "openMaterialCreate", this._onOpenRequest, this);
        },

        onExit: function () {
            if (this._oEventBus) {
                this._oEventBus.unsubscribe("dashboard", "openMaterialCreate", this._onOpenRequest, this);
            }
        },

        _onOpenRequest: function () {
            this._openDialog();
        },

        _emptyCreatePayload: function () {
            return {
                Component: "",
                ComponentText: "",
                ParentMatnr: "UP-F-PNT-001",
                BomQty: "1",
                OrderQty: "1",
                Remark: ""
            };
        },

        _openDialog: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            if (!oODataModel) {
                MessageBox.error("SAP OData 모델이 없습니다.");
                return;
            }

            var oCreateModel = this.getView().getModel("create");
            if (oCreateModel) {
                oCreateModel.setData(this._emptyCreatePayload());
            }
            this.byId("materialCreateDialog").open();
        },

        onCancelMaterialCreate: function () {
            this.byId("materialCreateDialog").close();
        },

        onSaveMaterial: function () {
            var oCreateModel = this.getView().getModel("create");
            var oData = oCreateModel.getData();
            var oODataModel = this.getOwnerComponent().getModel();
            var oDashboardModel = this.getView().getModel("dashboard");
            var sCreateEntityPath = oDashboardModel.getProperty("/ui/createEntityPath") || "/MaterialSet";

            if (!oData.Component || !oData.ComponentText || !oData.ParentMatnr) {
                MessageBox.warning("자재코드, 자재명, 완제품은 필수입니다.");
                return;
            }

            var oPayload = {
                Component: oData.Component.trim(),
                ComponentText: oData.ComponentText.trim(),
                ParentMatnr: oData.ParentMatnr.trim(),
                BomQty: String(oData.BomQty || "1"),
                OrderQty: String(oData.OrderQty || "1"),
                Remark: (oData.Remark || "").trim()
            };

            var oDialog = this.byId("materialCreateDialog");
            oDialog.setBusy(true);

            oODataModel.create(sCreateEntityPath, oPayload, {
                success: function () {
                    oDialog.setBusy(false);
                    oDialog.close();
                    MessageToast.show("SAP에 자재가 등록되었습니다");
                    sap.ui.getCore().getEventBus().publish("dashboard", "refreshData");
                },
                error: function (oError) {
                    oDialog.setBusy(false);
                    MessageBox.error(SapErrorUtil.extractMessage(oError, "SAP 자재 등록에 실패했습니다."));
                }
            });
        }
    });
});
