/**
 * OrderInquiry.controller.js  (A공간 — 오더 조회)
 *
 * OData:
 * - trackerModel       → /Z_C_E2E_OrderTracker (E2E 전표 추적, flowModel 연동)
 * - orderSummaryModel  → /Z_C_OrderSummary_SJ (판매오더 요약 — 고객·금액·생성일)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "com/capstone/dashboard/fioridashboard/util/E2EProgressHelper"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox, BusyIndicator, E2EProgressHelper) {
    "use strict";

    var FLOW_STEPS = [
        { key: "SalesOrder", title: "Sales Order" },
        { key: "PlannedOrder", title: "Planned Order" },
        { key: "PurchaseReq", title: "Purchase Requisition" },
        { key: "PurchaseOrder", title: "Purchase Order" },
        { key: "POMigo", title: "Goods Receipt (MIGO)" },
        { key: "ProductionOrder", title: "Production Order" },
        { key: "ProdMigo", title: "Goods Receipt (MIGO)" },
        { key: "Delivery", title: "Outbound Delivery" },
        { key: "Billing", title: "Billing" },
        { key: "FI", title: "Accounting Document" },
        { key: "Clearing", title: "Payment Posting" }
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.OrderInquiry", {

        onSearchOrder: function () {
            var oInput = this.byId("salesOrderInput");
            if (!oInput) {
                MessageBox.error("검색 필드를 찾을 수 없습니다.");
                return;
            }

            var sOrderNum = (oInput.getValue() || "").trim();
            if (!sOrderNum) {
                MessageToast.show("조회할 판매오더 번호를 입력해 주세요.");
                return;
            }

            var sPaddedOrder = sOrderNum.padStart(10, "0");
            var oComponent = this.getOwnerComponent();
            var oTrackerModel = oComponent.getModel("trackerModel");
            var oSummaryModel = oComponent.getModel("orderSummaryModel");
            var oFlowModel = oComponent.getModel("flowModel");
            var oDashboardModel = oComponent.getModel("dashboard");

            if (!oTrackerModel || !oFlowModel || !oDashboardModel) {
                MessageBox.error("시스템 모델을 불러오지 못했습니다.");
                return;
            }

            BusyIndicator.show(0);

            var aFilters = [new Filter("SalesOrder", FilterOperator.EQ, sPaddedOrder)];
            var that = this;

            oTrackerModel.read("/Z_C_E2E_OrderTracker", {
                filters: aFilters,
                success: function (oData) {
                    var aResults = oData.results || [];
                    if (!aResults.length) {
                        BusyIndicator.hide();
                        E2EProgressHelper.resetFlow(oFlowModel, oDashboardModel);
                        sap.ui.getCore().getEventBus().publish("dashboard", "e2eProgressUpdated", {
                            progressStep: 0
                        });
                        MessageBox.warning("판매오더 " + sOrderNum + "에 대한 추적 데이터가 없습니다.");
                        return;
                    }

                    var oFlowData = that._buildFlowData(aResults);
                    oFlowModel.setData(oFlowData);

                    if (oSummaryModel) {
                        oSummaryModel.read("/Z_C_OrderSummary_SJ", {
                            filters: aFilters,
                            success: function (oSummaryData) {
                                BusyIndicator.hide();
                                var aSummaryRows = that._sortSummaryRows(oSummaryData.results || []);
                                that._applyOrderInquiryPanel(
                                    oDashboardModel,
                                    sOrderNum,
                                    oFlowData,
                                    aResults[0],
                                    aSummaryRows
                                );
                                MessageToast.show("판매오더 " + sOrderNum + " 조회가 완료되었습니다.");
                            },
                            error: function () {
                                BusyIndicator.hide();
                                that._applyOrderInquiryPanel(
                                    oDashboardModel,
                                    sOrderNum,
                                    oFlowData,
                                    aResults[0],
                                    []
                                );
                                MessageToast.show("요약 CDS 없이 추적 데이터만 표시합니다.");
                            }
                        });
                    } else {
                        BusyIndicator.hide();
                        that._applyOrderInquiryPanel(
                            oDashboardModel,
                            sOrderNum,
                            oFlowData,
                            aResults[0],
                            []
                        );
                        MessageToast.show("판매오더 " + sOrderNum + " 흐름이 동기화되었습니다.");
                    }
                },
                error: function () {
                    BusyIndicator.hide();
                    MessageBox.error("SAP 시스템에서 추적 데이터를 불러오는 중 오류가 발생했습니다.");
                }
            });
        },

        _sortSummaryRows: function (aRows) {
            return aRows.slice().sort(function (oA, oB) {
                var sA = String(oA.ItemNumber || "");
                var sB = String(oB.ItemNumber || "");
                return sA.localeCompare(sB, undefined, { numeric: true });
            });
        },

        _buildProductDisplay: function (sBase, iExtraCount) {
            var sValue = (sBase || "-").trim();
            if (!sValue || sValue === "-") {
                return "-";
            }
            if (iExtraCount > 0) {
                return sValue + " 외 " + iExtraCount + "건";
            }
            return sValue;
        },

        _buildFlowData: function (aResults) {
            var aPRs = [];
            var oMerged = {};

            aResults.forEach(function (item) {
                if (item.PurchaseRequisition && aPRs.indexOf(item.PurchaseRequisition) < 0) {
                    aPRs.push(item.PurchaseRequisition);
                }
                this._mergeFlowField(oMerged, "SalesOrder", item.SalesOrder);
                this._mergeFlowField(oMerged, "PlannedOrder", item.PlannedOrder);
                this._mergeFlowField(oMerged, "PurchaseOrder", item.PurchaseOrder);
                this._mergeFlowField(oMerged, "POMigo", item.POMigoDoc);
                this._mergeFlowField(oMerged, "ProductionOrder", item.ProductionOrder);
                this._mergeFlowField(oMerged, "ProdMigo", item.ProdMigoDoc);
                this._mergeFlowField(oMerged, "Delivery", item.OutboundDelivery);
                this._mergeFlowField(oMerged, "Billing", item.BillingDocument);
                this._mergeFlowField(oMerged, "FI", item.FIDocument);
                this._mergeFlowField(oMerged, "Clearing", item.ClearingDocument);
            }, this);

            return {
                SalesOrder: oMerged.SalesOrder || "없음",
                PlannedOrder: oMerged.PlannedOrder || "없음",
                PurchaseReq: aPRs.length ? aPRs.join(", ") : "없음",
                PurchaseOrder: oMerged.PurchaseOrder || "없음",
                POMigo: oMerged.POMigo || "없음",
                ProductionOrder: oMerged.ProductionOrder || "없음",
                ProdMigo: oMerged.ProdMigo || "없음",
                Delivery: oMerged.Delivery || "없음",
                Billing: oMerged.Billing || "없음",
                FI: oMerged.FI || "없음",
                Clearing: oMerged.Clearing || "없음"
            };
        },

        _mergeFlowField: function (oMerged, sKey, vValue) {
            if (!oMerged[sKey] && vValue) {
                oMerged[sKey] = vValue;
            }
        },

        _applyOrderInquiryPanel: function (oDashboardModel, sOrderNum, oFlowData, oTrackerRow, aSummaryRows) {
            var iStage = this._resolveCurrentStep(oFlowData);
            var sStageTitle = FLOW_STEPS[iStage.currentIndex].title;
            var iTotal = FLOW_STEPS.length;
            var iProgressStep = iStage.inProgress ? iStage.currentIndex + 1 : iStage.completedCount;
            if (iStage.completedCount >= iTotal) {
                iProgressStep = iTotal;
            }

            var oPrimary = aSummaryRows.length ? aSummaryRows[0] : null;
            var iExtraCount = aSummaryRows.length > 0 ? aSummaryRows.length - 1 : 0;

            var sProductCode = oPrimary
                ? this._buildProductDisplay(oPrimary.Material, iExtraCount)
                : (oTrackerRow.Material || "-");
            var sProductName = oPrimary
                ? this._buildProductDisplay(oPrimary.MaterialName, iExtraCount)
                : (oTrackerRow.MaterialName || oTrackerRow.MaterialText || oTrackerRow.ProductName || "-");

            var iProgressPercent = Math.round((iProgressStep / iTotal) * 100);

            oDashboardModel.setProperty("/spaces/orderInquiry", {
                visible: true,
                orderNumber: sOrderNum,
                currentStep: iProgressStep,
                totalSteps: iTotal,
                stageText: sStageTitle,
                stageLabel: iProgressStep + " / " + iTotal + " · " + sStageTitle,
                progressPercent: iProgressPercent,
                estimatedDays: oPrimary && oPrimary.EstimatedDays !== undefined && oPrimary.EstimatedDays !== null
                    ? oPrimary.EstimatedDays + "일 (예상)"
                    : "-",
                customer: oPrimary
                    ? (oPrimary.CustomerName || oPrimary.Customer || "-")
                    : "-",
                productCode: sProductCode,
                productName: sProductName,
                quantity: String(
                    (oPrimary && oPrimary.OrderQuantity)
                    || oTrackerRow.OrderQuantity
                    || oTrackerRow.Quantity
                    || "-"
                ),
                quantityUnit: (oPrimary && (oPrimary.OrderUnit || oPrimary.OrderQuantityUnit))
                    || oTrackerRow.QuantityUnit
                    || "EA",
                amountDisplay: this._formatAmount(
                    oPrimary && oPrimary.TotalAmount,
                    oPrimary && oPrimary.Currency
                ),
                creationDate: this._formatDate(oPrimary && oPrimary.CreationDate)
            });

            E2EProgressHelper.applyProgress(oDashboardModel, iProgressStep);
            E2EProgressHelper.updateProcessGauge(
                oDashboardModel,
                sOrderNum,
                iProgressStep,
                iTotal,
                sStageTitle,
                iProgressPercent
            );
            sap.ui.getCore().getEventBus().publish("dashboard", "e2eProgressUpdated", {
                progressStep: iProgressStep
            });
            this._syncProgressBar(iProgressPercent);
        },

        _syncProgressBar: function (iPercent) {
            var that = this;
            var fnApply = function () {
                var oFill = that.byId("orderProgressFill");
                if (!oFill) {
                    return;
                }
                if (oFill.setWidth) {
                    oFill.setWidth(iPercent + "%");
                }
                var oDom = oFill.getDomRef && oFill.getDomRef();
                if (oDom) {
                    oDom.style.width = iPercent + "%";
                }
            };

            fnApply();
            setTimeout(fnApply, 0);
            setTimeout(fnApply, 150);
        },

        _resolveCurrentStep: function (oFlowData) {
            var iCompleted = 0;
            var i;

            for (i = 0; i < FLOW_STEPS.length; i++) {
                if (this._isStepReady(oFlowData, FLOW_STEPS[i].key)) {
                    iCompleted = i + 1;
                } else {
                    break;
                }
            }

            return {
                completedCount: iCompleted,
                currentIndex: iCompleted >= FLOW_STEPS.length ? FLOW_STEPS.length - 1 : iCompleted,
                inProgress: iCompleted < FLOW_STEPS.length
            };
        },

        _isStepReady: function (oFlowData, sKey) {
            if (sKey === "PlannedOrder" && this._isDocReady(oFlowData.ProductionOrder)) {
                return true;
            }
            return this._isDocReady(oFlowData[sKey]);
        },

        _isDocReady: function (vValue) {
            return vValue && vValue !== "없음" && vValue !== "대기중..." && vValue !== "대기중";
        },

        _formatDate: function (vDate) {
            if (!vDate) {
                return "-";
            }
            var oDate = vDate instanceof Date ? vDate : new Date(vDate);
            if (isNaN(oDate.getTime())) {
                return String(vDate);
            }
            return oDate.getFullYear() + "."
                + String(oDate.getMonth() + 1).padStart(2, "0") + "."
                + String(oDate.getDate()).padStart(2, "0");
        },

        _formatAmount: function (vAmount, sCurrency) {
            if (vAmount === undefined || vAmount === null || vAmount === "") {
                return "-";
            }
            var nAmount = Number(vAmount);
            if (isNaN(nAmount)) {
                return String(vAmount) + (sCurrency ? " " + sCurrency : "");
            }
            if (sCurrency === "KRW" || sCurrency === "WON") {
                return "₩ " + nAmount.toLocaleString("ko-KR");
            }
            return nAmount.toLocaleString("ko-KR") + (sCurrency ? " " + sCurrency : "");
        }
    });
});
