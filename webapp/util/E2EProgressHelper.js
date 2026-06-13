/**
 * E2EProgressHelper.js — E2E Flow 진행도·색상 상태 계산
 *
 * iProgressStep: 완료된 단계 수 (0 = 미조회, 4 = 4단계까지 완료 → 5단계 진행중)
 */
sap.ui.define([], function () {
    "use strict";

    var TOTAL_STEPS = 11;
    var EMPTY_DOC = "-------";
    var CONNECTOR_KEYS = ["12", "23", "34", "45", "56", "67", "78", "89", "910", "1011"];
    var CONNECTOR_TO_STEP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    function resolveStepStatus(iStepNo, iProgressStep) {
        if (!iProgressStep || iProgressStep <= 0) {
            return "idle";
        }
        if (iStepNo <= iProgressStep) {
            return "completed";
        }
        if (iStepNo === iProgressStep + 1) {
            return "active";
        }
        return "pending";
    }

    function resolveConnectorStatus(iToStep, iProgressStep) {
        if (!iProgressStep || iProgressStep <= 0) {
            return "idle";
        }
        if (iToStep <= iProgressStep) {
            return "completed";
        }
        if (iToStep === iProgressStep + 1) {
            return "active";
        }
        return "pending";
    }

    function cardClassForStatus(sStatus) {
        switch (sStatus) {
            case "completed":
                return "e2eMtoCardDone";
            case "active":
                return "e2eMtoCardActive";
            default:
                return "e2eMtoCardPending";
        }
    }

    function connectorClassForStatus(sStatus) {
        switch (sStatus) {
            case "completed":
                return "e2eMtoConnectorDone";
            case "active":
                return "e2eMtoConnectorActive";
            default:
                return "e2eMtoConnectorPending";
        }
    }

    function statusToCardClass(sStatus) {
        return cardClassForStatus(sStatus);
    }

    function statusToConnectorClass(sStatus) {
        return connectorClassForStatus(sStatus);
    }

    function buildStepStatuses(iProgressStep) {
        var aStatuses = [];
        var i;

        for (i = 1; i <= TOTAL_STEPS; i++) {
            aStatuses.push(resolveStepStatus(i, iProgressStep));
        }
        return aStatuses;
    }

    function buildStepCardClasses(iProgressStep) {
        return buildStepStatuses(iProgressStep).map(statusToCardClass);
    }

    function buildConnectorClasses(iProgressStep) {
        var oClasses = {};
        var i;

        for (i = 0; i < CONNECTOR_KEYS.length; i++) {
            oClasses[CONNECTOR_KEYS[i]] = statusToConnectorClass(
                resolveConnectorStatus(CONNECTOR_TO_STEP[i], iProgressStep)
            );
        }
        return oClasses;
    }

    function buildGaugeSegments(iProgressStep) {
        var aSegments = [];
        var i;
        var sStatus;

        for (i = 1; i <= TOTAL_STEPS; i++) {
            sStatus = resolveStepStatus(i, iProgressStep);
            aSegments.push({
                step: i,
                status: sStatus === "completed" ? "done" : (sStatus === "active" ? "active" : "pending")
            });
        }
        return aSegments;
    }

    function buildEmptyFlowData() {
        return {
            SalesOrder: EMPTY_DOC,
            PlannedOrder: EMPTY_DOC,
            PurchaseReq: EMPTY_DOC,
            PurchaseOrder: EMPTY_DOC,
            POMigo: EMPTY_DOC,
            ProductionOrder: EMPTY_DOC,
            ProdMigo: EMPTY_DOC,
            Delivery: EMPTY_DOC,
            Billing: EMPTY_DOC,
            FI: EMPTY_DOC,
            Clearing: EMPTY_DOC
        };
    }

    function applyProgress(oDashboardModel, iProgressStep) {
        var iStep = iProgressStep || 0;

        oDashboardModel.setProperty("/e2eProcessFlow/progressStep", iStep);
        oDashboardModel.setProperty("/e2eProcessFlow/stepStatuses", buildStepStatuses(iStep));
        oDashboardModel.setProperty("/e2eProcessFlow/stepCardClasses", buildStepCardClasses(iStep));
        oDashboardModel.setProperty("/e2eProcessFlow/connectorClasses", buildConnectorClasses(iStep));
        oDashboardModel.setProperty("/e2eProcessFlow/processGauge/segments", buildGaugeSegments(iStep));
    }

    function updateProcessGauge(oDashboardModel, sOrderNum, iProgressStep, iTotal, sStageTitle, iProgressPercent) {
        oDashboardModel.setProperty("/e2eProcessFlow/processGauge/orderNumber", sOrderNum || "");
        oDashboardModel.setProperty("/e2eProcessFlow/processGauge/currentStep", iProgressStep || 0);
        oDashboardModel.setProperty("/e2eProcessFlow/processGauge/totalSteps", iTotal || TOTAL_STEPS);
        oDashboardModel.setProperty("/e2eProcessFlow/processGauge/stageText", sStageTitle || "");
        oDashboardModel.setProperty("/e2eProcessFlow/processGauge/progressPercent", iProgressPercent || 0);
    }

    function resetFlow(oFlowModel, oDashboardModel) {
        if (oFlowModel) {
            oFlowModel.setData(buildEmptyFlowData());
        }
        if (oDashboardModel) {
            applyProgress(oDashboardModel, 0);
            updateProcessGauge(oDashboardModel, "", 0, TOTAL_STEPS, "", 0);
        }
    }

    return {
        TOTAL_STEPS: TOTAL_STEPS,
        EMPTY_DOC: EMPTY_DOC,
        buildEmptyFlowData: buildEmptyFlowData,
        buildStepStatuses: buildStepStatuses,
        buildStepCardClasses: buildStepCardClasses,
        buildConnectorClasses: buildConnectorClasses,
        buildGaugeSegments: buildGaugeSegments,
        applyProgress: applyProgress,
        updateProcessGauge: updateProcessGauge,
        resetFlow: resetFlow,
        cardClassForStatus: cardClassForStatus,
        connectorClassForStatus: connectorClassForStatus
    };
});
