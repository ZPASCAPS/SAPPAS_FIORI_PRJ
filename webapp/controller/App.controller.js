/**
 * App.controller.js
 *
 * View: com.capstone.dashboard.fioridashboard.view.App
 * Controller: com.capstone.dashboard.fioridashboard.controller.App
 *
 * 역할:
 * - App.view.xml 최상위 Shell Controller. 현재 초기화 로직 없음.
 *
 * 대시보드 구조: App → Main (Component.js가 Main.view 로드)
 *
 * 협업: 라우팅·앱 전역 이벤트 추가 시 이 파일에서 작업한다.
 */
sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("com.capstone.dashboard.fioridashboard.controller.App", {
      onInit() {
      }
  });
});