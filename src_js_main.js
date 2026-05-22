/**
 * FinCRM 메인 진입점
 * 
 * 애플리케이션 초기화 및 글로벌 설정
 * 모든 모듈의 조율
 */

class FinCRMApp {
  constructor() {
    this.store = null;
    this.api = null;
    this.sheetsAPI = null;
    this.driveAPI = null;
    this.config = CONFIG;
    this.isInitialized = false;
  }

  /**
   * 애플리케이션 초기화
   */
  async init() {
    try {
      console.log('FinCRM 초기화 시작...');

      // 1. 스토어 초기화
      this.store = window.store || new Store();
      console.log('✓ 스토어 초기화');

      // 2. 인증 확인
      const token = this.store.getState('auth.token');
      if (!token) {
        console.log('인증 필요');
        this.redirectToLogin();
        return;
      }

      // 3. API 클라이언트 초기화
      this.api = new APIClient(token);
      this.sheetsAPI = new GoogleSheetsAPI(
        token,
        CONFIG.GOOGLE.SPREADSHEET_ID
      );
      this.driveAPI = new GoogleDriveAPI(token);
      console.log('✓ API 클라이언트 초기화');

      // 4. 데이터 로드
      await this.loadData();
      console.log('✓ 데이터 로드');

      // 5. UI 초기화
      this.initializeUI();
      console.log('✓ UI 초기화');

      // 6. 이벤트 리스너 설정
      this.setupListeners();
      console.log('✓ 이벤트 리스너 설정');

      // 7. 상태 변화 감시
      this.watchState();
      console.log('✓ 상태 감시 설정');

      this.isInitialized = true;
      console.log('✓ FinCRM 초기화 완료');

      // 8. 정기 작업 시작
      this.startScheduledTasks();
      console.log('✓ 정기 작업 시작');

    } catch (error) {
      console.error('초기화 실패:', error);
      this.showError('애플리케이션 초기화 실패');
    }
  }

  /**
   * 데이터 로드 (Google Sheets)
   */
  async loadData() {
    try {
      // 클라이언트 데이터 로드
      const clientData = await this.sheetsAPI.readRange('클라이언트!A1:S500');
      if (clientData.values) {
        const clients = this.parseClientsFromSheets(clientData.values);
        this.store.setState('data.clients', clients);
      }

      // 에이전트 데이터 로드
      const agentData = await this.sheetsAPI.readRange('에이전트!A1:D100');
      if (agentData.values) {
        const agents = this.parseAgentsFromSheets(agentData.values);
        this.store.setState('data.agents', agents);
      }

      // 캐시 업데이트
      this.updateCache();

    } catch (error) {
      console.error('데이터 로드 실패:', error);
      // 오류가 있어도 진행 (오프라인 모드 가능)
      this.showWarning('일부 데이터를 로드하지 못했습니다');
    }
  }

