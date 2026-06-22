/**
 * MmInventory.controller.js — MM Inventory 2x2 생산 연계형 재고 대시보드
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/Column",
    "sap/m/ColumnListItem",
    "sap/m/Text",
    "com/capstone/dashboard/fioridashboard/service/mm/MmInventoryDataService",
    "com/capstone/dashboard/fioridashboard/service/mm/MmStockLogDataService",
    "com/capstone/dashboard/fioridashboard/util/mm/MmBomOverviewConfig"
], function (Controller, JSONModel, MessageToast, Column, ColumnListItem, Text, MmInventoryDataService, MmStockLogDataService, MmBomOverviewConfig) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.mm.MmInventory", {

        onInit: function () {
            this._oCache = null;
            this._bLoading = false;
            this._oWhatIf = MmInventoryDataService.getDefaultWhatIf();
            this._sActiveTab = "CURRENT";
            this._sMaterialCategoryFilter = "ALL";
            this._sDistributionCategoryFilter = "ALL";
            this._sCompositionTab = "DISTRIBUTION";
            this._sBomVisualizationTab = "HEATTECH";
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._fnRefreshHandler = this._onGlobalRefresh.bind(this);
            this._fnInventoryActionHandler = this._onMmInventoryAction.bind(this);

            this.getView().setModel(
                new JSONModel(MmInventoryDataService.getEmptyAnalysisState()),
                "inventoryView"
            );
            this.getView().setModel(
                new JSONModel(MmInventoryDataService.getEmptyStockPositionViewState()),
                "stockPositionView"
            );
            this.getView().setModel(
                new JSONModel(MmStockLogDataService.getEmptyPopoverState()),
                "stockLogView"
            );

            this._oStockLogRequestToken = 0;

            this._oEventBus.subscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
            this._oEventBus.subscribe("dashboard", "mmInventoryAction", this._fnInventoryActionHandler, this);
            this._waitForDashboardModel();
        },

        onExit: function () {
            var oModel = this._getDashboardModel();

            if (this._oEventBus) {
                if (this._fnRefreshHandler) {
                    this._oEventBus.unsubscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
                }
                if (this._fnInventoryActionHandler) {
                    this._oEventBus.unsubscribe("dashboard", "mmInventoryAction", this._fnInventoryActionHandler, this);
                }
            }

            if (oModel && this._fnNavChange) {
                oModel.detachPropertyChange(this._fnNavChange, this);
            }

            this._closeStockLogPopover();
        },

        _getDashboardModel: function () {
            var oView = this.getView();
            return (oView && oView.getModel("dashboard")) || this.getOwnerComponent().getModel("dashboard");
        },

        _getStockPositionViewModel: function () {
            return this.getView().getModel("stockPositionView");
        },

        _getViewModel: function () {
            return this.getView().getModel("inventoryView");
        },

        _getStockLogViewModel: function () {
            return this.getView().getModel("stockLogView");
        },

        _sortMmbeRows: function (aRows) {
            return MmInventoryDataService.sortMmbeDisplayRows(aRows);
        },

        _enrichMmbeRowsForView: function (aRows) {
            return this._sortMmbeRows(aRows).map(function (oRow) {
                return Object.assign({}, oRow, {
                    logClickable: MmStockLogDataService.parseRowQuantity(oRow.Quantity) > 0
                });
            });
        },

        _resolveMaterialIconMeta: function (oMaterial) {
            return MmBomOverviewConfig.getMaterialIconMeta(
                oMaterial && oMaterial.material,
                oMaterial && (oMaterial.displayName || oMaterial.materialName),
                {
                    isRawMaterial: !!(oMaterial && oMaterial.isRawMaterial),
                    isFinishedProduct: !!(oMaterial && oMaterial.isFinishedProduct)
                }
            );
        },

        _closeStockLogPopover: function () {
            var oPopover = this.byId("mmStockLogPopover");
            var oLogView = this._getStockLogViewModel();

            if (oPopover && oPopover.isOpen()) {
                oPopover.close();
            }

            this._oStockLogRequestToken += 1;

            if (oLogView) {
                oLogView.setData(MmStockLogDataService.getEmptyPopoverState());
            }
        },

        _refreshStockLogTableBinding: function () {
            var oTable = this.byId("mmStockLogPopoverTable");
            var oBinding;

            if (!oTable) {
                return;
            }

            oBinding = oTable.getBinding("items");
            if (oBinding) {
                oBinding.refresh(true);
            }
            oTable.invalidate();
        },

        _rebuildStockLogTable: function (aColumnDefs) {
            var oTable = this.byId("mmStockLogPopoverTable");
            var i;

            if (!oTable) {
                return;
            }

            oTable.setFixedLayout(false);
            oTable.destroyColumns();
            oTable.destroyItems();
            oTable.unbindItems();

            for (i = 0; i < aColumnDefs.length; i++) {
                oTable.addColumn(new Column({
                    width: aColumnDefs[i].width || "auto",
                    hAlign: aColumnDefs[i].hAlign || "Begin",
                    header: new Text({
                        text: aColumnDefs[i].label,
                        wrapping: false
                    })
                }));
            }

            oTable.bindItems({
                path: "stockLogView>/rows",
                factory: function (sId, oContext) {
                    var aCells = aColumnDefs.map(function (oCol) {
                        var vValue = oContext.getProperty(oCol.key);
                        var sText = MmStockLogDataService.formatDisplayValue(oCol.key, vValue);
                        var sAlignClass = oCol.hAlign === "End"
                            ? " nxMmStockLogCell--end"
                            : (oCol.hAlign === "Center" ? " nxMmStockLogCell--center" : "");

                        return new Text({
                            text: sText,
                            wrapping: false,
                            maxLines: 1,
                            tooltip: sText,
                            textAlign: oCol.hAlign === "End" ? "End" : (oCol.hAlign === "Center" ? "Center" : "Begin")
                        }).addStyleClass("nxMmStockLogCell" + sAlignClass);
                    });

                    return new ColumnListItem({ cells: aCells });
                }
            });
        },

        _applyStockLogViewState: function (oState) {
            var oLogView = this._getStockLogViewModel();

            if (!oLogView) {
                return;
            }

            oLogView.setData(Object.assign(MmStockLogDataService.getEmptyPopoverState(), oState));
            oLogView.refresh(true);
        },

        _loadStockLogData: function (oRow) {
            var oLogView = this._getStockLogViewModel();
            var oComponent = this.getOwnerComponent();
            var oStockView = this._getStockPositionViewModel();
            var oContext;
            var oCfg;
            var nToken;
            var sStockTypeName;

            if (!oLogView || !oComponent || !oRow) {
                return;
            }

            sStockTypeName = String(oRow.StockTypeName || "").trim();
            oCfg = MmStockLogDataService.getStockLogConfig(sStockTypeName);

            if (!oCfg) {
                this._applyStockLogViewState({
                    loading: false,
                    error: "지원하지 않는 Stock Type입니다.",
                    title: sStockTypeName || "재고 근거 문서"
                });
                return;
            }

            oContext = {
                material: String(oRow.Material || oStockView.getProperty("/material") || "").trim(),
                materialName: oRow.MaterialName || oStockView.getProperty("/materialName"),
                plant: oRow.Plant || MmStockLogDataService.FIXED_PLANT,
                storageLocation: oRow.StorageLocation,
                stockTypeName: sStockTypeName
            };

            nToken = ++this._oStockLogRequestToken;

            this._applyStockLogViewState({
                loading: true,
                error: "",
                hasData: false,
                rows: [],
                title: sStockTypeName,
                contextLine: MmStockLogDataService.buildContextLine(oContext),
                hint: oCfg.hint
            });
            this._rebuildStockLogTable(oCfg.fields);

            MmStockLogDataService.loadStockLog(oComponent, sStockTypeName, oContext)
                .then(function (oResult) {
                    var aResults = oResult && oResult.rows ? oResult.rows : [];

                    if (nToken !== this._oStockLogRequestToken) {
                        return;
                    }

                    this._applyStockLogViewState({
                        loading: false,
                        error: "",
                        hasData: aResults.length > 0,
                        rows: aResults,
                        title: sStockTypeName,
                        contextLine: MmStockLogDataService.buildContextLine(oContext),
                        hint: oCfg.hint
                    });

                    setTimeout(function () {
                        if (nToken !== this._oStockLogRequestToken) {
                            return;
                        }
                        this._rebuildStockLogTable(oCfg.fields);
                        this._refreshStockLogTableBinding();
                    }.bind(this), 0);
                }.bind(this))
                .catch(function (oError) {
                    if (nToken !== this._oStockLogRequestToken) {
                        return;
                    }

                    this._applyStockLogViewState({
                        loading: false,
                        error: (oError && oError.message) || MmStockLogDataService.LOAD_ERROR,
                        hasData: false,
                        rows: [],
                        title: sStockTypeName,
                        contextLine: MmStockLogDataService.buildContextLine(oContext),
                        hint: oCfg.hint
                    });
                    this._rebuildStockLogTable(oCfg.fields);
                }.bind(this));
        },

        onStockTypePress: function (oEvent) {
            var oSource = oEvent.getSource();
            var oCtx = oSource.getBindingContext("stockPositionView");
            var oRow = oCtx && oCtx.getObject();
            var oPopover = this.byId("mmStockLogPopover");
            var nQuantity;

            if (!oRow || !oPopover) {
                return;
            }

            nQuantity = MmStockLogDataService.parseRowQuantity(oRow.Quantity);

            /* eslint-disable no-console */
            console.log("[StockLog] click", {
                stockType: oRow.StockTypeName,
                material: oRow.Material,
                plant: oRow.Plant,
                storageLocation: oRow.StorageLocation,
                quantity: oRow.Quantity
            });
            /* eslint-enable no-console */

            if (nQuantity <= 0) {
                /* eslint-disable no-console */
                console.log("[StockLog] skip because quantity is zero", {
                    stockType: oRow.StockTypeName,
                    quantity: oRow.Quantity
                });
                /* eslint-enable no-console */
                return;
            }

            oPopover.openBy(oSource);
            this._loadStockLogData(oRow);
        },

        onStockLogPopoverClose: function () {
            this._closeStockLogPopover();
        },

        _loadStockPositionForSelectedMaterial: function (sMaterial, sMaterialName, oMaterialMeta) {
            var oStockView = this._getStockPositionViewModel();
            var oComponent = this.getOwnerComponent();
            var sMat = _normalize(sMaterial);
            var oIconMeta = this._resolveMaterialIconMeta(oMaterialMeta);

            if (!oStockView || !oComponent || !sMat) {
                return;
            }

            this._closeStockLogPopover();

            oStockView.setProperty("/loading", true);
            oStockView.setProperty("/material", sMat);
            oStockView.setProperty("/materialName", sMaterialName || sMat);
            oStockView.setProperty("/materialIcon", oIconMeta.src);
            oStockView.setProperty("/materialIconColor", oIconMeta.color);
            oStockView.setProperty("/hasSelection", true);
            oStockView.setProperty("/showNoRows", false);

            if (this._oCache && this._oCache.stockPositionRows) {
                oStockView.setProperty("/rows", this._enrichMmbeRowsForView(MmInventoryDataService.buildMmbeRowsForMaterial(
                    this._oCache,
                    sMat,
                    this._getFiltersFromModel()
                )));
            }

            MmInventoryDataService.loadStockPositionForMaterial(
                oComponent,
                sMat,
                this._getFiltersFromModel(),
                {
                    stockTypeCatalog: this._oCache && this._oCache.stockTypeCatalog,
                    inventoryItems: this._oCache && this._oCache.items,
                    allStockPositionRows: this._oCache && this._oCache.stockPositionRows
                }
            ).then(function (aRows) {
                oStockView.setProperty("/rows", this._enrichMmbeRowsForView(aRows));
                oStockView.setProperty("/showNoRows", aRows.length === 0);
                oStockView.setProperty("/loading", false);
            }.bind(this)).catch(function (oError) {
                oStockView.setProperty("/rows", []);
                oStockView.setProperty("/showNoRows", true);
                oStockView.setProperty("/loading", false);
                oStockView.setProperty("/noRowsMessage", oError.message || "Stock Position 조회에 실패했습니다.");
            });
        },

        _waitForDashboardModel: function () {
            var oModel = this._getDashboardModel();

            if (!oModel) {
                setTimeout(this._waitForDashboardModel.bind(this), 50);
                return;
            }

            if (!oModel.getProperty("/mmInventory")) {
                oModel.setProperty("/mmInventory", MmInventoryDataService.getEmptyState());
            }

            this._fnNavChange = this._onDashboardPropertyChange.bind(this);
            oModel.attachPropertyChange(this._fnNavChange, this);
            this._ensureInventoryLoaded();
        },

        onAfterRendering: function () {
            this._ensureInventoryLoaded();
        },

        _ensureInventoryLoaded: function () {
            if (!this._isInventoryActive()) {
                return;
            }
            if (this._bLoading) {
                return;
            }
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return;
            }
            if (!this._oCache || !oModel.getProperty("/mmInventory/loaded")) {
                this._setLoading(true);
                this._loadInventory(true);
            }
        },

        _isInventoryActive: function () {
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return false;
            }
            return oModel.getProperty("/ui/navKey") === "MM_MATERIALS"
                && oModel.getProperty("/moduleView/activeSubTab") === "INVENTORY";
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();
            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._ensureInventoryLoaded();
            }
        },

        _loadIfActive: function () {
            this._ensureInventoryLoaded();
        },

        _getFiltersFromModel: function () {
            var oModel = this._getDashboardModel();
            return {
                materialSearch: oModel.getProperty("/mmInventory/materialSearch") || "",
                plantFilter: oModel.getProperty("/mmInventory/plantFilter") || "ALL",
                storageLocationFilter: oModel.getProperty("/mmInventory/storageLocationFilter") || "ALL",
                materialTypeFilter: oModel.getProperty("/mmInventory/materialTypeFilter") || "ALL"
            };
        },

        _setLoading: function (bLoading) {
            var oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/mmInventory/loading", bLoading);
            }
        },

        _syncWhatIfFromModel: function () {
            var oViewModel = this._getViewModel();
            if (!oViewModel) {
                return;
            }
            this._oWhatIf = {
                heattechTarget: oViewModel.getProperty("/production/whatIf/heattechTarget"),
                bagTarget: oViewModel.getProperty("/production/whatIf/bagTarget")
            };
        },

        _logStockPositionDebug: function (oCache, oAnalysis) {
            if (!oCache) {
                return;
            }

            /* eslint-disable no-console */
            console.table((oCache.stockPositionRows || []).map(function (oRow) {
                return {
                    Material: oRow.Material,
                    StockType: oRow.StockType,
                    StockTypeName: oRow.StockTypeName,
                    Plant: oRow.Plant,
                    StorageLocation: oRow.StorageLocation,
                    Quantity: oRow.Quantity,
                    BaseUnit: oRow.BaseUnit
                };
            }));

            console.table(Object.keys(oAnalysis.stockSummaryByMaterial || {}).map(function (sCode) {
                var oSum = oAnalysis.stockSummaryByMaterial[sCode];
                return {
                    Material: sCode,
                    UnrestrictedStock: oSum.UnrestrictedStock,
                    ReservedStock: oSum.ReservedStock,
                    QualityStock: oSum.QualityStock,
                    BlockedStock: oSum.BlockedStock,
                    TransferStock: oSum.TransferStock,
                    SalesOrderStock: oSum.SalesOrderStock,
                    TotalStock: oSum.TotalStock
                };
            }));

            console.table((oAnalysis.mergedMaterials || []).map(function (oMat) {
                return {
                    Material: oMat.material,
                    MaterialName: oMat.materialName,
                    UnrestrictedStock: oMat.unrestrictedStock,
                    TotalStock: oMat.totalStock,
                    DisplayStock: oMat.displayStock
                };
            }));
            /* eslint-enable no-console */
        },

        _applyInventoryState: function (sSelectedMaterial, oOptions) {
            var oModel = this._getDashboardModel();
            var oViewModel = this._getViewModel();
            var sResolved;
            var oDashState;
            var oAnalysis;
            var bExplicitSelection = sSelectedMaterial !== undefined && sSelectedMaterial !== null;

            if (!oModel || !oViewModel || !this._oCache) {
                return;
            }

            this._syncWhatIfFromModel();

            sResolved = bExplicitSelection
                ? _normalize(sSelectedMaterial)
                : _normalize(oModel.getProperty("/mmInventory/selectedMaterial"));

            oDashState = MmInventoryDataService.buildInventoryState(
                this._oCache,
                this._getFiltersFromModel(),
                sResolved,
                this._oWhatIf,
                this._sActiveTab
            );

            oAnalysis = MmInventoryDataService.buildInventoryAnalysis(
                this._oCache,
                this._getFiltersFromModel(),
                sResolved,
                this._oWhatIf,
                this._sActiveTab,
                this._sMaterialCategoryFilter,
                this._sDistributionCategoryFilter,
                this._sCompositionTab,
                this._sBomVisualizationTab,
                {
                    preserveSelection: !!(oOptions && oOptions.preserveSelection) ||
                        (bExplicitSelection && !!sResolved)
                }
            );

            oModel.setProperty("/mmInventory", oDashState);
            oViewModel.setData(oAnalysis);

            if (oAnalysis.selectedMaterial) {
                this._loadStockPositionForSelectedMaterial(
                    oAnalysis.selectedMaterial,
                    oAnalysis.selectedMaterialDisplayName || oAnalysis.selectedMaterialName,
                    (oAnalysis.materialList || []).filter(function (oMat) {
                        return oMat.material === oAnalysis.selectedMaterial;
                    })[0] || (oAnalysis.mergedMaterials || []).filter(function (oMat) {
                        return oMat.material === oAnalysis.selectedMaterial;
                    })[0] || null
                );
            }

            setTimeout(function () {
                this._syncListSelection(oAnalysis.selectedMaterial);
                this._wireDonutTooltips();
                this._wireDistChartInteractions();
                this._wireProdCompareChartInteractions();
            }.bind(this), 80);
        },

        _wireDistChartInteractions: function () {
            var oRoot = this.getView().getDomRef();
            var aCharts;
            var i;
            var j;

            if (!oRoot) {
                return;
            }

            aCharts = oRoot.querySelectorAll("[data-dist-chart]");
            for (i = 0; i < aCharts.length; i++) {
                var oChart = aCharts[i];
                var oFloatTip = oChart.querySelector(".nxMmInvDistModernFloatTip");
                var aBars = oChart.querySelectorAll(".nxMmInvDistModernBar");

                if (!aBars.length || oChart.getAttribute("data-dist-wired") === "true") {
                    continue;
                }

                oChart.setAttribute("data-dist-wired", "true");

                for (j = 0; j < aBars.length; j++) {
                    (function (oBarEl, oChartEl, oTipEl) {
                        oBarEl.addEventListener("mouseenter", function () {
                            if (oTipEl) {
                                oTipEl.textContent = (oBarEl.getAttribute("data-label") || "") + " · " +
                                    (oBarEl.getAttribute("data-value") || "0") + " " +
                                    (oBarEl.getAttribute("data-unit") || "PC");
                                oTipEl.classList.add("nxMmInvDistModernFloatTip--visible");
                            }
                        });
                        oBarEl.addEventListener("mousemove", function (oEvent) {
                            if (!oTipEl) {
                                return;
                            }
                            var oRect = oChartEl.getBoundingClientRect();
                            oTipEl.style.left = (oEvent.clientX - oRect.left + 12) + "px";
                            oTipEl.style.top = (oEvent.clientY - oRect.top - 32) + "px";
                        });
                        oBarEl.addEventListener("mouseleave", function () {
                            if (oTipEl) {
                                oTipEl.classList.remove("nxMmInvDistModernFloatTip--visible");
                            }
                        });
                        oBarEl.addEventListener("click", function () {
                            var sMaterial = oBarEl.getAttribute("data-material");
                            var aAllBars = oChartEl.querySelectorAll(".nxMmInvDistModernBar");
                            var k;

                            if (!sMaterial) {
                                return;
                            }

                            for (k = 0; k < aAllBars.length; k++) {
                                aAllBars[k].classList.remove("nxMmInvDistModernBar--active");
                                var oPopover = aAllBars[k].querySelector(".nxMmInvDistModernPopover");
                                var oStem = aAllBars[k].querySelector(".nxMmInvDistModernBarStem");
                                if (oPopover) {
                                    oPopover.classList.add("nxMmInvDistModernPopover--hidden");
                                }
                                if (oStem) {
                                    oStem.classList.remove("nxMmInvDistModernBarStem--active");
                                }
                            }

                            oBarEl.classList.add("nxMmInvDistModernBar--active");
                            var oActivePopover = oBarEl.querySelector(".nxMmInvDistModernPopover");
                            var oActiveStem = oBarEl.querySelector(".nxMmInvDistModernBarStem");
                            if (oActivePopover) {
                                oActivePopover.classList.remove("nxMmInvDistModernPopover--hidden");
                            }
                            if (oActiveStem) {
                                oActiveStem.classList.add("nxMmInvDistModernBarStem--active");
                            }

                            this._applyInventoryState(sMaterial, { preserveSelection: true });
                            this._showInventoryToast(oBarEl.getAttribute("data-label") + " 선택");
                        }.bind(this));
                    }.bind(this)(aBars[j], oChart, oFloatTip));
                }
            }
        },

        _wireDonutTooltips: function () {
            var oRoot = this.getView().getDomRef();
            var aHosts;
            var i;
            var j;

            if (!oRoot) {
                return;
            }

            aHosts = oRoot.querySelectorAll(".nxMmInvAnalysisHost--donutTip");
            for (i = 0; i < aHosts.length; i++) {
                var oHost = aHosts[i];
                var oTip = oHost.querySelector(".nxMmInvDonutTooltip");
                var aSlices = oHost.querySelectorAll(".nxMmInvDonutSlice");

                if (!oTip || !aSlices.length || oHost.getAttribute("data-tip-wired") === "true") {
                    continue;
                }

                oHost.setAttribute("data-tip-wired", "true");

                for (j = 0; j < aSlices.length; j++) {
                    (function (oSliceEl, oTipEl, oHostEl) {
                        oSliceEl.addEventListener("mouseenter", function () {
                            oTipEl.textContent = oSliceEl.getAttribute("data-tip") || "";
                            oTipEl.style.opacity = "1";
                        });
                        oSliceEl.addEventListener("mousemove", function (oEvent) {
                            var oRect = oHostEl.getBoundingClientRect();
                            oTipEl.style.left = (oEvent.clientX - oRect.left + 12) + "px";
                            oTipEl.style.top = (oEvent.clientY - oRect.top - 28) + "px";
                        });
                        oSliceEl.addEventListener("mouseleave", function () {
                            oTipEl.style.opacity = "0";
                        });
                    }(aSlices[j], oTip, oHost));
                }
            }
        },

        _wireProdCompareChartInteractions: function () {
            var oRoot = this.getView().getDomRef();
            var aCharts;
            var i;
            var j;

            if (!oRoot) {
                return;
            }

            aCharts = oRoot.querySelectorAll("[data-prod-compare-chart]");
            for (i = 0; i < aCharts.length; i++) {
                var oChart = aCharts[i];
                var oFloatTip = oChart.querySelector(".nxMmInvProdCompareFloatTip");
                var oSegInfo = oChart.querySelector(".nxMmInvProdCompareSegInfo");
                var oSegInfoBody = oChart.querySelector(".nxMmInvProdCompareSegInfoBody");
                var oSegInfoPlaceholder = oChart.querySelector(".nxMmInvProdCompareSegInfoPlaceholder");
                var oSegInfoImg = oChart.querySelector(".nxMmInvProdCompareSegInfoImg");
                var oSegInfoName = oChart.querySelector(".nxMmInvProdCompareSegInfoName");
                var oSegInfoMeta = oChart.querySelector(".nxMmInvProdCompareSegInfoMeta");
                var aSegTargets = oChart.querySelectorAll(".nxMmInvProdCompareSeg--interactive");
                var aMidSegs = oChart.querySelectorAll(".nxMmInvProdCompareMidSeg");
                var aLegendItems = oChart.querySelectorAll(".nxMmInvProdCompareLegendItem[data-prod-key]");
                var oMidInsight = oChart.querySelector(".nxMmInvProdCompareMidInsight");

                if (oChart.getAttribute("data-prod-wired") === "true") {
                    continue;
                }

                oChart.setAttribute("data-prod-wired", "true");

                var fnSelectProduct = function (oSourceEl) {
                    var sKey = oSourceEl.getAttribute("data-prod-key") || "";
                    var sLabel = oSourceEl.getAttribute("data-label") || "";
                    var sQty = oSourceEl.getAttribute("data-qty") || "";
                    var sPct = oSourceEl.getAttribute("data-pct") || "";
                    var sImg = oSourceEl.getAttribute("data-img") || "";
                    var k;

                    if (!sKey || !oSegInfo || !oSegInfoBody) {
                        return;
                    }

                    oSegInfo.className = "nxMmInvProdCompareSegInfo nxMmInvProdCompareSegInfo--" + sKey +
                        " nxMmInvProdCompareSegInfo--active";

                    if (oSegInfoPlaceholder) {
                        oSegInfoPlaceholder.hidden = true;
                    }
                    oSegInfoBody.hidden = false;

                    if (oSegInfoImg) {
                        oSegInfoImg.src = sImg;
                        oSegInfoImg.alt = sLabel;
                    }
                    if (oSegInfoName) {
                        oSegInfoName.textContent = sLabel;
                    }
                    if (oSegInfoMeta) {
                        oSegInfoMeta.textContent = sQty + " PC · " + sPct + "% · BOM 기준 생산 가능";
                    }
                    if (oMidInsight) {
                        oMidInsight.innerHTML = "<strong>" + sLabel + "</strong> · " + sQty +
                            " PC · 전체 " + sPct + "% · BOM 기준";
                    }

                    for (k = 0; k < aSegTargets.length; k++) {
                        aSegTargets[k].classList.toggle(
                            "nxMmInvProdCompareSeg--selected",
                            aSegTargets[k].getAttribute("data-prod-key") === sKey
                        );
                    }
                    for (k = 0; k < aLegendItems.length; k++) {
                        aLegendItems[k].classList.toggle(
                            "nxMmInvProdCompareLegendItem--active",
                            aLegendItems[k].getAttribute("data-prod-key") === sKey
                        );
                    }
                    for (k = 0; k < aMidSegs.length; k++) {
                        aMidSegs[k].classList.toggle(
                            "nxMmInvProdCompareMidSeg--active",
                            aMidSegs[k].getAttribute("data-prod-key") === sKey
                        );
                    }
                };

                for (j = 0; j < aSegTargets.length; j++) {
                    (function (oTargetEl) {
                        oTargetEl.addEventListener("click", function () {
                            fnSelectProduct(oTargetEl);
                        });
                        oTargetEl.addEventListener("keydown", function (oEvent) {
                            if (oEvent.key === "Enter" || oEvent.key === " ") {
                                oEvent.preventDefault();
                                fnSelectProduct(oTargetEl);
                            }
                        });
                    }(aSegTargets[j]));
                }

                for (j = 0; j < aLegendItems.length; j++) {
                    (function (oLegendEl) {
                        oLegendEl.addEventListener("click", function () {
                            fnSelectProduct(oLegendEl);
                        });
                        oLegendEl.addEventListener("keydown", function (oEvent) {
                            if (oEvent.key === "Enter" || oEvent.key === " ") {
                                oEvent.preventDefault();
                                fnSelectProduct(oLegendEl);
                            }
                        });
                    }(aLegendItems[j]));
                }

                for (j = 0; j < aMidSegs.length; j++) {
                    (function (oTargetEl, oChartEl, oTipEl) {
                        oTargetEl.addEventListener("click", function () {
                            fnSelectProduct(oTargetEl);
                        });
                        oTargetEl.addEventListener("keydown", function (oEvent) {
                            if (oEvent.key === "Enter" || oEvent.key === " ") {
                                oEvent.preventDefault();
                                fnSelectProduct(oTargetEl);
                            }
                        });
                        oTargetEl.addEventListener("mouseenter", function (oEvent) {
                            if (!oTipEl) {
                                return;
                            }
                            oTipEl.textContent = oTargetEl.getAttribute("data-tip") || "";
                            oTipEl.classList.add("nxMmInvProdCompareFloatTip--visible");
                            if (oEvent && oEvent.clientX) {
                                var oRect = oChartEl.getBoundingClientRect();
                                oTipEl.style.left = (oEvent.clientX - oRect.left + 12) + "px";
                                oTipEl.style.top = (oEvent.clientY - oRect.top - 32) + "px";
                            }
                        });
                        oTargetEl.addEventListener("mousemove", function (oEvent) {
                            if (!oTipEl || !oEvent.clientX) {
                                return;
                            }
                            var oRect = oChartEl.getBoundingClientRect();
                            oTipEl.style.left = (oEvent.clientX - oRect.left + 12) + "px";
                            oTipEl.style.top = (oEvent.clientY - oRect.top - 32) + "px";
                        });
                        oTargetEl.addEventListener("mouseleave", function () {
                            if (oTipEl) {
                                oTipEl.classList.remove("nxMmInvProdCompareFloatTip--visible");
                            }
                        });
                    }(aMidSegs[j], oChart, oFloatTip));
                }
            }
        },

        _syncListSelection: function (sSelectedMaterial) {
            var oList = this.byId("mmInventoryMaterialList");
            var aItems;
            var i;

            if (!oList || !sSelectedMaterial) {
                return;
            }

            aItems = oList.getItems();
            for (i = 0; i < aItems.length; i++) {
                if (aItems[i].getBindingContext("inventoryView")
                    && aItems[i].getBindingContext("inventoryView").getProperty("material") === sSelectedMaterial) {
                    oList.setSelectedItem(aItems[i]);
                    return;
                }
            }
        },

        _showInventoryToast: function (sMessage) {
            MessageToast.show(sMessage, {
                duration: 2000,
                width: "15em",
                my: "RightTop",
                at: "RightTop",
                offset: "-12 72"
            });
        },

        _onGlobalRefresh: function () {
            if (!this._isInventoryActive()) {
                return;
            }
            this._loadInventory(false);
        },

        _loadInventory: function (bApplyCurrentQuery) {
            var oModel = this._getDashboardModel();
            var oViewModel = this._getViewModel();
            var oComponent = this.getOwnerComponent();
            var sSelected = "";

            if (!oModel || !oComponent || !oViewModel) {
                return;
            }

            if (this._bLoading) {
                return;
            }
            this._bLoading = true;

            if (bApplyCurrentQuery) {
                sSelected = oModel.getProperty("/mmInventory/selectedMaterial") || "";
            } else {
                this._oWhatIf = MmInventoryDataService.getDefaultWhatIf();
                this._sActiveTab = "CURRENT";
            }

            this._setLoading(true);
            oModel.setProperty("/mmInventory/error", "");

            MmInventoryDataService.loadInventoryData(oComponent)
                .then(function (oCache) {
                    this._oCache = oCache;
                    this._logStockPositionDebug(oCache, MmInventoryDataService.buildInventoryAnalysis(
                        oCache,
                        this._getFiltersFromModel(),
                        sSelected,
                        this._oWhatIf,
                        this._sActiveTab,
                        this._sMaterialCategoryFilter,
                        this._sDistributionCategoryFilter,
                        this._sCompositionTab,
                        this._sBomVisualizationTab
                    ));

                    if (!bApplyCurrentQuery) {
                        var oDefaults = MmInventoryDataService.getDefaultFilters();
                        oModel.setProperty("/mmInventory/materialSearch", oDefaults.materialSearch);
                        oModel.setProperty("/mmInventory/plantFilter", oDefaults.plantFilter);
                        oModel.setProperty("/mmInventory/storageLocationFilter", oDefaults.storageLocationFilter);
                        oModel.setProperty("/mmInventory/materialTypeFilter", oDefaults.materialTypeFilter);
                        sSelected = "";
                    }

                    this._applyInventoryState(sSelected);
                    this._setLoading(false);
                    this._bLoading = false;
                }.bind(this))
                .catch(function (oError) {
                    this._setLoading(false);
                    this._bLoading = false;
                    this._oCache = null;
                    oModel.setProperty("/mmInventory/loaded", false);
                    oModel.setProperty("/mmInventory/error", oError.message || "재고 데이터를 불러올 수 없습니다");
                    oViewModel.setData(MmInventoryDataService.getEmptyAnalysisState());
                }.bind(this));
        },

        _onMmInventoryAction: function (sChannel, sEvent, oData) {
            if (!oData || !oData.action) {
                return;
            }

            switch (oData.action) {
                case "search":
                    this.onSearchPress();
                    break;
                case "reset":
                    this.onResetPress();
                    break;
                case "refresh":
                    this.onRefreshPress();
                    break;
                default:
                    break;
            }
        },

        onSearchPress: function () {
            if (!this._oCache) {
                this._loadInventory(true);
                return;
            }
            this._applyInventoryState("");
            this._showInventoryToast("조회 조건을 적용했습니다.");
        },

        onResetPress: function () {
            var oModel = this._getDashboardModel();
            var oDefaults = MmInventoryDataService.getDefaultFilters();

            if (!oModel) {
                return;
            }

            oModel.setProperty("/mmInventory/materialSearch", oDefaults.materialSearch);
            oModel.setProperty("/mmInventory/plantFilter", oDefaults.plantFilter);
            oModel.setProperty("/mmInventory/storageLocationFilter", oDefaults.storageLocationFilter);
            oModel.setProperty("/mmInventory/materialTypeFilter", oDefaults.materialTypeFilter);
            this._oWhatIf = MmInventoryDataService.getDefaultWhatIf();
            this._sMaterialCategoryFilter = "ALL";
            this._sDistributionCategoryFilter = "ALL";
            this._sCompositionTab = "DISTRIBUTION";
            this._sBomVisualizationTab = "HEATTECH";

            if (this._oCache) {
                this._applyInventoryState("");
            } else {
                this._loadInventory(true);
            }
        },

        onRefreshPress: function () {
            this._loadInventory(true);
            this._showInventoryToast("SAP 데이터 새로고침");
        },

        onMaterialSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext;
            var oMaterial;
            var sMaterial;

            if (!oItem) {
                return;
            }

            oContext = oItem.getBindingContext("inventoryView");
            if (!oContext) {
                return;
            }

            oMaterial = oContext.getObject();
            sMaterial = oMaterial && oMaterial.material;

            /* eslint-disable no-console */
            console.log("[Inventory] selected material", oMaterial);
            /* eslint-enable no-console */

            this._applyInventoryState(sMaterial);
        },

        onMaterialItemPress: function (oEvent) {
            var oItem = oEvent.getSource();
            var oList = this.byId("mmInventoryMaterialList");
            var oContext;
            var oMaterial;

            if (!oItem || !oList) {
                return;
            }

            oList.setSelectedItem(oItem);
            oContext = oItem.getBindingContext("inventoryView");
            if (!oContext) {
                return;
            }

            oMaterial = oContext.getObject();

            /* eslint-disable no-console */
            console.log("[Inventory] selected material", oMaterial);
            /* eslint-enable no-console */

            this._applyInventoryState(oMaterial && oMaterial.material);
        },

        onMaterialCategoryFilter: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            var sKey = oItem ? oItem.getKey() : "ALL";

            if (oEvent.stopPropagation) {
                oEvent.stopPropagation();
            }

            this._sMaterialCategoryFilter = sKey;
            this._applyInventoryState(undefined);
        },

        onMaterialTypeBadgePress: function (oEvent) {
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext("inventoryView");
            var oMaterial = oContext && oContext.getObject();
            var sKey = "ALL";

            if (oEvent.stopPropagation) {
                oEvent.stopPropagation();
            }

            if (oMaterial && oMaterial.isRawMaterial) {
                sKey = "RAW";
            } else if (oMaterial && oMaterial.isFinishedProduct) {
                sKey = "FINISHED";
            }

            this._sMaterialCategoryFilter = sKey;
            this._applyInventoryState(undefined);
        },

        onDistributionCategoryFilter: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            var sKey = oItem ? oItem.getKey() : "ALL";

            if (oEvent.stopPropagation) {
                oEvent.stopPropagation();
            }

            this._sDistributionCategoryFilter = sKey;
            this._applyInventoryState(undefined);
        },

        onCompositionTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            this._sCompositionTab = sKey || "DISTRIBUTION";
            this._applyInventoryState(undefined);
        },

        onBomVisualizationTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            this._sBomVisualizationTab = sKey || "HEATTECH";
            this._applyInventoryState(undefined);
        },

        onProductionTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            this._sActiveTab = sKey || "CURRENT";
            this._applyInventoryState(undefined);
        },

        onWhatIfTargetChange: function () {
            this._syncWhatIfFromModel();
        },

        onWhatIfCalculate: function () {
            this.onWhatIfTargetChange();
            this._applyInventoryState(undefined);
            this._showInventoryToast("MRP 시뮬레이션을 계산했습니다.");
        }
    });

    function _normalize(sText) {
        return String(sText || "").trim().toUpperCase();
    }
});
