/**
 * SdControlTableSlot.controller.js — Step 2: 여신 · 납기 관제 테이블 (OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/BusyIndicator",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/ScrollContainer",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/m/Title",
    "sap/m/List",
    "sap/m/StandardListItem",
    "sap/m/IconTabBar",
    "sap/m/IconTabFilter",
    "sap/m/Text",
    "sap/m/FlexItemData",
    "com/capstone/dashboard/fioridashboard/service/SdControlDataService"
], function (
    Controller,
    JSONModel,
    BusyIndicator,
    Dialog,
    Button,
    ScrollContainer,
    VBox,
    HBox,
    Title,
    List,
    StandardListItem,
    IconTabBar,
    IconTabFilter,
    Text,
    FlexItemData,
    SdControlDataService
) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.sd.SdControlTableSlot", {

        onInit: function () {
            this._oViewModel = new JSONModel(SdControlDataService.getEmptyViewData());
            this.getView().setModel(this._oViewModel, "sdControl");
            // 납기 임박 보드/처리 가이드를 SdMain 하단에서도 바인딩할 수 있도록 컴포넌트로 공유
            this.getOwnerComponent().setModel(this._oViewModel, "sdControl");

            this._oDashboard = this.getOwnerComponent().getModel("dashboard");
            if (this._oDashboard) {
                this._fnDashboardChange = this._onDashboardPropertyChange.bind(this);
                this._oDashboard.attachPropertyChange(this._fnDashboardChange);
            }

            this._loadControlData();
        },

        onExit: function () {
            if (this._oDashboard && this._fnDashboardChange) {
                this._oDashboard.detachPropertyChange(this._fnDashboardChange);
            }
            if (this._oDetailDialog) {
                this._oDetailDialog.destroy();
                this._oDetailDialog = null;
            }
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();

            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._loadControlData();
            }
        },

        _loadControlData: function () {
            var oComponent = this.getOwnerComponent();
            var that = this;

            if (!oComponent || !oComponent.getModel("sdControlModel")) {
                this._oViewModel.setData(SdControlDataService.getEmptyViewData());
                this._oViewModel.setProperty("/loading", false);
                this._oViewModel.setProperty("/error", "sdControlModel이 연결되지 않았습니다.");
                return;
            }

            this._oViewModel.setProperty("/loading", true);
            this._oViewModel.setProperty("/error", "");
            BusyIndicator.show(0);

            SdControlDataService.load(oComponent)
                .then(function (oViewData) {
                    that._oViewModel.setData(oViewData);
                })
                .finally(function () {
                    BusyIndicator.hide();
                    that._oViewModel.setProperty("/loading", false);
                });
        },

        _buildProductTabContent: function (oProduct) {
            var oList = new List({
                width: "100%",
                class: "nxSdControlDetailOrderList"
            });
            var oScroll;
            var i;

            for (i = 0; i < (oProduct.orders || []).length; i++) {
                oList.addItem(new StandardListItem({
                    title: "오더 " + oProduct.orders[i].salesOrderDisplay,
                    description: oProduct.orders[i].descriptionDisplay,
                    info: oProduct.orders[i].problemSummary,
                    infoState: oProduct.orders[i].problemState || "None",
                    icon: "sap-icon://sales-order",
                    type: "Inactive"
                }));
            }

            oScroll = new ScrollContainer({
                vertical: true,
                horizontal: false,
                width: "100%",
                class: "nxSdControlDetailScroll",
                content: [oList]
            });

            oScroll.setLayoutData(new FlexItemData({
                growFactor: 1,
                shrinkFactor: 1,
                baseSize: "0px"
            }));

            return new VBox({
                width: "100%",
                height: "100%",
                renderType: "Bare",
                fitContainer: true,
                class: "nxSdControlDetailTabContent",
                items: [oScroll]
            });
        },

        _syncDetailScrollHeight: function () {
            var oDialog = this._oDetailDialog;
            var oRoot;
            var oSection;
            var oHeader;
            var oTabHead;
            var aScrollEls;
            var iHeight;
            var i;

            if (!oDialog || !oDialog.isOpen()) {
                return;
            }

            oRoot = oDialog.getDomRef();
            if (!oRoot) {
                return;
            }

            oSection = oRoot.querySelector(".sapMDialogSection");
            oHeader = oRoot.querySelector(".nxSdControlDetailHeaderRow");
            oTabHead = oRoot.querySelector(".nxSdControlDetailTabBar .sapMITBHead");
            aScrollEls = oRoot.querySelectorAll(".nxSdControlDetailScroll");

            if (!oSection || !aScrollEls.length) {
                return;
            }

            iHeight = oSection.clientHeight
                - (oHeader ? oHeader.offsetHeight : 0)
                - (oTabHead ? oTabHead.offsetHeight : 0)
                - 10;

            if (iHeight < 120) {
                return;
            }

            for (i = 0; i < aScrollEls.length; i++) {
                var oScrollCtrl = sap.ui.core.Element.getElementById(aScrollEls[i].id);

                if (oScrollCtrl) {
                    oScrollCtrl.setHeight(Math.floor(iHeight) + "px");
                }
            }
        },

        _openDetailDialog: function (oRow) {
            var that = this;
            var oDialog = this._oDetailDialog;
            var oIconTabBar;
            var oBody;
            var aProducts = oRow.productDetails || [];
            var i;

            if (!oDialog) {
                oDialog = new Dialog({
                    contentWidth: "38rem",
                    contentHeight: "34rem",
                    draggable: true,
                    resizable: true,
                    showHeader: false,
                    verticalScrolling: false,
                    class: "nxSdControlDetailDialog",
                    endButton: new Button({
                        text: "닫기",
                        press: function () {
                            oDialog.close();
                        }
                    })
                });
                oDialog.attachAfterOpen(function () {
                    setTimeout(function () {
                        that._syncDetailScrollHeight();
                    }, 0);
                });
                this._oDetailDialog = oDialog;
                this.getView().addDependent(oDialog);
            }

            oDialog.removeAllContent();

            oBody = new VBox({
                width: "100%",
                height: "100%",
                renderType: "Bare",
                fitContainer: true,
                class: "nxSdControlDetailBody",
                items: [
                    new HBox({
                        width: "100%",
                        alignItems: "Start",
                        justifyContent: "SpaceBetween",
                        class: "nxSdControlDetailHeaderRow",
                        items: [
                            new VBox({
                                class: "nxSdControlDetailHeader",
                                items: [
                                    new Title({
                                        text: oRow.customerName + " · 품목 상세",
                                        level: "H5",
                                        wrapping: true,
                                        class: "nxSdControlDetailTitle"
                                    }),
                                    new Text({
                                        text: oRow.holdReason + " · " + oRow.orderCountDisplay,
                                        class: "nxSdControlDetailMeta"
                                    })
                                ]
                            }),
                            new Button({
                                icon: "sap-icon://decline",
                                type: "Transparent",
                                tooltip: "닫기",
                                press: function () {
                                    oDialog.close();
                                }
                            })
                        ]
                    })
                ]
            });

            oIconTabBar = new IconTabBar({
                expandable: false,
                stretchContentHeight: true,
                applyContentPadding: false,
                backgroundDesign: "Solid",
                width: "100%",
                class: "nxSdControlDetailTabBar"
            });

            oIconTabBar.setLayoutData(new FlexItemData({
                growFactor: 1,
                shrinkFactor: 1,
                baseSize: "0px"
            }));
            oIconTabBar.attachSelect(function () {
                setTimeout(function () {
                    that._syncDetailScrollHeight();
                }, 0);
            });

            for (i = 0; i < aProducts.length; i++) {
                oIconTabBar.addItem(new IconTabFilter({
                    text: aProducts[i].productName,
                    key: aProducts[i].productName,
                    content: [this._buildProductTabContent(aProducts[i])]
                }));
            }

            if (aProducts.length > 0) {
                oIconTabBar.setSelectedKey(aProducts[0].productName);
            }

            oBody.addItem(oIconTabBar);
            oDialog.addContent(oBody);
            oDialog.open();

            setTimeout(this._syncDetailScrollHeight.bind(this), 0);
        },

        onProductDetailPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("sdControl");
            var oRow = oCtx && oCtx.getObject();

            if (!oRow || !oRow.hasMultipleProducts) {
                return;
            }

            this._openDetailDialog(oRow);
        }
    });
});
