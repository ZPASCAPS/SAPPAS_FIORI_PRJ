/**
 * NotesDataService.js
 *
 * Dashboard Notes — SAP OData 공유 저장 (Z_C_DASHBOARD_NOTE_CDS).
 */
sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil"
], function (Filter, FilterOperator, SapErrorUtil) {
    "use strict";

    var ENTITY_SET = "/Z_C_DashboardNote";

    function parseSapDate(vValue) {
        var sRaw = vValue;
        var nMs;

        if (!sRaw) {
            return "";
        }

        if (typeof sRaw === "object" && sRaw instanceof Date) {
            return sRaw.toISOString();
        }

        if (typeof sRaw === "string" && sRaw.indexOf("/Date(") >= 0) {
            nMs = parseInt(sRaw.replace(/\D/g, ""), 10);

            if (!isNaN(nMs)) {
                return new Date(nMs).toISOString();
            }
        }

        if (typeof sRaw === "string") {
            var d = new Date(sRaw);

            if (!isNaN(d.getTime())) {
                return d.toISOString();
            }

            return sRaw;
        }

        return "";
    }

    function fromOData(oRow) {
        if (!oRow) {
            return null;
        }

        return {
            id: oRow.NoteId || oRow.note_id || "",
            title: oRow.Title || "",
            content: oRow.Content || "",
            module: oRow.Module || "MM",
            section: oRow.Section || "General",
            author: oRow.Author || "",
            fontSize: oRow.FontSize || "16",
            fontFamily: oRow.FontFamily || "default",
            createdAt: parseSapDate(oRow.CreatedAt),
            updatedAt: parseSapDate(oRow.UpdatedAt)
        };
    }

    function toOData(oNote) {
        return {
            NoteId: oNote.id,
            Title: oNote.title || "제목 없음",
            Content: oNote.content || "",
            Module: oNote.module || "MM",
            Section: oNote.section || "General",
            Author: oNote.author || "",
            FontSize: oNote.fontSize || "16",
            FontFamily: oNote.fontFamily || "default",
            CreatedAt: oNote.createdAt || null,
            UpdatedAt: oNote.updatedAt || null
        };
    }

    function entityPath(sId) {
        return ENTITY_SET + "('" + String(sId).replace(/'/g, "''") + "')";
    }

    var ODATA_TIMEOUT_MS = 5000;

    function withTimeout(oPromise, nMs, sMessage) {
        return new Promise(function (resolve, reject) {
            var bDone = false;
            var oTimer = setTimeout(function () {
                if (!bDone) {
                    bDone = true;
                    reject(new Error(sMessage || "OData request timed out"));
                }
            }, nMs || ODATA_TIMEOUT_MS);

            oPromise.then(function (vResult) {
                if (!bDone) {
                    bDone = true;
                    clearTimeout(oTimer);
                    resolve(vResult);
                }
            }).catch(function (oError) {
                if (!bDone) {
                    bDone = true;
                    clearTimeout(oTimer);
                    reject(oError);
                }
            });
        });
    }

    return {
        ENTITY_SET: ENTITY_SET,

        extractMessage: function (oError, sDefault) {
            return SapErrorUtil.extractMessage(oError, sDefault);
        },

        loadByModule: function (oModel, sModule) {
            return withTimeout(new Promise(function (resolve, reject) {
                if (!oModel) {
                    reject(new Error("notesModel missing"));
                    return;
                }

                oModel.read(ENTITY_SET, {
                    filters: [
                        new Filter("Module", FilterOperator.EQ, sModule)
                    ],
                    success: function (oData) {
                        var aRows = oData.results || [];
                        resolve(aRows.map(fromOData).filter(function (o) {
                            return o && o.id;
                        }));
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }), ODATA_TIMEOUT_MS, "Notes OData load timed out");
        },

        create: function (oModel, oNote) {
            return withTimeout(new Promise(function (resolve, reject) {
                if (!oModel) {
                    reject(new Error("notesModel missing"));
                    return;
                }

                oModel.create(ENTITY_SET, toOData(oNote), {
                    success: function (oData) {
                        resolve(fromOData(oData) || oNote);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }), ODATA_TIMEOUT_MS, "Notes OData create timed out");
        },

        update: function (oModel, oNote) {
            return withTimeout(new Promise(function (resolve, reject) {
                if (!oModel || !oNote.id) {
                    reject(new Error("invalid note"));
                    return;
                }

                oModel.update(entityPath(oNote.id), toOData(oNote), {
                    success: function () {
                        resolve(oNote);
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }), ODATA_TIMEOUT_MS, "Notes OData update timed out");
        },

        remove: function (oModel, sId) {
            return withTimeout(new Promise(function (resolve, reject) {
                if (!oModel || !sId) {
                    reject(new Error("invalid id"));
                    return;
                }

                oModel.remove(entityPath(sId), {
                    success: function () {
                        resolve();
                    },
                    error: function (oError) {
                        reject(oError);
                    }
                });
            }), ODATA_TIMEOUT_MS, "Notes OData remove timed out");
        }
    };
});
