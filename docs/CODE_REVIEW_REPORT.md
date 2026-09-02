# FinCRM 코드 검토 보고서

## 🔍 전체 아키텍처 분석

### 1. 클라이언트 (index_final.html)
- 5600줄 단일 파일 → 너무 큼
- Vanilla JS (프레임워크 없음) → 관리 어려움
- Google Sheets API 직접 호출 → CORS 이슈 가능

### 2. 백엔드 (Google Apps Script)
- GAS에서만 처리 → 보안 미흡
- 직접 Sheets 접근 → 권한 관리 복잡
- 에러 처리 미흡

### 3. 데이터 저장소 (Google Sheets)
- 클라이언트와 GAS가 동시 접근 → 충돌 가능
- 버전 관리 없음
- 백업 전략 없음

---

## ⚠️ CRITICAL 문제점 (즉시 수정 필요)

### 1️⃣ localStorage 코드 검증의 Promise 문제

**현재 코드의 문제:**
```javascript
verifyAccessCodeInBackground(savedCode).then(()=>{
  // 성공 처리
}).catch(e=>{
  // 실패 처리
});
```

**버그:**
- async 함수인데 Promise를 명시적으로 반환하지 않음
- catch 블록이 작동하지 않을 수 있음
- 검증 실패해도 계속 진행될 수 있음

**수정:**
```javascript
async function verifyAccessCodeInBackground(userCode){
  try {
    const response = await fetch(gasUrl, {method: 'POST', body: formData});
    const result = await response.text();
    
    if(result.includes('✅')){
      return true;  // ★ 명시적 반환
    } else {
      throw new Error('코드 무효');  // ★ throw 필수!
    }
  } catch(e) {
    throw e;  // ★ 에러 전파
  }
}

// 호출 시
try {
  await verifyAccessCodeInBackground(savedCode);
  // 성공
} catch(e) {
  // 실패 처리
}
```

---

### 2️⃣ 액세스 코드 검증 로직의 치명적 버그

**현재 상황:**
```javascript
// Code.gs의 verifyCode() 함수는 GAS에만 있음
// HTML에서 호출되지 않음!

// HTML의 verifyCode() 함수는 형식만 검증
// Sheet에서 실제 코드 존재 여부는 확인 안 함!
```

**보안 취약점:**
```
1. 사용자가 임의의 코드 입력 가능 (예: FC-X-9999)
2. 형식만 맞으면 localStorage에 저장됨
3. Sheet에 없는 코드도 수용됨
```

**수정 코드:**
```javascript
async function verifyCode(){
  const raw = document.getElementById('lp_code_input').value.trim().toUpperCase();
  const errEl = document.getElementById('lp_code_err');
  
  // 1단계: 형식 검증
  if(!/^FC-[A-Z]{1,2}-\d{4}$/.test(raw)){
    errEl.textContent = '❌ 코드 형식이 올바르지 않습니다';
    errEl.style.display = 'block';
    return;
  }
  
  // 2단계: ★ Sheet에서 실제 존재하는지 확인 (중요!)
  try {
    const isValid = await checkCodeInSheet(raw);
    
    if(!isValid){
      errEl.textContent = '❌ 유효하지 않은 코드입니다';
      errEl.style.display = 'block';
      return;
    }
    
    // 3단계: 검증 성공 → 저장
    localStorage.setItem('fcrm_access_code', raw);
    errEl.style.display = 'none';
    
    // Google 로그인 버튼 표시
    document.getElementById('lp_google_wrap').style.display = 'block';
    
  } catch(e) {
    errEl.textContent = '❌ 코드 확인 중 오류가 발생했습니다';
    errEl.style.display = 'block';
    console.error('코드 검증 실패:', e);
  }
}

// 새 함수: Sheet에서 코드 확인
async function checkCodeInSheet(code) {
  const gasUrl = 'https://script.google.com/macros/s/AKfycby_Ho65Es2yeoxkMf_RmbOMb4ORrDbM4t8mPFlyEgcGJ_IkgymsL7E1QK0sy8ZuNc0s/exec';
  
  const formData = new FormData();
  formData.append('action', 'verifyCode');
  formData.append('code', code);
  
  const response = await fetch(gasUrl, {
    method: 'POST',
    body: formData
  });
  
  const result = await response.text();
  return result.includes('✅');
}
```

---

### 3️⃣ 동시성 문제 (Race Condition)

**현재 흐름:**
```
1. 클라이언트: Sheet에 신청 정보 추가 (행 추가)
   ↓
2. Zapier: 새 행 감지 → 코드 생성 → G열 업데이트
   ↓
3. Zapier: H열(상태) 업데이트 → "발급됨"
```

**잠재적 문제:**
- 신청 데이터 추가 중에 Zapier가 행을 수정할 수 있음
- 일부 필드가 손실될 수 있음
- 이메일 발송이 실패할 수 있음

**현재는 괜찮은 이유:**
- Zapier trigger는 "new row" 감지
- 일단 행이 추가되면 Zapier가 처리
- 순서가 명확함

