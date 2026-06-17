/**
 * MmNotesStorage.js
 *
 * Notes persist — OData 공유 저장 우선, 실패 시 LocalStorage fallback.
 */
sap.ui.define([
    "com/capstone/dashboard/fioridashboard/service/NotesDataService"
], function (NotesDataService) {
    "use strict";

    var KEY_PREFIX = "com.capstone.dashboard.fioridashboard.";
    var MODULE_SUFFIX = {
        MM: "mm.notes",
        PP: "pp.notes",
        SD: "sd.notes",
        FI: "fi.notes"
    };

    function getStorageKey(sModule) {
        var sSuffix = MODULE_SUFFIX[sModule] || MODULE_SUFFIX.MM;

        return KEY_PREFIX + sSuffix;
    }

    function loadLocal(sModule) {
        var sKey = getStorageKey(sModule);

        try {
            var sRaw = window.localStorage.getItem(sKey);

            if (!sRaw) {
                return [];
            }

            var aParsed = JSON.parse(sRaw);

            return Array.isArray(aParsed) ? aParsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveLocal(sModule, aNotes) {
        window.localStorage.setItem(getStorageKey(sModule), JSON.stringify(aNotes || []));
    }

    function upsertLocal(sModule, oNote) {
        var aNotes = loadLocal(sModule);
        var i = aNotes.findIndex(function (o) {
            return o.id === oNote.id;
        });

        if (i >= 0) {
            aNotes[i] = oNote;
        } else {
            aNotes.push(oNote);
        }

        saveLocal(sModule, aNotes);
        return aNotes;
    }

    function removeLocal(sModule, sId) {
        var aNotes = loadLocal(sModule).filter(function (o) {
            return o.id !== sId;
        });

        saveLocal(sModule, aNotes);
        return aNotes;
    }

    return {
        STORAGE_KEY: getStorageKey("MM"),
        getStorageKey: getStorageKey,

        load: function (sModule) {
            return loadLocal(sModule);
        },

        save: function (sModule, aNotes) {
            saveLocal(sModule, aNotes);
        },

        loadAsync: function (sModule, oODataModel) {
            if (!oODataModel) {
                return Promise.resolve({
                    notes: loadLocal(sModule),
                    shared: false
                });
            }

            return NotesDataService.loadByModule(oODataModel, sModule).then(function (aNotes) {
                saveLocal(sModule, aNotes);
                return {
                    notes: aNotes,
                    shared: true
                };
            }).catch(function () {
                return {
                    notes: loadLocal(sModule),
                    shared: false,
                    odataFailed: true
                };
            });
        },

        createAsync: function (sModule, oNote, oODataModel) {
            if (!oODataModel) {
                var aLocal = loadLocal(sModule);
                aLocal.push(oNote);
                saveLocal(sModule, aLocal);
                return Promise.resolve({
                    note: oNote,
                    shared: false
                });
            }

            return NotesDataService.create(oODataModel, oNote).then(function (oSaved) {
                upsertLocal(sModule, oSaved);
                return {
                    note: oSaved,
                    shared: true
                };
            }).catch(function () {
                var aFallback = loadLocal(sModule);
                aFallback.push(oNote);
                saveLocal(sModule, aFallback);
                return {
                    note: oNote,
                    shared: false,
                    odataFailed: true
                };
            });
        },

        updateAsync: function (sModule, oNote, oODataModel) {
            if (!oODataModel) {
                upsertLocal(sModule, oNote);
                return Promise.resolve({
                    note: oNote,
                    shared: false
                });
            }

            return NotesDataService.update(oODataModel, oNote).then(function () {
                upsertLocal(sModule, oNote);
                return {
                    note: oNote,
                    shared: true
                };
            }).catch(function () {
                upsertLocal(sModule, oNote);
                return {
                    note: oNote,
                    shared: false,
                    odataFailed: true
                };
            });
        },

        removeAsync: function (sModule, sId, oODataModel) {
            if (!oODataModel) {
                removeLocal(sModule, sId);
                return Promise.resolve({
                    shared: false
                });
            }

            return NotesDataService.remove(oODataModel, sId).then(function () {
                removeLocal(sModule, sId);
                return {
                    shared: true
                };
            }).catch(function () {
                removeLocal(sModule, sId);
                return {
                    shared: false,
                    odataFailed: true
                };
            });
        }
    };
});
