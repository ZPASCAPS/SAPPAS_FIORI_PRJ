/**
 * InventoryStatus.controller.js
 *
 * 역할:
 * - 재고 KPI 카드(총 자재, 재고 가치, 부족률) 표시 영역을 담당한다.
 * - 데이터는 dashboard JSONModel에 바인딩되어 있으며 별도 로직은 없다.
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.InventoryStatus", {});
});
