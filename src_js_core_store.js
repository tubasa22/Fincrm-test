/**
 * FinCRM 상태 관리 시스템
 * 모든 애플리케이션 상태를 한곳에서 관리
 * 
 * 기존 localStorage 130개 분산 → 통합 관리
 * 이점: 데이터 일관성, 버그 감소, 동기화 용이
 */

class Store {
  constructor() {
    // 애플리케이션 전체 상태
    this.state = {
      // 인증 관련
      auth: {
        token: null,
        tokenExpiresAt: null,
        user: null,
        isAuthorized: false,
        loginAttempt: 0
      },

      // 클라이언트 데이터
      data: {
        clients: [],
        memos: [],
        contacts: [],
        agents: [],
        smsHistory: [],
        applications: [],
        calendar: []
      },

      // UI 상태
      ui: {
        currentTab: 'dashboard',
        activeModal: null,
        isLoading: false,
        selectedClientId: null,
        sidebarOpen: true,
        notifications: []
      },

      // 앱 설정
      settings: {
        isDemo: false,
        language: 'ko',
        theme: 'light',
        version: '1.1.0'
      }
    };

    // 상태 변화를 감시하는 리스너들
    this.listeners = [];

    // 상태 변화 이력 (디버깅용)
    this.history = [];
    this.maxHistory = 50;

    // localStorage에서 상태 복구
    this.load();
  }

  /**
   * 상태 업데이트 (핵심 메서드)
   * @param {string} path - 상태 경로 (예: 'data.clients' 또는 'ui.currentTab')
   * @param {*} value - 새로운 값
   * @example
   * store.setState('data.clients', [...clients, newClient]);
   * store.setState('ui.currentTab', 'clients');
   */
  setState(path, value) {
    const oldValue = this.getState(path);
    
    // 값이 같으면 변경 안 함 (불필요한 업데이트 방지)
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return;
    }

    // 경로를 따라가며 상태 업데이트
    const keys = path.split('.');
    let target = this.state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    target[lastKey] = value;

    // 이력 기록
    this.addHistory(path, oldValue, value);

    // 저장소에 저장
    this.save();

    // 모든 리스너에 알림
    this.notifyListeners();
  }

  /**
   * 상태 조회
   * @param {string} path - 상태 경로
   * @returns {*} 요청한 상태 값
   * @example
   * const clients = store.getState('data.clients');
   * const currentTab = store.getState('ui.currentTab');
   */
  getState(path) {
    const keys = path.split('.');
    let target = this.state;
    for (const key of keys) {
      if (target && typeof target === 'object') {
        target = target[key];
      } else {
        return undefined;
      }
    }
    return target;
  }

  /**
   * 전체 상태 반환
   */
  getFullState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 상태 변화 감시 등록
   * @param {Function} listener - 상태 변화 시 호출될 함수
   * @returns {Function} 구독 해제 함수
   * @example
   * const unsubscribe = store.subscribe((newState) => {
   *   console.log('상태 변화:', newState);
   *   renderUI(newState);
   * });
   * 
   * // 나중에 구독 해제
   * unsubscribe();
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      console.error('listener는 함수여야 합니다');
      return () => {};
    }

    this.listeners.push(listener);

    // 구독 해제 함수 반환
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 모든 리스너에 상태 변화 알림
   * @private
   */
  notifyListeners() {
    const state = this.getFullState();
    this.listeners.forEach(fn => {
      try {
        fn(state);
      } catch (error) {
        console.error('리스너 실행 중 오류:', error);
      }
    });
  }

  /**
   * 상태를 localStorage에 저장
   * @private
   */
  save() {
    try {
      const stateToSave = {
        auth: this.state.auth,
        data: this.state.data,
        settings: this.state.settings
        // UI 상태는 저장하지 않음 (매번 초기화)
      };
      localStorage.setItem('fincrm_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('상태 저장 실패:', error);
      // 저장 실패해도 계속 진행 (localStorage 가득 참 등)
    }
  }

  /**
   * localStorage에서 상태 복구
   * @private
   */
  load() {
    try {
      const saved = localStorage.getItem('fincrm_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 저장된 데이터 병합
        this.state.auth = { ...this.state.auth, ...parsed.auth };
        this.state.data = { ...this.state.data, ...parsed.data };
        this.state.settings = { ...this.state.settings, ...parsed.settings };
      }
    } catch (error) {
      console.error('상태 복구 실패:', error);
      // 복구 실패해도 기본값으로 계속 진행
    }
  }

  /**
   * 상태 변화 이력 기록 (디버깅용)
   * @private
   */
  addHistory(path, oldValue, newValue) {
    this.history.push({
      timestamp: new Date().toISOString(),
      path,
      oldValue: JSON.stringify(oldValue).slice(0, 100),
      newValue: JSON.stringify(newValue).slice(0, 100)
    });

    // 최근 50개만 유지
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * 상태 변화 이력 조회
   * @returns {Array} 변화 이력 배열
   */
  getHistory() {
    return this.history;
  }

  /**
   * 상태 초기화
   */
  clear() {
    localStorage.removeItem('fincrm_state');
    this.state = {
      auth: {
        token: null,
        tokenExpiresAt: null,
        user: null,
        isAuthorized: false,
        loginAttempt: 0
      },
      data: {
        clients: [],
        memos: [],
        contacts: [],
        agents: [],
        smsHistory: [],
        applications: [],
        calendar: []
      },
      ui: {
        currentTab: 'dashboard',
        activeModal: null,
        isLoading: false,
        selectedClientId: null,
        sidebarOpen: true,
        notifications: []
      },
      settings: {
        isDemo: false,
        language: 'ko',
        theme: 'light',
        version: '1.1.0'
      }
    };
    this.notifyListeners();
  }

  /**
   * 배치 업데이트 (여러 상태를 한번에 업데이트)
   * @param {Object} updates - { path: value } 형태의 객체
   * @example
   * store.batchSet({
   *   'data.clients': newClients,
   *   'ui.isLoading': false,
   *   'ui.currentTab': 'clients'
   * });
   */
  batchSet(updates) {
    const oldState = this.getFullState();

    for (const [path, value] of Object.entries(updates)) {
      const keys = path.split('.');
      let target = this.state;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {};
        }
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = value;
    }

    this.save();
    this.notifyListeners();
  }

  /**
   * 상태 통계 (디버깅용)
   */
  getStats() {
    return {
      clientCount: this.state.data.clients.length,
      memoCount: this.state.data.memos.length,
      contactCount: this.state.data.contacts.length,
      agentCount: this.state.data.agents.length,
      smsHistoryCount: this.state.data.smsHistory.length,
      listenerCount: this.listeners.length,
      historyCount: this.history.length
    };
  }
}

// 글로벌 스토어 생성
const store = new Store();

// 사용 예시:
/*
// 1. 상태 업데이트
store.setState('data.clients', newClients);
store.setState('ui.currentTab', 'clients');
store.setState('ui.isLoading', false);

// 2. 상태 조회
const clients = store.getState('data.clients');
const isLoading = store.getState('ui.isLoading');

// 3. 상태 변화 감시
const unsubscribe = store.subscribe((newState) => {
  console.log('상태 변화:', newState);
  renderUI(newState);
});

// 4. 배치 업데이트
store.batchSet({
  'data.clients': newClients,
  'ui.isLoading': false,
  'ui.currentTab': 'clients'
});

// 5. 상태 초기화
store.clear();

// 6. 상태 통계
console.log(store.getStats());
*/
