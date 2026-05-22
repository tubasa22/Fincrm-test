/**
 * FinCRM API 통합 관리
 * 
 * 기존: 15개의 분산된 fetch 호출
 * 개선: 1개의 통합 API 클래스
 * 
 * 이점:
 * - 인증 처리 통일
 * - 에러 처리 통일
 * - 재시도 로직
 * - 요청 타임아웃
 * - 로깅
 */

class APIClient {
  constructor(token = null, config = {}) {
    this.token = token;
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    this.requestLog = [];
    this.maxLog = 50;
  }

  /**
   * 기본 fetch 래퍼 (모든 요청의 기초)
   * @private
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 토큰 추가
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    let lastError;

    // 재시도 로직
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        // 타임아웃 설정
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // 요청 로그
        this.logRequest(endpoint, response.status, attempt);

        // 응답 처리
        if (!response.ok) {
          throw new APIError(
            `HTTP ${response.status}`,
            response.status,
            response.statusText
          );
        }

        // 응답 파싱
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else if (contentType?.includes('text')) {
          data = await response.text();
        } else {
          data = await response.blob();
        }

        return data;

      } catch (error) {
        clearTimeout();
        lastError = error;

        // 401 (인증 오류)은 재시도 안 함
        if (error.code === 401) {
          throw error;
        }

        // 마지막 시도가 아니면 대기 후 재시도
        if (attempt < this.retries) {
          const waitTime = Math.pow(2, attempt - 1) * 1000; // 1초, 2초, 4초
          await this.delay(waitTime);
          continue;
        }

        break;
      }
    }

    throw lastError || new Error('요청 실패');
  }

  /**
   * GET 요청
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * POST 요청
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT 요청
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE 요청
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }

  /**
   * PATCH 요청
   */
  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  /**
   * 요청 로그 기록
   * @private
   */
  logRequest(endpoint, status, attempt) {
    this.requestLog.push({
      timestamp: new Date().toISOString(),
      endpoint,
      status,
      attempt
    });

    // 최근 50개만 유지
    if (this.requestLog.length > this.maxLog) {
      this.requestLog.shift();
    }
  }

  /**
   * 대기 (재시도 시 사용)
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 토큰 업데이트
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * 요청 로그 조회
   */
  getLog() {
    return this.requestLog;
  }

  /**
   * 로그 초기화
   */
  clearLog() {
    this.requestLog = [];
  }
}

/**
 * Google Sheets API 클래스
 */
class GoogleSheetsAPI extends APIClient {
  constructor(token, spreadsheetId, config = {}) {
    super(token, {
      baseURL: 'https://sheets.googleapis.com/v4',
      ...config
    });
    this.spreadsheetId = spreadsheetId;
  }

  /**
   * 범위 읽기
   */
  async readRange(range) {
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
    return this.get(url);
  }

  /**
   * 범위 쓰기
   */
  async writeRange(range, values) {
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
    return this.put(url, { values });
  }

  /**
   * 행 추가
   */
  async appendRow(range, values) {
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}:append`;
    return this.post(url, { values: [values] });
  }

  /**
   * 여러 행 추가
   */
  async appendRows(range, values) {
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}:append`;
    return this.post(url, { values });
  }

  /**
   * 범위 삭제
   */
  async clearRange(range) {
    const url = `/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}:clear`;
    return this.post(url, {});
  }

  /**
   * 배치 업데이트
   */
  async batchUpdate(requests) {
    const url = `/spreadsheets/${this.spreadsheetId}:batchUpdate`;
    return this.post(url, { requests });
  }
}

/**
 * Google Drive API 클래스
 */
class GoogleDriveAPI extends APIClient {
  constructor(token, config = {}) {
    super(token, {
      baseURL: 'https://www.googleapis.com/drive/v3',
      ...config
    });
  }

  /**
   * 파일 목록 조회
   */
  async listFiles(query, pageSize = 10) {
    return this.get('/files', {
      params: new URLSearchParams({
        q: query,
        pageSize,
        fields: 'files(id,name,webViewLink,createdTime,modifiedTime,size)'
      }).toString()
    });
  }

  /**
   * 특정 파일 조회
   */
  async getFile(fileId) {
    return this.get(`/files/${fileId}`, {
      params: new URLSearchParams({
        fields: 'id,name,webViewLink,mimeType,size,createdTime,modifiedTime'
      }).toString()
    });
  }

  /**
   * 파일 업로드
   */
  async uploadFile(file, parentId) {
    const formData = new FormData();
    const metadata = {
      name: file.name,
      parents: parentId ? [parentId] : []
    };

    formData.append('metadata', new Blob([JSON.stringify(metadata)], {
      type: 'application/json'
    }));
    formData.append('file', file);

    return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      },
      body: formData
    }).then(r => {
      if (!r.ok) throw new APIError('파일 업로드 실패', r.status);
      return r.json();
    });
  }

  /**
   * 파일 삭제
   */
  async deleteFile(fileId) {
    return this.delete(`/files/${fileId}`);
  }

  /**
   * 폴더 생성
   */
  async createFolder(folderName, parentId = null) {
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : []
    };

    return this.post('/files', metadata);
  }
}

/**
 * API 에러 클래스
 */
class APIError extends Error {
  constructor(message, code, statusText = '') {
    super(message);
    this.code = code;
    this.statusText = statusText;
    this.name = 'APIError';
  }
}

// 사용 예시:
/*
// 1. Google Sheets API
const sheetsAPI = new GoogleSheetsAPI(accessToken, SPREADSHEET_ID);

try {
  const data = await sheetsAPI.readRange('클라이언트!A1:D100');
  console.log(data);
} catch (error) {
  console.error('Sheets API 에러:', error);
}

// 2. Google Drive API
const driveAPI = new GoogleDriveAPI(accessToken);

try {
  const files = await driveAPI.listFiles('name contains "FinCRM"');
  console.log(files);
} catch (error) {
  console.error('Drive API 에러:', error);
}

// 3. 일반 API
const api = new APIClient(accessToken);

try {
  const data = await api.get('/some-endpoint');
  const result = await api.post('/submit', { data });
} catch (error) {
  console.error('API 에러:', error);
}

// 4. 요청 로그 조회
console.log(sheetsAPI.getLog());

// 5. 토큰 업데이트
api.setToken(newToken);
*/

