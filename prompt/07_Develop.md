# 07. 협업 개발 가이드 (Cursor / Gemini / GPT)

이 문서는 **3명 팀이 서로 다른 AI 도구**로 같은 프로젝트를 수정할 때,  
**어느 파일을 고쳐야 하는지**, **오류가 어디서 났는지** 빠르게 찾기 위한 가이드이다.

---

## 1. 왜 이 문서가 필요한가

| 도구 | 특징 | 위험 |
|------|------|------|
| **Cursor** | 프로젝트 전체 폴더를 읽고 연결 관계를 분석 | 상대적으로 안전 |
| **Gemini / ChatGPT** | 보통 **붙여넣은 한 파일**만 수정 | View만 고치고 Controller를 안 고침, namespace 오타, 다른 파일과 모델 경로 불일치 |

우리 프로젝트는 **Nested Views** 방식으로 View와 Controller가 **파일별로 쌍**을 이룬다.  
한쪽만 수정하면 화면은 안 바뀌거나, 콘솔에 `failed to load controller`, `Cannot read property` 같은 오류가 난다.

**작업 전에 이 문서(또는 01~06 prompt)를 AI에게 먼저 학습시킨 뒤**,  
**담당 파일만 지정해서** 수정하도록 한다.

---

## 2. 프로젝트 namespace (반드시 통일)

`manifest.json` → `sap.app.id`:

```text
com.capstone.dashboard.fioridashboard
```

View / Controller 이름 규칙:

| 종류 | 경로 예시 |
|------|-----------|
| View | `com.capstone.dashboard.fioridashboard.view.features.DashboardHeader` |
| Controller | `com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader` |
| 파일 경로 | `webapp/view/features/DashboardHeader.view.xml` |
| Controller 파일 | `webapp/controller/features/DashboardHeader.controller.js` |

**오류 패턴:** `controllerName`과 실제 `.controller.js` 경로·이름이 1글자만 달라도 화면이 깨진다.

---

## 3. 화면 연결 구조 (전체 지도)

```text
index.html
└─ Component.js                    ← OData 모델, device 모델
   └─ App.view.xml
      └─ Main.view.xml             ← 좌/우 뼈대 ONLY
         ├─ ModuleSideNav          ← 왼쪽 사이드바 (메뉴·로고)
         └─ DashboardMain          ← 오른쪽 컨테이너 ONLY
            ├─ DashboardHeader     ← 검색·알림·프로필 Dialog
            ├─ DashboardToolbar    ← 탭 제목·새로고침
            ├─ DashboardCanvas     ← 중앙 본문 (탭별 콘텐츠)
            │  └─ SectionPlaceholder ← 현재 모든 탭 안내 카드
            ├─ AiAssistant         ← 챗봇 (오버레이)
            └─ MaterialCreate      ← 자재 등록 Dialog (오버레이)
```

**Routing 사용 안 함.** **Fragment 사용 안 함.**  
화면 추가 = `view/features/` + `controller/features/` + 상위 View에 `<mvc:XMLView>` 한 줄.

---

## 4. 폴더별 역할

```text
SAPPAS_FIORI_PRJ/
├─ prompt/              ← AI 학습용 (01~07). 코드 아님
├─ webapp/
│  ├─ Component.js      ← 앱 시작, OData
│  ├─ manifest.json     ← namespace, OData URL
│  ├─ index.html
│  ├─ css/style.css     ← 전역·영역별 스타일 (.nxSidebar, .nxProfile 등)
│  ├─ model/models.js   ← device 모델 (dashboard 모델 아님!)
│  ├─ service/
│  │  └─ DashboardDataService.js  ← OData → dashboard JSON 변환
│  ├─ util/
│  │  └─ SapErrorUtil.js          ← SAP 오류 메시지
│  ├─ view/
│  │  ├─ App.view.xml
│  │  ├─ Main.view.xml
│  │  └─ features/      ← ★ 기능별 View (팀원 작업 주 영역)
│  └─ controller/
│     ├─ App.controller.js
│     ├─ Main.controller.js       ← ★ 공통 dashboard 모델·OData
│     └─ features/                ← ★ 기능별 Controller
```

---

## 5. View ↔ Controller ↔ 담당 기능 표

작업할 때 **View와 Controller는 항상 같은 이름**으로 짝을 맞춘다.

