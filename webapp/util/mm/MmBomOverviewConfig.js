/**
 * MmBomOverviewConfig.js
 *
 * Uniqlo 히트텍·가방 완제품 BOM 정의 (프로젝트 기준 정적 구성).
 * 재고 수량은 Z_C_MM_INVENTORY OData에서 조회한다.
 */
sap.ui.define([], function () {
    "use strict";

    var FINISHED_PRODUCTS = [
        { code: "UP-F-HIT-001", name: "히트텍", baseQty: 1, unit: "PC", imageSrc: "./img/mm/product-heattech.png" },
        { code: "UP-F-BAG-001", name: "가방", baseQty: 1, unit: "PC", imageSrc: "./img/mm/product-bag.png" }
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

    var MATERIAL_ICON_BY_CODE = {
        "UP-F-HIT-001": { src: "sap-icon://product", color: "#EA580C" },
        "UP-F-BAG-001": { src: "sap-icon://retail-store", color: "#0284C7" },
        "UP-R-BZP-001": { src: "sap-icon://chain-link", color: "#64748B" }
    };

    var CATEGORY_ICON_FINISHED = { src: "sap-icon://retail-fashion", color: "#059669" };
    var CATEGORY_ICON_RAW = { src: "sap-icon://color-fill", color: "#0D9488" };

    function _normalizeMaterialCode(sCode) {
        return String(sCode || "").trim().toUpperCase();
    }

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

    function getMaterialIconMeta(sCode, sDisplayName, oOptions) {
        var sMaterial = _normalizeMaterialCode(sCode);
        var sName = String(sDisplayName || "").trim();
        var oOpts = oOptions || {};
        var bRaw = !!oOpts.isRawMaterial || getMaterialCodes().indexOf(sMaterial) >= 0;
        var bFinished = !!oOpts.isFinishedProduct ||
            FINISHED_PRODUCTS.some(function (oItem) {
                return oItem.code === sMaterial;
            });

        if (MATERIAL_ICON_BY_CODE[sMaterial]) {
            return MATERIAL_ICON_BY_CODE[sMaterial];
        }

        if (/가방/.test(sName) && !/지퍼/.test(sName)) {
            return MATERIAL_ICON_BY_CODE["UP-F-BAG-001"];
        }
        if (/지퍼/.test(sName)) {
            return MATERIAL_ICON_BY_CODE["UP-R-BZP-001"];
        }
        if (/히트텍/.test(sName)) {
            return MATERIAL_ICON_BY_CODE["UP-F-HIT-001"];
        }

        if (bFinished) {
            return CATEGORY_ICON_FINISHED;
        }
        if (bRaw) {
            return CATEGORY_ICON_RAW;
        }

        return { src: "sap-icon://tag", color: "#64748B" };
    }

    function getFinishedProductImageSrc(sCode) {
        var i;
        var sMaterial = _normalizeMaterialCode(sCode);

        for (i = 0; i < FINISHED_PRODUCTS.length; i++) {
            if (FINISHED_PRODUCTS[i].code === sMaterial) {
                return FINISHED_PRODUCTS[i].imageSrc || "";
            }
        }

        return "";
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
        getTotalRequirement: getTotalRequirement,
        getMaterialIconMeta: getMaterialIconMeta,
        getFinishedProductImageSrc: getFinishedProductImageSrc
    };
});
