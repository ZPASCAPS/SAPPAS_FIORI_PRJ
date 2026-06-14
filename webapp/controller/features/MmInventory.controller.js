/**
 * MmInventory.controller.js — MM Inventory master-detail (SAP OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/service/MmInventoryDataService"
], function (Controller, MessageToast, MessageBox, MmInventoryDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.MmInventory", {

        onInit: function () {
            this._oCache = null;
            this._bDataLoaded = false;
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._fnRefreshHandler = this._onGlobalRefresh.bind(this);
            this._fnInventoryActionHandler = this._onMmInventoryAction.bind(this);
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
        },

        _getDashboardModel: function () {
            var oView = this.getView();
            return (oView && oView.getModel("dashboard")) || this.getOwnerComponent().getModel("dashboard");
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
            this._loadIfActive();
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
                this._loadIfActive();
            }
        },

        _loadIfActive: function () {
            if (!this._isInventoryActive()) {
                return;
            }
            if (!this._bDataLoaded) {
                this._bDataLoaded = true;
                this._loadInventory(true);
            }
        },

        _resolveImageBase: function () {
            try {
                return sap.ui.require.toUrl("com/capstone/dashboard/fioridashboard/images/");
            } catch (e) {
                return "images/";
            }
        },

        _getFiltersFromModel: function () {
            var oModel = this._getDashboardModel();
            return {
                materialSearch: oModel.getProperty("/mmInventory/materialSearch") || "",
                statusFilter: oModel.getProperty("/mmInventory/statusFilter") || "ALL",
                typeLabelFilter: oModel.getProperty("/mmInventory/typeLabelFilter") || "ALL",
                shortageOnly: oModel.getProperty("/mmInventory/shortageOnly") === true
            };
        },

        _setLoading: function (bLoading) {
            var oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/mmInventory/loading", bLoading);
            }
        },

        _applyInventoryState: function (sSelectedId) {
            var oModel = this._getDashboardModel();
            var sResolved;
            var oState;

            if (!oModel || !this._oCache) {
                return;
            }

            sResolved = (sSelectedId !== undefined && sSelectedId !== null)
                ? String(sSelectedId)
                : String(oModel.getProperty("/mmInventory/selectedMaterialId") || "");

            oState = MmInventoryDataService.buildInventoryState(
                this._oCache,
                this._getFiltersFromModel(),
                sResolved
            );

            if (!oState.detail.hasSelection && oState.materials.length > 0) {
                oState = MmInventoryDataService.buildInventoryState(
                    this._oCache,
                    this._getFiltersFromModel(),
                    oState.materials[0].id
                );
            }

            oModel.setProperty("/mmInventory", oState);
            setTimeout(function () {
                this._syncTableSelection(oState.selectedMaterialId);
            }.bind(this), 80);
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

        _syncTableSelection: function (sSelectedId) {
            var oTable = this.byId("mmInventoryMaterialTable");
            var aItems;
            var i;

            if (!oTable || !sSelectedId) {
                return;
            }

            aItems = oTable.getItems();
            for (i = 0; i < aItems.length; i++) {
                if (aItems[i].getBindingContext("dashboard")
                    && aItems[i].getBindingContext("dashboard").getProperty("id") === sSelectedId) {
                    oTable.setSelectedItem(aItems[i]);
                    return;
                }
            }
        },

        _onGlobalRefresh: function () {
            if (!this._isInventoryActive()) {
                return;
            }
            this._loadInventory(false);
        },

        _loadInventory: function (bApplyCurrentQuery) {
            var oModel = this._getDashboardModel();
            var oComponent = this.getOwnerComponent();
            var sSelectedId = "";

            if (!oModel || !oComponent) {
                return;
            }

            if (bApplyCurrentQuery) {
                sSelectedId = oModel.getProperty("/mmInventory/selectedMaterialId") || "";
            }

            this._setLoading(true);
            oModel.setProperty("/mmInventory/error", "");

            MmInventoryDataService.loadInventoryData(oComponent, this._resolveImageBase())
                .then(function (oCache) {
                    this._oCache = oCache;

                    if (!bApplyCurrentQuery) {
                        var oDefaults = MmInventoryDataService.getDefaultFilters();
                        oModel.setProperty("/mmInventory/materialSearch", oDefaults.materialSearch);
                        oModel.setProperty("/mmInventory/statusFilter", oDefaults.statusFilter);
                        oModel.setProperty("/mmInventory/typeLabelFilter", oDefaults.typeLabelFilter);
                        oModel.setProperty("/mmInventory/shortageOnly", oDefaults.shortageOnly);
                        sSelectedId = "";
                    }

                    this._applyInventoryState(sSelectedId);
                    this._setLoading(false);
                }.bind(this))
                .catch(function (oError) {
                    this._setLoading(false);
                    oModel.setProperty("/mmInventory/loaded", false);
                    oModel.setProperty("/mmInventory/error", oError.message || "SAP OData 조회 실패");
                    MessageBox.error(oError.message || "SAP OData 조회에 실패했습니다.");
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
                this._showInventoryToast("데이터를 먼저 조회해 주세요.");
                return;
            }
            this._applyInventoryState("");
        },

        onResetPress: function () {
            var oModel = this._getDashboardModel();
            var oDefaults = MmInventoryDataService.getDefaultFilters();

            if (!oModel) {
                return;
            }

            oModel.setProperty("/mmInventory/materialSearch", oDefaults.materialSearch);
            oModel.setProperty("/mmInventory/statusFilter", oDefaults.statusFilter);
            oModel.setProperty("/mmInventory/typeLabelFilter", oDefaults.typeLabelFilter);
            oModel.setProperty("/mmInventory/shortageOnly", oDefaults.shortageOnly);

            if (this._oCache) {
                this._applyInventoryState("");
            }
        },

        onRefreshPress: function () {
            this._loadInventory(true);
            this._showInventoryToast("SAP 데이터 새로고침");
        },

        onMaterialSelect: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext;
            var sId;

            if (!oItem) {
                return;
            }

            oContext = oItem.getBindingContext("dashboard");
            if (!oContext) {
                return;
            }

            sId = oContext.getProperty("id");
            this._applyInventoryState(sId);
        }
    });
});
