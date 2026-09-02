# FinCRM

한인 보험 에이전트용 고객 관리 시스템입니다. 기존 단일 HTML 파일을 화면·기능별 파일로 분리한 정리본입니다.

## 폴더 구조

```text
refactored-fincrm/
├── index.html                 # 앱 화면 마크업과 스크립트 로드 순서
├── assets/
│   ├── css/main.css            # 전체 스타일
│   └── js/
│       ├── config.js           # API 설정과 전역 상태
│       ├── auth.js             # 로그인·사용 신청·접근 코드
│       ├── demo-data.js        # 데모 데이터
│       ├── api-and-bootstrap.js# Google API·앱 시작
│       ├── dashboard.js        # 대시보드·캘린더·알림
│       ├── client-detail.js    # 고객 상세·문서 보기
│       ├── feedback.js         # 피드백·버그 신고
│       ├── schedule.js         # 수동 일정
│       ├── client-management.js# 고객·메모·생일 관리
│       ├── sms.js              # 문자 발송·예약·주소록
│       ├── automation.js       # Zapier/n8n 자동화
│       ├── ui-and-onboarding.js# 공통 UI·온보딩·입력 도우미
│       └── developer-tools.js  # 내부 개발 도구
├── apps-script/                # Google Apps Script 프로젝트에 넣을 서버 코드
└── docs/CODE_REVIEW_REPORT.md  # 기존 코드 검토 보고서
```

## 배포 방법

1. 이 폴더의 내용을 GitHub Pages 저장소 루트에 업로드합니다.
2. `apps-script` 안의 네 개 `.gs` 파일을 같은 Google Apps Script 프로젝트에 추가합니다.
3. `assets/js/config.js`의 Google OAuth 클라이언트 ID와 스프레드시트 ID가 현재 환경과 맞는지 확인합니다.

## 유지보수 원칙

- HTML의 `onclick` 등 기존 이벤트 방식을 그대로 유지했습니다. 따라서 JavaScript 파일은 `index.html`에 적힌 순서대로 로드해야 합니다.
- 새 기능은 가장 가까운 기능 파일에 추가하고, 여러 화면이 공통으로 쓰는 함수만 `ui-and-onboarding.js`에 둡니다.
- API 키·Webhook URL 같은 민감한 값은 코드에 직접 넣지 말고 배포 환경 또는 사용자 설정으로 관리하세요.
