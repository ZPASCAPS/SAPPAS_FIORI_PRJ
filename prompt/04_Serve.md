# 04. Feature Components Prompt

SAP Fiori 통합 대시보드의 세부 기능을 모듈별 컴포넌트로 나누어 구현한다.

각 기능은 독립적으로 유지보수할 수 있도록 분리한다.

불필요한 파일은 만들지 않고, 실제 화면과 로직에 필요한 컴포넌트만 생성한다.

## SD 탭 기능

SD 탭은 수주 정보를 보여준다.(예시)

주요 표시 정보:

- Sales Order
- Customer
- Order Quantity
- Requested Delivery Date
- Emergency Order 여부
- Order Status

각 모듈이나 회사에 맞는 기능을 설정할것임.

권장 파일:

```text
webapp/view/SalesOrderPanel.view.xml
webapp/controller/SalesOrderPanel.controller.js