  /**
   * Sheets 형식의 클라이언트 데이터를 객체로 변환
   */
  parseClientsFromSheets(rows) {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0];
    return rows.slice(1).map(row => ({
      no: row[0],
      fname: row[1],
      mname: row[2],
      lname: row[3],
      email: row[4],
      phone: row[5],
      dob: row[6],
      plan: row[7],
      // ... 더 많은 필드
    })).filter(client => client.fname); // 빈 행 제거
  }

  /**
   * Sheets 형식의 에이전트 데이터를 객체로 변환
   */
  parseAgentsFromSheets(rows) {
    if (!rows || rows.length < 2) return [];

    return rows.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      email: row[2],
      phone: row[3]
    })).filter(agent => agent.name);
  }

  /**
   * UI 초기화
   */
  initializeUI() {
    const state = this.store.getFullState();

    // 현재 탭으로 이동
    const tab = state.ui.currentTab || 'dashboard';
    this.showTab(tab);

    // 언어 설정
    this.setLanguage(state.settings.language);

    // 테마 적용
    this.applyTheme(state.settings.theme);
  }

  /**
   * 탭 표시
   */
  showTab(tabName) {
    // 모든 탭 숨기기
    document.querySelectorAll('.page').forEach(el => {
      el.style.display = 'none';
    });

    // 선택한 탭 표시
    const tabEl = document.getElementById(`pg-${tabName}`);
    if (tabEl) {
      tabEl.style.display = 'block';
    }

    // 상태 업데이트
    this.store.setState('ui.currentTab', tabName);
  }

  /**
   * 언어 설정
   */
  setLanguage(lang) {
    document.documentElement.lang = lang;
    // i18n 로직 (필요한 경우)
  }

  /**
   * 테마 적용
   */
  applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  setupListeners() {
    // 탭 클릭
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        if (tabName) {
          this.showTab(tabName);
        }
      });
    });

    // 모달 닫기
    document.querySelectorAll('.modal .btn-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.currentTarget.closest('.modal');
        if (modal) {
          modal.classList.remove('on');
          this.store.setState('ui.activeModal', null);
        }
      });
    });

    // 윈도우 이벤트
    window.addEventListener('beforeunload', () => {
      // 종료 전 저장 (필요한 경우)
    });

    // 온/오프라인 감지
    window.addEventListener('online', () => {
      this.onOnline();
    });

    window.addEventListener('offline', () => {
      this.onOffline();
    });
  }

  /**
   * 상태 변화 감시
   */
  watchState() {
    this.store.subscribe((newState) => {
      // UI 업데이트 (필요한 경우만)
      if (newState.ui.currentTab !== this.lastTab) {
        this.lastTab = newState.ui.currentTab;
        // UI 업데이트 로직
      }

      // 로깅
      console.debug('상태 변화:', newState);
    });
  }

  /**
   * 정기 작업 시작
   */
  startScheduledTasks() {
    // 1시간마다 데이터 새로고침
    this.refreshInterval = setInterval(() => {
      if (navigator.onLine) {
        this.loadData();
      }
    }, 60 * 60 * 1000);

    // 5분마다 토큰 유효성 확인
    this.tokenCheckInterval = setInterval(() => {
      this.checkTokenValidity();
    }, 5 * 60 * 1000);

    // 매일 자정에 캐시 초기화
    this.scheduleNightlyCache();
  }

  /**
   * 토큰 유효성 확인
   */
  checkTokenValidity() {
    const expiresAt = this.store.getState('auth.tokenExpiresAt');
    if (!expiresAt) return;

    const now = new Date();
    const expiryDate = new Date(expiresAt);

    if (now > expiryDate) {
      // 토큰 만료
      this.handleTokenExpired();
    }
  }

  /**
   * 토큰 만료 처리
   */
  handleTokenExpired() {
    console.warn('토큰이 만료되었습니다');
    this.showWarning('세션이 만료되었습니다. 다시 로그인해주세요.');
    this.redirectToLogin();
  }

  /**
   * 온라인 상태 진입
   */
  onOnline() {
    console.log('온라인 상태로 변경됨');
    this.showSuccess('온라인 상태입니다');
    // 오프라인 중 변경된 데이터 동기화
    this.syncOfflineChanges();
  }

  /**
   * 오프라인 상태 진입
   */
  onOffline() {
    console.log('오프라인 상태로 변경됨');
    this.showWarning('인터넷 연결이 끊어졌습니다. 오프라인 모드로 전환됩니다.');
  }

  /**
   * 오프라인 변경 사항 동기화
   */
  async syncOfflineChanges() {
    // 오프라인 중에 변경된 데이터가 있으면 동기화
    const pendingChanges = this.store.getState('data.pendingChanges');
    if (pendingChanges && pendingChanges.length > 0) {
      try {
        await this.uploadChanges(pendingChanges);
        this.store.setState('data.pendingChanges', []);
      } catch (error) {
        console.error('동기화 실패:', error);
      }
    }
  }

  /**
   * 캐시 업데이트
   */
  updateCache() {
    const cacheData = {
      timestamp: new Date().toISOString(),
      clients: this.store.getState('data.clients'),
      agents: this.store.getState('data.agents')
    };
    localStorage.setItem(CONFIG.STORAGE.CACHE, JSON.stringify(cacheData));
  }

  /**
   * 자정 캐시 초기화 스케줄
   */
  scheduleNightlyCache() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const timeUntilMidnight = tomorrow - now;

    setTimeout(() => {
      localStorage.removeItem(CONFIG.STORAGE.CACHE);
      this.scheduleNightlyCache(); // 다음날 자정에 다시 스케줄
    }, timeUntilMidnight);
  }

  /**
   * 로그인 페이지로 리다이렉트
   */
  redirectToLogin() {
    window.location.href = '#auth';
  }

  /**
   * 메시지 표시
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showWarning(message) {
    this.showNotification(message, 'warning');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // 화면에 토스트 메시지 표시 (선택)
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  /**
   * 변경 사항 업로드
   */
  async uploadChanges(changes) {
    for (const change of changes) {
      // API를 통해 서버에 업로드
      console.log('변경 사항 업로드:', change);
    }
  }

  /**
   * 정리 작업 (앱 종료 시)
   */
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
  }

  /**
   * 디버그 정보
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      storeStats: this.store?.getStats(),
      requestLog: this.api?.getLog(),
      state: this.store?.getFullState()
    };
  }
}

// 글로벌 앱 인스턴스
let app = null;

/**
 * 앱 시작 (DOM이 로드된 후)
 */
document.addEventListener('DOMContentLoaded', async () => {
  app = new FinCRMApp();
  await app.init();

  // 디버그 모드 (개발 중에만)
  if (window.location.hostname === 'localhost') {
    window.app = app;
    window.store = app.store;
    console.log('디버그 모드: app, store 객체가 전역으로 가능합니다');
  }
});

/**
 * 앱 종료 시 정리
 */
window.addEventListener('beforeunload', () => {
  if (app) {
    app.cleanup();
  }
});

// 사용 예시:
/*
// 1. 데이터 조회
const clients = app.store.getState('data.clients');

// 2. UI 업데이트
app.showTab('clients');

// 3. 메시지 표시
app.showSuccess('저장되었습니다');
app.showError('오류가 발생했습니다');

// 4. 디버그 정보 조회
console.log(app.getDebugInfo());

// 5. 상태 변화 감시
app.store.subscribe((newState) => {
  console.log('상태 변화:', newState);
});
*/

