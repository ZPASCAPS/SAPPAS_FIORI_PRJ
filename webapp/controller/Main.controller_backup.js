sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, Fragment, JSONModel, MessageToast, MessageBox) {
    "use strict";

    var STATUS_TAB_IDS = {
        ALL: "statAll",
        OK: "statOk",
        WARN: "statWarn",
        SHORT: "statShort"
    };

    var CREATE_ENTITY_CANDIDATES = [
        "BomStockSet",
        "MaterialSet",
        "MaterialMasterSet",
        "ZmaterialSet"
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.Main", {

        onInit: function () {
            this._aAllItems = [];
            this._sImageBase = this._resolveImageBase();
            this._sCreateEntityPath = "/MaterialSet";
            this._initDashboardModel();
            this._initCreateModel();
            this._highlightStatusTab("ALL");
            this._discoverCreateEntity();
            this._loadSapBomStock();
        },

        _resolveImageBase: function () {
            try {
                return sap.ui.require.toUrl("com/capstone/dashboard/fioridashboard/images/");
            } catch (e) {
                return "images/";
            }
        },

        _initDashboardModel: function () {
            var oModel = new JSONModel({
                ui: {
                    navKey: "INVENTORY",
                    createEntityLabel: "MaterialSet"
                },
                summary: {
                    total: 0,
                    available: 0,
                    shortage: 0,
                    totalShortageQty: 0,
                    totalLabel: "총 0건",
                    totalBadge: "총 0건"
                },
                counts: { all: 0, active: 0, warning: 0, shortage: 0 },
                filters: {
                    status: "ALL",
                    sort: "NAME_ASC",
                    stock: "ALL",
                    category: "ALL",
                    location: "ALL",
                    query: ""
                },
                categories: [{ key: "ALL", text: "전체 카테고리" }],
                locations: [{ key: "ALL", text: "전체 위치" }],
                items: [],
                displayItems: []
            });
            this.getView().setModel(oModel, "dashboard");
        },

        _initCreateModel: function () {
            this.getView().setModel(new JSONModel(this._emptyCreatePayload()), "create");
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

        _discoverCreateEntity: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            if (!oODataModel) {
                return;
            }

            var oMetaModel = oODataModel.getMetaModel();
            oMetaModel.loaded().then(function () {
                var sFound = null;
                var i;

                for (i = 0; i < CREATE_ENTITY_CANDIDATES.length; i++) {
                    try {
                        var oSet = oMetaModel.getODataEntitySet(CREATE_ENTITY_CANDIDATES[i]);
                        if (oSet) {
                            sFound = CREATE_ENTITY_CANDIDATES[i];
                            break;
                        }
                    } catch (e) {
                        // try next
                    }
                }

                if (!sFound) {
                    try {
                        var oContainer = oMetaModel.getODataEntityContainer("");
                        var aSets = (oContainer && oContainer.entitySet) || [];
                        for (i = 0; i < aSets.length; i++) {
                            var sName = aSets[i].name || "";
                            if (/material|matnr|bomstock|component/i.test(sName)) {
                                sFound = sName;
                                break;
                            }
                        }
                    } catch (e2) {
                        // keep default
                    }
                }

                if (sFound) {
                    this._sCreateEntityPath = "/" + sFound;
                    this.getView().getModel("dashboard").setProperty("/ui/createEntityLabel", sFound);
                }
            }.bind(this));
        },

        _loadSapBomStock: function () {
            var oODataModel = this.getOwnerComponent().getModel();

            if (!oODataModel) {
                MessageToast.show("OData Model 없음: manifest.json 확인 필요");
                return;
            }

            oODataModel.read("/BomStockSet", {
                success: function (oData) {
                    var aItems = (oData.results || []).map(this._mapODataItem, this);
                    this._aAllItems = aItems;
                    this._refreshDashboard(aItems);
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(this._extractSapError(oError, "자재 목록 조회에 실패했습니다."));
                }.bind(this)
            });
        },

        _mapODataItem: function (oItem) {
            oItem.BomQty = Number(oItem.BomQty || 0);
            oItem.OrderQty = Number(oItem.OrderQty || 0);
            oItem.RequiredQty = Number(oItem.RequiredQty || 0);
            oItem.StockQty = Number(oItem.StockQty || 0);
            oItem.ShortageQty = Number(oItem.ShortageQty || 0);

            var sStatus = oItem.Status || "";
            if (sStatus === "OK") {
                oItem.StatusText = "정상";
                oItem.StatusState = "Success";
                oItem.FilterStatus = "OK";
            } else if (sStatus === "SHORT") {
                oItem.StatusText = "부족";
                oItem.StatusState = "Error";
                oItem.FilterStatus = "SHORT";
            } else {
                oItem.StatusText = "확인";
                oItem.StatusState = "Warning";
                oItem.FilterStatus = "WARN";
            }

            oItem.MaterialName = oItem.ComponentText || oItem.Component || "-";
            oItem.MaterialCode = oItem.Component || "";
            oItem.CategoryLine = (oItem.ParentMatnr || "-") + " · 재고 " + oItem.StockQty + " EA";
            oItem.IsLowStock = oItem.ShortageQty > 0;
            oItem.LocationText = oItem.ParentMatnr
                ? "Depo " + String(oItem.ParentMatnr).slice(-1)
                : "Depo A";
            oItem.DateText = oItem.Remark || "—";

            this._assignMaterialVisual(oItem);
            return oItem;
        },

        _assignMaterialVisual: function (oItem) {
            var sCode = (oItem.Component || "").toUpperCase();
            var sName = (oItem.MaterialName || "").toUpperCase();
            var sImg = "product.svg";
            var sIcon = "sap-icon://product";

            if (sCode.indexOf("COT") >= 0 || sName.indexOf("COTTON") >= 0 || sName.indexOf("면") >= 0 || sName.indexOf("안감") >= 0) {
                sImg = "fabric.svg";
                sIcon = "sap-icon://palette";
            } else if (sCode.indexOf("ZIP") >= 0 || sName.indexOf("ZIP") >= 0 || sName.indexOf("지퍼") >= 0) {
                sImg = "zipper.svg";
                sIcon = "sap-icon://chain-link";
            } else if (sCode.indexOf("BRG") >= 0 || sName.indexOf("베어링") >= 0 || sName.indexOf("BEARING") >= 0) {
                sImg = "part.svg";
                sIcon = "sap-icon://lathe";
            } else if (sCode.indexOf("MOT") >= 0 || sName.indexOf("모터") >= 0 || sName.indexOf("MOTOR") >= 0) {
                sImg = "product.svg";
                sIcon = "sap-icon://machine";
            }

            oItem.ImageUrl = this._sImageBase + sImg;
            oItem.Icon = sIcon;
        },

        _refreshDashboard: function (aItems) {
            var oModel = this.getView().getModel("dashboard");
            var iTotal = aItems.length;
            var iActive = aItems.filter(function (i) { return i.FilterStatus === "OK"; }).length;
            var iWarn = aItems.filter(function (i) { return i.FilterStatus === "WARN"; }).length;
            var iShort = aItems.filter(function (i) { return i.FilterStatus === "SHORT"; }).length;
            var iShortageQty = aItems.reduce(function (s, i) { return s + Number(i.ShortageQty || 0); }, 0);

            oModel.setProperty("/summary", {
                total: iTotal,
                available: iActive,
                shortage: iShort,
                totalShortageQty: iShortageQty,
                totalLabel: "총 " + iTotal + "건",
                totalBadge: "총 " + iTotal + "건"
            });
            oModel.setProperty("/counts", {
                all: iTotal,
                active: iActive,
                warning: iWarn,
                shortage: iShort
            });
            oModel.setProperty("/items", aItems);
            oModel.setProperty("/categories", this._buildSelectOptions(aItems, "ParentMatnr", "전체 카테고리"));
            oModel.setProperty("/locations", this._buildSelectOptions(aItems, "LocationText", "전체 위치"));
            this._applyFiltersAndSort();
        },

        _buildSelectOptions: function (aItems, sField, sAllLabel) {
            var mUnique = {};
            aItems.forEach(function (o) {
                if (o[sField]) { mUnique[o[sField]] = true; }
            });
            var aOpts = [{ key: "ALL", text: sAllLabel }];
            Object.keys(mUnique).sort().forEach(function (k) {
                aOpts.push({ key: k, text: k });
            });
            return aOpts;
        },

        _applyFiltersAndSort: function () {
            var oModel = this.getView().getModel("dashboard");
            var oFilters = oModel.getProperty("/filters");
            var aItems = (this._aAllItems || []).slice();

            if (oFilters.status && oFilters.status !== "ALL") {
                aItems = aItems.filter(function (i) {
                    return i.FilterStatus === oFilters.status;
                });
            }
            if (oFilters.stock === "LOW") {
                aItems = aItems.filter(function (i) { return i.IsLowStock; });
            } else if (oFilters.stock === "OK") {
                aItems = aItems.filter(function (i) { return !i.IsLowStock; });
            }
            if (oFilters.category && oFilters.category !== "ALL") {
                aItems = aItems.filter(function (i) { return i.ParentMatnr === oFilters.category; });
            }
            if (oFilters.location && oFilters.location !== "ALL") {
                aItems = aItems.filter(function (i) { return i.LocationText === oFilters.location; });
            }

            var sQuery = (oFilters.query || "").trim().toLowerCase();
            if (sQuery) {
                aItems = aItems.filter(function (i) {
                    return (i.MaterialName || "").toLowerCase().indexOf(sQuery) >= 0
                        || (i.MaterialCode || "").toLowerCase().indexOf(sQuery) >= 0
                        || (i.ParentMatnr || "").toLowerCase().indexOf(sQuery) >= 0;
                });
            }

            oModel.setProperty("/displayItems", this._sortItems(aItems, oFilters.sort));
        },

        _sortItems: function (aItems, sSort) {
            var a = aItems.slice();
            if (sSort === "NAME_DESC") {
                a.sort(function (x, y) { return (y.MaterialName || "").localeCompare(x.MaterialName || ""); });
            } else if (sSort === "STOCK_ASC") {
                a.sort(function (x, y) { return x.StockQty - y.StockQty; });
            } else if (sSort === "STOCK_DESC") {
                a.sort(function (x, y) { return y.StockQty - x.StockQty; });
            } else {
                a.sort(function (x, y) { return (x.MaterialName || "").localeCompare(y.MaterialName || ""); });
            }
            return a;
        },

        _highlightStatusTab: function (sKey) {
            Object.keys(STATUS_TAB_IDS).forEach(function (k) {
                var oTile = this.byId(STATUS_TAB_IDS[k]);
                if (oTile) {
                    oTile.toggleStyleClass("invKpiTileSelected", k === sKey);
                }
            }.bind(this));
        },

        _extractSapError: function (oError, sDefault) {
            try {
                var oResponse = oError && oError.responseText && JSON.parse(oError.responseText);
                var oMsg = oResponse && oResponse.error && oResponse.error.message;
                if (oMsg && oMsg.value) {
                    return oMsg.value;
                }
            } catch (e) {
                // ignore parse error
            }
            return (oError && oError.message) || sDefault;
        },

        onRefresh: function () {
            this._loadSapBomStock();
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            this.getView().getModel("dashboard").setProperty("/filters/query", sQuery);
            this._applyFiltersAndSort();
        },

        onStatusFilter: function (oEvent) {
            var aCustom = oEvent.getSource().getCustomData();
            var sKey = (aCustom[0] && aCustom[0].getValue()) || "ALL";
            this.getView().getModel("dashboard").setProperty("/filters/status", sKey);
            this._highlightStatusTab(sKey);
            this._applyFiltersAndSort();
        },

        onSortChange: function (oEvent) {
            this.getView().getModel("dashboard").setProperty("/filters/sort", oEvent.getParameter("selectedItem").getKey());
            this._applyFiltersAndSort();
        },

        onStockFilterChange: function (oEvent) {
            this.getView().getModel("dashboard").setProperty("/filters/stock", oEvent.getParameter("selectedItem").getKey());
            this._applyFiltersAndSort();
        },

        onCategoryChange: function (oEvent) {
            this.getView().getModel("dashboard").setProperty("/filters/category", oEvent.getParameter("selectedItem").getKey());
            this._applyFiltersAndSort();
        },

        onLocationChange: function (oEvent) {
            this.getView().getModel("dashboard").setProperty("/filters/location", oEvent.getParameter("selectedItem").getKey());
            this._applyFiltersAndSort();
        },

        onClearFilters: function () {
            var oModel = this.getView().getModel("dashboard");
            oModel.setProperty("/filters", {
                status: "ALL",
                sort: "NAME_ASC",
                stock: "ALL",
                category: "ALL",
                location: "ALL",
                query: ""
            });
            var oSearch = this.byId("materialSearch");
            if (oSearch) { oSearch.setValue(""); }
            this._highlightStatusTab("ALL");
            this._applyFiltersAndSort();
            MessageToast.show("필터가 초기화되었습니다");
        },

        onNavChange: function (oEvent) {
            if (oEvent.getParameter("item").getKey() === "DASHBOARD") {
                MessageToast.show("KPI 대시보드는 추후 연결 예정");
                oEvent.getSource().setSelectedKey("INVENTORY");
            }
        },

        onAddMaterial: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            if (!oODataModel) {
                MessageBox.error("SAP OData 모델이 없습니다. manifest.json의 dataSource를 확인하세요.");
                return;
            }

            if (!this._oCreateDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "com.capstone.dashboard.fioridashboard.view.fragment.MaterialCreateDialog",
                    controller: this
                }).then(function (oDialog) {
                    this._oCreateDialog = oDialog;
                    this.getView().addDependent(this._oCreateDialog);
                    this._openCreateDialog();
                }.bind(this));
            } else {
                this._openCreateDialog();
            }
        },

        _openCreateDialog: function () {
            this.getView().getModel("create").setData(this._emptyCreatePayload());
            this._oCreateDialog.open();
        },

        onCancelMaterialCreate: function () {
            if (this._oCreateDialog) {
                this._oCreateDialog.close();
            }
        },

        onSaveMaterial: function () {
            var oCreateModel = this.getView().getModel("create");
            var oData = oCreateModel.getData();
            var oODataModel = this.getOwnerComponent().getModel();

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

            var oDialog = this._oCreateDialog;
            if (oDialog) {
                oDialog.setBusy(true);
            }

            oODataModel.create(this._sCreateEntityPath, oPayload, {
                success: function () {
                    if (oDialog) {
                        oDialog.setBusy(false);
                        oDialog.close();
                    }
                    MessageToast.show("SAP에 자재가 등록되었습니다");
                    this._loadSapBomStock();
                }.bind(this),
                error: function (oError) {
                    if (oDialog) {
                        oDialog.setBusy(false);
                    }
                    var sMsg = this._extractSapError(oError, "SAP 자재 등록에 실패했습니다.");
                    MessageBox.error(sMsg, {
                        title: "자재 추가 실패",
                        details: "Entity: " + this._sCreateEntityPath
                    });
                }.bind(this)
            });
        }

    });
});
