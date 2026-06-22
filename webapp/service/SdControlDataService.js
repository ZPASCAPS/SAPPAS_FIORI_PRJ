/**
 * SdControlDataService.js — SD 관제 테이블 OData read (Z_C_SD_CONTROL_SJ)
 */
sap.ui.define([
    "sap/ui/thirdparty/jquery",
    "com/capstone/dashboard/fioridashboard/util/SapErrorUtil",
    "com/capstone/dashboard/fioridashboard/model/formatter"
], function (jQuery, SapErrorUtil, formatter) {
    "use strict";

    var SERVICE_BASE = "/sap/opu/odata/sap/Z_C_SD_CONTROL_SJ_CDS/";
    var ENTITY_SET = "/Z_C_SD_CONTROL_SJ";
    var ENTITY_SET_ALTERNATES = [
        "/Z_C_SD_CONTROL_SJ",
        "/Z_C_SD_CONTROL_SJSet"
    ];
    var DASHBOARD_MATERIAL_CODES = ["UP-F-HIT-001", "UP-F-BAG-001"];

    function _normalizeMaterialCode(sText) {
        return String(sText || "").trim().toUpperCase();
    }

    function _isDashboardProductRow(oRow) {
        var sMaterial = _normalizeMaterialCode(
            oRow.Material || oRow.Product || oRow.MaterialCode || ""
        );
        var sProductName = String(oRow.ProductName || "");
        var i;

        for (i = 0; i < DASHBOARD_MATERIAL_CODES.length; i++) {
            if (sMaterial === DASHBOARD_MATERIAL_CODES[i]) {
                return true;
            }
        }

        if (/히트텍|히트택/i.test(sProductName)) {
            return true;
        }

        if (/가방/i.test(sProductName)) {
            return true;
        }

        return false;
    }

    function _filterDashboardProducts(aRows) {
        if (!aRows || !aRows.length) {
            return [];
        }

        return aRows.filter(_isDashboardProductRow);
    }

    function _collectEntitySetNames(oModel) {
        var oMeta = oModel && oModel.getServiceMetadata();
        var aSchema = oMeta && oMeta.dataServices && oMeta.dataServices.schema;
        var aContainers;
        var aSets;
        var aNames = [];
        var i;

        if (!aSchema || !aSchema.length) {
            return aNames;
        }

        aContainers = aSchema[0].entityContainer;
        if (!aContainers || !aContainers.length) {
            return aNames;
        }

        aSets = aContainers[0].entitySet || [];
        for (i = 0; i < aSets.length; i++) {
            if (aSets[i] && aSets[i].name) {
                aNames.push(aSets[i].name);
            }
        }

        return aNames;
    }

    function resolveEntitySet(oModel) {
        var aNames = _collectEntitySetNames(oModel);
        var i;
        var sName;

        for (i = 0; i < ENTITY_SET_ALTERNATES.length; i++) {
            sName = ENTITY_SET_ALTERNATES[i].replace(/^\//, "");
            if (aNames.indexOf(sName) >= 0) {
                return "/" + sName;
            }
        }

        for (i = 0; i < aNames.length; i++) {
            if (/Z_C_SD_CONTROL/i.test(aNames[i])) {
                return "/" + aNames[i];
            }
        }

        return ENTITY_SET;
    }

    function ensureMetadataReady(oModel) {
        return new Promise(function (resolve, reject) {
            if (!oModel) {
                reject(new Error("sdControlModel not available"));
                return;
            }

            if (oModel.getServiceMetadata()) {
                resolve();
                return;
            }

            var fnLoaded = function () {
                oModel.detachMetadataLoaded(fnLoaded);
                oModel.detachMetadataFailed(fnFailed);
                resolve();
            };
            var fnFailed = function (oEvent) {
                oModel.detachMetadataLoaded(fnLoaded);
                oModel.detachMetadataFailed(fnFailed);
                reject(oEvent.getParameter("message") || new Error("sdControlModel metadata load failed"));
            };

            oModel.attachMetadataLoaded(fnLoaded);
            oModel.attachMetadataFailed(fnFailed);
        });
    }

    function _parseJsonCollection(oData) {
        if (!oData) {
            return [];
        }
        if (oData.d && Array.isArray(oData.d.results)) {
            return oData.d.results;
        }
        if (Array.isArray(oData.results)) {
            return oData.results;
        }
        if (Array.isArray(oData.value)) {
            return oData.value;
        }
        if (oData.d && oData.d.SalesOrder !== undefined) {
            return [oData.d];
        }
        if (oData.SalesOrder !== undefined) {
            return [oData];
        }
        return [];
    }

    function _normalizeReadResults(oData) {
        if (!oData) {
            return [];
        }
        if (Array.isArray(oData.results)) {
            return oData.results;
        }
        if (Array.isArray(oData)) {
            return oData;
        }
        if (oData.SalesOrder !== undefined) {
            return [oData];
        }
        return [];
    }

    function _readViaModel(oModel, sEntitySet) {
        return new Promise(function (resolve, reject) {
            oModel.read(sEntitySet, {
                urlParameters: {
                    "$top": "500"
                },
                success: function (oData) {
                    resolve(_normalizeReadResults(oData));
                },
                error: function (oError) {
                    reject(oError);
                }
            });
        });
    }

    function _readViaJsonAjax(sEntitySet) {
        var sPath = String(sEntitySet || ENTITY_SET).replace(/^\//, "");

        return new Promise(function (resolve, reject) {
            jQuery.ajax({
                type: "GET",
                url: SERVICE_BASE + sPath,
                dataType: "json",
                data: {
                    "$format": "json",
                    "$top": "500"
                },
                success: function (oData) {
                    resolve(_parseJsonCollection(oData));
                },
                error: function (jqXHR) {
                    reject(jqXHR);
                }
            });
        });
    }

    function _readAllRows(oModel) {
        return ensureMetadataReady(oModel).then(function () {
            var sEntitySet = resolveEntitySet(oModel);

            return _readViaModel(oModel, sEntitySet).then(function (aRows) {
                if (aRows.length > 0) {
                    return aRows;
                }
                return _readViaJsonAjax(sEntitySet);
            });
        });
    }

    function _pickField(oRow, aKeys) {
        var i;
        var vVal;

        for (i = 0; i < aKeys.length; i++) {
            vVal = oRow[aKeys[i]];
            if (vVal !== undefined && vVal !== null && vVal !== "") {
                return vVal;
            }
        }

        return undefined;
    }

    function _pickOrderQuantity(oRow) {
        return Number(_pickField(oRow, ["OrderQuantity", "OrderQty", "Quantity", "KWMENG"])) || 0;
    }

    function _pickOrderQuantityUnit(oRow) {
        return String(_pickField(oRow, ["OrderQuantityUnit", "OrderUnit", "QuantityUnit", "VRKME"]) || "");
    }

    // 상태 표시 라벨: "부분 출하" → "출하 불가" (비즈니스 코드 변경 없이 렌더링 단계 변환)
    function _displayStatusText(sStatusText) {
        var s = String(sStatusText || "").trim();
        if (s === "부분 출하") {
            return "출하 불가";
        }
        return s || "-";
    }

    // 보류 사유 라벨: "재고 부족 · 부분 출하" 결합 문구는 "재고 부족"만 노출
    function _displayHoldReason(sHoldReason) {
        var s = String(sHoldReason || "").trim();
        s = s.replace(/\s*·\s*부분\s*출하\s*$/, "");
        return s || "-";
    }

    function _orderProblemState(sControlType) {
        switch (String(sControlType || "").toUpperCase()) {
            case "CREDIT":
                return "Error";
            case "DELIVERY":
                return "Warning";
            default:
                return "None";
        }
    }

    function _buildOrderDescription(sAmountDisplay, sQuantityDisplay) {
        if (sQuantityDisplay && sQuantityDisplay !== "-") {
            return sAmountDisplay + " · " + sQuantityDisplay;
        }
        return sAmountDisplay;
    }

    // 상세 모달의 오더 문구는 보류 사유만 노출 ("재고 부족 · 부분 출하" → "재고 부족")
    function _buildOrderProblemSummary(sHoldReason, sStatusText) {
        var sReason = _displayHoldReason(sHoldReason);
        if (sReason && sReason !== "-") {
            return sReason;
        }

        var sStatus = _displayStatusText(sStatusText);
        return (sStatus && sStatus !== "-") ? sStatus : "";
    }

    function _controlSortKey(sControlType) {
        switch (String(sControlType || "").toUpperCase()) {
            case "CREDIT":
                return 0;
            case "DELIVERY":
                return 1;
            default:
                return 2;
        }
    }

    function _parseODataDate(vDate) {
        var oDate;
        var nMs;
        var sRaw;

        if (!vDate) {
            return null;
        }
        if (vDate instanceof Date) {
            return isNaN(vDate.getTime()) ? null : vDate;
        }

        sRaw = String(vDate);
        if (sRaw.indexOf("/Date(") >= 0) {
            nMs = parseInt(sRaw.replace(/[^0-9-]/g, ""), 10);
            return isNaN(nMs) ? null : new Date(nMs);
        }

        oDate = new Date(sRaw);
        return isNaN(oDate.getTime()) ? null : oDate;
    }

    function _dayDiff(oDate, oToday) {
        var nFrom = Date.UTC(oToday.getFullYear(), oToday.getMonth(), oToday.getDate());
        var nTo = Date.UTC(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());
        return Math.round((nTo - nFrom) / 86400000);
    }

    function _classifyDeadline(nDiff) {
        if (nDiff < 0) {
            return {
                ddayText: "지연 " + Math.abs(nDiff) + "일",
                urgency: "overdue"
            };
        }
        if (nDiff === 0) {
            return { ddayText: "오늘 마감", urgency: "urgent" };
        }
        if (nDiff <= 3) {
            return { ddayText: "D-" + nDiff, urgency: "urgent" };
        }
        return { ddayText: "D-" + nDiff, urgency: "normal" };
    }

    // 오늘에 가까운 순: 임박(미래·오늘) 먼저, 그다음 최근 지연부터(-1 → -386)
    function _compareDeadline(a, b) {
        var bUpcomingA = a.sortKey >= 0 ? 0 : 1;
        var bUpcomingB = b.sortKey >= 0 ? 0 : 1;

        if (bUpcomingA !== bUpcomingB) {
            return bUpcomingA - bUpcomingB;
        }
        if (bUpcomingA === 0) {
            return a.sortKey - b.sortKey;
        }
        return b.sortKey - a.sortKey;
    }

    function _deadlineBucketKey(nDiff) {
        if (nDiff < 0) {
            return "overdue";
        }
        if (nDiff === 0) {
            return "today";
        }
        if (nDiff <= 3) {
            return "urgent";
        }
        return "later";
    }

    // 보드는 오늘 / D-1~3 / 이후 3등분으로 고정 (지연은 헤더 배지로만 집계)
    var DEADLINE_BUCKET_META = [
        { key: "today", label: "오늘", tone: "today" },
        { key: "urgent", label: "D-1~3", tone: "urgent" },
        { key: "later", label: "이후", tone: "later" }
    ];

    function _buildDeadlineBuckets(aItems) {
        var mByKey = {};

        aItems.forEach(function (oItem) {
            var sKey = _deadlineBucketKey(oItem.sortKey);
            if (!mByKey[sKey]) {
                mByKey[sKey] = [];
            }
            mByKey[sKey].push(oItem);
        });

        return DEADLINE_BUCKET_META.map(function (oMeta) {
            var aBucketItems = (mByKey[oMeta.key] || []).slice().sort(function (a, b) {
                return oMeta.key === "overdue"
                    ? b.sortKey - a.sortKey
                    : a.sortKey - b.sortKey;
            });

            // 모든 컬럼 2x2(최대 4건)까지 노출, 초과분은 "+N개" 버튼 → 팝오버.
            var iLimit = 4;
            var aVisible = aBucketItems.slice(0, iLimit);
            var iOverflow = aBucketItems.length - aVisible.length;

            return {
                key: oMeta.key,
                label: oMeta.label,
                tone: oMeta.tone,
                count: aBucketItems.length,
                countText: aBucketItems.length + "건",
                hasItems: aBucketItems.length > 0,
                toneClass: "nxSdDlCol--" + oMeta.tone,
                headToneClass: "nxSdDlColHead--" + oMeta.tone,
                items: aBucketItems,
                visibleItems: aVisible,
                overflowCount: iOverflow,
                hasOverflow: iOverflow > 0,
                overflowText: "+" + iOverflow + "개 더보기"
            };
        });
    }

    function _buildDeadlineSection(aODataRows) {
        var mOrders = {};
        var oToday = new Date();
        var i;
        var oRow;
        var sOrder;
        var oDate;
        var oBucket;
        var aItems;
        var nOverdue = 0;
        var nUrgent = 0;

        for (i = 0; i < aODataRows.length; i++) {
            oRow = aODataRows[i];
            sOrder = String(oRow.SalesOrder || "");
            if (!sOrder) {
                continue;
            }

            oDate = _parseODataDate(oRow.RequestedDeliveryDate);
            if (!mOrders[sOrder]) {
                mOrders[sOrder] = {
                    salesOrder: sOrder,
                    salesOrderDisplay: formatter.formatSalesOrderDisplay(sOrder),
                    customerName: oRow.CustomerName || "-",
                    productName: oRow.ProductName || "-",
                    controlType: String(oRow.ControlType || "").toUpperCase(),
                    date: oDate,
                    amount: 0,
                    currency: oRow.Currency || ""
                };
            }

            oBucket = mOrders[sOrder];
            oBucket.amount += Number(oRow.OrderAmount) || 0;
            if (oDate && (!oBucket.date || oDate < oBucket.date)) {
                oBucket.date = oDate;
            }
            if (oRow.Currency) {
                oBucket.currency = oRow.Currency;
            }
        }

        aItems = Object.keys(mOrders).map(function (sKey) {
            return mOrders[sKey];
        }).filter(function (oOrder) {
            return !!oOrder.date;
        }).map(function (oOrder) {
            var nDiff = _dayDiff(oOrder.date, oToday);
            var oClass = _classifyDeadline(nDiff);

            if (oClass.urgency === "overdue") {
                nOverdue += 1;
            } else if (oClass.urgency === "urgent") {
                nUrgent += 1;
            }

            return {
                salesOrderDisplay: oOrder.salesOrderDisplay,
                customerName: oOrder.customerName,
                productName: oOrder.productName,
                controlType: oOrder.controlType.toLowerCase(),
                dateDisplay: formatter.formatDate(oOrder.date),
                amountDisplay: formatter.formatAmountInKrw(oOrder.amount, oOrder.currency),
                ddayText: oClass.ddayText,
                urgency: oClass.urgency,
                ddayClass: "nxSdControlDeadlineDday--" + oClass.urgency,
                itemToneClass: "nxSdControlDeadlineItem--" + oClass.urgency,
                itemClass: "nxSdControlDeadlineItem nxSdControlDeadlineItem--" + oClass.urgency,
                sortKey: nDiff
            };
        }).sort(_compareDeadline);

        return {
            title: "납기 임박 · 지연 오더",
            subtitle: nOverdue + "건 지연 · " + nUrgent + "건 임박(D-3)",
            overdueCount: nOverdue,
            urgentCount: nUrgent,
            hasItems: aItems.length > 0,
            emptyText: "임박하거나 지연된 납기 오더가 없습니다.",
            items: aItems,
            buckets: _buildDeadlineBuckets(aItems)
        };
    }

    function _emptyDeadlineSection() {
        return {
            title: "납기 임박 · 지연 오더",
            subtitle: "0건 지연 · 0건 임박(D-3)",
            overdueCount: 0,
            urgentCount: 0,
            hasItems: false,
            emptyText: "임박하거나 지연된 납기 오더가 없습니다.",
            items: [],
            buckets: []
        };
    }

    function _countDistinctOrdersByControlType(aRows) {
        var oCreditOrders = {};
        var oDeliveryOrders = {};
        var i;
        var oRow;
        var sType;
        var sOrder;

        for (i = 0; i < aRows.length; i++) {
            oRow = aRows[i];
            sOrder = String(oRow.SalesOrder || "");
            if (!sOrder) {
                continue;
            }
            sType = String(oRow.ControlType || "").toUpperCase();
            if (sType === "CREDIT") {
                oCreditOrders[sOrder] = true;
            } else if (sType === "DELIVERY") {
                oDeliveryOrders[sOrder] = true;
            }
        }

        return {
            creditCount: Object.keys(oCreditOrders).length,
            deliveryCount: Object.keys(oDeliveryOrders).length
        };
    }

    function _aggregateByCustomerAndHoldReason(aODataRows) {
        var mGroups = {};
        var aKeys;
        var i;
        var oRow;
        var sKey;
        var oGroup;
        var aProductNames;
        var nOrderCount;
        var sProductName;
        var sProductKey;
        var sOrderKey;
        var oProductBucket;
        var oOrderBucket;

        for (i = 0; i < aODataRows.length; i++) {
            oRow = aODataRows[i];
            sKey = String(oRow.Customer || "") + "|" + String(oRow.HoldReason || "");

            if (!mGroups[sKey]) {
                mGroups[sKey] = {
                    customerName: oRow.CustomerName || "-",
                    holdReason: _displayHoldReason(oRow.HoldReason),
                    controlType: String(oRow.ControlType || "").toUpperCase(),
                    statusText: _displayStatusText(oRow.StatusText),
                    currency: oRow.Currency || "",
                    totalAmount: 0,
                    salesOrders: {},
                    productMap: {}
                };
            }

            oGroup = mGroups[sKey];
            oGroup.totalAmount += Number(oRow.OrderAmount) || 0;
            if (oRow.SalesOrder) {
                oGroup.salesOrders[oRow.SalesOrder] = true;
            }

            sProductKey = oRow.ProductName || "-";
            if (!oGroup.productMap[sProductKey]) {
                oGroup.productMap[sProductKey] = {
                    productName: sProductKey,
                    orderMap: {}
                };
            }

            oProductBucket = oGroup.productMap[sProductKey];
            sOrderKey = String(oRow.SalesOrder || "");
            if (sOrderKey) {
                if (!oProductBucket.orderMap[sOrderKey]) {
                    oProductBucket.orderMap[sOrderKey] = {
                        salesOrder: sOrderKey,
                        salesOrderDisplay: formatter.formatSalesOrderDisplay(sOrderKey),
                        orderAmount: 0,
                        orderQuantity: 0,
                        currency: oRow.Currency || "",
                        quantityUnit: _pickOrderQuantityUnit(oRow),
                        controlType: String(oRow.ControlType || "").toUpperCase(),
                        holdReason: oRow.HoldReason || "-",
                        statusText: oRow.StatusText || "-"
                    };
                }
                oOrderBucket = oProductBucket.orderMap[sOrderKey];
                oOrderBucket.orderAmount += Number(oRow.OrderAmount) || 0;
                oOrderBucket.orderQuantity += _pickOrderQuantity(oRow);
                oOrderBucket.currency = oRow.Currency || oOrderBucket.currency;
                if (!oOrderBucket.quantityUnit) {
                    oOrderBucket.quantityUnit = _pickOrderQuantityUnit(oRow);
                }
            }
        }

        aKeys = Object.keys(mGroups);
        return aKeys.map(function (sGroupKey) {
            oGroup = mGroups[sGroupKey];
            aProductNames = Object.keys(oGroup.productMap);
            nOrderCount = Object.keys(oGroup.salesOrders).length;

            if (aProductNames.length === 0) {
                sProductName = "-";
            } else if (aProductNames.length === 1) {
                sProductName = aProductNames[0];
            } else {
                sProductName = "복수 품목 (" + aProductNames.length + "종)";
            }

            var aProductDetails = aProductNames.map(function (sName) {
                var oProd = oGroup.productMap[sName];
                var aOrders = Object.keys(oProd.orderMap).map(function (sOrd) {
                    var oOrd = oProd.orderMap[sOrd];
                    var sAmountDisplay = formatter.formatAmountInKrw(oOrd.orderAmount, oOrd.currency);
                    var sQuantityDisplay = formatter.formatQtyUnit(
                        oOrd.orderQuantity || null,
                        oOrd.quantityUnit
                    );

                    return {
                        salesOrder: oOrd.salesOrder,
                        salesOrderDisplay: oOrd.salesOrderDisplay,
                        amountDisplay: sAmountDisplay,
                        quantityDisplay: sQuantityDisplay,
                        descriptionDisplay: _buildOrderDescription(sAmountDisplay, sQuantityDisplay),
                        holdReason: oOrd.holdReason,
                        statusText: oOrd.statusText,
                        controlType: oOrd.controlType,
                        problemSummary: _buildOrderProblemSummary(
                            oOrd.holdReason,
                            oOrd.statusText
                        ),
                        problemState: _orderProblemState(oOrd.controlType)
                    };
                }).sort(function (a, b) {
                    return String(a.salesOrder).localeCompare(String(b.salesOrder));
                });

                return {
                    productName: oProd.productName,
                    orderCount: aOrders.length,
                    orderCountDisplay: aOrders.length + "건",
                    headerText: oProd.productName + " · " + aOrders.length + "건",
                    orders: aOrders
                };
            }).sort(function (a, b) {
                return String(a.productName).localeCompare(String(b.productName));
            });

            return {
                customerName: oGroup.customerName,
                productName: sProductName,
                hasMultipleProducts: aProductNames.length > 1,
                productDetails: aProductDetails,
                orderCount: nOrderCount,
                orderCountDisplay: nOrderCount + "건",
                amountDisplay: formatter.formatAmountInKrw(oGroup.totalAmount, oGroup.currency),
                holdReason: oGroup.holdReason,
                statusText: oGroup.statusText,
                statusState: formatter.formatSdControlStatusState(oGroup.controlType),
                statusIcon: formatter.formatSdControlStatusIcon(oGroup.controlType),
                controlType: oGroup.controlType.toLowerCase()
            };
        });
    }

    function _buildCreditBlockOrders(aODataRows) {
        var mOrders = {};
        var i;
        var oRow;
        var sOrder;
        var oBucket;

        for (i = 0; i < aODataRows.length; i++) {
            oRow = aODataRows[i];
            if (String(oRow.ControlType || "").toUpperCase() !== "CREDIT") {
                continue;
            }
            sOrder = String(oRow.SalesOrder || "");
            if (!sOrder) {
                continue;
            }

            if (!mOrders[sOrder]) {
                mOrders[sOrder] = {
                    salesOrder: sOrder,
                    customerName: oRow.CustomerName || "-",
                    productNames: {},
                    amount: 0,
                    currency: oRow.Currency || "",
                    holdReason: oRow.HoldReason || "-",
                    statusText: oRow.StatusText || "-"
                };
            }

            oBucket = mOrders[sOrder];
            oBucket.amount += Number(oRow.OrderAmount) || 0;
            if (oRow.Currency) {
                oBucket.currency = oRow.Currency;
            }
            if (oRow.CustomerName) {
                oBucket.customerName = oRow.CustomerName;
            }
            if (oRow.ProductName) {
                oBucket.productNames[oRow.ProductName] = true;
            }
        }

        return Object.keys(mOrders).map(function (sKey) {
            var o = mOrders[sKey];
            var aNames = Object.keys(o.productNames);
            var sProduct;

            if (aNames.length === 0) {
                sProduct = "-";
            } else if (aNames.length === 1) {
                sProduct = aNames[0];
            } else {
                sProduct = "복수 품목 (" + aNames.length + "종)";
            }

            return {
                salesOrder: o.salesOrder,
                orderNoDisplay: "오더 " + formatter.formatSalesOrderDisplay(o.salesOrder),
                customerName: o.customerName,
                productName: sProduct,
                amountDisplay: formatter.formatAmountInKrw(o.amount, o.currency),
                holdReason: _displayHoldReason(o.holdReason),
                statusText: _displayStatusText(o.statusText),
                statusState: formatter.formatSdControlStatusState("CREDIT"),
                statusIcon: formatter.formatSdControlStatusIcon("CREDIT")
            };
        }).sort(function (a, b) {
            return String(a.salesOrder).localeCompare(String(b.salesOrder));
        });
    }

    function _emptyViewData() {
        return {
            loading: true,
            error: "",
            title: "납기 관리",
            subtitle: "히트텍 · 가방 관련 오더만 표시합니다.",
            creditCount: 0,
            deliveryCount: 0,
            emptyText: "관제 대상 오더가 없습니다.",
            rows: [],
            creditBlockOrders: [],
            deadline: _emptyDeadlineSection()
        };
    }

    function _mapRowsToViewData(aODataRows) {
        // 여신(CREDIT) 오더는 상단 "여신 초과" KPI 카드 모달로 분리 → 납기 관리 표에서는 제외
        var aAggregated = _aggregateByCustomerAndHoldReason(aODataRows || []).filter(function (oGroup) {
            return oGroup.controlType !== "credit";
        });
        var aSorted = aAggregated.sort(function (a, b) {
            var nDiff = _controlSortKey(a.controlType) - _controlSortKey(b.controlType);
            if (nDiff !== 0) {
                return nDiff;
            }
            return String(a.customerName || "").localeCompare(String(b.customerName || ""));
        });
        var oCounts = _countDistinctOrdersByControlType(aODataRows);

        return {
            loading: false,
            error: "",
            title: "납기 관리",
            subtitle: "히트텍 · 가방 관련 오더만 표시합니다.",
            creditCount: oCounts.creditCount,
            deliveryCount: oCounts.deliveryCount,
            emptyText: "관제 대상 오더가 없습니다.",
            rows: aSorted,
            creditBlockOrders: _buildCreditBlockOrders(aODataRows),
            deadline: _buildDeadlineSection(aODataRows)
        };
    }

    return {
        ENTITY_SET: ENTITY_SET,
        SERVICE_BASE: SERVICE_BASE,
        resolveEntitySet: resolveEntitySet,
        ensureMetadataReady: ensureMetadataReady,
        getEmptyViewData: _emptyViewData,

        /**
         * KPI와 동일하게 ODataModel.read 후 JSON 뷰 모델로 매핑
         * @param {sap.ui.core.Component} oComponent
         * @returns {Promise<object>}
         */
        load: function (oComponent) {
            var oModel = oComponent && oComponent.getModel("sdControlModel");

            return _readAllRows(oModel)
                .then(function (aRows) {
                    var aFiltered = _filterDashboardProducts(aRows);
                    var oViewData = _mapRowsToViewData(aFiltered);

                    if (!aFiltered.length) {
                        oViewData.error = aRows.length
                            ? "히트텍 · 가방 관련 관제 오더가 없습니다."
                            : "OData에서 관제 데이터가 비어 있습니다. ADT Preview에 데이터가 있다면 Gateway 서비스(Z_C_SD_CONTROL_SJ_CDS) 캐시 삭제 후 재활성화를 확인해 주세요.";
                    }
                    return oViewData;
                })
                .catch(function (oError) {
                    var oViewData = _emptyViewData();
                    oViewData.loading = false;
                    oViewData.error = SapErrorUtil.extractMessage(oError, "관제 테이블 조회에 실패했습니다.");
                    return oViewData;
                });
        }
    };
});
