/**
 * FiEmptyStateUtil.js
 *
 * FI Cockpit empty-state builders. OData 미연결 시 mock 데이터 없이 UI만 준비.
 * TODO: Eclipse CDS / OData 연결 후 각 탭 Controller에서 실제 데이터 로드로 교체.
 */
sap.ui.define([], function () {
    "use strict";

    var NO_DATA = "데이터 없음";
    var NO_ODATA = "현재 연결된 FI OData가 없습니다.";
    var ODATA_HINT = "FI 전표/채권/채무 데이터를 표시하려면 Eclipse CDS 및 OData 연결이 필요합니다.";

    function _baseShell() {
        return {
            loading: false,
            loaded: false,
            error: "",
            hasData: false,
            odataConnected: false,
            emptyTitle: NO_DATA,
            emptyMessage: NO_ODATA,
            emptyHint: ODATA_HINT
        };
    }

    return {
        NO_DATA: NO_DATA,
        NO_ODATA: NO_ODATA,
        ODATA_HINT: ODATA_HINT,

        getOverviewEmptyState: function () {
            return Object.assign(_baseShell(), {
                summaryCards: [
                    {
                        key: "GL_SUMMARY",
                        title: "General Ledger Summary",
                        subtitle: "회계전표 및 계정별 흐름 요약",
                        emptyMessage: NO_DATA
                    },
                    {
                        key: "PAYABLE_STATUS",
                        title: "Payable Status",
                        subtitle: "미지급금 및 지급 상태 요약",
                        emptyMessage: NO_DATA
                    },
                    {
                        key: "RECEIVABLE_STATUS",
                        title: "Receivable Status",
                        subtitle: "미수금 및 수금 상태 요약",
                        emptyMessage: NO_DATA
                    }
                ],
                worklist: [],
                worklistTitle: "FI Worklist",
                worklistSubtitle: "우선 확인 재무 업무 목록",
                worklistEmptyMessage: NO_DATA
            });
        },

        getGeneralLedgerEmptyState: function () {
            return Object.assign(_baseShell(), {
                journalEntries: [],
                listTitle: "Journal Entry List",
                listSubtitle: "회계전표 목록",
                detail: {
                    hasSelection: false,
                    emptyMessage: "왼쪽 목록에서 전표를 선택하면 상세 정보가 표시됩니다."
                }
            });
        },

        getAccountsPayableEmptyState: function () {
            return Object.assign(_baseShell(), {
                emptyMessage: "미지급금 데이터 없음",
                payables: [],
                listTitle: "Open Payables",
                listSubtitle: "구매·입고 이후 발생한 미지급금 목록",
                detail: {
                    hasSelection: false,
                    emptyMessage: "미지급금 목록에서 항목을 선택하면 상세 정보가 표시됩니다."
                }
            });
        },

        getAccountsReceivableEmptyState: function () {
            return Object.assign(_baseShell(), {
                emptyMessage: "미수금 데이터 없음",
                receivables: [],
                listTitle: "Open Receivables",
                listSubtitle: "판매 이후 발생한 미수금 목록",
                detail: {
                    hasSelection: false,
                    emptyMessage: "미수금 목록에서 항목을 선택하면 상세 정보가 표시됩니다."
                }
            });
        },

        getReportEmptyState: function () {
            return Object.assign(_baseShell(), {
                chartSlots: [
                    {
                        key: "FIN_OVERVIEW",
                        title: "Financial Overview",
                        subtitle: "재무 지표 요약",
                        emptyMessage: NO_DATA
                    },
                    {
                        key: "AR_AP_TREND",
                        title: "Payable / Receivable Trend",
                        subtitle: "채무·채권 추이",
                        emptyMessage: NO_DATA
                    }
                ]
            });
        },

        getNoteEmptyState: function () {
            return {
                introTitle: "FI Note",
                introMessage: "FI 업무 관련 메모를 정리할 수 있는 영역입니다.",
                hint: "저장 기능이 연결되기 전까지는 안내 문구만 표시됩니다."
            };
        }
    };
});
