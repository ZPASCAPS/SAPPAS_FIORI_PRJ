/**
 * MmBomOverviewConfig.js
 *
 * Uniqlo 히트텍·가방 완제품 BOM 정의 (프로젝트 기준 정적 구성).
 * 재고 수량은 Z_C_MM_INVENTORY OData에서 조회한다.
 */
sap.ui.define([], function () {
    "use strict";

    var FINISHED_PRODUCTS = [
        { code: "UP-F-HIT-001", name: "히트텍", baseQty: 1, unit: "PC" },
        { code: "UP-F-BAG-001", name: "가방", baseQty: 1, unit: "PC" }
    ];

    var RAW_MATERIALS = [
        { code: "UP-R-PES-001", name: "폴리에스터", shared: true },
        { code: "UP-R-ACR-001", name: "아크릴", shared: false },
        { code: "UP-R-RAY-001", name: "레이온", shared: false },
        { code: "UP-R-PUR-001", name: "폴리우레탄", shared: false },
        { code: "UP-R-NYL-001", name: "나일론", shared: false },
        { code: "UP-R-BZP-001", name: "가방 지퍼", shared: false }
    ];

    var BOM_BY_PRODUCT = {
        "UP-F-HIT-001": [
            { material: "UP-R-PES-001", qty: 5 },
            { material: "UP-R-ACR-001", qty: 4 },
            { material: "UP-R-RAY-001", qty: 3 },
            { material: "UP-R-PUR-001", qty: 1 }
        ],
        "UP-F-BAG-001": [
            { material: "UP-R-PES-001", qty: 18 },
            { material: "UP-R-NYL-001", qty: 6 },
            { material: "UP-R-BZP-001", qty: 1 }
        ]
    };

    var REQUIREMENT_BY_MATERIAL = {
        "UP-R-PES-001": { heattech: 5, bag: 18 },
        "UP-R-ACR-001": { heattech: 4, bag: 0 },
        "UP-R-RAY-001": { heattech: 3, bag: 0 },
        "UP-R-PUR-001": { heattech: 1, bag: 0 },
        "UP-R-NYL-001": { heattech: 0, bag: 6 },
        "UP-R-BZP-001": { heattech: 0, bag: 1 }
    };

    var SHARED_MATERIAL = "UP-R-PES-001";
    var TOTAL_REQUIREMENT_QTY = 38;

    function getMaterialCodes() {
        return RAW_MATERIALS.map(function (oItem) {
            return oItem.code;
        });
    }

    function getAllMaterialCodes() {
        return getMaterialCodes().concat(FINISHED_PRODUCTS.map(function (oItem) {
            return oItem.code;
        }));
    }

    function getMaterialMeta(sCode) {
        var i;
        for (i = 0; i < RAW_MATERIALS.length; i++) {
            if (RAW_MATERIALS[i].code === sCode) {
                return RAW_MATERIALS[i];
            }
        }
        for (i = 0; i < FINISHED_PRODUCTS.length; i++) {
            if (FINISHED_PRODUCTS[i].code === sCode) {
                return FINISHED_PRODUCTS[i];
            }
        }
        return null;
    }

    function getProductBom(sProductCode) {
        return (BOM_BY_PRODUCT[sProductCode] || []).slice();
    }

    function getRequirement(sMaterial) {
        return REQUIREMENT_BY_MATERIAL[sMaterial] || { heattech: 0, bag: 0 };
    }

    function getTotalRequirement(sMaterial) {
        var oReq = getRequirement(sMaterial);
        return oReq.heattech + oReq.bag;
    }

    return {
        FINISHED_PRODUCTS: FINISHED_PRODUCTS,
        RAW_MATERIALS: RAW_MATERIALS,
        BOM_BY_PRODUCT: BOM_BY_PRODUCT,
        SHARED_MATERIAL: SHARED_MATERIAL,
        TOTAL_REQUIREMENT_QTY: TOTAL_REQUIREMENT_QTY,
        getMaterialCodes: getMaterialCodes,
        getAllMaterialCodes: getAllMaterialCodes,
        getMaterialMeta: getMaterialMeta,
        getProductBom: getProductBom,
        getRequirement: getRequirement,
        getTotalRequirement: getTotalRequirement
    };
});
