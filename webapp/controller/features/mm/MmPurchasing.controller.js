/**
 * MmPurchasing.controller.js — MM Purchasing Control Tower (SAP OData)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/service/mm/MmPurchasingDataService"
], function (Controller, MessageToast, MessageBox, MmPurchasingDataService) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.mm.MmPurchasing", {

        onInit: function () {
            this._oCache = null;
            this._bLoading = false;
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._fnRefreshHandler = this._onGlobalRefresh.bind(this);
            this._fnPurchasingActionHandler = this._onMmPurchasingAction.bind(this);
            this._oEventBus.subscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
            this._oEventBus.subscribe("dashboard", "mmPurchasingAction", this._fnPurchasingActionHandler, this);
            this._waitForDashboardModel();
        },

        onExit: function () {
            var oModel = this._getDashboardModel();

            if (this._oEventBus) {
                if (this._fnRefreshHandler) {
                    this._oEventBus.unsubscribe("dashboard", "refreshData", this._fnRefreshHandler, this);
                }
                if (this._fnPurchasingActionHandler) {
                    this._oEventBus.unsubscribe("dashboard", "mmPurchasingAction", this._fnPurchasingActionHandler, this);
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

            if (!oModel.getProperty("/mmPurchasing")) {
                oModel.setProperty("/mmPurchasing", MmPurchasingDataService.getEmptyState());
            }

            this._fnNavChange = this._onDashboardPropertyChange.bind(this);
            oModel.attachPropertyChange(this._fnNavChange, this);
            this._loadIfActive();
        },

        _isPurchasingActive: function () {
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return false;
            }
            return oModel.getProperty("/ui/navKey") === "MM_MATERIALS"
                && oModel.getProperty("/moduleView/activeSubTab") === "PURCHASING";
        },

        _onDashboardPropertyChange: function (oEvent) {
            var sPath = oEvent.getPath();
            if (sPath === "/ui/navKey" || sPath === "/moduleView/activeSubTab") {
                this._loadIfActive();
            }
        },

        _loadIfActive: function () {
            if (!this._isPurchasingActive()) {
                return;
            }
            if (this._bLoading) {
                return;
            }
            if (!this._oCache || !this._getDashboardModel().getProperty("/mmPurchasing/loaded")) {
                this._loadPurchasing(true);
            }
        },

        _getFiltersFromModel: function () {
            var oModel = this._getDashboardModel();
            return {
                poSearch: oModel.getProperty("/mmPurchasing/poSearch") || "",
                materialSearch: oModel.getProperty("/mmPurchasing/materialSearch") || "",
                migoSearch: oModel.getProperty("/mmPurchasing/migoSearch") || "",
                poLinkedFilter: oModel.getProperty("/mmPurchasing/poLinkedFilter") || "ALL",
                migoLinkedFilter: oModel.getProperty("/mmPurchasing/migoLinkedFilter") || "ALL",
                shortageOnly: oModel.getProperty("/mmPurchasing/shortageOnly") === true
            };
        },

        _setLoading: function (bLoading) {
            var oModel = this._getDashboardModel();
            if (oModel) {
                oModel.setProperty("/mmPurchasing/loading", bLoading);
            }
        },

        _applyPurchasingState: function (sSelectedId) {
            var oModel = this._getDashboardModel();
            var sResolved;
            var oState;

            if (!oModel || !this._oCache) {
                return;
            }

            sResolved = (sSelectedId !== undefined && sSelectedId !== null)
                ? String(sSelectedId)
                : String(oModel.getProperty("/mmPurchasing/selectedTrackerId") || "");

            oState = MmPurchasingDataService.buildPurchasingState(
                this._oCache,
                this._getFiltersFromModel(),
                sResolved
            );

            if (!oState.detail.hasSelection && oState.trackers.length > 0) {
                oState = MmPurchasingDataService.buildPurchasingState(
                    this._oCache,
                    this._getFiltersFromModel(),
                    oState.trackers[0].id
                );
            }

            oModel.setProperty("/mmPurchasing", oState);
            setTimeout(function () {
                this._syncAllSelections(oState.selectedTrackerId);
            }.bind(this), 80);
        },

        _syncAllSelections: function (sSelectedId) {
            this._syncTableSelection(sSelectedId);
            this._syncRiskQueueSelection(sSelectedId);
        },

        _syncRiskQueueSelection: function (sSelectedId) {
            var oList = this.byId("mmPurchasingRiskQueue");
            var aItems;
            var i;
            var sTrackerId;

            if (!oList || !sSelectedId) {
                return;
            }

            aItems = oList.getItems();
            for (i = 0; i < aItems.length; i++) {
                sTrackerId = aItems[i].getBindingContext("dashboard")
                    && aItems[i].getBindingContext("dashboard").getProperty("trackerId");
                if (sTrackerId === sSelectedId) {
                    oList.setSelectedItem(aItems[i]);
                    return;
                }
            }
        },

        _syncTableSelection: function (sSelectedId) {
            var oTable = this.byId("mmPurchasingTrackerTable");
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
            if (!this._isPurchasingActive()) {
                return;
            }
            this._loadPurchasing(false);
        },

        _loadPurchasing: function (bApplyCurrentQuery) {
            var oModel = this._getDashboardModel();
            var oComponent = this.getOwnerComponent();
            var sSelectedId = "";

            if (!oModel || !oComponent) {
                return;
            }

            if (this._bLoading) {
                return;
            }
            this._bLoading = true;

            if (bApplyCurrentQuery) {
                sSelectedId = oModel.getProperty("/mmPurchasing/selectedTrackerId") || "";
            }

            this._setLoading(true);
            oModel.setProperty("/mmPurchasing/error", "");

            MmPurchasingDataService.loadPurchasingData(oComponent)
                .then(function (oCache) {
                    this._oCache = oCache;

                    if (!bApplyCurrentQuery) {
                        var oDefaults = MmPurchasingDataService.getDefaultFilters();
                        oModel.setProperty("/mmPurchasing/poSearch", oDefaults.poSearch);
                        oModel.setProperty("/mmPurchasing/materialSearch", oDefaults.materialSearch);
                        oModel.setProperty("/mmPurchasing/migoSearch", oDefaults.migoSearch);
                        oModel.setProperty("/mmPurchasing/poLinkedFilter", oDefaults.poLinkedFilter);
                        oModel.setProperty("/mmPurchasing/migoLinkedFilter", oDefaults.migoLinkedFilter);
                        oModel.setProperty("/mmPurchasing/shortageOnly", oDefaults.shortageOnly);
                        sSelectedId = "";
                    }

                    this._applyPurchasingState(sSelectedId);
                    this._setLoading(false);
                    this._bLoading = false;
                }.bind(this))
                .catch(function (oError) {
                    this._setLoading(false);
                    this._bLoading = false;
                    this._oCache = null;
                    oModel.setProperty("/mmPurchasing/loaded", false);
                    oModel.setProperty("/mmPurchasing/error", oError.message || "SAP OData 조회 실패");
                    MessageBox.error(oError.message || "SAP OData 조회에 실패했습니다.");
                }.bind(this));
        },

        _onMmPurchasingAction: function (sChannel, sEvent, oData) {
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

        _showPurchasingToast: function (sMessage) {
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
                this._loadPurchasing(true);
                return;
            }
            this._applyPurchasingState("");
            this._showPurchasingToast("조회 조건을 적용했습니다.");
        },

        onResetPress: function () {
            var oModel = this._getDashboardModel();
            var oDefaults = MmPurchasingDataService.getDefaultFilters();

            if (!oModel) {
                return;
            }

            oModel.setProperty("/mmPurchasing/poSearch", oDefaults.poSearch);
            oModel.setProperty("/mmPurchasing/materialSearch", oDefaults.materialSearch);
            oModel.setProperty("/mmPurchasing/migoSearch", oDefaults.migoSearch);
            oModel.setProperty("/mmPurchasing/poLinkedFilter", oDefaults.poLinkedFilter);
            oModel.setProperty("/mmPurchasing/migoLinkedFilter", oDefaults.migoLinkedFilter);
            oModel.setProperty("/mmPurchasing/shortageOnly", oDefaults.shortageOnly);

            if (this._oCache) {
                this._applyPurchasingState("");
            } else {
                this._loadPurchasing(true);
            }
        },

        onRefreshPress: function () {
            this._loadPurchasing(true);
            this._showPurchasingToast("SAP 데이터 새로고침");
        },

        onTrackerSelect: function (oEvent) {
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
            this._applyPurchasingState(sId);
        },

        onRiskQueueSelect: function (oEvent) {
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

            sId = oContext.getProperty("trackerId");
            if (sId) {
                this._applyPurchasingState(sId);
            }
        }
    });
});