| View | Controller | 화면 위치 | 주요 역할 |
|------|------------|-----------|-----------|
| `App.view.xml` | `App.controller.js` | 최상위 | Shell |
| `Main.view.xml` | `Main.controller.js` | 전체 | 좌/우 분할, **dashboard JSONModel**, OData 로드 |
| `ModuleSideNav.view.xml` | `ModuleSideNav.controller.js` | 왼쪽 | 메뉴, **navKey** 변경 |
| `DashboardMain.view.xml` | `DashboardMain.controller.js` | 오른쪽 | 하위 View 묶음 (로직 거의 없음) |
| `DashboardHeader.view.xml` | `DashboardHeader.controller.js` | 상단 | 검색, 프로필 Dialog |
| `DashboardToolbar.view.xml` | `DashboardToolbar.controller.js` | 헤더 아래 | 탭 제목, 새로고침 |
| `DashboardCanvas.view.xml` | `DashboardCanvas.controller.js` | 중앙 | 탭별 본문 |
| `SectionPlaceholder.view.xml` | `SectionPlaceholder.controller.js` | 중앙 | 탭 안내 카드 |
| `AiAssistant.view.xml` | `AiAssistant.controller.js` | 오버레이 | 챗봇 |
| `MaterialCreate.view.xml` | `MaterialCreate.controller.js` | Dialog | SAP 자재 등록 |
| `InventoryStatus.view.xml` | `InventoryStatus.controller.js` | (예비) | KPI 카드 |
| `StatusSummary.view.xml` | `StatusSummary.controller.js` | (예비) | 상태 pill |
| `OrderImpact.view.xml` | `OrderImpact.controller.js` | (예비) | Sales 차트 |
| `ProcessFlow.view.xml` | `ProcessFlow.controller.js` | (예비) | Distribution |
| `MaterialShortage.view.xml` | `MaterialShortage.controller.js` | (예비) | 연동 테이블 |
| `StockActivity.view.xml` | `StockActivity.controller.js` | (예비) | Stock 차트 |

각 파일 **맨 위 주석**에도 View/Controller/협업 범위가 적혀 있다. VS Code에서 파일만 열어도 역할을 알 수 있다.

---

## 6. 공통 데이터는 어디에 있는가

Gemini/GPT가 **한 Controller만** 수정할 때 가장 많이 깨지는 부분이다.

### dashboard JSONModel (화면 대부분이 사용)

- **생성 위치:** `Main.controller.js` → `_initModels()`
- **모델 이름:** `"dashboard"` (Component에 등록)
- **바인딩 예:** `{dashboard>/user/name}`, `{dashboard>/ui/navKey}`

| 경로 | 설명 | 주로 수정하는 파일 |
|------|------|-------------------|
| `/ui/navKey` | 현재 탭 ID | ModuleSideNav.controller.js |
| `/ui/navLabel` | 탭 제목 | ModuleSideNav.controller.js |
| `/ui/navDescription` | 탭 안내문 | ModuleSideNav.controller.js |
| `/user/name`, `/user/role` | 프로필 | DashboardHeader.controller.js |
| `/profileOptions/names` | 이름 Select 목록 | Main.controller.js |
| `/summary`, `/integrations` 등 | KPI·테이블 | DashboardDataService.js + Main.controller.js |

**규칙:** Select/Input에 새 필드를 쓰려면  
1) `Main.controller.js`에 초기값 추가  
2) View에 바인딩  
3) Controller에 저장 로직  

→ **3곳**이 한 세트. View만 고치면 값이 undefined다.

### OData (SAP 실데이터)

- **설정:** `manifest.json` → `dataSources.mainService`
- **읽기:** `Main.controller.js` → `/BomStockSet`
- **가공:** `service/DashboardDataService.js`
- **create:** `MaterialCreate.controller.js`

### EventBus (파일 간 신호)

| 채널 | 이벤트 | 보내는 쪽 | 받는 쪽 |
|------|--------|-----------|---------|
| `dashboard` | `refreshData` | DashboardToolbar, MaterialCreate | Main.controller.js |

한 Controller에서 `publish`만 추가하고 Main에 `subscribe`가 없으면 새로고침이 동작하지 않는다.

---

## 7. 증상 → 원인 → 확인할 파일

