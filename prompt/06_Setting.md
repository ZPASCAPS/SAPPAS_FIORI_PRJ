# SAP Fiori/UI5 프로젝트 기능별 파일 분리 리팩토링 요청

너는 SAP Fiori/UI5 프로젝트 구조를 설계하고 리팩토링하는 시니어 프론트엔드 개발자다.

현재 우리는 3명이서 VS Code와 GitHub를 사용해 SAP Fiori/UI5 기반 캡스톤 대시보드를 협업 개발하고 있다.

프로젝트는 하나의 SAP 통합 대시보드 프로그램이며, 메인 대시보드 안에 여러 기능 또는 리포트 형식의 화면을 구현할 예정이다.

현재 문제는 Main.view.xml과 Main.controller.js 같은 하나의 파일 안에 모든 화면 UI 코드와 기능 로직을 작성하면 다음 문제가 발생한다는 점이다.

- 3명이 동시에 같은 파일을 수정해서 Git 충돌이 자주 발생함
- 화면 레이아웃 코드와 기능 로직 코드가 섞여 유지보수가 어려움
- 다른 팀원의 코드를 실수로 건드릴 가능성이 큼
- 기능별 책임 구분이 어려움
- Main.view.xml과 Main.controller.js가 너무 커져서 구조 파악이 어려움
- Cursor를 사용하지 않는 팀원도 유지보수하기 어려움

따라서 현재 프로젝트를 UI5의 Nested Views 방식으로 리팩토링하고 싶다.

즉, Main.view.xml은 전체 대시보드의 뼈대와 배치만 담당하고, 실제 기능 화면과 로직은 기능별 XML View와 Controller 파일로 분리한다.

---

# 핵심 목표

현재 프로젝트를 다음 기준으로 리팩토링해줘.

1. Main.view.xml은 전체 대시보드 레이아웃만 담당한다.
2. 각 기능은 별도의 XML View와 Controller.js 파일을 가진다.
3. Main.view.xml에서는 각 기능 View를 `<mvc:XMLView>`로 호출한다.
4. 각 기능의 로직은 해당 기능 Controller 안에만 작성한다.
5. Main.controller.js는 전체 공통 초기화, 공통 모델 연결, 공통 이벤트 정도만 담당한다.
6. 기능별 파일을 분리해서 GitHub 협업 시 merge conflict를 최소화한다.
7. 불필요한 파일은 만들지 않는다.
8. 기존 프로젝트가 `npm start`로 실행 가능한 상태를 유지한다.
9. 기존 코드를 무작정 삭제하지 말고, 필요한 코드는 알맞은 기능 파일로 이동한다.
10. namespace 오류가 발생하지 않도록 manifest.json의 `sap.app.id`를 기준으로 viewName과 controllerName을 정확히 작성한다.

---

# 반드시 지킬 방식

이번 리팩토링은 반드시 아래 방식으로 진행해줘.

- Routing 방식은 사용하지 않는다.
- Fragment 방식도 사용하지 않는다.
- 이번에는 Nested Views 방식만 사용한다.
- Main.view.xml 안에 기능별 UI를 직접 길게 작성하지 않는다.
- Main.view.xml은 기능 View를 호출하는 역할만 한다.
- 기능별 화면은 `webapp/view/features` 폴더에 작성한다.
- 기능별 Controller는 `webapp/controller/features` 폴더에 작성한다.
- 각 기능 Controller는 자기 기능 View의 데이터와 이벤트만 담당한다.
- 기능 Controller끼리 직접 참조하지 않는다.
- 공통 데이터가 필요하면 Main.controller.js 또는 Component.js에서 모델로 관리한다.
- 각 파일 맨 위에는 이 파일이 어떤 역할을 하는지 주석을 작성한다.
- 별도 주석 파일은 만들지 않는다.
- 주석은 코드 파일 내부에 직접 작성한다.
- 파일 이름만 봐도 어떤 기능인지 알 수 있도록 명확하게 작성한다.
- 테스트용 의미 없는 파일이나 불필요한 예제 파일을 만들지 않는다.

---

# 원하는 최종 폴더 구조

아래 구조를 기준으로 정리해줘.

webapp/
 ├─ view/
 │   ├─ Main.view.xml
 │   └─ features/
 │       ├─ ProcessFlow.view.xml
 │       ├─ InventoryStatus.view.xml
 │       ├─ OrderImpact.view.xml
 │       ├─ MaterialShortage.view.xml
 │       └─ AiAssistant.view.xml
 │
 ├─ controller/
 │   ├─ Main.controller.js
 │   └─ features/
 │       ├─ ProcessFlow.controller.js
 │       ├─ InventoryStatus.controller.js
 │       ├─ OrderImpact.controller.js
 │       ├─ MaterialShortage.controller.js
 │       └─ AiAssistant.controller.js
 │
 ├─ css/
 │   └─ style.css
 │
 ├─ model/
 │   └─ models.js
 │
 ├─ Component.js
 └─ manifest.json

단, 현재 프로젝트에 이미 존재하는 구조가 다르면 기존 구조를 최대한 유지하면서 위 구조와 비슷하게 정리해줘.

---

# 기능별 역할 정의

## 1. Main.view.xml

역할:
- 전체 대시보드의 최상위 화면 담당
- Page 또는 DynamicPage 기반의 전체 레이아웃 구성
- Header, 메인 콘텐츠, 섹션 배치 담당
- 각 기능 View를 `<mvc:XMLView>`로 호출
- 기능별 세부 UI는 작성하지 않음

Main.view.xml은 아래와 같은 방식으로 작성해줘.

```xml
<mvc:View
    controllerName="프로젝트namespace.controller.Main"
    xmlns:mvc="sap.ui.core.mvc"
    xmlns="sap.m"
    xmlns:core="sap.ui.core">

    <Page title="SAP 통합 프로세스 대시보드">
        <content>
            <VBox class="sapUiMediumMargin">

                <mvc:XMLView viewName="프로젝트namespace.view.features.ProcessFlow" />

                <mvc:XMLView viewName="프로젝트namespace.view.features.InventoryStatus" />

                <mvc:XMLView viewName="프로젝트namespace.view.features.OrderImpact" />

                <mvc:XMLView viewName="프로젝트namespace.view.features.MaterialShortage" />

                <mvc:XMLView viewName="프로젝트namespace.view.features.AiAssistant" />

            </VBox>
        </content>
    </Page>
</mvc:View>