# E2E ㄹ자 Process Flow UI 백업

**백업 일시:** 2026-06-06  
**복원 대상:** B공간 9개 프로세스 + ㄹ자 SVG 트랙 UI

## 포함 파일

| 파일 | 설명 |
|------|------|
| `E2EProcessFlow.view.xml` | ㄹ자 플로우가 들어간 View 전체 |
| `e2e-rieul-flow.styles.css` | `style.css`에서 분리한 nxE2E 관련 CSS |

## 다시 적용하는 방법

1. `E2EProcessFlow.view.xml` → `webapp/view/features/E2EProcessFlow.view.xml` 로 복사
2. `e2e-rieul-flow.styles.css` 내용을 `webapp/css/style.css`의 `.nxSpaceFlowCanvas` 블록 아래에 붙여넣기
3. `npm start` 후 Ctrl+F5 새로고침

## 되돌리기 (현재 상태 = ㄹ자 UI 이전)

- B공간: 헤더 + 범례 + 빈 회색 캔버스만 표시
- A공간·DashboardCanvas·다른 모듈: 변경 없음