| 브라우저/콘솔 증상 | 먼저 확인할 파일 |
|-------------------|------------------|
| 흰 화면, 앱 안 뜸 | `manifest.json`, `Component.js`, `index.html` |
| `failed to load controller` | View의 `controllerName` ↔ controller 파일명·namespace |
| `Error: unknown provider 'dashboard'` | `Main.controller.js` (_initModels 실행 여부) |
| 버튼 눌러도 반응 없음 | 해당 View의 `press=".onXXX"` ↔ Controller에 `onXXX` 함수 존재 |
| 바인딩 `{dashboard>/...}` 안 보임 | `Main.controller.js` 해당 경로 초기값, 오타 |
| 사이드바 메뉴 눌러도 본문 안 바뀜 | `ModuleSideNav.controller.js` (navKey), `DashboardCanvas.view.xml` |
| 프로필 저장 안 됨 | `DashboardHeader.view.xml` + `.controller.js`, `Main.controller.js` user/profileOptions |
| SAP 데이터 오류 | `manifest.json` OData URL, `Main.controller.js`, `SapErrorUtil.js` |
| 스타일만 이상 | `css/style.css` (클래스명 View와 일치?) |
| namespace / view not found | `viewName` 전체 경로, `webapp/view/features/` 파일 존재 |

---

## 8. Gemini / GPT 작업 절차 (필수)

한 파일만 AI에게 줄 때 **아래 순서**를 지킨다.

### Step 1 — 학습 프롬프트 (먼저 붙여넣기)

```text
너는 SAP UI5 Fiori 대시보드 프로젝트를 수정하는 프론트엔드 개발자다.

프로젝트 규칙:
- Nested Views만 사용 (Routing, Fragment 금지)
- namespace: com.capstone.dashboard.fioridashboard
- View는 webapp/view/features/, Controller는 webapp/controller/features/
- View와 Controller는 같은 이름 쌍으로 수정한다
- 공통 데이터는 Main.controller.js의 dashboard JSONModel
- Main.view.xml, DashboardMain.view.xml은 뼈대만, 기능 UI는 features/에 작성
- 파일 맨 위 주석(역할·협업)을 유지한다
- 불필요한 새 파일 만들지 않는다

내가 수정하려는 영역: [예: DashboardHeader / SD Sales 탭 / 프로필 Dialog]
```

### Step 2 — 수정 요청 (파일 지정)

```text
아래 파일만 수정해줘. 다른 파일은 건드리지 마.

수정 파일:
1. webapp/view/features/DashboardHeader.view.xml
2. webapp/controller/features/DashboardHeader.controller.js

필요하면 연관 파일을 "수정 필요 목록"으로만 알려주고, 코드는 넣지 마:
- Main.controller.js (dashboard 모델 필드 추가가 필요할 때)

작업 내용: [구체적 요구사항]

응답 순서:
1. 수정할 파일 목록
2. View / Controller 각각 역할
3. dashboard 모델 경로 사용 여부
4. 최종 코드
```

### Step 3 — 본인이 직접 확인 (AI 대신 사람)

- [ ] `npm start` 후 브라우저 F12 콘솔 오류 없음
- [ ] View `controllerName` = Controller extend 경로
- [ ] `press=".onFoo"` 함수가 Controller에 있음
- [ ] 새 바인딩 경로가 `Main.controller.js`에 있음
- [ ] Git commit 전 **본인 담당 파일만** 변경됐는지 `git diff` 확인

---

## 9. Cursor vs Gemini 역할 나누기 (충돌 방지)

