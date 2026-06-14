/**
 * MmGoodsMovement.controller.js — MM Goods Movement Monitor (SAP OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/service/MmGoodsMovementDataService"
], function (Controller, MessageToast, MessageBox, MmGoodsMovementDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.MmGoodsMovement", {

        onInit: function () {
            this._oCache = null;
            this._bDataLoaded = false;
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._fnRefreshHandler = this._onGlobalRefresh.bind(this);
            this._fnGoodsMovementActionHandler = this._onMmGoodsMovementAction.bind(this);
            this._oEventBus.subscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
            this._oEventBus.subscribe("dashboard", "mmGoodsMovementAction", this._fnGoodsMovementActionHandler, this);
            this._waitForDashboardModel();
        },

        onExit: function () {
            var oModel = this._getDashboardModel();

            if (this._oEventBus) {
                if (this._fnRefreshHandler) {
                    this._oEventBus.unsubscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
                }
                if (this._fnGoodsMovementActionHandler) {
                    this._oEventBus.unsubscribe("dashboard", "mmGoodsMovementAction", this._fnGoodsMovementActionHandler, this);
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

            if (!oModel.getProperty("/mmGoodsMovement")) {
                oModel.setProperty("/mmGoodsMovement", MmGoodsMovementDataService.getEmptyState());
            }

            this._fnNavChange = this._onDashboardPropertyChange.bind(this);
            oModel.attachPropertyChange(this._fnNavChange, this);
            this._loadIfActive();
        },

        _isGoodsMovementActive: function () {
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return false;
            }
            return oModel.getProperty("/ui/navKey") === "MM_MATERIALS"
                && oModel.getProperty("/moduleView/activeSubTab") === "GOODS_MOVEMENT";
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();
            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._loadIfActive();
            }
        },

        _loadIfActive: function () {
            if (!this._isGoodsMovementActive()) {
                return;
            }
            if (!this._bDataLoaded) {
                this._bDataLoaded = true;
                this._loadGoodsMovement(true);
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
                migoSearch: oModel.getProperty("/mmGoodsMovement/migoSearch") || "",
                poSearch: oModel.getProperty("/mmGoodsMovement/poSearch") || "",
                materialSearch: oModel.getProperty("/mmGoodsMovement/materialSearch") || "",
                migoLinkedFilter: oModel.getProperty("/mmGoodsMovement/migoLinkedFilter") || "ALL",
                shortageOnly: oModel.getProperty("/mmGoodsMovement/shortageOnly") === true
            };
        },

        _setLoading: function (bLoading) {
            var oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/mmGoodsMovement/loading", bLoading);
            }
        },

        _applyGoodsMovementState: function (sSelectedId) {
            var oModel = this._getDashboardModel();
            var sResolved;
            var oState;

            if (!oModel || !this._oCache) {
                return;
            }

            sResolved = (sSelectedId !== undefined && sSelectedId !== null)
                ? String(sSelectedId)
                : String(oModel.getProperty("/mmGoodsMovement/selectedMovementId") || "");

            oState = MmGoodsMovementDataService.buildGoodsMovementState(
                this._oCache,
                this._getFiltersFromModel(),
                sResolved
            );

            if (!oState.detail.hasSelection && oState.movements.length > 0) {
                oState = MmGoodsMovementDataService.buildGoodsMovementState(
                    this._oCache,
                    this._getFiltersFromModel(),
                    oState.movements[0].id
                );
            }

            oModel.setProperty("/mmGoodsMovement", oState);
            setTimeout(function () {
                this._syncDocumentSelection(oState.selectedMovementId);
            }.bind(this), 80);
        },

        _syncDocumentSelection: function (sSelectedId) {
            var aListIds = ["mmGmLinkedQueue", "mmGmMissingQueue"];
            var iList;
            var oList;
            var aItems;
            var i;

            if (!sSelectedId) {
                return;
            }

            for (iList = 0; iList < aListIds.length; iList++) {
                oList = this.byId(aListIds[iList]);
                if (!oList) {
                    continue;
                }
                aItems = oList.getItems();
                for (i = 0; i < aItems.length; i++) {
                    if (aItems[i].getBindingContext("dashboard")
                        && aItems[i].getBindingContext("dashboard").getProperty("id") === sSelectedId) {
                        oList.setSelectedItem(aItems[i]);
                        return;
                    }
                }
            }
        },

        _onGlobalRefresh: function () {
            if (!this._isGoodsMovementActive()) {
                return;
            }
            this._loadGoodsMovement(false);
        },

        _loadGoodsMovement: function (bApplyCurrentQuery) {
            var oModel = this._getDashboardModel();
            var oComponent = this.getOwnerComponent();
            var sSelectedId = "";

            if (!oModel || !oComponent) {
                return;
            }

            if (bApplyCurrentQuery) {
                sSelectedId = oModel.getProperty("/mmGoodsMovement/selectedMovementId") || "";
            }

            this._setLoading(true);
            oModel.setProperty("/mmGoodsMovement/error", "");

            MmGoodsMovementDataService.loadGoodsMovementData(oComponent, this._resolveImageBase())
                .then(function (oCache) {
                    this._oCache = oCache;

                    if (!bApplyCurrentQuery) {
                        var oDefaults = MmGoodsMovementDataService.getDefaultFilters();
                        oModel.setProperty("/mmGoodsMovement/migoSearch", oDefaults.migoSearch);
                        oModel.setProperty("/mmGoodsMovement/poSearch", oDefaults.poSearch);
                        oModel.setProperty("/mmGoodsMovement/materialSearch", oDefaults.materialSearch);
                        oModel.setProperty("/mmGoodsMovement/migoLinkedFilter", oDefaults.migoLinkedFilter);
                        oModel.setProperty("/mmGoodsMovement/shortageOnly", oDefaults.shortageOnly);
                        sSelectedId = "";
                    }

                    this._applyGoodsMovementState(sSelectedId);
                    this._setLoading(false);
                }.bind(this))
                .catch(function (oError) {
                    this._setLoading(false);
                    oModel.setProperty("/mmGoodsMovement/loaded", false);
                    oModel.setProperty("/mmGoodsMovement/error", oError.message || "SAP OData 조회 실패");
                    MessageBox.error(oError.message || "SAP OData 조회에 실패했습니다.");
                }.bind(this));
        },

        _onMmGoodsMovementAction: function (sChannel, sEvent, oData) {
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

        _showGoodsMovementToast: function (sMessage) {
            MessageToast.show(sMessage, {
                duration: 2000,
                width: "15em",
                my: "RightTop",
                at: "RightTop",
                offset: "-12 72"
            });
        },

        onSearchPress: function () {
            if (!this._oCache) {
                this._showGoodsMovementToast("데이터를 먼저 조회해 주세요.");
                return;
            }
            this._applyGoodsMovementState("");
        },

        onResetPress: function () {
            var oModel = this._getDashboardModel();
            var oDefaults = MmGoodsMovementDataService.getDefaultFilters();

            if (!oModel) {
                return;
            }

            oModel.setProperty("/mmGoodsMovement/migoSearch", oDefaults.migoSearch);
            oModel.setProperty("/mmGoodsMovement/poSearch", oDefaults.poSearch);
            oModel.setProperty("/mmGoodsMovement/materialSearch", oDefaults.materialSearch);
            oModel.setProperty("/mmGoodsMovement/migoLinkedFilter", oDefaults.migoLinkedFilter);
            oModel.setProperty("/mmGoodsMovement/shortageOnly", oDefaults.shortageOnly);

            if (this._oCache) {
                this._applyGoodsMovementState("");
            }
        },

        onRefreshPress: function () {
            this._loadGoodsMovement(true);
            this._showGoodsMovementToast("SAP 데이터 새로고침");
        },

        onMovementSelect: function (oEvent) {
            this.onDocumentSelect(oEvent);
        },

        onDocumentSelect: function (oEvent) {
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
            this._applyGoodsMovementState(sId);
        }
    });
});
