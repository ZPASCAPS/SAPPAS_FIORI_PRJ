/**
 * SdKpiTilesSlot.controller.js — SD Overview KPI Tiles (Step 1, OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Table",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "sap/m/ObjectStatus",
    "com/capstone/dashboard/fioridashboard/service/SdKpiDataService"
], function (Controller, JSONModel, BusyIndicator, Dialog, Button, Table, Column, ColumnListItem, Text, ObjectStatus, SdKpiDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.sd.SdKpiTilesSlot", {

        onInit: function () {
            this._oViewModel = new JSONModel(SdKpiDataService.getEmptyViewData());
            this.getView().setModel(this._oViewModel, "sdKpi");

            this._oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (this._oDashboard) {
                this._fnDashboardChange = this._onDashboardPropertyChange.bind(this);
                this._oDashboard.attachPropertyChange(this._fnDashboardChange);
            }

            var oCreditCard = this.byId("sdCreditExceedCard");
            if (oCreditCard) {
                oCreditCard.attachBrowserEvent("click", this.onCreditExceedPress, this);
            }

            this._loadKpiData();
        },

        onExit: function () {
            if (this._oDashboard && this._fnDashboardChange) {
                this._oDashboard.detachPropertyChange(this._fnDashboardChange);
            }
            if (this._oCreditDialog) {
                this._oCreditDialog.destroy();
                this._oCreditDialog = null;
            }
        },

        /* ============ 여신 초과 블로킹 오더 모달 ============ */

        onCreditExceedPress: function () {
            this._getCreditBlockDialog().open();
        },

        _getCreditBlockDialog: function () {
            if (this._oCreditDialog) {
                return this._oCreditDialog;
            }

            var that = this;
            var oTable = new Table({
                width: "100%",
                fixedLayout: false,
                noDataText: "블로킹된 오더가 없습니다.",
                columns: [
                    new Column({ header: new Text({ text: "오더 번호" }) }),
                    new Column({ header: new Text({ text: "고객사" }) }),
                    new Column({ header: new Text({ text: "제품명" }) }),
                    new Column({ hAlign: "End", header: new Text({ text: "금액" }) }),
                    new Column({ header: new Text({ text: "보류 사유" }) }),
                    new Column({ hAlign: "Center", header: new Text({ text: "상태" }) })
                ]
            });
            oTable.addStyleClass("nxSdControlTable nxSdDashTable nxSdCreditBlockTable");

            oTable.bindItems({
                path: "sdControl>/creditBlockOrders",
                factory: function (sId) {
                    return new ColumnListItem(sId, {
                        cells: [
                            new Text({ text: "{sdControl>orderNoDisplay}", wrapping: false }),
                            new Text({ text: "{sdControl>customerName}", wrapping: false }),
                            new Text({ text: "{sdControl>productName}", wrapping: false }),
                            new Text({ text: "{sdControl>amountDisplay}", textAlign: "End", wrapping: false }),
                            new Text({ text: "{sdControl>holdReason}", wrapping: false }),
                            new ObjectStatus({
                                text: "{sdControl>statusText}",
                                state: "{sdControl>statusState}",
                                icon: "{sdControl>statusIcon}"
                            }).addStyleClass("nxSdControlStatus")
                        ]
                    });
                }
            });

            this._oCreditDialog = new Dialog({
                title: "여신 초과 블로킹 오더",
                contentWidth: "46rem",
                contentHeight: "26rem",
                draggable: true,
                resizable: true,
                verticalScrolling: true,
                content: [oTable],
                endButton: new Button({
                    text: "닫기",
                    press: function () {
                        that._oCreditDialog.close();
                    }
                })
            });
            this._oCreditDialog.addStyleClass("nxSdCreditBlockDialog");
            this.getView().addDependent(this._oCreditDialog);

            return this._oCreditDialog;
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/moduleView/period" || sPath === "/ui/navKey") {
                this._loadKpiData();
            }
        },

        _getPeriodKey: function () {
            if (!this._oDashboard) {
                return "THIS_WEEK";
            }
            return this._oDashboard.getProperty("/moduleView/period") || "THIS_WEEK";
        },

        _loadKpiData: function () {
            var oComponent = this.getOwnerComponent();
            var sPeriodKey = this._getPeriodKey();
            var that = this;

            if (!oComponent || !oComponent.getModel("sdKpiModel")) {
                this._oViewModel.setData(SdKpiDataService.getEmptyViewData());
                this._oViewModel.setProperty("/loading", false);
                this._oViewModel.setProperty("/error", "sdKpiModel이 연결되지 않았습니다.");
                return;
            }

            this._oViewModel.setProperty("/loading", true);
            BusyIndicator.show(0);

            // 반품 접수율 = ReturnAcceptanceRate (RE오더 ÷ 표준오더, 제품계층 00003) 백엔드 값 그대로 사용
            SdKpiDataService.load(oComponent, sPeriodKey)
                .then(function (oTiles) {
                    that._oViewModel.setData(oTiles);
                })
                .finally(function () {
                    BusyIndicator.hide();
                    that._oViewModel.setProperty("/loading", false);
                });
        }
    });
});