| 담당 | 적합한 작업 | 피할 작업 |
|------|-------------|-----------|
| **Cursor** | 구조 변경, 여러 파일 연동, OData/모델, 리팩토링, 오류 추적 | — |
| **Gemini/GPT** | **담당 features/** 한 세트 (View+Controller), CSS 클래스 추가, UI 문구 | Main.controller.js 대규모 수정, manifest, 폴더 구조 변경 |

**같은 파일을 두 AI가 동시에 수정하지 않는다.**  
GitHub에서 **기능별 브랜치** 예: `feat/profile-header`, `feat/serve-sd-sales`

---

## 10. 기능 추가 시 체크리스트 (예: SD Sales 탭에 차트 넣기)

1. **담당 View/Controller** 이미 있으면 그 파일만 확장 (`OrderImpact` 등)
2. 없으면 `view/features/Xxx.view.xml` + `controller/features/Xxx.controller.js` **쌍** 생성
3. `DashboardCanvas.view.xml`에 navKey 조건 + `<mvc:XMLView viewName="...Xxx" />` 추가
4. 데이터 필요 시:
   - 표시만 → `DashboardDataService.js` + `Main.controller.js` 초기값
   - 탭 전환 → `ModuleSideNav.controller.js` NAV_LABELS
5. 스타일 → `css/style.css` (`.nx` 접두 클래스 유지)
6. **Main.view.xml / DashboardMain.view.xml** 은 영역 추가할 때만 수정

---

## 11. 실행·경로 (공통)

```powershell
cd C:\Uniqlo\SAPPAS_FIORI_PRJ
npm install
npm start
```

브라우저: `http://localhost:8080`  
프로젝트 루트는 **`SAPPAS_FIORI_PRJ`** 이다. 상위 `C:\Uniqlo`에서 npm 하면 오류 난다.

---

## 12. prompt 파일 읽는 순서 (AI 학습용)

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `01_Subject.md` | 프로젝트 주제·3영역 레이아웃 |
| 2 | `02_Code.md` | 코드·주석 원칙 |
| 3 | `03_Main_dashboard.md` | MainDashboard 컴포넌트 구성 |
| 4 | `04_Serve.md` | Serve 탭 기능 예시 |
| 5 | `05_AI_prompt.md` | Cursor 작업 방식 |
| 6 | `06_Setting.md` | Nested Views 리팩토링 규칙 |
| 7 | **`07_Develop.md`** | **협업·파일 구조·오류 추적·LLM 디버깅 프롬프트** |

---

## 13. 한 줄 요약

> **View는 그림, Controller는 동작, Main은 공통 데이터, Service는 SAP 변환.**  
> Gemini/GPT에는 **항상 View+Controller 쌍과 모델 경로**를 함께 말하고,  
> 오류 나면 **증상표(§7)** → **수집 체크(§14)** → **복붙 프롬프트(§15)** 순으로 찾는다.

---

## 14. 오류 발생 시 먼저 수집할 정보

다른 LLM에게 물어보기 **전에** 아래를 메모한다.  
정보가 많을수록 **한 파일만 고치다 연쇄 오류** 나는 일을 줄일 수 있다.

### 14-1. 사람이 적어둘 메모 (30초)

```text
[언제] npm start / 저장 직후 / Git pull 직후
[무엇을] 수정한 파일: webapp/view/features/OOO.view.xml
[증상] 흰 화면 / 버튼 무반응 / 콘솔 빨간 글씨 / npm 터미널 오류
[어느 화면] 왼쪽 메뉴 / 프로필 Dialog / 중앙 Dashboard / 전체
```

### 14-2. 브라우저 (F12 → Console)에서 복사

- **빨간 Error** 전체 (첫 줄 + `at ...` 스택 3~5줄)
- `failed to load ...`, `ModuleError`, `Error: ...` 키워드 포함

### 14-3. 터미널 (npm start)에서 복사

- `npm ERR!` 블록 전체
- `ENOENT`, `Cannot find module`, `EADDRINUSE` 등

### 14-4. 함께 붙여넣으면 좋은 파일 (최대 3개)

| 상황 | 붙여넣을 파일 |
|------|---------------|
| 방금 수정한 기능 | 해당 `.view.xml` + `.controller.js` |
| 화면 연결 의심 | 상위 View (`DashboardCanvas.view.xml` 등) |
| 데이터 안 나옴 | `Main.controller.js`의 `_initModels` 부분 |
| SAP 오류 | `manifest.json` dataSources + 콘솔/팝업 메시지 |

---

## 15. 오류·디버깅 LLM 프롬프트 (복붙용)

아래 프롬프트는 **Gemini, ChatGPT, Claude** 등 어디에든 그대로 붙여넣을 수 있다.  
`[ ]` 안만 본인 상황으로 채운다.

---

### 15-1. 범용 — "오류 원인 찾기" (가장 많이 씀)

```text
너는 SAP UI5 Fiori 프로젝트 디버깅 전문가다.
프로젝트: com.capstone.dashboard.fioridashboard (Nested Views, Routing/Fragment 없음)

아래 오류를 분석해서 답해줘. 코드 수정은 아직 하지 말고, 원인과 확인할 파일만 먼저 알려줘.

[증상]
(예: 프로필 저장 버튼 눌러도 반영 안 됨 / 화면 전체 흰색)

[브라우저 콘솔 Error — 복사 붙여넣기]
(여기에 F12 Console 내용)

[방금 수정한 파일]
(예: DashboardHeader.view.xml, DashboardHeader.controller.js)

[질문]
1. 오류의 직접 원인 (한 줄)
2. 확인해야 할 파일 목록 (우선순위 순)
3. View / Controller / Main.controller.js / manifest 중 어디 문제인지
4. 수정 시 View+Controller 쌍 중 무엇을 같이 고쳐야 하는지
5. 내가 VS Code에서 직접 확인할 체크리스트 3가지

답변 형식:
- 추측으로 고치지 말고, 증상과 파일 연결만 명확히
- namespace: com.capstone.dashboard.fioridashboard 기준으로 경로 작성
```

---

### 15-2. 콘솔 — `failed to load controller`

```text
SAP UI5 오류: failed to load controller

프로젝트 namespace: com.capstone.dashboard.fioridashboard
View 경로: webapp/view/features/
Controller 경로: webapp/controller/features/

[콘솔 전체 메시지]
(붙여넣기)

[해당 View.xml의 controllerName 한 줄]
(예: controllerName="com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader")

[Controller.js extend 한 줄]
(예: Controller.extend("com.capstone.dashboard.fioridashboard.controller.features.DashboardHeader"

controllerName과 extend 경로, 파일명(DashboardHeader.controller.js)이 일치하는지 비교해줘.
틀린 부분만 정확히 고친 controllerName / extend / 파일명을 알려줘.
View.xml과 Controller.js 수정본만 제시해줘.
```

---

### 15-3. 콘솔 — `unknown provider 'dashboard'` / 바인딩 안 됨

```text
SAP UI5 dashboard JSONModel 바인딩 오류

View에서 {dashboard>/...} 바인딩을 쓰는데 값이 안 보이거나 unknown provider 오류가 난다.

[콘솔 메시지]
(붙여넣기)

[View에서 사용 중인 바인딩 경로]
(예: {dashboard>/user/editName}, {dashboard>/ui/navKey})

[Main.controller.js _initModels에 해당 경로가 있는지 — 없으면 "없음"]

규칙:
- dashboard 모델은 Main.controller.js _initModels()에서만 생성
- features Controller에서 setModel(..., "dashboard") 하지 않음

1. 빠진 모델 경로 목록
2. Main.controller.js에 추가할 JSON 초기값 (해당 부분만)
3. View 바인딩 오타 여부
순서대로 알려줘.
```

---

### 15-4. UI — 버튼/메뉴 눌러도 반응 없음

```text
SAP UI5 이벤트가 동작하지 않는다.

[증상] (예: 사이드바 Worklist 클릭해도 중앙 화면 안 바뀜 / 프로필 화살표 무반응)

[View.xml의 press / selectionChange 속성]
(해당 줄 복사, 예: press=".onProfile")

[Controller.js에 해당 함수 있는지]
(있으면 함수 코드, 없으면 "함수 없음")

Nested View 구조:
- ModuleSideNav → navKey 변경 → DashboardCanvas → SectionPlaceholder

1. press/.onXXX 와 Controller 함수명 불일치 여부
2. navKey / visible 바인딩 문제인지
3. 수정할 View + Controller 쌍과 수정 내용
를 알려주고, 필요한 코드만 제시해줘.
```

---

### 15-5. npm / 실행 오류

```text
SAP Fiori 프로젝트 npm 실행 오류

[실행한 명령]
(예: npm start — C:\Uniqlo 에서 실행)

[터미널 오류 전체]
(붙여넣기)

프로젝트 실제 경로: C:\Uniqlo\SAPPAS_FIORI_PRJ
package.json scripts: "start": "fiori run ..."

1. 경로 문제인지 / 의존성 문제인지 / 포트 충돌인지 구분
2. PowerShell에서 실행할 정확한 명령 순서
3. node -v 확인 필요 여부
짧게 단계별로 알려줘.
```

---

### 15-6. SAP OData / MessageBox 오류

```text
SAP UI5 OData 연동 오류

[화면에 뜬 MessageBox / Toast 문구]
(붙여넣기)

[manifest.json dataSources.mainService.uri]
(복사)

[Main.controller.js에서 read 하는 entitySet]
(예: /BomStockSet)

OData 가공: service/DashboardDataService.js
오류 메시지: util/SapErrorUtil.js

1. 프론트 코드 문제 vs SAP 서버/네트워크 문제 구분
2. 확인할 파일 (manifest / Main / MaterialCreate)
3. 더미 데이터로 UI만 먼저 테스트하는 방법
알려줘. SAP 비밀번호/API Key 하드코딩 제안은 하지 마.
```

---

### 15-7. Git pull / merge 후 깨짐

```text
GitHub 협업 후 SAP UI5 화면이 깨졌다.

[상황] pull / merge / conflict 해결 직후

[충돌 났던 파일 목록]
(예: ModuleSideNav.controller.js, DashboardHeader.view.xml)

[현재 증상 + 콘솔 Error]
(붙여넣기)

3명이 features/ 폴더를 나눠 작업 중.
Main.view.xml / Main.controller.js는 공통 파일.

1. conflict 해결 시 자주 깨지는 UI5 패턴 (controllerName, viewName, 중복 id)
2. 위 파일들에서 확인할 포인트
3. git diff로 봐야 할 줄 (View controllerName, XMLView viewName)
체크리스트로 알려줘. 코드는 conflict 난 파일만 제시해줘.
```

---

### 15-8. 수정 후 검증 요청 (고친 뒤 LLM에게 재확인)

```text
아래 SAP UI5 코드를 수정했다. 리뷰만 해줘.

프로젝트 규칙: Nested Views, namespace com.capstone.dashboard.fioridashboard,
View+Controller 같은 이름, dashboard 모델은 Main.controller.js

[수정한 View.xml]
(전체 또는 변경 부분)

[수정한 Controller.js]
(전체 또는 변경 부분)

[연관 파일 수정 여부]
Main.controller.js: 수정함/안 함
DashboardCanvas.view.xml: 수정함/안 함

1. namespace / controllerName / press 함수명 오류
2. dashboard 바인딩 경로 누락
3. 다른 파일도 같이 고쳐야 하는데 빠진 것
4. npm start 전에 사람이 확인할 5항목

문제 있으면 "위험" 항목만, 없으면 "통과 + 확인 방법"만 짧게.
```

---

### 15-9. 터미널 오류 메시지 → 파일 빠른 매칭표

LLM 없이도 1차 확인할 때 사용:

| 콘솔/터미널 키워드 | 거의 항상 보는 파일 |
|-------------------|---------------------|
| `failed to load controller` | View `controllerName` + Controller `extend` + 파일명 |
| `failed to load view` | `viewName` in XMLView + `view/features/` 파일 존재 |
| `unknown provider 'dashboard'` | `Main.controller.js` `_initModels` |
| `Cannot read properties of undefined` | Controller에서 getModel/getProperty null 체크, 바인딩 경로 |
| `Duplicate ID` | 같은 View id가 XMLView 두 번 로드 |
| `ENOENT package.json` | `cd SAPPAS_FIORI_PRJ` 후 npm |
| `404 /sap/opu/odata` | `manifest.json`, SAP 프록시, 네트워크 |
| `Module not found: com/capstone/...` | `sap.ui.define` 경로, 파일 위치 |

위 표로 1차 파일을 좁힌 뒤 **15-1 범용 프롬프트**에 콘솔 전문을 붙여넣는다.

---

### 15-10. 팀 공유용 — 오류 리포트 템플릿 (카톡/Discord/GitHub Issue)

팀원에게 오류 공유할 때 이 형식을 쓰면 Cursor 담당자도 바로 찾는다.

```text
## Pascal Dashboard 오류 리포트

- 담당 기능: [ModuleSideNav / DashboardHeader / SD Sales ...]
- 수정 파일: 
  - webapp/view/features/___
  - webapp/controller/features/___
- 증상: 
- F12 Console (복사): 
- npm 터미널 (있으면): 
- 재현: npm start → [어떤 버튼 클릭]
- 스크린샷: (선택)
```

---

## 16. 오류 해결 후 필수 확인 (LLM이 고쳐줘도 사람이 할 일)

```text
[ ] SAPPAS_FIORI_PRJ 폴더에서 npm start
[ ] Ctrl+F5 새로고침
[ ] F12 Console Error 0개 (경고는 SAP proxy credential warning 가능)
[ ] 수정한 View controllerName = Controller extend
[ ] git diff — 내 담당 파일만 변경됐는지
[ ] 팀원에게 "수정 파일 + 연관 파일" 목록 공유
```
