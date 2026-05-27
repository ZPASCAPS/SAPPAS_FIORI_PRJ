/**
 * SapErrorUtil.js
 *
 * 역할:
 * - SAP OData 오류 응답에서 사용자에게 보여줄 메시지를 추출한다.
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
