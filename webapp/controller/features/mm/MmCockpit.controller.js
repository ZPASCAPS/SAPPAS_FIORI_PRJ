/**
 * MmCockpit.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.features.mm.MmCockpit
 * Controller: com.capstone.dashboard.fioridashboard.controller.features.mm.MmCockpit
 *
 * 역할:
 * - MM Extended 관제 콕핏 UI 이벤트 처리
 * - 상단 CheckBox → 카드 visible, 카드 클릭 → 하단 테이블 필터 연동
 *
 * 데이터:
 * - 전역 dashboard JSONModel (Main.controller.js에서 초기화)
 * - mmDetailListAll: 전체 Mock/OData 원본
 * - mmDetailList: 화면 표시용 필터 결과
 *
 * SAP 실데이터 연동 시:
 * - DashboardDataService 또는 MM OData Service에서 mmDetailListAll 갱신
 * - onDimensionToggle / onCardPress 로직은 그대로 재사용
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    /** 카테고리 코드 → 화면 라벨 */
    var CATEGORY_LABELS = {
        PHYSICAL_DIFF: "실사차이",
        IN_TRANSIT: "이동중",
        SUBCONTRACT: "사급",
        BLOCKED: "보류"
    };

    /** 카테고리 → CheckBox ui 경로 */
    var CATEGORY_UI_FLAGS = {
        PHYSICAL_DIFF: "/ui/showPhysicalDiff",
        IN_TRANSIT: "/ui/showInTransit",
        SUBCONTRACT: "/ui/showSubcontract",
        BLOCKED: "/ui/showBlocked"
    };

    /** 카테고리 표시 순서 (체크박스 기본 필터용) */
    var CATEGORY_ORDER = [
        "PHYSICAL_DIFF",
        "IN_TRANSIT",
        "SUBCONTRACT",
        "BLOCKED"
    ];

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.mm.MmCockpit", {

        onInit: function () {
            // dashboard 모델은 Main.controller.js _initModels()에서 Component에 등록됨
            // MM 콕핏 전용 필드가 없을 때만 기본값 보정 (모델 재생성 금지)
            this._ensureMmCockpitDefaults();
            this._applyDetailFilter(this._getDashboardModel().getProperty("/ui/mmActiveCategory"));
        },

        /**
         * dashboard 모델에 MM 콕핏 ui/mmDetailList 필드가 없을 때만 기본값 설정
         */
        _ensureMmCockpitDefaults: function () {
            var oModel = this._getDashboardModel();
            if (!oModel) {
                return;
            }

            if (oModel.getProperty("/ui/showPhysicalDiff") === undefined) {
                oModel.setProperty("/ui/showPhysicalDiff", true);
            }
            if (oModel.getProperty("/ui/showInTransit") === undefined) {
                oModel.setProperty("/ui/showInTransit", true);
            }
            if (oModel.getProperty("/ui/showSubcontract") === undefined) {
                oModel.setProperty("/ui/showSubcontract", true);
            }
            if (oModel.getProperty("/ui/showBlocked") === undefined) {
                oModel.setProperty("/ui/showBlocked", true);
            }
            if (!oModel.getProperty("/ui/mmActiveCategory")) {
                oModel.setProperty("/ui/mmActiveCategory", "PHYSICAL_DIFF");
            }
        },

        /**
         * CheckBox 변경 — 카드 visible은 View 바인딩으로 처리, 테이블은 활성 카테고리 보정
         */
        onDimensionToggle: function () {
            var oModel = this._getDashboardModel();
            var sActive = oModel.getProperty("/ui/mmActiveCategory");
            var bActiveVisible = oModel.getProperty(CATEGORY_UI_FLAGS[sActive]);

            // 현재 선택 중인 카테고리가 꺼졌으면 보이는 첫 카테고리로 전환
            if (!bActiveVisible) {
                var sNext = this._findFirstVisibleCategory();
                if (sNext) {
                    this._applyDetailFilter(sNext);
                } else {
                    oModel.setProperty("/mmDetailList", []);
                    this._updateCategoryLabels("", 0);
                }
                return;
            }

            this._applyDetailFilter(sActive);
            MessageToast.show("MM Extended 영역 표시 설정이 변경되었습니다");
        },

        /**
         * 카드 헤더 클릭 — 해당 카테고리로 하단 테이블 필터
         */
        onCardPress: function (oEvent) {
            var oSource = oEvent.getSource();
            var sCategory = oSource.data("category") || "PHYSICAL_DIFF";

            if (!this._getDashboardModel().getProperty(CATEGORY_UI_FLAGS[sCategory])) {
                MessageToast.show("해당 영역이 비활성화되어 있습니다. CheckBox를 먼저 선택하세요.");
                return;
            }

            this._applyDetailFilter(sCategory);
            MessageToast.show(CATEGORY_LABELS[sCategory] + " 상세 내역을 표시합니다");
        },

        /**
         * 테이블 조치 버튼 — SAP 액션/OData create 호출 지점
         */
        onActionPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("dashboard");
            var oRow = oContext && oContext.getObject();

            if (!oRow) {
                return;
            }

            MessageToast.show(
                "[" + oRow.actionText + "] " + oRow.materialCode + " · " + oRow.materialName
            );
        },

        /**
         * mmDetailListAll에서 카테고리별 필터 후 mmDetailList 갱신
         */
        _applyDetailFilter: function (sCategory) {
            var oModel = this._getDashboardModel();
            var aAll = oModel.getProperty("/mmDetailListAll") || [];
            var aFiltered = aAll.filter(function (oItem) {
                return oItem.category === sCategory;
            });

            oModel.setProperty("/ui/mmActiveCategory", sCategory);
            oModel.setProperty("/mmDetailList", aFiltered);
            this._updateCategoryLabels(sCategory, aFiltered.length);
        },

        _updateCategoryLabels: function (sCategory, iCount) {
            var oModel = this._getDashboardModel();
            var sLabel = sCategory ? CATEGORY_LABELS[sCategory] + " 상세 리스크" : "MM Extended 상세";
            oModel.setProperty("/ui/mmActiveCategoryLabel", sLabel);
            oModel.setProperty("/ui/mmDetailCountLabel", iCount ? "총 " + iCount + "건" : "0건");
        },

        _findFirstVisibleCategory: function () {
            var oModel = this._getDashboardModel();
            var i;

            for (i = 0; i < CATEGORY_ORDER.length; i++) {
                if (oModel.getProperty(CATEGORY_UI_FLAGS[CATEGORY_ORDER[i]])) {
                    return CATEGORY_ORDER[i];
                }
            }
            return null;
        },

        _getDashboardModel: function () {
            return this.getView().getModel("dashboard")
                || this.getOwnerComponent().getModel("dashboard");
        }
    });
});