**개선:**
```javascript
// 클라이언트에서는 신청만 함 (현재 O)
// Zapier에서 모든 처리 (현재 O)
// → 현재 구조로 문제 없음

// 하지만 future-proof를 위해:
// - 행에 "timestamp" 추가
// - Zapier에서 "updated at" 확인
```

---

## 📊 HIGH 우선순위 문제

### 4️⃣ 에러 처리 거의 없음

**문제점:**
```javascript
await sheetsReq(...);  // 실패해도 아무것도 안 함
loadAll();             // 실패 무시하고 계속
renderAll();           // 빈 데이터로 렌더링
```

**결과:**
- 사용자는 데이터가 로드됐다고 생각
- 실제로는 로드 실패
- 디버깅 어려움

**수정:**
```javascript
async function loadAll() {
  try {
    const clientData = await sheetsReq('GET', ...);
    if (!clientData) throw new Error('고객 데이터 로드 실패');
    clients = clientData;
    
    const memoData = await sheetsReq('GET', ...);
    if (!memoData) throw new Error('메모 데이터 로드 실패');
    allMemos = memoData;
    
    setSyncStatus('연결됨', true);
    return true;
    
  } catch(e) {
    console.error('데이터 로드 실패:', e);
    setSyncStatus('❌ 연결 오류: ' + e.message, false);
    toast('❌ 데이터 로드 실패. 새로고침해주세요');
    return false;
  }
}

// 호출 시
if (!await loadAll()) {
  return;  // 실패하면 중단
}
```

---

### 5️⃣ localStorage에 20개 이상의 데이터 저장

**문제:**
- 5MB 용량 제한
- 탭 간 동기화 안 됨
- 보안 취약점 (XSS 공격)

**권장:**
```javascript
// sessionStorage: 임시 데이터
sessionStorage.setItem('fcrm_temp_code', code);

// localStorage: 필수 데이터만
localStorage.setItem('fcrm_user_email', email);

// IndexedDB: 대용량 캐시 (향후)
const db = await openDB('fincrm');
await db.put('clients', clientData);
```

---

### 6️⃣ 메모리 누수 가능성

**문제:**
```javascript
// bootApp() 호출될 때마다
renderAll();  // 기존 DOM은?

// 이벤트 리스너 중복 등록 가능
document.addEventListener('click', handler);  // 계속 추가됨
```

**해결:**
```javascript
function cleanup() {
  // DOM 정리
  document.getElementById('mainContent').innerHTML = '';
  
  // 타이머 정리
  if(window.syncTimer) clearInterval(window.syncTimer);
  
  // 큰 객체 초기화
  clients = [];
  allMemos = [];
  allPlanInfo = [];
}

function bootApp() {
  cleanup();  // 먼저 정리
  renderAll();
  // ...
}
```

---

## 📊 코드 품질 점수

| 항목 | 점수 | 상태 |
|------|------|------|
| 기능성 | 8/10 | ✅ 대부분 작동 |
| 보안 | 3/10 | ⚠️ 심각 |
| 성능 | 6/10 | 🔄 개선 필요 |
| 유지보수성 | 4/10 | 🔄 파일 너무 큼 |
| 에러 처리 | 2/10 | ⚠️ 거의 없음 |
| **종합** | **4.6/10** | **개선 필요** |

---

## 🎯 우선순위별 수정 계획

### Phase 1️⃣ CRITICAL (지금)
```
□ Promise 반환 수정 (checkSavedAccessCode)
□ 코드 검증 로직 추가 (checkCodeInSheet)
□ 에러 처리 추가 (try-catch)
예상 시간: 2-3시간
```

### Phase 2️⃣ HIGH (이번 주)
```
□ 모든 sheetsReq 호출에 에러 처리
□ localStorage 정리 (20개 → 5개로 축소)
□ 메모리 누수 수정 (cleanup 함수)
예상 시간: 4-5시간
```

### Phase 3️⃣ MEDIUM (다음 주)
```
□ 비동기 처리 통일 (await 추가)
□ 전역 변수 객체화
□ 날짜 포맷 통일
예상 시간: 6-8시간
```

### Phase 4️⃣ OPTIONAL (향후)
```
□ 파일 분리 (HTML → JS 모듈화)
□ IndexedDB 마이그레이션
□ 보안 감사
예상 시간: 20+ 시간
```

---

## ✅ 현재 상태 평가

**장점:**
- ✅ 기본 기능 잘 작동
- ✅ UI/UX 좋음
- ✅ 데모 데이터 충실
- ✅ Git 버전 관리 시작

**단점:**
- ❌ 에러 처리 미흡
- ❌ 보안 취약점
- ❌ 파일이 너무 큼
- ❌ 코드 구조 불명확

**평가:**
현재는 **MVP(최소 기능 제품) 수준**이며, **프로덕션 배포 전에 Phase 1, 2는 꼭 수정**해야 합니다.

---

## 💡 최종 권장사항

```
1순위: CRITICAL 3가지 수정 (보안)
2순위: HIGH 3가지 추가 (안정성)
3순위: MEDIUM 3가지 정리 (유지보수)
4순위: 새 기능 추가 (안정화 후)
```

지금 바로 **Phase 1 수정 코드**를 제공할까요? 🚀
