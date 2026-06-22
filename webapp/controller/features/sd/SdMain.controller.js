/**
 * SdMain.controller.js — SD Overview 메인 컨테이너 (Step 0)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/ResponsivePopover",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Text",
    "sap/ui/core/CustomData"
], function (Controller, ResponsivePopover, VBox, HBox, Text, CustomData) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.sd.SdMain", {

        onInit: function () {
            var oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (!oDashboard) {
                return;
            }

            if (!oDashboard.getProperty("/sdMain")) {
                oDashboard.setProperty("/sdMain", {
                    ready: true,
                    lastUpdated: this._formatNow(),
                    showStepsBelow: true
                });
            }
        },

        /* ============ 납기 보드 "+N개 더보기" 팝오버 ============ */

        // 버킷의 전체 항목을 동일한 칩 스타일로 보여주는 팝오버
        onDeadlineMore: function (oEvent) {
            var oSource = oEvent.getSource();
            var oCtx = oSource.getBindingContext("sdControl");
            if (!oCtx) {
                return;
            }

            var oPop = this._getDeadlineMorePopover();
            oPop.setBindingContext(oCtx, "sdControl");
            oPop.setTitle((oCtx.getProperty("label") || "") + " · 전체 " + (oCtx.getProperty("count") || 0) + "건");
            oPop.bindAggregation("content", {
                path: "sdControl>items",
                factory: this._deadlineChipFactory.bind(this)
            });
            oPop.openBy(oSource);
        },

        _getDeadlineMorePopover: function () {
            if (!this._oDlMorePopover) {
                this._oDlMorePopover = new ResponsivePopover({
                    placement: "Vertical",
                    contentWidth: "21rem",
                    showHeader: true,
                    title: "전체"
                });
                this._oDlMorePopover.addStyleClass("nxSdDlMorePopover sapUiContentPadding");
                this.getView().addDependent(this._oDlMorePopover);
            }
            return this._oDlMorePopover;
        },

        _deadlineChipFactory: function (sId, oCtx) {
            var oChip = new VBox(sId, { renderType: "Bare" });
            oChip.addStyleClass("nxSdDlChip nxSdDlChip--pop nxSdControlDeadlineItem");
            oChip.addCustomData(new CustomData({
                key: "urgency",
                value: oCtx.getProperty("urgency"),
                writeToDom: true
            }));

            oChip.addItem(new HBox({
                width: "100%",
                alignItems: "Center",
                justifyContent: "SpaceBetween",
                renderType: "Bare",
                items: [
                    new Text({ text: "{sdControl>ddayText}" }).addStyleClass("nxSdControlDeadlineDday"),
                    new Text({ text: "{sdControl>amountDisplay}", wrapping: false }).addStyleClass("nxSdDlChipAmt")
                ]
            }));
            oChip.addItem(new Text({ text: "{sdControl>customerName}", wrapping: false }).addStyleClass("nxSdDlChipCust"));
            oChip.addItem(new Text({
                text: "{= '오더 ' + ${sdControl>salesOrderDisplay} + ' · ' + ${sdControl>dateDisplay} }",
                wrapping: false
            }).addStyleClass("nxSdDlChipMeta"));

            return oChip;
        },

        _formatNow: function () {
            var oNow = new Date();
            return oNow.getFullYear() + "."
                + String(oNow.getMonth() + 1).padStart(2, "0") + "."
                + String(oNow.getDate()).padStart(2, "0") + " "
                + String(oNow.getHours()).padStart(2, "0") + ":"
                + String(oNow.getMinutes()).padStart(2, "0");
        }
    });
});
