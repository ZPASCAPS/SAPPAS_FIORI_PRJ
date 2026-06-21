/**
 * MmNotes.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.mm.MmNotes
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.mm.MmNotes
 *
 * 역할:
 * - MM 업무 노트 (OData 공유 저장 + LocalStorage fallback).
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/capstone/dashboard/fioridashboard/util/mm/MmNotesStorage",
    "com/capstone/dashboard/fioridashboard/service/NotesDataService"
], function (Controller, JSONModel, MessageToast, MmNotesStorage, NotesDataService) {
    "use strict";

    var MM_SECTION_OPTIONS = [
        { key: "General", text: "General" },
        { key: "Overview", text: "Overview" },
        { key: "Inventory", text: "Inventory" },
        { key: "Purchasing", text: "Purchasing" },
        { key: "Goods Movement", text: "Goods Movement" },
        { key: "Report", text: "Report" }
    ];

    var GENERAL_SECTION_OPTIONS = [
        { key: "General", text: "General" }
    ];

    var WORKSPACE_MODULES = ["SD", "PP", "MM", "FI"];

    var AUTHOR_OPTIONS = [
        { name: "김용민", initial: "김" },
        { name: "신성진", initial: "신" },
        { name: "박찬영", initial: "박" }
    ];

    var MODULE_TAB_BTN_IDS = {
        SD: "mmNotesModuleTabSD",
        PP: "mmNotesModuleTabPP",
        MM: "mmNotesModuleTabMM",
        FI: "mmNotesModuleTabFI"
    };

    var FONT_SIZE_OPTIONS = [
        { key: "14", text: "14px" },
        { key: "16", text: "16px" },
        { key: "18", text: "18px" },
        { key: "20", text: "20px" },
        { key: "24", text: "24px" }
    ];

    var FONT_FAMILY_OPTIONS = [
        { key: "default", text: "기본" },
        { key: "sans", text: "고딕" },
        { key: "serif", text: "명조" },
        { key: "mono", text: "고정폭" }
    ];

    function getDefaultNoteFields(sModule) {
        return {
            fontSize: "16",
            fontFamily: "default",
            author: ""
        };
    }

    function normalizeNoteFields(oNote, sModule) {
        var oDefaults = getDefaultNoteFields(sModule);

        return {
            fontSize: oNote.fontSize || oDefaults.fontSize,
            fontFamily: oNote.fontFamily || oDefaults.fontFamily,
            author: oNote.author || ""
        };
    }

    function pad2(nValue) {
        return nValue < 10 ? "0" + nValue : String(nValue);
    }

    function formatListDate(sIso) {
        var d;

        if (!sIso) {
            return "";
        }

        d = new Date(sIso);

        if (isNaN(d.getTime())) {
            return "";
        }

        return d.getFullYear() + " / " + pad2(d.getMonth() + 1) + " / " + pad2(d.getDate());
    }

    function formatUpdatedDateTime(sIso) {
        var d;
        var sDate;
        var sTime;

        if (!sIso) {
            return "";
        }

        d = new Date(sIso);

        if (isNaN(d.getTime())) {
            return "";
        }

        sDate = formatListDate(sIso);
        sTime = d.toLocaleString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });

        return sDate + "  " + sTime;
    }

    function getAuthorInitial(sAuthor) {
        var sTrimmed = (sAuthor || "").trim();

        return sTrimmed ? sTrimmed.charAt(0) : "";
    }

    function normalizeSection(sSection) {
        if (sSection === "Reports") {
            return "Report";
        }

        return sSection || "General";
    }

    function enrichNoteForEditor(oNote, sModule) {
        var oNorm = normalizeNoteFields(oNote, sModule);
        var sAuthor = oNorm.author;

        return {
            id: oNote.id,
            title: oNote.title || "",
            content: oNote.content || "",
            module: oNote.module || sModule || "MM",
            section: normalizeSection(oNote.section),
            createdAt: oNote.createdAt || "",
            updatedAt: oNote.updatedAt || "",
            updatedAtDisplay: formatUpdatedDateTime(oNote.updatedAt),
            author: sAuthor,
            authorInitial: getAuthorInitial(sAuthor),
            fontSize: oNorm.fontSize,
            fontFamily: oNorm.fontFamily
        };
    }

    function enrichNoteForList(oNote) {
        var sAuthor = oNote.author || "";

        return {
            id: oNote.id,
            title: oNote.title || "제목 없음",
            section: normalizeSection(oNote.section),
            updatedAt: oNote.updatedAt,
            updatedAtDisplay: formatListDate(oNote.updatedAt),
            author: sAuthor,
            authorInitial: getAuthorInitial(sAuthor)
        };
    }

    function getSectionOptions(sModule) {
        return sModule === "MM" ? MM_SECTION_OPTIONS.slice() : GENERAL_SECTION_OPTIONS.slice();
    }

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.mm.MmNotes", {

        onInit: function () {
            var that = this;

            this._notesCache = {};
            this._bNotesODataDisabled = false;
            this._oNotesODataModel = this.getOwnerComponent().getModel("notesModel");

            if (this._oNotesODataModel) {
                this._oNotesODataModel.attachMetadataFailed(function () {
                    that._bNotesODataDisabled = true;
                });
            }

            this._initNotesModel("MM");
            this._loadModuleNotes("MM");

            this.getView().addEventDelegate({
                onAfterRendering: this._onModuleTabsAfterRendering
            }, this);

            this._fnModuleTabResize = this._updateModuleTabIndicator.bind(this, true);
            window.addEventListener("resize", this._fnModuleTabResize);

            this._fnNotesSyncHandler = this._onNotesSyncModule.bind(this);
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("dashboard", "notesSyncModule", this._fnNotesSyncHandler, this);
        },

        _onNotesSyncModule: function (sChannel, sEvent, oData) {
            if (oData && oData.module) {
                this._switchWorkspace(oData.module);
            }
        },

        _getNotesODataModel: function () {
            if (this._bNotesODataDisabled || !this._oNotesODataModel) {
                return null;
            }

            return this._oNotesODataModel;
        },

        _initNotesModel: function (sModule) {
            var oDefaults = getDefaultNoteFields(sModule);
            var sPickedAuthor = this._getCurrentAuthor() || "박찬영";
            var oNotesModel = new JSONModel({
                activeModule: sModule,
                workspaceTitle: sModule + " Note",
                pickedAuthor: sPickedAuthor,
                authorOptions: AUTHOR_OPTIONS.slice(),
                notes: [],
                selectedNoteId: "",
                selectedNote: {
                    id: "",
                    title: "",
                    content: "",
                    module: sModule,
                    section: "General",
                    createdAt: "",
                    updatedAt: "",
                    author: "",
                    fontSize: oDefaults.fontSize,
                    fontFamily: oDefaults.fontFamily
                },
                hasNotes: false,
                hasSelectedNote: false,
                isSharedStorage: false,
                isLoading: false,
                sectionOptions: getSectionOptions(sModule),
                fontSizeOptions: FONT_SIZE_OPTIONS.slice(),
                fontFamilyOptions: FONT_FAMILY_OPTIONS.slice()
            });

            this.getView().setModel(oNotesModel, "mmNotes");
        },

        _getCurrentAuthor: function () {
            var oDashboard = this.getView().getModel("dashboard");
            var sName = oDashboard && oDashboard.getProperty("/user/editName");

            if (!sName) {
                sName = oDashboard && oDashboard.getProperty("/user/name");
            }

            return sName || "";
        },

        _getNotesModel: function () {
            return this.getView().getModel("mmNotes");
        },

        _getActiveModule: function () {
            var oModel = this._getNotesModel();

            return oModel ? oModel.getProperty("/activeModule") || "MM" : "MM";
        },

        _setViewBusy: function (bBusy) {
            var oView = this.getView();

            if (oView) {
                oView.setBusy(bBusy);
            }
        },

        _applyNotesToModel: function (sModule, aNotes, bShared) {
            var oModel = this._getNotesModel();

            oModel.setProperty("/notes", (aNotes || []).map(enrichNoteForList));
            oModel.setProperty("/hasNotes", aNotes && aNotes.length > 0);
            oModel.setProperty("/isSharedStorage", bShared);
        },

        _loadModuleNotes: function (sModule) {
            var that = this;
            var oModel = this._getNotesModel();

            this._nLoadSeq = (this._nLoadSeq || 0) + 1;
            var nSeq = this._nLoadSeq;

            oModel.setProperty("/isLoading", true);
            this._setViewBusy(true);

            return MmNotesStorage.loadAsync(sModule, this._getNotesODataModel()).then(function (oResult) {
                if (nSeq !== that._nLoadSeq) {
                    return;
                }

                if (oResult.odataFailed) {
                    that._bNotesODataDisabled = true;
                }
                that._notesCache[sModule] = oResult.notes || [];
                that._applyNotesToModel(sModule, that._notesCache[sModule], oResult.shared);
            }).finally(function () {
                if (nSeq !== that._nLoadSeq) {
                    return;
                }

                oModel.setProperty("/isLoading", false);
                that._setViewBusy(false);
            });
        },

        _clearSelection: function () {
            var oModel = this._getNotesModel();
            var sModule = this._getActiveModule();
            var oDefaults = getDefaultNoteFields(sModule);

            oModel.setProperty("/selectedNoteId", "");
            oModel.setProperty("/selectedNote", {
                id: "",
                title: "",
                content: "",
                module: sModule,
                section: "General",
                createdAt: "",
                updatedAt: "",
                author: "",
                fontSize: oDefaults.fontSize,
                fontFamily: oDefaults.fontFamily
            });
            oModel.setProperty("/hasSelectedNote", false);
        },

        _generateId: function () {
            return "note-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
        },

        _findNoteIndex: function (aNotes, sId) {
            var i;

            for (i = 0; i < aNotes.length; i++) {
                if (aNotes[i].id === sId) {
                    return i;
                }
            }

            return -1;
        },

        _getModuleNotes: function (sModule) {
            return this._notesCache[sModule] || [];
        },

        _syncListSelection: function (sId) {
            var oList = this.byId("mmNotesPageList");

            if (!oList || !sId) {
                return;
            }

            var aItems = oList.getItems();
            var i;

            for (i = 0; i < aItems.length; i++) {
                var oCtx = aItems[i].getBindingContext("mmNotes");

                if (oCtx && oCtx.getProperty("id") === sId) {
                    oList.setSelectedItem(aItems[i]);
                    return;
                }
            }
        },

        _selectNoteById: function (sId) {
            var sModule = this._getActiveModule();
            var aRaw = this._getModuleNotes(sModule);
            var i = this._findNoteIndex(aRaw, sId);
            var oModel = this._getNotesModel();

            if (i < 0) {
                return false;
            }

            oModel.setProperty("/selectedNoteId", sId);
            oModel.setProperty("/selectedNote", enrichNoteForEditor(aRaw[i], sModule));
            oModel.setProperty("/hasSelectedNote", true);
            oModel.setProperty("/pickedAuthor", aRaw[i].author || oModel.getProperty("/pickedAuthor"));
            setTimeout(this._syncListSelection.bind(this, sId), 0);

            return true;
        },

        _deleteNoteById: function (sId) {
            var that = this;
            var oModel = this._getNotesModel();
            var sModule = this._getActiveModule();

            this._setViewBusy(true);

            MmNotesStorage.removeAsync(sModule, sId, this._getNotesODataModel()).then(function (oResult) {
                if (oResult.odataFailed) {
                    that._bNotesODataDisabled = true;
                }
                that._notesCache[sModule] = that._getModuleNotes(sModule).filter(function (o) {
                    return o.id !== sId;
                });
                that._applyNotesToModel(sModule, that._notesCache[sModule], oResult.shared);

                if (oModel.getProperty("/selectedNoteId") === sId) {
                    that._clearSelection();
                }

                MessageToast.show(oResult.shared ? "공유 노트가 삭제되었습니다" : "페이지가 삭제되었습니다 (로컬)");
            }).catch(function (oError) {
                MessageToast.show(NotesDataService.extractMessage(oError, "삭제에 실패했습니다"));
            }).finally(function () {
                that._setViewBusy(false);
            });
        },

        _focusTitleInput: function () {
            var oInput = this.byId("mmNotesTitleInput");
            var oDomInput;

            if (!oInput) {
                return;
            }

            oInput.focus();
            oDomInput = oInput.getFocusDomRef();

            if (oDomInput && oDomInput.select) {
                oDomInput.select();
            }
        },

        _getNoteIdFromListAction: function (oSource) {
            var oCtx = oSource.getBindingContext("mmNotes");
            var oParent;

            if (oCtx) {
                return oCtx.getProperty("id");
            }

            oParent = oSource.getParent();

            while (oParent) {
                oCtx = oParent.getBindingContext("mmNotes");

                if (oCtx) {
                    return oCtx.getProperty("id");
                }

                oParent = oParent.getParent();
            }

            return "";
        },

        _switchWorkspace: function (sModule) {
            var oModel = this._getNotesModel();

            if (!sModule || sModule === oModel.getProperty("/activeModule")) {
                return;
            }

            oModel.setProperty("/activeModule", sModule);
            oModel.setProperty("/workspaceTitle", sModule + " Note");
            oModel.setProperty("/sectionOptions", getSectionOptions(sModule));
            this._clearSelection();

            var oList = this.byId("mmNotesPageList");

            if (oList) {
                oList.removeSelections(true);
            }

            this._loadModuleNotes(sModule);
            setTimeout(this._updateModuleTabIndicator.bind(this, true), 0);
        },

        _onModuleTabsAfterRendering: function () {
            this._ensureModuleTabIndicator();

            if (!this._bModuleTabIndicatorReady) {
                this._updateModuleTabIndicator(false);
                this._bModuleTabIndicatorReady = true;
            } else {
                this._updateModuleTabIndicator(true);
            }
        },

        _ensureModuleTabIndicator: function () {
            var oWrap = this.byId("mmNotesModuleTabsWrap");
            var oDom = oWrap && oWrap.getDomRef();

            if (!oDom || oDom.querySelector(".nxModuleSubTabIndicator")) {
                this._oModuleTabIndicator = oDom && oDom.querySelector(".nxModuleSubTabIndicator");
                return;
            }

            this._oModuleTabIndicator = document.createElement("div");
            this._oModuleTabIndicator.className = "nxModuleSubTabIndicator";
            oDom.appendChild(this._oModuleTabIndicator);
        },

        _getModuleTabButton: function (sModule) {
            var sId = MODULE_TAB_BTN_IDS[sModule];

            return sId ? this.byId(sId) : null;
        },

        _updateModuleTabIndicator: function (bAnimate) {
            var sModule = this._getActiveModule();
            var oWrap = this.byId("mmNotesModuleTabsWrap");
            var oActiveBtn = this._getModuleTabButton(sModule);
            var oWrapDom = oWrap && oWrap.getDomRef();
            var oBtnDom = oActiveBtn && oActiveBtn.getDomRef();
            var oIndicator = this._oModuleTabIndicator;
            var oInner;
            var oWrapRect;
            var oBtnRect;
            var nLeft;
            var nWidth;

            if (!oIndicator || !oWrapDom || !oBtnDom) {
                return;
            }

            oInner = oBtnDom.querySelector(".sapMBtnInner") || oBtnDom;
            oWrapRect = oWrapDom.getBoundingClientRect();
            oBtnRect = oInner.getBoundingClientRect();
            nLeft = oBtnRect.left - oWrapRect.left;
            nWidth = oBtnRect.width;

            if (!bAnimate) {
                oIndicator.style.transition = "none";
            }

            oIndicator.style.left = nLeft + "px";
            oIndicator.style.width = nWidth + "px";

            if (!bAnimate) {
                void oIndicator.offsetWidth;
                oIndicator.style.transition = "";
            }
        },

        onModuleTabPress: function (oEvent) {
            var oButton = oEvent.getSource();
            var aCustom = oButton.getCustomData();
            var sKey = aCustom && aCustom[0] && aCustom[0].getValue();

            if (sKey) {
                this._switchWorkspace(sKey);
                this._updateModuleTabIndicator(true);

                setTimeout(function () {
                    var oDom = oButton.getDomRef();

                    if (oDom && oDom.blur) {
                        oDom.blur();
                    }
                }, 0);
            }
        },

        _applyAuthorSelection: function (sName, bShowToast) {
            var oModel = this._getNotesModel();

            if (!sName) {
                return;
            }

            oModel.setProperty("/pickedAuthor", sName);

            if (oModel.getProperty("/hasSelectedNote")) {
                oModel.setProperty("/selectedNote/author", sName);
                oModel.setProperty("/selectedNote/authorInitial", getAuthorInitial(sName));

                if (bShowToast) {
                    MessageToast.show(sName + " 작성자로 변경되었습니다. 저장을 눌러 반영하세요.");
                }
            } else if (bShowToast) {
                MessageToast.show(sName + " 작성자로 설정되었습니다.");
            }

            oModel.refresh(true);
        },

        onAuthorSelectChange: function (oEvent) {
            this._applyAuthorSelection(oEvent.getSource().getSelectedKey(), true);
        },

        onAddNote: function () {
            var that = this;
            var oModel = this._getNotesModel();
            var sModule = this._getActiveModule();
            var sNow = new Date().toISOString();
            var sAuthor = oModel.getProperty("/pickedAuthor") || this._getCurrentAuthor();
            var oDefaults = getDefaultNoteFields(sModule);
            var oNew = {
                id: this._generateId(),
                title: "제목 없음",
                content: "",
                module: sModule,
                section: "General",
                createdAt: sNow,
                updatedAt: sNow,
                author: sAuthor,
                fontSize: oDefaults.fontSize,
                fontFamily: oDefaults.fontFamily
            };

            this._setViewBusy(true);

            MmNotesStorage.createAsync(sModule, oNew, this._getNotesODataModel()).then(function (oResult) {
                if (oResult.odataFailed) {
                    that._bNotesODataDisabled = true;
                }
                var oSaved = oResult.note;
                var aNotes = that._getModuleNotes(sModule).slice();
                aNotes.push(oSaved);
                that._notesCache[sModule] = aNotes;
                that._applyNotesToModel(sModule, aNotes, oResult.shared);

                oModel.setProperty("/selectedNoteId", oSaved.id);
                oModel.setProperty("/selectedNote", enrichNoteForEditor(oSaved, sModule));
                oModel.setProperty("/hasSelectedNote", true);
                oModel.setProperty("/pickedAuthor", oSaved.author || sAuthor);

                setTimeout(that._syncListSelection.bind(that, oSaved.id), 0);
                MessageToast.show(oResult.shared ? "공유 노트가 추가되었습니다" : "새 페이지가 추가되었습니다 (로컬)");
            }).catch(function (oError) {
                MessageToast.show(NotesDataService.extractMessage(oError, "페이지 추가에 실패했습니다"));
            }).finally(function () {
                that._setViewBusy(false);
            });
        },

        onSelectNote: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oCtx = oItem && oItem.getBindingContext("mmNotes");
            var sId = oCtx && oCtx.getProperty("id");

            if (sId) {
                this._selectNoteById(sId);
            }
        },

        onEditNoteFromList: function (oEvent) {
            var sId = this._getNoteIdFromListAction(oEvent.getSource());

            if (!sId || !this._selectNoteById(sId)) {
                return;
            }

            setTimeout(this._focusTitleInput.bind(this), 150);
        },

        onDeleteNoteFromList: function (oEvent) {
            var sId = this._getNoteIdFromListAction(oEvent.getSource());

            if (sId) {
                this._deleteNoteById(sId);
            }
        },

        onSaveNote: function () {
            var that = this;
            var oModel = this._getNotesModel();
            var sModule = this._getActiveModule();
            var sId = oModel.getProperty("/selectedNoteId");
            var oEdit = oModel.getProperty("/selectedNote");
            var aRaw = this._getModuleNotes(sModule);
            var i = this._findNoteIndex(aRaw, sId);
            var sNow = new Date().toISOString();
            var oSaved;

            if (!sId || i < 0 || !oEdit) {
                MessageToast.show("저장할 페이지를 선택해주세요");
                return;
            }

            oSaved = {
                id: sId,
                title: (oEdit.title || "").trim() || "제목 없음",
                content: oEdit.content || "",
                module: sModule,
                section: oEdit.section || "General",
                createdAt: aRaw[i].createdAt || sNow,
                updatedAt: sNow,
                author: (oEdit.author || "").trim() || oModel.getProperty("/pickedAuthor") || this._getCurrentAuthor(),
                fontSize: oEdit.fontSize || "16",
                fontFamily: oEdit.fontFamily || "default"
            };

            this._setViewBusy(true);

            MmNotesStorage.updateAsync(sModule, oSaved, this._getNotesODataModel()).then(function (oResult) {
                if (oResult.odataFailed) {
                    that._bNotesODataDisabled = true;
                }
                var oFinal = oResult.note;
                aRaw[i] = oFinal;
                that._notesCache[sModule] = aRaw;
                that._applyNotesToModel(sModule, aRaw, oResult.shared);
                oModel.setProperty("/selectedNote", enrichNoteForEditor(oFinal, sModule));
                oModel.setProperty("/pickedAuthor", oFinal.author || oModel.getProperty("/pickedAuthor"));
                setTimeout(that._syncListSelection.bind(that, sId), 0);
                MessageToast.show(oResult.shared ? "공유 노트가 저장되었습니다" : "노트가 저장되었습니다 (로컬)");
            }).catch(function (oError) {
                MessageToast.show(NotesDataService.extractMessage(oError, "저장에 실패했습니다"));
            }).finally(function () {
                that._setViewBusy(false);
            });
        },

        onDeleteNote: function () {
            var sId = this._getNotesModel().getProperty("/selectedNoteId");

            if (sId) {
                this._deleteNoteById(sId);
            }
        },

        onFontSettingChange: function () {
            var oModel = this._getNotesModel();
            var oEdit = oModel.getProperty("/selectedNote");

            if (!oEdit || !oEdit.fontSize) {
                oModel.setProperty("/selectedNote/fontSize", "16");
            }

            if (!oEdit || !oEdit.fontFamily) {
                oModel.setProperty("/selectedNote/fontFamily", "default");
            }

            oModel.refresh(true);
        },

        onExit: function () {
            if (this._oEventBus && this._fnNotesSyncHandler) {
                this._oEventBus.unsubscribe("dashboard", "notesSyncModule", this._fnNotesSyncHandler, this);
            }

            if (this._fnModuleTabResize) {
                window.removeEventListener("resize", this._fnModuleTabResize);
            }

            this._oModuleTabIndicator = null;
            this._bModuleTabIndicatorReady = false;
        }
    });
});
