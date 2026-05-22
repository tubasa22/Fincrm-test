/**
 * FinCRM 설정
 * 
 * 하드코딩된 값들을 한곳에 모아 관리
 * 기존: 30개 이상의 하드코딩된 값 분산
 * 개선: 중앙 집중식 설정 관리
 */

const CONFIG = {
  // ═══════════════════════════════════════
  // 1. API 엔드포인트
  // ═══════════════════════════════════════
  API: {
    SHEETS: 'https://sheets.googleapis.com/v4',
    DRIVE: 'https://www.googleapis.com/drive/v3',
    WEBHOOK: 'https://hooks.zapier.com/hooks/catch/xxxx'
  },

  // ═══════════════════════════════════════
  // 2. Google 설정 (Google Cloud Console에서 발급)
  // ═══════════════════════════════════════
  GOOGLE: {
    CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    SCOPE: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ],
    SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',
    DRIVE_FOLDER_ID: 'YOUR_FOLDER_ID'
  },

  // ═══════════════════════════════════════
  // 3. 보험 플랜 (상수)
  // ═══════════════════════════════════════
  PLANS: {
    MAPD: {
      id: 'MAPD',
      label: 'Medicare Advantage',
      shortLabel: 'MAPD',
      color: '#4285F4',
      icon: '🔵'
    },
    PDP: {
      id: 'PDP',
      label: 'Prescription Drug Plan',
      shortLabel: 'PDP',
      color: '#34A853',
      icon: '🟢'
    },
    DENTAL: {
      id: 'DENTAL',
      label: 'Dental',
      shortLabel: '치과',
      color: '#FBBC04',
      icon: '🟡'
    },
    VISION: {
      id: 'VISION',
      label: 'Vision',
      shortLabel: '안경',
      color: '#EA4335',
      icon: '🔴'
    }
  },

  // ═══════════════════════════════════════
  // 4. 제품 유형
  // ═══════════════════════════════════════
  PRODUCTS: {
    AETNA: {
      id: 'aetna',
      label: 'Aetna Silver',
      color: '#0066CC'
    },
    CIGNA: {
      id: 'cigna',
      label: 'CIGNA',
      color: '#003399'
    }
  },

  // ═══════════════════════════════════════
  // 5. 상태 값들
  // ═══════════════════════════════════════
  STATUS: {
    ACTIVE: { id: 'active', label: '활성', color: '#4CAF50' },
    INACTIVE: { id: 'inactive', label: '비활성', color: '#F44336' },
    PENDING: { id: 'pending', label: '대기', color: '#FF9800' },
    COMPLETED: { id: 'completed', label: '완료', color: '#2196F3' }
  },

  // ═══════════════════════════════════════
  // 6. 컬러 팔레트
  // ═══════════════════════════════════════
  COLORS: {
    PRIMARY: '#007BFF',
    SUCCESS: '#28A745',
    WARNING: '#FFC107',
    DANGER: '#DC3545',
    INFO: '#17A2B8',
    LIGHT: '#F8F9FA',
    DARK: '#343A40',
    BORDER: '#CCCCCC'
  },

  // ═══════════════════════════════════════
  // 7. 스토리지 키 (localStorage)
  // ═══════════════════════════════════════
  STORAGE: {
    STATE: 'fincrm_state',
    TOKEN: 'fincrm_token',
    USER: 'fincrm_user',
    CACHE: 'fincrm_cache',
    LOG: 'fincrm_log'
  },

  // ═══════════════════════════════════════
  // 8. 타임아웃 설정
  // ═══════════════════════════════════════
  TIMEOUT: {
    API: 30000,        // API 요청 30초
    SESSION: 3600000,  // 세션 1시간
    CACHE: 300000      // 캐시 5분
  },

  // ═══════════════════════════════════════
  // 9. 페이지네이션
  // ═══════════════════════════════════════
  PAGINATION: {
    CLIENTS: 50,       // 클라이언트 페이지당 50개
    SMS: 100,          // SMS 이력 페이지당 100개
    MEMOS: 20          // 메모 페이지당 20개
  },

  // ═══════════════════════════════════════
  // 10. 날짜 형식
  // ═══════════════════════════════════════
  DATE_FORMAT: {
    DISPLAY: 'MM/DD/YYYY',    // 표시: 05/21/2024
    STORAGE: 'YYYY-MM-DD',    // 저장: 2024-05-21
    INPUT: 'DD/MM/YYYY'       // 입력: 21/05/2024
  },

  // ═══════════════════════════════════════
  // 11. 유효성 검사
  // ═══════════════════════════════════════
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^\d{3}-\d{3}-\d{4}$/,
    ZIP_REGEX: /^\d{5}(-\d{4})?$/,
    NAME_MIN: 2,
    NAME_MAX: 100,
    MEMO_MAX: 500
  },

  // ═══════════════════════════════════════
  // 12. 언어 설정
  // ═══════════════════════════════════════
  LANGUAGE: {
    KO: 'ko',
    EN: 'en'
  },

  // ═══════════════════════════════════════
  // 13. 테마
  // ═══════════════════════════════════════
  THEME: {
    LIGHT: 'light',
    DARK: 'dark'
  },

  // ═══════════════════════════════════════
  // 14. 앱 정보
  // ═══════════════════════════════════════
  APP: {
    NAME: 'FinCRM',
    VERSION: '1.1.0',
    AUTHOR: 'Park Min-ju',
    GITHUB: 'https://github.com/tubasa22/Fincrm'
  }
};

/**
 * 환경별 설정 오버라이드
 */
const getEnvConfig = () => {
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1';
  
  if (isDev) {
    // 개발 환경 설정
    return {
      ...CONFIG,
      API: {
        ...CONFIG.API,
        // 로컬 서버 사용 가능
        // WEBHOOK: 'http://localhost:3000/webhook'
      }
    };
  }
  
  // 프로덕션 설정
  return CONFIG;
};

/**
 * 이 함수로 환경별 설정 가져오기
 */
const finalConfig = getEnvConfig();

// 사용 예시:
/*
// 1. 플랜 정보 조회
console.log(CONFIG.PLANS.MAPD.label);  // 'Medicare Advantage'
console.log(CONFIG.PLANS.MAPD.color);  // '#4285F4'

// 2. 컬러 사용
const html = `<div style="color: ${CONFIG.COLORS.PRIMARY}">텍스트</div>`;

// 3. 제약 조건 사용
if (name.length < CONFIG.VALIDATION.NAME_MIN) {
  console.log('이름이 너무 짧습니다');
}

// 4. 타임아웃 설정
const api = new APIClient(token, { timeout: CONFIG.TIMEOUT.API });

// 5. 페이지네이션
const pageSize = CONFIG.PAGINATION.CLIENTS;  // 50

// 6. 스토리지 키 사용
localStorage.setItem(CONFIG.STORAGE.STATE, JSON.stringify(state));

// 7. 날짜 형식
console.log(CONFIG.DATE_FORMAT.DISPLAY);  // 'MM/DD/YYYY'
*/

