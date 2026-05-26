# 03. Main Dashboard Layout Prompt

SAP Fiori 기반 메인 대시보드를 설계한다.

대시보드는 세 영역으로 구성한다.

1. 왼쪽: 모듈별 기능 탭 또는 사이드 메뉴
2. 중앙: SAP 업무 프로세스 순서도 (그래프로 각 모듈에 적합한 프로세스를 표시)
3. 오른쪽: 챗봇(자체 개발발)

## 메인 화면 구조

MainDashboard는 전체 화면의 뼈대만 담당한다.

MainDashboard 안에 모든 기능을 직접 넣지 않는다.

다음 컴포넌트들이 유기적으로 연결되도록 구성한다.

```text
MainDashboard
├─ ModuleSideNav
│  └─ 왼쪽 모듈별 탭 담당 (핵심 기능. 서브 기능능)
│
├─ ProcessFlow
│  └─ 중앙 SAP 업무 프로세스 순서도 담당 (그래프로 시각화 표시시)
│
├─ ChatbotPanel
│  └─ 오른쪽 챗봇 패널 담당 (자체 챗봇 개발)
│
└─ DetailPanel
   └─ 선택된 모듈 또는 프로세스 단계의 상세 정보 표시