/**
 * SapErrorUtil.js
 *
 * 역할:
 * - SAP OData 오류 응답에서 사용자 메시지 추출.
 *
 * 대시보드 구조: Main.controller.js, MaterialCreate.controller.js 등에서 사용.
 *
 * 협업: OData error handling 공통 → 이 util만 수정.
 */
sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * OData error 객체에서 표시용 메시지를 반환한다.
         * @param {object} oError OData error
         * @param {string} sDefault 기본 메시지
         * @returns {string}
         */
        extractMessage: function (oError, sDefault) {
            try {
                var oResponse = oError && oError.responseText && JSON.parse(oError.responseText);
                var oMsg = oResponse && oResponse.error && oResponse.error.message;
                if (oMsg && oMsg.value) {
                    return oMsg.value;
                }
            } catch (e) {
                // ignore parse errors
            }
            return (oError && oError.message) || sDefault;
        }
    };
});
