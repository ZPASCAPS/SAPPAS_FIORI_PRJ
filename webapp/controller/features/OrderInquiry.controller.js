/**
 * OrderInquiry.controller.js  (A공간 — 문서 조회)
 *
 * OData:
 * - trackerModel       → Z_C_E2E_OrderTracker (E2E flowModel)
 * - orderSummaryModel  → Z_C_OrderSummary_SJ (SO만, 호환)
 * - sd/mm/pp/fiSummaryModel → 그룹별 DocSummary CDS
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "com/capstone/dashboard/fioridashboard/util/E2EProgressHelper",
    "com/capstone/dashboard/fioridashboard/model/formatter"
], function (Controller, Filter, FilterOperator, MessageToast, MessageBox, BusyIndicator, E2EProgressHelper, formatter) {
    "use strict";

    var DOC_CONFIG = {
        SO:           { filterField: "SalesOrder",          pad: 10, group: "SD", label: "판매오더" },
        PlannedOrder: { filterField: "PlannedOrder",        pad: 10, group: "PP", label: "계획오더" },
        PR:           { filterField: "PurchaseRequisition", pad: 10, group: "MM", label: "구매요청" },
        PO:           { filterField: "PurchaseOrder",       pad: 10, group: "MM", label: "구매오더" },
        POMigo:       { filterField: "POMigoDoc",           pad: 10, group: "MM", label: "원자재입고" },
        Production:   { filterField: "ProductionOrder",     pad: 10, group: "PP", label: "생산오더" },
        ProdMigo:     { filterField: "ProdMigoDoc",         pad: 10, group: "MM", label: "완제품입고" },
        DN:           { filterField: "OutboundDelivery",    pad: 10, group: "SD", label: "출하" },
        BL:           { filterField: "BillingDocument",     pad: 10, group: "SD", label: "청구" },
        FI:           { filterField: "FIDocument",          pad: 10, group: "FI", label: "회계전표" },
        Clearing:     { filterField: "ClearingDocument",    pad: 10, group: "FI", label: "입금전기" }
    };

    var GROUP_SUMMARY = {
        SD: { model: "sdSummaryModel", entitySet: "/Z_C_SD_DocSummary_SJ" },
        MM: { model: "mmSummaryModel", entitySet: "/Z_C_MM_DocSummary_SJ" },
        PP: { model: "ppSummaryModel", entitySet: "/Z_C_PP_DocSummary_SJ" },
        FI: { model: "fiSummaryModel", entitySet: "/Z_C_FI_DocSummary_SJ" }
    };

    var FLOW_STEPS = [
        { key: "SalesOrder", title: "Sales Order" },
        { key: "PlannedOrder", title: "Planned Order" },
        { key: "PurchaseReq", title: "Purchase Requisition" },
        { key: "PurchaseOrder", title: "Purchase Order" },
        { key: "POMigo", title: "Goods Receipt (MIGO)" },
        { key: "ProductionOrder", title: "Production Order" },
        { key: "ProdMigo", title: "Goods Receipt (MIGO)" },
        { key: "Delivery", title: "Outbound Delivery" },
        { key: "Picking", title: "Picking" },
        { key: "Billing", title: "Billing" },
        { key: "FI", title: "Accounting Document" },
        { key: "Clearing", title: "Payment Posting" }
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.OrderInquiry", {

        formatter: formatter,

        onInit: function () {
            this._updateSearchPlaceholder("SO");
        },

        onDocTypeChange: function () {
            var oSelect = this.byId("docTypeSelect");
            if (!oSelect) {
                return;
            }
            this._updateSearchPlaceholder(oSelect.getSelectedKey());
        },

        _updateSearchPlaceholder: function (sDocType) {
            var oInput = this.byId("docNumberInput");
            var oCfg = DOC_CONFIG[sDocType];
            if (oInput && oCfg) {
                oInput.setPlaceholder(oCfg.label + " 번호 검색");
            }
        },

        _getDocConfig: function () {
            var oSelect = this.byId("docTypeSelect");
            var sDocType = oSelect ? oSelect.getSelectedKey() : "SO";
            return {
                docType: sDocType,
                cfg: DOC_CONFIG[sDocType] || DOC_CONFIG.SO
            };
        },

        onSearchOrder: function () {
            var oInput = this.byId("docNumberInput");
            if (!oInput) {
                MessageBox.error("검색 필드를 찾을 수 없습니다.");
                return;
            }

            var oDoc = this._getDocConfig();
            var sDocType = oDoc.docType;
            var oCfg = oDoc.cfg;
            var sDocNum = (oInput.getValue() || "").trim();

            if (!sDocNum) {
                MessageToast.show("조회할 " + oCfg.label + " 번호를 입력해 주세요.");
                return;
            }

            var sPaddedDocNo = sDocNum.padStart(oCfg.pad, "0");
            var oComponent = this.getOwnerComponent();
            var oTrackerModel = oComponent.getModel("trackerModel");
            var oFlowModel = oComponent.getModel("flowModel");
            var oDashboardModel = oComponent.getModel("dashboard");

            if (!oTrackerModel || !oFlowModel || !oDashboardModel) {
                MessageBox.error("시스템 모델을 불러오지 못했습니다.");
                return;
            }

            BusyIndicator.show(0);

            var aFilters = [new Filter(oCfg.filterField, FilterOperator.EQ, sPaddedDocNo)];
            var that = this;

            oTrackerModel.read("/Z_C_E2E_OrderTracker", {
                filters: aFilters,
                success: function (oData) {
                    var aResults = oData.results || [];

                    if (aResults.length > 1) {
                        console.warn(
                            "[DocumentInquiry] multi-chain rows:",
                            aResults.length,
                            "- Phase 2에서 SO Select 추가 예정"
                        );
                    }

                    if (!aResults.length) {
                        BusyIndicator.hide();
                        E2EProgressHelper.resetFlow(oFlowModel, oDashboardModel);
                        sap.ui.getCore().getEventBus().publish("dashboard", "e2eProgressUpdated", {
                            progressStep: 0
                        });
                        MessageBox.warning(oCfg.label + " " + sDocNum + "에 대한 추적 데이터가 없습니다.");
                        return;
                    }

                    var oFlowData = that._buildFlowData(aResults);
                    oFlowModel.setData(oFlowData);

                    var sPaddedSalesOrder = that._getPaddedSalesOrder(aResults, oFlowData);
                    var aFetchTasks = that._buildSummaryFetchTasks(
                        oComponent,
                        sDocType,
                        oCfg,
                        sPaddedSalesOrder,
                        sDocNum,
                        sPaddedDocNo
                    );

                    Promise.all(aFetchTasks).then(function (aOutcomes) {
                        BusyIndicator.hide();
                        var oSummaryBundle = that._mergeSummaryOutcomes(aOutcomes);
                        that._applyOrderInquiryPanel(
                            oDashboardModel,
                            sDocType,
                            oCfg,
                            sDocNum,
                            oFlowData,
                            aResults[0],
                            oSummaryBundle
                        );
                        MessageToast.show(oCfg.label + " " + sDocNum + " 조회가 완료되었습니다.");
                    }).catch(function () {
                        BusyIndicator.hide();
                        that._applyOrderInquiryPanel(
                            oDashboardModel,
                            sDocType,
                            oCfg,
                            sDocNum,
                            oFlowData,
                            aResults[0],
                            { source: "tracker", rows: [], row: null }
                        );
                        MessageToast.show(oCfg.label + " " + sDocNum + " 흐름이 동기화되었습니다.");
                    });
                },
                error: function () {
                    BusyIndicator.hide();
                    MessageBox.error("SAP 시스템에서 추적 데이터를 불러오는 중 오류가 발생했습니다.");
                }
            });
        },

        _buildSummaryFetchTasks: function (oComponent, sDocType, oCfg, sPaddedSalesOrder, sDocNum, sPaddedDocNo) {
            var that = this;
            var aTasks = [];

            if (sDocType === "SO") {
                var oOrderSummaryModel = oComponent.getModel("orderSummaryModel");
                if (oOrderSummaryModel) {
                    aTasks.push(this._readOrderSummary(oOrderSummaryModel, sPaddedSalesOrder));
                }
            } else if (oCfg.group && GROUP_SUMMARY[oCfg.group]) {
                var oGroupMeta = GROUP_SUMMARY[oCfg.group];
                var oGroupModel = oComponent.getModel(oGroupMeta.model);
                if (oGroupModel) {
                    aTasks.push(this._readGroupSummary(
                        oGroupModel,
                        oGroupMeta.entitySet,
                        oCfg.group,
                        sPaddedSalesOrder,
                        sDocType,
                        sDocNum,
                        sPaddedDocNo
                    ));
                }
            }

            if (!aTasks.length) {
                aTasks.push(Promise.resolve({ source: "none", rows: [], row: null }));
            }

            return aTasks;
        },

        _mergeSummaryOutcomes: function (aOutcomes) {
            if (!aOutcomes.length) {
                return { source: "none", rows: [], row: null };
            }
            return aOutcomes[0];
        },

        _readOrderSummary: function (oModel, sPaddedSalesOrder) {
            var that = this;
            return new Promise(function (resolve) {
                oModel.read("/Z_C_OrderSummary_SJ", {
                    filters: [new Filter("SalesOrder", FilterOperator.EQ, sPaddedSalesOrder)],
                    success: function (oData) {
                        var aRows = that._sortSummaryRows(oData.results || []);
                        resolve({
                            source: "orderSummary",
                            rows: aRows,
                            row: aRows.length ? aRows[0] : null
                        });
                    },
                    error: function (oError) {
                        console.warn("[DocumentInquiry] Z_C_OrderSummary_SJ read failed:", oError);
                        resolve({ source: "orderSummary", rows: [], row: null });
                    }
                });
            });
        },

        _readGroupSummary: function (oModel, sEntitySet, sGroup, sPaddedSalesOrder, sDocType, sDocNum, sPaddedDocNo) {
            var that = this;
            return new Promise(function (resolve) {
                oModel.read(sEntitySet, {
                    filters: [new Filter("SalesOrder", FilterOperator.EQ, sPaddedSalesOrder)],
                    success: function (oData) {
                        var aRows = oData.results || [];
                        var oRow = that._pickSummaryRow(aRows, sDocType, sDocNum, sPaddedDocNo);
                        resolve({
                            source: sGroup,
                            rows: aRows,
                            row: oRow
                        });
                    },
                    error: function (oError) {
                        console.warn("[DocumentInquiry] " + sEntitySet + " read failed:", oError);
                        resolve({ source: sGroup, rows: [], row: null });
                    }
                });
            });
        },

        _pickSummaryRow: function (aRows, sDocType, sDocNum, sPaddedDocNo) {
            if (!aRows.length) {
                return null;
            }

            var aCandidates = aRows.filter(function (oRow) {
                return this._rowMatchesDocType(oRow, sDocType, sDocNum, sPaddedDocNo);
            }, this);

            if (aCandidates.length) {
                return aCandidates[0];
            }
            return aRows[0];
        },

        _rowMatchesDocType: function (oRow, sDocType, sDocNum, sPaddedDocNo) {
            var aKeys = this._docMatchFields(sDocType);
            var i;
            for (i = 0; i < aKeys.length; i++) {
                if (this._normalizeDocNo(oRow[aKeys[i]]) === this._normalizeDocNo(sDocNum)
                    || this._normalizeDocNo(oRow[aKeys[i]]) === this._normalizeDocNo(sPaddedDocNo)) {
                    return true;
                }
            }
            return false;
        },

        _docMatchFields: function (sDocType) {
            switch (sDocType) {
                case "SO":
                    return ["SalesOrder"];
                case "PlannedOrder":
                    return ["PlannedOrder"];
                case "PR":
                    return ["PurchaseRequisition", "PRNumber"];
                case "PO":
                    return ["PurchaseOrder", "PONumber"];
                case "POMigo":
                    return ["POMigoDoc", "MaterialDocument"];
                case "Production":
                    return ["ProductionOrder"];
                case "ProdMigo":
                    return ["ProdMigoDoc", "MaterialDocument"];
                case "DN":
                    return ["OutboundDelivery", "DeliveryDocument"];
                case "BL":
                    return ["BillingDocument", "BillingDoc"];
                case "FI":
                    return ["FIDocument", "AccountingDocument"];
                case "Clearing":
                    return ["ClearingDocument"];
                default:
                    return [];
            }
        },

        _normalizeDocNo: function (vValue) {
            if (vValue === undefined || vValue === null || vValue === "") {
                return "";
            }
            return String(vValue).replace(/^0+/, "") || "0";
        },

        _getPaddedSalesOrder: function (aResults, oFlowData) {
            var sRaw = (aResults[0] && aResults[0].SalesOrder) || oFlowData.SalesOrder || "";
            if (!sRaw || sRaw === "없음") {
                return "";
            }
            return String(sRaw).padStart(10, "0");
        },

        _getLinkedSalesOrderDisplay: function (aResults, oFlowData) {
            var sRaw = (aResults[0] && aResults[0].SalesOrder) || oFlowData.SalesOrder || "-";
            if (!sRaw || sRaw === "없음") {
                return "-";
            }
            return String(sRaw).replace(/^0+/, "") || "0";
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

        _formatDocListTwoPerLine: function (aItems) {
            var aLines = [];
            var i;

            if (!aItems || !aItems.length) {
                return "없음";
            }

            for (i = 0; i < aItems.length; i += 2) {
                aLines.push(aItems.slice(i, i + 2).join(", "));
            }

            return aLines.join("\n");
        },

        _buildFlowData: function (aResults) {
            var aPRs = [];
            var aPOs = [];
            var aPOMigos = [];   // 🚀 [추가] 원자재 입고(MIGO) 자재전표 배열
            var aProds = [];     // 🚀 [추가] 생산오더 배열
            var aProdMigos = []; // 🚀 [추가] 완제품 입고(MIGO) 자재전표 배열
            var oMerged = {};

            aResults.forEach(function (item) {
                // 1. 구매요청 배열로 묶기
                if (item.PurchaseRequisition && aPRs.indexOf(item.PurchaseRequisition) < 0) {
                    aPRs.push(item.PurchaseRequisition);
                }
                // 2. 구매오더 배열로 묶기
                if (item.PurchaseOrder && aPOs.indexOf(item.PurchaseOrder) < 0) {
                    aPOs.push(item.PurchaseOrder);
                }
                // 3. 원자재 입고(POMigo) 자재전표 묶기
                if (item.POMigoDoc && aPOMigos.indexOf(item.POMigoDoc) < 0) {
                    aPOMigos.push(item.POMigoDoc);
                }
                // 4. 생산오더 묶기
                if (item.ProductionOrder && aProds.indexOf(item.ProductionOrder) < 0) {
                    aProds.push(item.ProductionOrder);
                }
                // 5. 완제품 입고(ProdMigo) 자재전표 묶기
                if (item.ProdMigoDoc && aProdMigos.indexOf(item.ProdMigoDoc) < 0) {
                    aProdMigos.push(item.ProdMigoDoc);
                }

                this._mergeFlowField(oMerged, "SalesOrder", item.SalesOrder);
                this._mergeFlowField(oMerged, "PlannedOrder", item.PlannedOrder);
                this._mergeFlowField(oMerged, "PurchaseOrder", item.PurchaseOrder);
                this._mergeFlowField(oMerged, "POMigo", item.POMigoDoc);
                this._mergeFlowField(oMerged, "ProductionOrder", item.ProductionOrder);
                this._mergeFlowField(oMerged, "ProdMigo", item.ProdMigoDoc);
                this._mergeFlowField(oMerged, "Delivery", item.OutboundDelivery);
                this._mergeFlowField(oMerged, "Picking", item.OutboundDelivery);
                this._mergeFlowField(oMerged, "Billing", item.BillingDocument);
                this._mergeFlowField(oMerged, "FI", item.FIDocument);
                this._mergeFlowField(oMerged, "Clearing", item.ClearingDocument);
            }, this);

            return {
                SalesOrder: oMerged.SalesOrder || "없음",
                PlannedOrder: oMerged.PlannedOrder || "없음",
                PurchaseReq: this._formatDocListTwoPerLine(aPRs),
                PurchaseOrder: this._formatDocListTwoPerLine(aPOs),
                POMigo: this._formatDocListTwoPerLine(aPOMigos),
                ProductionOrder: aProds.length ? aProds.join(", ") : "없음",
                ProdMigo: this._formatDocListTwoPerLine(aProdMigos),
                Delivery: oMerged.Delivery || "없음",
                Picking: oMerged.Picking || "없음",
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

        _buildSummaryDisplay: function (sDocType, oSummaryRow, oTrackerRow, aSummaryRows) {
            var o = oSummaryRow || {};
            var t = oTrackerRow || {};
            var iExtraCount = sDocType === "SO" && aSummaryRows ? aSummaryRows.length - 1 : 0;

            switch (sDocType) {
                case "SO":
                    return {
                        estimatedDays: o.EstimatedDays !== undefined && o.EstimatedDays !== null
                            ? o.EstimatedDays + "일 (예상)" : "-",
                        customer: formatter.dash(o.CustomerName || o.Customer),
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.SOQuantity || o.OrderQuantity, o.SOUnit || o.OrderUnit || o.OrderQuantityUnit),
                        amount: formatter.formatAmount(o.SOAmount || o.TotalAmount, o.SOCurrency || o.Currency),
                        creationDate: formatter.formatDate(o.SOCreationDate || o.CreationDate),
                        productCode: this._buildProductDisplay(o.Material, iExtraCount > 0 ? iExtraCount : 0),
                        productName: this._buildProductDisplay(o.MaterialName, 0)
                    };
                case "PlannedOrder":
                    return {
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.PlannedQuantity, o.PlannedUnit),
                        plannedStartDate: formatter.formatDate(o.PlannedStartDate),
                        plannedEndDate: formatter.formatDate(o.PlannedEndDate),
                        mrpElement: formatter.formatMRPElement(o.MRPElementType),
                        plannedPlant: formatter.dash(o.PlannedPlant)
                    };
                case "PR":
                    return {
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.PRQuantity, o.PRUnit),
                        requestDate: formatter.formatDate(o.PRRequestDate),
                        deliveryDate: formatter.formatDate(o.PRDeliveryDate),
                        requester: formatter.dash(o.PRRequester),
                        purchaseGroup: formatter.dash(o.PRPurchaseGroup),
                        plant: formatter.dash(o.PRPlant)
                    };
                case "PO":
                    return {
                        supplierName: formatter.dash(o.SupplierName),
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.POQuantity, o.POUnit),
                        unitPrice: formatter.formatAmount(o.POUnitPrice, o.POCurrency),
                        amount: formatter.formatAmount(o.POAmount, o.POCurrency),
                        deliveryDate: formatter.formatDate(o.PODeliveryDate),
                        purchaseOrg: formatter.dash(o.POPurchaseOrg)
                    };
                case "POMigo":
                    return {
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.POMigoQuantity, o.POMigoUnit),
                        migoDate: formatter.formatDate(o.POMigoDate),
                        moveType: formatter.formatMoveType(o.POMigoMoveType),
                        storage: formatter.dash(o.POMigoStorage),
                        purchaseOrder: formatter.dash(o.PurchaseOrder || t.PurchaseOrder)
                    };
                case "Production":
                    return {
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.ProductionQuantity, o.ProdUnit),
                        startDate: formatter.formatDate(o.ProductionStartDate),
                        endDate: formatter.formatDate(o.ProductionEndDate),
                        confirmedQty: formatter.formatQtyUnit(o.ProductionConfirmedQty, o.ProdUnit),
                        status: formatter.formatProductionStatus(o.ProductionStatus)
                    };
                case "ProdMigo":
                    return {
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.ProdMigoQuantity, o.ProdMigoUnit),
                        migoDate: formatter.formatDate(o.ProdMigoDate),
                        moveType: formatter.formatMoveType(o.ProdMigoMoveType),
                        storage: formatter.dash(o.ProdMigoStorage),
                        productionOrder: formatter.dash(o.LinkedProductionOrder || t.ProductionOrder)
                    };
                case "DN":
                    return {
                        customerName: formatter.dash(o.CustomerName),
                        material: formatter.formatMaterial(o.Material, o.MaterialName),
                        quantity: formatter.formatQtyUnit(o.DNQuantity, o.DNUnit),
                        plannedDate: formatter.formatDate(o.DNPlannedDate),
                        actualDate: formatter.formatDNActualDate(o.DNActualDate),
                        shippingPoint: formatter.dash(o.DNShippingPoint),
                        overallStatus: formatter.formatDNStatus(o.DNOverallStatus)
                    };
                case "BL":
                    return {
                        customerName: formatter.dash(o.CustomerName),
                        netAmount: formatter.formatAmount(o.BLNetAmount, o.BLCurrency),
                        taxAmount: formatter.formatAmount(o.BLTaxAmount, o.BLCurrency),
                        billingDate: formatter.formatDate(o.BLBillingDate),
                        billingType: formatter.formatBLType(o.BLBillingType),
                        paymentTerms: formatter.dash(o.BLPaymentTerms)
                    };
                case "FI":
                    return {
                        companyCode: formatter.dash(o.FICompanyCode),
                        docType: formatter.formatFIDocType(o.FIDocType),
                        docDate: formatter.formatDate(o.FIDocDate),
                        postingDate: formatter.formatDate(o.FIPostingDate),
                        amount: formatter.formatAmount(o.FIAmount, o.FICurrency),
                        fiscalYear: formatter.dash(o.FIFiscalYear),
                        refDocument: formatter.dash(o.FIRefDocument),
                        status: formatter.formatFIStatus(o.FIStatus)
                    };
                case "Clearing":
                    return {
                        customerName: formatter.dash(o.CustomerName),
                        amount: formatter.formatAmount(o.ClearingAmount, o.ClearingCurrency),
                        clearingDate: formatter.formatDate(o.ClearingDate),
                        paymentMethod: formatter.dash(o.ClearingPaymentMethod),
                        clearingDocument: formatter.dash(o.ClearingDocument),
                        refBilling: formatter.dash(o.ClearingRefBilling)
                    };
                default:
                    return {};
            }
        },

        _buildTrackerFallbackDisplay: function (sDocType, oCfg, oTrackerRow, oFlowData) {
            var t = oTrackerRow || {};
            return {
                material: formatter.formatMaterial(t.Material, t.MaterialName || t.MaterialText || t.ProductName),
                quantity: formatter.formatQtyUnit(t.OrderQuantity || t.Quantity, t.QuantityUnit || "EA"),
                purchaseOrder: formatter.dash(t.PurchaseOrder || oFlowData.PurchaseOrder),
                productionOrder: formatter.dash(t.ProductionOrder || oFlowData.ProductionOrder),
                docTypeLabel: oCfg.label,
                note: "Summary CDS 미연동 — tracker row fallback"
            };
        },

        _applyOrderInquiryPanel: function (
            oDashboardModel,
            sDocType,
            oCfg,
            sDocNum,
            oFlowData,
            oTrackerRow,
            oSummaryBundle
        ) {
            var iStage = this._resolveCurrentStep(oFlowData);
            var sStageTitle = FLOW_STEPS[iStage.currentIndex].title;
            var iTotal = FLOW_STEPS.length;
            var iCompletedCount = iStage.completedCount;
            var iDisplayStep = iStage.inProgress ? iStage.currentIndex + 1 : iCompletedCount;
            if (iCompletedCount >= iTotal) {
                iDisplayStep = iTotal;
            }

            var oSummaryRow = oSummaryBundle && oSummaryBundle.row;
            var aSummaryRows = oSummaryBundle && oSummaryBundle.rows ? oSummaryBundle.rows : [];
            var sSummarySource = oSummaryBundle && oSummaryBundle.source ? oSummaryBundle.source : "none";
            var bHasSummary = !!oSummaryRow;

            if (!bHasSummary && sSummarySource !== "none") {
                console.warn(
                    "[DocumentInquiry] Summary CDS empty for",
                    sDocType,
                    "- using tracker row fallback"
                );
            }

            var oDisplay = bHasSummary
                ? this._buildSummaryDisplay(sDocType, oSummaryRow, oTrackerRow, aSummaryRows)
                : this._buildTrackerFallbackDisplay(sDocType, oCfg, oTrackerRow, oFlowData);

            var iProgressPercent = Math.round((iDisplayStep / iTotal) * 100);
            var sLinkedSalesOrder = this._getLinkedSalesOrderDisplay([oTrackerRow], oFlowData);
            var sGaugeKey = sLinkedSalesOrder !== "-" ? sLinkedSalesOrder : sDocNum;
            var sHeaderDisplay = sDocType === "SO" ? sDocNum : oCfg.label + " " + sDocNum;

            oDashboardModel.setProperty("/spaces/orderInquiry", {
                visible: true,
                docType: sDocType,
                docTypeLabel: oCfg.label,
                docNumber: sDocNum,
                headerDisplay: sHeaderDisplay,
                linkedSalesOrder: sLinkedSalesOrder,
                summarySource: sSummarySource,
                summary: oSummaryRow || {},
                display: oDisplay,
                orderNumber: sDocNum,
                currentStep: iDisplayStep,
                totalSteps: iTotal,
                stageText: sStageTitle,
                stageLabel: iDisplayStep + " / " + iTotal + " · " + sStageTitle,
                progressPercent: iProgressPercent,
                isSalesOrderDoc: sDocType === "SO",
                estimatedDays: oDisplay.estimatedDays || "-",
                customer: oDisplay.customer || "-",
                productCode: oDisplay.productCode || (oTrackerRow.Material || "-"),
                productName: oDisplay.productName || (oTrackerRow.MaterialName || "-"),
                quantity: oDisplay.quantity ? oDisplay.quantity.split(" ")[0] : String(oTrackerRow.Quantity || "-"),
                quantityUnit: oDisplay.quantity && oDisplay.quantity.indexOf(" ") > -1
                    ? oDisplay.quantity.split(" ").slice(1).join(" ")
                    : (oTrackerRow.QuantityUnit || "EA"),
                amountDisplay: oDisplay.amount || oDisplay.netAmount || "-",
                creationDate: oDisplay.creationDate || "-",
                trackerPurchaseOrder: oTrackerRow.PurchaseOrder || oFlowData.PurchaseOrder || "-",
                trackerProductionOrder: oTrackerRow.ProductionOrder || oFlowData.ProductionOrder || "-"
            });

            E2EProgressHelper.applyProgress(oDashboardModel, iCompletedCount);
            E2EProgressHelper.updateProcessGauge(
                oDashboardModel,
                sGaugeKey,
                iDisplayStep,
                iTotal,
                sStageTitle,
                iProgressPercent
            );
            sap.ui.getCore().getEventBus().publish("dashboard", "e2eProgressUpdated", {
                progressStep: iCompletedCount
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
            if (sKey === "Picking") {
                return this._isDocReady(oFlowData.Picking);
            }
            return this._isDocReady(oFlowData[sKey]);
        },

        _isDocReady: function (vValue) {
            return vValue && vValue !== "없음" && vValue !== "대기중..." && vValue !== "대기중";
        }
    });
});
