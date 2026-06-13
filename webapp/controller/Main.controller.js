/**
 *  
 *
 * View: com.capstone.dashboard.fioridashboard.view.Main
 * Controller: com.capstone.dashboard.fioridashboard.controller.Main
 *
 * 역할:
 * - 통합 대시보드 공통 초기화. dashboard/create JSONModel을 Component에 등록한다.
 * - SAP BomStock OData 로딩·갱신, create entity 탐색.
 *
 * 대시보드 구조:
 * Main.view.xml (뼈대) — 하위 features View는 각자 Controller가 담당
 * DashboardCanvas → OrderInquiry (A공간), E2EProcessFlow (B공간)
 *
 * 협업:
 * - 공통 모델·OData·EventBus(refreshData) → 이 Controller
 * - 화면별 UI/이벤트 → features/ 하위 Controller (충돌 방지)
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "com/capstone/dashboard/fioridashboard/service/DashboardDataService",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/util/DashboardThemeHelper",
    "com/capstone/dashboard/fioridashboard/util/MmChartHtmlUtil"
], function (Controller, JSONModel, MessageToast, MessageBox, DashboardDataService, SapErrorUtil, DashboardThemeHelper, MmChartHtmlUtil) {
    "use strict";

    var CREATE_ENTITY_CANDIDATES = [
        "BomStockSet",
        "MaterialSet",
        "MaterialMasterSet",
        "ZmaterialSet"
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.Main", {

        onInit: function () {
            this._sImageBase = this._resolveImageBase();
            this._initModels();
            this._bindEventBus();
            this._discoverCreateEntity();
            this._loadSapBomStock();
        },

        onExit: function () {
            if (this._oEventBus) {
                this._oEventBus.unsubscribe("dashboard", "refreshData", this._onRefreshData, this);
            }
        },

        _resolveImageBase: function () {
            try {
                return sap.ui.require.toUrl("com/capstone/dashboard/fioridashboard/images/");
            } catch (e) {
                return "images/";
            }
        },

        /**
         * 공통 모델을 Component에 설정해 Nested View 전체에서 사용한다.
         */
        _initModels: function () {
            var oComponent = this.getOwnerComponent();
            var oDashboardModel = new JSONModel({
                ui: {
                    navKey: "DASHBOARD",
                    navLabel: "Dashboard",
                    navDescription: "SAP 통합 프로세스 전체 현황을 확인합니다.",
                    navIcon: "sap-icon://bbyd-dashboard",
                    createEntityLabel: "MaterialSet",
                    createEntityPath: "/MaterialSet",
                    dateRange: "Oct 18 - Nov 18",
                    period: "MONTHLY",
                    notificationCount: 5,
                    lastUpdated: "2025.05.20 10:30 기준",
                    showPhysicalDiff: true,
                    showInTransit: true,
                    showSubcontract: true,
                    showBlocked: true,
                    mmActiveCategory: "PHYSICAL_DIFF",
                    mmActiveCategoryLabel: "실사차이 상세 리스크",
                    mmDetailCountLabel: "총 3건"
                },
                moduleView: {
                    title: "",
                    period: "THIS_WEEK",
                    periodOptions: [],
                    activeSubTab: "OVERVIEW",
                    subTabs: [],
                    kpis: []
                },
                user: {
                    name: "박찬영",
                    role: "FI",
                    editName: "박찬영",
                    editModule: "FI",
                    blogUrl: "https://blog.naver.com/channy0210",
                    blogQrSrc: "images/profile-blog-qr.png"
                },
                team: {
                    name: "HSAPIENT",
                    key: "HSAPIENT"
                },
                teamOptions: [
                    { key: "HSAPIENT", text: "HSAPIENT" },
                    { key: "SAP_CORE", text: "SAP Core Team" },
                    { key: "FI_CO", text: "FI/CO Team" },
                    { key: "MM_PP", text: "MM/PP Team" }
                ],
                profileOptions: {
                    names: [
                        { key: "김용민", text: "김용민" },
                        { key: "신성진", text: "신성진" },
                        { key: "박찬영", text: "박찬영" }
                    ],
                    modules: [
                        { key: "SD", text: "SD" },
                        { key: "PP", text: "PP" },
                        { key: "MM", text: "MM" },
                        { key: "FI", text: "FI" }
                    ]
                },
                notifications: [
                    { id: "N1", title: "재고 부족 경고", description: "자재 MAT-001 · 재고 임계치 미달 · 10분 전", icon: "sap-icon://alert", read: false },
                    { id: "N2", title: "수주 연동 완료", description: "SO-20250520-014 · SD 연동 성공 · 25분 전", icon: "sap-icon://sales-order", read: false },
                    { id: "N3", title: "생산 오더 지연", description: "PO-7782 · PP 일정 2시간 지연 · 1시간 전", icon: "sap-icon://factory", read: false },
                    { id: "N4", title: "마스터 데이터 점검", description: "MM 자재 3건 정합성 확인 필요 · 2시간 전", icon: "sap-icon://validate", read: false },
                    { id: "N5", title: "재무 마감 알림", description: "FI/CO 월마감 D-3 · 3시간 전", icon: "sap-icon://money-bills", read: false },
                    { id: "N6", title: "OData 연결 정상", description: "SAP BOM Stock 서비스 응답 정상 · 5시간 전", icon: "sap-icon://connected", read: true }
                ],
                helpItems: [
                    { key: "TCODE_GUIDE", title: "T-code Guide", description: "자주 사용하는 T-code 안내" },
                    { key: "ERROR_HELPER", title: "Error Helper", description: "SAP 오류 메시지 해결 방법" },
                    { key: "ODATA_STATUS", title: "OData Status", description: "OData 서비스 연결 상태 확인" },
                    { key: "SYSTEM_LOG", title: "System Log", description: "시스템 로그 및 이벤트 기록" }
                ],
                settings: {
                    autoRefresh: false,
                    showNotifications: true,
                    darkMode: DashboardThemeHelper.load()
                },
                summary: {
                    totalMaterials: 0,
                    totalMaterialsTrend: "+0%",
                    totalMaterialsTrendUp: true,
                    stockValue: "0",
                    stockValueTrend: "0%",
                    stockValueTrendUp: false,
                    shortageRate: "0%",
                    shortageRateTrend: "+0%",
                    shortageRateTrendUp: false
                },
                salesOverview: {
                    total: "0",
                    trend: "+0%",
                    trendUp: true,
                    bars: [],
                    legend: []
                },
                subscribers: {
                    total: "0",
                    trend: "0%",
                    trendUp: true,
                    trendState: "None",
                    subtitle: "",
                    days: []
                },
                distribution: {
                    channels: [],
                    segments: []
                },
                integrations: [],
                counts: { all: 0, active: 0, warning: 0, shortage: 0 },
                filters: {
                    query: ""
                },
                search: {
                    results: [],
                    resultCount: 0
                },
                allItems: [],
                displayItems: [],
                spaces: {
                    orderInquiry: {},
                    e2eProcessFlow: {}
                },
                e2eProcessFlow: {
                    title: "E2E Process Flow (MTO)",
                    selectedStepId: null,
                    filters: {
                        region: "ALL",
                        productLine: "ALL",
                        period: "MONTH",
                        monthDays: "30"
                    },
                    filterOptions: {
                        regions: [
                            { key: "ALL", text: "Region" },
                            { key: "APAC", text: "APAC" },
                            { key: "EMEA", text: "EMEA" },
                            { key: "AMER", text: "Americas" }
                        ],
                        productLines: [
                            { key: "ALL", text: "Product Line" },
                            { key: "APPAREL", text: "Apparel" },
                            { key: "ACCESSORY", text: "Accessory" }
                        ],
                        periods: [
                            { key: "WEEK", text: "Week" },
                            { key: "MONTH", text: "Month" },
                            { key: "QUARTER", text: "Quarter" }
                        ],
                        monthDays: [
                            { key: "7", text: "7 days" },
                            { key: "30", text: "30 days" },
                            { key: "90", text: "90 days" }
                        ]
                    },
                    processGauge: {
                        orderNumber: "5000000010",
                        currentStep: 4,
                        totalSteps: 11,
                        stageText: "Purchase Order",
                        progressPercent: 36,
                        segments: [
                            { step: 1, status: "done" },
                            { step: 2, status: "done" },
                            { step: 3, status: "done" },
                            { step: 4, status: "active" },
                            { step: 5, status: "pending" },
                            { step: 6, status: "pending" },
                            { step: 7, status: "pending" },
                            { step: 8, status: "pending" },
                            { step: 9, status: "pending" },
                            { step: 10, status: "pending" },
                            { step: 11, status: "pending" }
                        ]
                    },
                    steps: {
                        step01: { id: "step01", number: 1, title: "Sales Order", icon: "sap-icon://target-group", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step02: { id: "step02", number: 2, title: "Planned Order", icon: "sap-icon://shipping-status", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step03: { id: "step03", number: 3, title: "Purchase Requisition", icon: "sap-icon://factory", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step04: { id: "step04", number: 4, title: "Purchase Order", icon: "sap-icon://product", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step05: { id: "step05", number: 5, title: "Goods Receipt", icon: "sap-icon://building", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step06: { id: "step06", number: 6, title: "Production Order", icon: "sap-icon://shipping-status", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step07: { id: "step07", number: 7, title: "Goods Receipt", icon: "sap-icon://outbox", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step08: { id: "step08", number: 8, title: "Shipment", icon: "sap-icon://retail-store", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step09: { id: "step09", number: 9, title: "Billing", icon: "sap-icon://money-bills", status: "complete", showDetail: false, documents: [], keyInfo: "" },
                        step10: { id: "step10", number: 10, title: "회계전표", icon: "sap-icon://account", status: "pending", showDetail: false, documents: [], keyInfo: "" },
                        step11: { id: "step11", number: 11, title: "입금 전기", icon: "sap-icon://payment-approval", status: "pending", showDetail: false, documents: [], keyInfo: "" }
                    },
                    kpis: [
                        { id: "K1", label: "On-time delivery", value: "56%", state: "Success", progress: 56 },
                        { id: "K2", label: "Inventory level", value: "1,300", state: "Warning", progress: 72 },
                        { id: "K3", label: "Lead time", value: "10 hr", state: "Success", progress: 40 },
                        { id: "K4", label: "Cycle time", value: "1.9 hr", state: "Warning", progress: 65 },
                        { id: "K5", label: "Fill rate", value: "128%", state: "Error", progress: 100 }
                    ]
                },
                mmCockpit: {
                    physicalDiffTop5: [
                        { materialCode: "MAT-FAB-001", materialName: "Airism Cotton Crew Neck", diffQty: "-128 EA" },
                        { materialCode: "MAT-FAB-014", materialName: "Stretch Selvedge Denim", diffQty: "-74 EA" },
                        { materialCode: "MAT-ACC-022", materialName: "Metal Zipper 5V Antique", diffQty: "+36 EA" },
                        { materialCode: "MAT-PKG-008", materialName: "Eco Poly Bag Medium", diffQty: "-19 EA" },
                        { materialCode: "MAT-FAB-031", materialName: "Heattech Extra Warm Fabric", diffQty: "+11 EA" }
                    ],
                    inTransitDelayedCount: 12,
                    inTransitDelayedHint: "STO/PO 기준 3일 초과 미입고",
                    subcontractRisks: [
                        { vendorName: "Hansung Apparel VN", materialName: "Shell Fabric Navy", riskLevel: "HIGH", riskState: "Error" },
                        { vendorName: "Busan Subcon Plant", materialName: "Interlining Roll", riskLevel: "MEDIUM", riskState: "Warning" },
                        { vendorName: "Daegu Cut&Sew", materialName: "Thread Cone 120D", riskLevel: "LOW", riskState: "Success" }
                    ],
                    blockedSummary: {
                        assetAmount: "48,250,000",
                        scrapQty: 37
                    }
                },
                mmDetailListAll: [
                    {
                        materialCode: "MAT-FAB-001",
                        materialName: "Airism Cotton Crew Neck",
                        category: "PHYSICAL_DIFF",
                        categoryLabel: "실사차이",
                        categoryState: "Warning",
                        issueReason: "실사 -128 EA · 장부 대비 과다 출고 의심",
                        plantVendor: "1000 / Seoul DC",
                        actionText: "차이 조정 승인"
                    },
                    {
                        materialCode: "MAT-FAB-014",
                        materialName: "Stretch Selvedge Denim",
                        category: "PHYSICAL_DIFF",
                        categoryLabel: "실사차이",
                        categoryState: "Warning",
                        issueReason: "실사 -74 EA · Cycle Count 미반영",
                        plantVendor: "1100 / Busan WH",
                        actionText: "차이 조정 승인"
                    },
                    {
                        materialCode: "MAT-ACC-022",
                        materialName: "Metal Zipper 5V Antique",
                        category: "PHYSICAL_DIFF",
                        categoryLabel: "실사차이",
                        categoryState: "Warning",
                        issueReason: "실사 +36 EA · 입고 전표 누락",
                        plantVendor: "1000 / Seoul DC",
                        actionText: "차이 조정 승인"
                    },
                    {
                        materialCode: "MAT-STO-901",
                        materialName: "Transfer Stock Pack A",
                        category: "IN_TRANSIT",
                        categoryLabel: "이동중",
                        categoryState: "Information",
                        issueReason: "STO 4500123456 · 5일 경과 미입고",
                        plantVendor: "1000 → 1200",
                        actionText: "입고 독촉"
                    },
                    {
                        materialCode: "MAT-STO-902",
                        materialName: "Transfer Stock Pack B",
                        category: "IN_TRANSIT",
                        categoryLabel: "이동중",
                        categoryState: "Information",
                        issueReason: "STO 4500123488 · 4일 경과 미입고",
                        plantVendor: "1100 → 1000",
                        actionText: "입고 독촉"
                    },
                    {
                        materialCode: "MAT-STO-903",
                        materialName: "Transfer Stock Pack C",
                        category: "IN_TRANSIT",
                        categoryLabel: "이동중",
                        categoryState: "Information",
                        issueReason: "PO In-Transit · 3일 초과",
                        plantVendor: "VN01 / Vendor Transit",
                        actionText: "입고 독촉"
                    },
                    {
                        materialCode: "MAT-SUB-101",
                        materialName: "Shell Fabric Navy",
                        category: "SUBCONTRACT",
                        categoryLabel: "사급",
                        categoryState: "Error",
                        issueReason: "외주처 재고 2일분 · 리드타임 위험 HIGH",
                        plantVendor: "VN01 / Hansung Apparel VN",
                        actionText: "출고 지시"
                    },
                    {
                        materialCode: "MAT-SUB-102",
                        materialName: "Interlining Roll",
                        category: "SUBCONTRACT",
                        categoryLabel: "사급",
                        categoryState: "Warning",
                        issueReason: "사급자재 소진 예상 D+3",
                        plantVendor: "1200 / Busan Subcon Plant",
                        actionText: "출고 지시"
                    },
                    {
                        materialCode: "MAT-SUB-103",
                        materialName: "Thread Cone 120D",
                        category: "SUBCONTRACT",
                        categoryLabel: "사급",
                        categoryState: "Success",
                        issueReason: "리드타임 여유 · 모니터링",
                        plantVendor: "1300 / Daegu Cut&Sew",
                        actionText: "출고 지시"
                    },
                    {
                        materialCode: "MAT-BLK-201",
                        materialName: "QC Fail Garment Lot A",
                        category: "BLOCKED",
                        categoryLabel: "보류",
                        categoryState: "Error",
                        issueReason: "품질 불합격 보류 · 폐기 검토",
                        plantVendor: "1000 / Seoul DC",
                        actionText: "폐기 승인"
                    },
                    {
                        materialCode: "MAT-BLK-202",
                        materialName: "Return Stock Lot B",
                        category: "BLOCKED",
                        categoryLabel: "보류",
                        categoryState: "Error",
                        issueReason: "반품 입고 보류 · 재검사 대기",
                        plantVendor: "1100 / Busan WH",
                        actionText: "폐기 승인"
                    },
                    {
                        materialCode: "MAT-BLK-203",
                        materialName: "Blocked Trim Lot C",
                        category: "BLOCKED",
                        categoryLabel: "보류",
                        categoryState: "Error",
                        issueReason: "Batch Hold · 사용 불가",
                        plantVendor: "1200 / Busan Subcon",
                        actionText: "폐기 승인"
                    }
                ],
                mmDetailList: []
            });

            MmChartHtmlUtil.enrichMmReports(oDashboardModel, []);

            oComponent.setModel(oDashboardModel, "dashboard");
            DashboardThemeHelper.apply(oDashboardModel.getProperty("/settings/darkMode"));
            oComponent.setModel(new JSONModel({
                Component: "",
                ComponentText: "",
                ParentMatnr: "UP-F-PNT-001",
                BomQty: "1",
                OrderQty: "1",
                Remark: ""
            }), "create");


            
            // ===================================================================
            // 💡 [여기서부터 추가!] E2E 프로세스 플로우용 공통 게시판(flowModel) 등록
            // ===================================================================
            var oInitialFlowData = {
                SalesOrder: "대기중...",
                PlannedOrder: "대기중...",
                PurchaseReq: "대기중...",
                PurchaseOrder: "대기중...",
                POMigo: "대기중...",
                ProductionOrder: "대기중...",
                ProdMigo: "대기중...",
                Delivery: "대기중...",
                Billing: "대기중...",
                FI: "대기중...",
                Clearing: "대기중..."
            };
            var oFlowModel = new JSONModel(oInitialFlowData);
            oComponent.setModel(oFlowModel, "flowModel");
            // ===================================================================
            // 💡 [여기까지 추가]
            // ===================================================================

        },




        _bindEventBus: function () {
            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("dashboard", "refreshData", this._onRefreshData, this);
        },

        _onRefreshData: function () {
            this._loadSapBomStock();
            MessageToast.show("SAP 데이터를 새로고침했습니다");
        },

        _discoverCreateEntity: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            if (!oODataModel) {
                return;
            }

            var oDashboardModel = this.getOwnerComponent().getModel("dashboard");
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
                        // try next candidate
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
                    oDashboardModel.setProperty("/ui/createEntityLabel", sFound);
                    oDashboardModel.setProperty("/ui/createEntityPath", "/" + sFound);
                }
            });
        },

        _loadSapBomStock: function () {
            var oODataModel = this.getOwnerComponent().getModel();
            var oDashboardModel = this.getOwnerComponent().getModel("dashboard");

            if (!oODataModel) {
                MessageToast.show("OData Model 없음: manifest.json 확인 필요");
                return;
            }

            oODataModel.read("/BomStockSet", {
                success: function (oData) {
                    var aItems = (oData.results || []).map(function (oItem) {
                        return DashboardDataService.mapODataItem(oItem, this._sImageBase);
                    }.bind(this));
                    DashboardDataService.refreshDashboard(oDashboardModel, aItems);
                }.bind(this),
                error: function (oError) {
                    MessageBox.error(SapErrorUtil.extractMessage(oError, "SAP 자재 데이터 조회에 실패했습니다."));
                }
            });
        }
    });
});
