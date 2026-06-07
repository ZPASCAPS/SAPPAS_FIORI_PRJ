/**
 * DashboardThemeHelper.js
 *
 * 다크 모드 토글 및 SAP Horizon 테마 전환.
 */
sap.ui.define([], function () {
    "use strict";

    var STORAGE_KEY = "com.capstone.dashboard.fioridashboard.darkMode";
    var THEME_LIGHT = "sap_horizon";
    var THEME_DARK = "sap_horizon_dark";
    var BODY_CLASS = "nxDarkMode";

    return {
        load: function () {
            try {
                return window.localStorage.getItem(STORAGE_KEY) === "true";
            } catch (e) {
                return false;
            }
        },

        save: function (bEnabled) {
            try {
                window.localStorage.setItem(STORAGE_KEY, bEnabled ? "true" : "false");
            } catch (e) {
                // ignore storage errors
            }
        },

        apply: function (bEnabled) {
            var oBody = document.body;
            if (oBody) {
                oBody.classList.toggle(BODY_CLASS, !!bEnabled);
            }

            this.save(!!bEnabled);

            var sTheme = bEnabled ? THEME_DARK : THEME_LIGHT;
            var oCore = sap.ui.getCore();
            if (oCore && oCore.getConfiguration().getTheme() !== sTheme) {
                oCore.applyTheme(sTheme);
            }
        }
    };
});
