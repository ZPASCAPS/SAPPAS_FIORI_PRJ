/**
 * NotesPanel.controller.js — 헤더 메모장 오버레이 (최상단 표시 + 헤더 드래그 이동)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    var NAV_TO_NOTES_MODULE = {
        SD_SALES: "SD",
        PP_PRODUCTION: "PP",
        MM_MATERIALS: "MM",
        FI_CO_FINANCE: "FI"
    };

    var PANEL_Z_INDEX = 11000;

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.NotesPanel", {

        onInit: function () {
            this._oDragState = null;
            this._fnToggleHandler = this._onToggleNotesPanel.bind(this);
            this._fnMouseMove = this._onDragMove.bind(this);
            this._fnMouseUp = this._onDragEnd.bind(this);
            this._fnDragStart = this._onDragStart.bind(this);
            this._fnTouchMove = this._onTouchMove.bind(this);
            this._fnTouchEnd = this._onDragEnd.bind(this);

            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("dashboard", "toggleNotesPanel", this._fnToggleHandler, this);
        },

        onExit: function () {
            if (this._oEventBus && this._fnToggleHandler) {
                this._oEventBus.unsubscribe("dashboard", "toggleNotesPanel", this._fnToggleHandler, this);
            }
            this._unbindPanelDrag();
        },

        onAfterRendering: function () {
            this._ensurePanelPortal();
        },

        _onToggleNotesPanel: function (sChannel, sEvent, oData) {
            var oPanel = this.byId("notesPanel");
            var bOpen;

            if (!oPanel) {
                return;
            }

            bOpen = !oPanel.getVisible();
            oPanel.setVisible(bOpen);

            if (bOpen) {
                setTimeout(function () {
                    this._syncNotesModule(true);
                    this._ensurePanelPortal();
                    this._bringPanelToFront();
                    this._positionPanelNearOpener(oData && oData.openById);
                    this._bindPanelDrag();
                }.bind(this), 50);
            } else {
                this._unbindPanelDrag();
            }
        },

        onCloseNotesPanel: function () {
            var oPanel = this.byId("notesPanel");

            if (oPanel) {
                oPanel.setVisible(false);
            }
            this._unbindPanelDrag();
        },

        _syncNotesModule: function (bForce) {
            var oComponent = this.getOwnerComponent();
            var oModel = oComponent && oComponent.getModel("dashboard");
            var sNavKey = oModel && oModel.getProperty("/ui/navKey");
            var sModule = NAV_TO_NOTES_MODULE[sNavKey] || "MM";

            this._oEventBus.publish("dashboard", "notesSyncModule", {
                module: sModule,
                force: !!bForce
            });
        },

        _getOpenerDom: function (sOpenById) {
            var oOpener;

            if (sOpenById) {
                oOpener = sap.ui.getCore().byId(sOpenById);
                if (oOpener && oOpener.getDomRef()) {
                    return oOpener.getDomRef();
                }
            }

            return null;
        },

        _getPanelDom: function () {
            var oPanel = this.byId("notesPanel");
            return oPanel && oPanel.getDomRef();
        },

        _ensurePanelPortal: function () {
            var oDom = this._getPanelDom();

            if (!oDom || oDom.parentNode === document.body) {
                return;
            }

            document.body.appendChild(oDom);
        },

        _bringPanelToFront: function () {
            var oDom = this._getPanelDom();
            var oParent;

            if (!oDom) {
                return;
            }

            oDom.classList.add("nxNotesPanelFront");
            oDom.style.setProperty("z-index", String(PANEL_Z_INDEX), "important");
            oParent = oDom.parentNode;

            if (oParent && oParent.lastElementChild !== oDom) {
                oParent.appendChild(oDom);
            }
        },

        _positionPanelNearOpener: function (sOpenById) {
            var oOpenerDom = this._getOpenerDom(sOpenById);
            var oPanelDom = this._getPanelDom();
            var oOpenerRect;
            var iPanelLeft;
            var iPanelTop;
            var iMaxLeft;
            var iMaxTop;

            if (!oPanelDom) {
                return;
            }

            if (!oOpenerDom) {
                this._applyPanelPosition(oPanelDom, Math.max(8, window.innerWidth - oPanelDom.offsetWidth - 24), 72);
                return;
            }

            oOpenerRect = oOpenerDom.getBoundingClientRect();
            iPanelLeft = oOpenerRect.right - oPanelDom.offsetWidth;
            iPanelTop = oOpenerRect.bottom + 10;
            iMaxLeft = window.innerWidth - oPanelDom.offsetWidth - 8;
            iMaxTop = window.innerHeight - oPanelDom.offsetHeight - 8;

            if (iPanelTop + oPanelDom.offsetHeight > window.innerHeight - 8) {
                iPanelTop = Math.max(8, oOpenerRect.top - oPanelDom.offsetHeight - 10);
            }

            iPanelLeft = Math.max(8, Math.min(iPanelLeft, iMaxLeft));
            iPanelTop = Math.max(8, Math.min(iPanelTop, iMaxTop));

            this._applyPanelPosition(oPanelDom, iPanelLeft, iPanelTop);
        },

        _applyPanelPosition: function (oDom, iLeft, iTop) {
            oDom.classList.add("nxNotesPanelMoved");
            oDom.style.setProperty("position", "fixed", "important");
            oDom.style.setProperty("left", iLeft + "px", "important");
            oDom.style.setProperty("top", iTop + "px", "important");
            oDom.style.setProperty("right", "auto", "important");
            oDom.style.setProperty("bottom", "auto", "important");
            oDom.style.setProperty("z-index", String(PANEL_Z_INDEX), "important");
        },

        _bindPanelDrag: function () {
            var oHeader = this.byId("notesPanelHeader");
            var oHeaderDom = oHeader && oHeader.getDomRef();

            this._unbindPanelDrag();

            if (!oHeaderDom) {
                return;
            }

            oHeaderDom.addEventListener("mousedown", this._fnDragStart);
            oHeaderDom.addEventListener("touchstart", this._fnDragStart, { passive: false });
            this._bDragBound = true;
        },

        _unbindPanelDrag: function () {
            var oHeader = this.byId("notesPanelHeader");
            var oHeaderDom = oHeader && oHeader.getDomRef();

            if (oHeaderDom) {
                oHeaderDom.removeEventListener("mousedown", this._fnDragStart);
                oHeaderDom.removeEventListener("touchstart", this._fnDragStart);
            }

            document.removeEventListener("mousemove", this._fnMouseMove);
            document.removeEventListener("mouseup", this._fnMouseUp);
            document.removeEventListener("touchmove", this._fnTouchMove);
            document.removeEventListener("touchend", this._fnTouchEnd);
            this._bDragBound = false;
            this._oDragState = null;
        },

        _isCloseButtonTarget: function (oTarget) {
            return oTarget && oTarget.closest && oTarget.closest(".nxNotesPanelClose");
        },

        _onDragStart: function (oEvent) {
            var oDom = this._getPanelDom();
            var oRect;
            var iClientX;
            var iClientY;

            if (!oDom || this._isCloseButtonTarget(oEvent.target)) {
                return;
            }

            this._bringPanelToFront();

            if (oEvent.type === "touchstart") {
                iClientX = oEvent.touches[0].clientX;
                iClientY = oEvent.touches[0].clientY;
                oEvent.preventDefault();
            } else {
                iClientX = oEvent.clientX;
                iClientY = oEvent.clientY;
                oEvent.preventDefault();
            }

            oRect = oDom.getBoundingClientRect();
            this._applyPanelPosition(oDom, oRect.left, oRect.top);
            this._oDragState = {
                startX: iClientX,
                startY: iClientY,
                startLeft: oRect.left,
                startTop: oRect.top
            };

            oDom.classList.add("nxNotesPanelDragging");
            document.addEventListener("mousemove", this._fnMouseMove);
            document.addEventListener("mouseup", this._fnMouseUp);
            document.addEventListener("touchmove", this._fnTouchMove, { passive: false });
            document.addEventListener("touchend", this._fnTouchEnd);
        },

        _onTouchMove: function (oEvent) {
            if (oEvent.touches && oEvent.touches.length) {
                this._moveDrag(oEvent.touches[0].clientX, oEvent.touches[0].clientY);
                oEvent.preventDefault();
            }
        },

        _onDragMove: function (oEvent) {
            if (this._oDragState) {
                oEvent.preventDefault();
            }
            this._moveDrag(oEvent.clientX, oEvent.clientY);
        },

        _moveDrag: function (iClientX, iClientY) {
            var oDom = this._getPanelDom();
            var iDeltaX;
            var iDeltaY;
            var iNewLeft;
            var iNewTop;

            if (!this._oDragState || !oDom) {
                return;
            }

            iDeltaX = iClientX - this._oDragState.startX;
            iDeltaY = iClientY - this._oDragState.startY;
            iNewLeft = this._oDragState.startLeft + iDeltaX;
            iNewTop = this._oDragState.startTop + iDeltaY;
            iNewLeft = Math.max(8, Math.min(iNewLeft, window.innerWidth - oDom.offsetWidth - 8));
            iNewTop = Math.max(8, Math.min(iNewTop, window.innerHeight - oDom.offsetHeight - 8));
            this._applyPanelPosition(oDom, iNewLeft, iNewTop);
        },

        _onDragEnd: function () {
            var oDom = this._getPanelDom();

            if (!this._oDragState) {
                return;
            }

            this._oDragState = null;
            document.removeEventListener("mousemove", this._fnMouseMove);
            document.removeEventListener("mouseup", this._fnMouseUp);
            document.removeEventListener("touchmove", this._fnTouchMove);
            document.removeEventListener("touchend", this._fnTouchEnd);

            if (oDom) {
                oDom.classList.remove("nxNotesPanelDragging");
            }
        }
    });
});
