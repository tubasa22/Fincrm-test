function demoMode(){
  isDemo=true;
  addLoginLog('login', '데모 사용자');
  updateUserUI({name:'데모 사용자', email:'demo@fincrm.app', picture:''});

  function dAgo(days){ const d=new Date(); d.setDate(d.getDate()-days); return d.toISOString().slice(0,10); }
  function dFrom(days){ const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
  function dobY(age){ const d=new Date(); d.setFullYear(d.getFullYear()-age); return (d.getMonth()+1)+'/'+d.getDate()+'/'+d.getFullYear(); }
  function dobSoon(daysLeft, age){ const d=new Date(); d.setDate(d.getDate()+daysLeft); return (d.getMonth()+1)+'/'+d.getDate()+'/'+(d.getFullYear()-age); }
  // 이번 달 생일 (이달 N일)
  function dobThisMonth(day, age){ const d=new Date(); return (d.getMonth()+1)+'/'+day+'/'+(d.getFullYear()-age); }
  // 65세 N일 전 (Medicare 리마인더 테스트용)
  function dobMedicare(daysTo65){ const d=new Date(); d.setDate(d.getDate()+daysTo65); return (d.getMonth()+1)+'/'+d.getDate()+'/'+(d.getFullYear()-65); }

  clients=[
    // 1. PDP 고객 — Aetna (이번달 생일)
    {rowIdx:2, no:'1', fname:'문례', mname:'', lname:'홍', name:'홍 문례',
     email:'hong.munrye@email.com', address1:'1234 Wilshire Blvd', city:'Los Angeles', zip:'90010', state:'CA',
     phone:'949-664-0113', phone2:'213-555-0191', plan:'PDP', prod:'Aetna',
     memo:'길벗 소개. 장례보험도 관심 있음. 매달 첫째 주 통화 선호.',
     ref:'FALSE', agent:'', dob:dobThisMonth(15, 72), next:dAgo(35), durl:'', biz:''},

    // 2. MAPD 고객 — 리퍼, 12일 후 생일
    {rowIdx:3, no:'2', fname:'철수', mname:'K', lname:'김', name:'김 철수',
     email:'kim.cs@gmail.com', address1:'567 Main Street', city:'Irvine', zip:'92614', state:'CA',
     phone:'213-555-0100', phone2:'', plan:'MAPD', prod:'Humana',
     memo:'딸 박지영 소개. 당뇨 관리 중. 처방전 갱신 매 3개월.',
     ref:'TRUE', agent:'박지영', dob:dobSoon(12, 68), next:dAgo(8), durl:'', biz:''},

    // 3. MAPD — 리퍼, 65세 3개월 전 Medicare 리마인더 대상 (60일 후 65세)
    {rowIdx:4, no:'3', fname:'Grace', mname:'', lname:'Lee', name:'Lee Grace',
     email:'grace.lee@yahoo.com', address1:'890 Orange Ave', city:'Fullerton', zip:'92832', state:'CA',
     phone:'714-555-0230', phone2:'714-555-0231', plan:'MAPD', prod:'Blue Shield',
     memo:'OC 한인회 소개. 영어 상담 가능. 남편 보험도 검토 예정.',
     ref:'TRUE', agent:'김민수', dob:dobMedicare(60), next:dAgo(62), durl:'', biz:''},

    // 4. SNP — 장기 미연락
    {rowIdx:5, no:'4', fname:'영자', mname:'', lname:'박', name:'박 영자',
     email:'', address1:'2200 Beach Blvd', city:'Huntington Beach', zip:'92648', state:'CA',
     phone:'562-555-0310', phone2:'', plan:'SNP', prod:'Humana',
     memo:'저소득층 플랜. Medi-Cal 연계. 딸이 대신 전화함.',
     ref:'FALSE', agent:'', dob:dobY(78), next:dAgo(14), durl:'', biz:''},

    // 5. MAPD — 최근 연락
    {rowIdx:6, no:'5', fname:'James', mname:'H', lname:'Park', name:'Park James',
     email:'jpark@hotmail.com', address1:'3300 Katella Ave', city:'Anaheim', zip:'92804', state:'CA',
     phone:'657-555-0420', phone2:'657-555-0421', plan:'MAPD', prod:'Anthem',
     memo:'AEP 시즌 갱신 예정. PDP에서 MAPD로 변경 논의.',
     ref:'FALSE', agent:'', dob:dobSoon(45, 70), next:dAgo(3), durl:'', biz:''},

    // 6. PDP — WellCare, 오늘 생일, 91일 미연락
    {rowIdx:7, no:'6', fname:'순희', mname:'', lname:'최', name:'최 순희',
     email:'choi.sh@naver.com', address1:'450 S Western Ave', city:'Los Angeles', zip:'90020', state:'CA',
     phone:'323-555-0540', phone2:'', plan:'PDP', prod:'WellCare',
     memo:'약값 부담 호소. Extra Help 신청 안내 완료.',
     ref:'TRUE', agent:'이정호', dob:dobSoon(0, 75), next:dAgo(91), durl:'', biz:''},

    // 7. Medigap
    {rowIdx:8, no:'7', fname:'David', mname:'', lname:'Chung', name:'Chung David',
     email:'dchung@email.com', address1:'1100 E Valley Blvd', city:'Alhambra', zip:'91801', state:'CA',
     phone:'626-555-0650', phone2:'626-555-0651', plan:'Medigap', prod:'Humana',
     memo:'여행 잦음. PPO 유지 선호. 연 1회 갱신 확인.',
     ref:'FALSE', agent:'', dob:dobSoon(20, 67), next:dAgo(5), durl:'', biz:''},

    // 8. MAPD — 이번달 생일
    {rowIdx:9, no:'8', fname:'명숙', mname:'', lname:'윤', name:'윤 명숙',
     email:'yoon.ms@gmail.com', address1:'780 N Vermont Ave', city:'Los Angeles', zip:'90029', state:'CA',
     phone:'213-555-0760', phone2:'', plan:'MAPD', prod:'SCAN',
     memo:'한국어 상담만. 가족 동반 상담 선호. 치과 커버리지 문의.',
     ref:'FALSE', agent:'', dob:dobThisMonth(22, 71), next:dAgo(22), durl:'', biz:''},

    // 9. MAPD — 리퍼, 8일 후 생일
    {rowIdx:10, no:'9', fname:'Robert', mname:'J', lname:'Kim', name:'Kim Robert',
     email:'rkim@work.com', address1:'2500 Pacific Coast Hwy', city:'Torrance', zip:'90505', state:'CA',
     phone:'310-555-0870', phone2:'310-555-0871', plan:'MAPD', prod:'Anthem MAPD',
     memo:'Medicare Advantage 가입. 은퇴 후 종합 커버리지. 배우자 추가 가입 검토.',
     ref:'TRUE', agent:'박지영', dob:dobSoon(8, 58), next:dAgo(18), durl:'', biz:''},

    // 10. MAPD — 45일 미연락
    {rowIdx:11, no:'10', fname:'정숙', mname:'', lname:'강', name:'강 정숙',
     email:'kang.js@email.com', address1:'320 S Hobart Blvd', city:'Los Angeles', zip:'90020', state:'CA',
     phone:'213-555-0980', phone2:'', plan:'MAPD', prod:'Anthem',
     memo:'고혈압·당뇨 복합. PCP 변경 요청. 처방약 커버 확인 필요.',
     ref:'FALSE', agent:'', dob:dobSoon(30, 69), next:dAgo(45), durl:'', biz:''},

    // 11. PDP — CIGNA, 65세 30일 전 (긴급 Medicare 리마인더)
    {rowIdx:12, no:'11', fname:'수진', mname:'', lname:'이', name:'이 수진',
     email:'sujin.lee@email.com', address1:'5500 Crenshaw Blvd', city:'Los Angeles', zip:'90043', state:'CA',
     phone:'323-555-1122', phone2:'', plan:'PDP', prod:'CIGNA',
     memo:'65세 생일 임박. Medicare 전환 상담 예정.',
     ref:'FALSE', agent:'', dob:dobMedicare(28), next:dAgo(10), durl:'', biz:''},

    // 12. MAPD — 이번달 생일, 리퍼
    {rowIdx:13, no:'12', fname:'정순', mname:'', lname:'장', name:'장 정순',
     email:'jangs@email.com', address1:'1800 W Olympic Blvd', city:'Los Angeles', zip:'90006', state:'CA',
     phone:'213-555-3344', phone2:'', plan:'MAPD', prod:'UCLA Health',
     memo:'UCLA 네트워크 선호. 심장 전문의 연계.',
     ref:'TRUE', agent:'김민수', dob:dobThisMonth(8, 70), next:dAgo(7), durl:'', biz:''},
  ];

  allMemos=[
    {name:'홍 문례', type:'전화 상담', date:dAgo(35),
     text:'Aetna PDP 갱신 상담. 약값 변동 없음 확인. 내년 플랜 비교 요청함.',
     ts:new Date(Date.now()-35*864e5).toLocaleString('ko-KR')},
    {name:'홍 문례', type:'대면 미팅', date:dAgo(90),
     text:'플랜 변경 완료. 장례보험 자료 전달. 다음 달 재연락 예정.',
     ts:new Date(Date.now()-90*864e5).toLocaleString('ko-KR')},
    {name:'홍 문례', type:'서류 접수', date:dAgo(120),
     text:'Medicare 카드 사본 수령. MBI 번호 확인 완료.',
     ts:new Date(Date.now()-120*864e5).toLocaleString('ko-KR')},

    {name:'김 철수', type:'전화 상담', date:dAgo(8),
     text:'딸 박지영 소개로 연결. 현재 Original Medicare 사용 중. MAPD로 전환 희망.',
     ts:new Date(Date.now()-8*864e5).toLocaleString('ko-KR')},
    {name:'김 철수', type:'대면 미팅', date:dAgo(30),
     text:'Humana MAPD 가입 완료. PCP 황인용 선생님으로 지정. 처방전 이전 처리.',
     ts:new Date(Date.now()-30*864e5).toLocaleString('ko-KR')},

    {name:'Lee Grace', type:'전화 상담', date:dAgo(62),
     text:'Blue Shield MAPD 갱신 확인. 남편 보험 상담 일정 조율 중. 다음 달 부부 상담 예정.',
     ts:new Date(Date.now()-62*864e5).toLocaleString('ko-KR')},
    {name:'Lee Grace', type:'전화 상담', date:dAgo(20),
     text:'65세 전환 안내. Medicare Part A/B 등록 기간 설명. New Medicare 서류 준비 요청.',
     ts:new Date(Date.now()-20*864e5).toLocaleString('ko-KR')},

    {name:'박 영자', type:'전화 상담', date:dAgo(14),
     text:'Medi-Cal 자격 확인 완료. Humana SNP 지속 유지. 딸 연락처로 소통.',
     ts:new Date(Date.now()-14*864e5).toLocaleString('ko-KR')},

    {name:'Park James', type:'전화 상담', date:dAgo(3),
     text:'AEP 시즌 안내. Anthem MAPD로 변경 검토 중. 비용 비교표 이메일 발송.',
     ts:new Date(Date.now()-3*864e5).toLocaleString('ko-KR')},
    {name:'Park James', type:'이메일', date:dAgo(2),
     text:'플랜 비교표 발송 완료 (PDP vs MAPD). 회신 대기 중.',
     ts:new Date(Date.now()-2*864e5).toLocaleString('ko-KR')},

    {name:'최 순희', type:'대면 미팅', date:dAgo(91),
     text:'Extra Help (LIS) 신청 완료. WellCare로 약값 대폭 절감. 만족도 높음.',
     ts:new Date(Date.now()-91*864e5).toLocaleString('ko-KR')},

    {name:'Chung David', type:'전화 상담', date:dAgo(5),
     text:'Medigap Plan G 갱신 확인. 해외 여행 중 응급 커버리지 문의 → 설명 완료.',
     ts:new Date(Date.now()-5*864e5).toLocaleString('ko-KR')},

    {name:'윤 명숙', type:'전화 상담', date:dAgo(22),
     text:'SCAN MAPD 치과 커버리지 추가 문의. Dental HMO 별도 가입 안내. 딸 통역으로 상담.',
     ts:new Date(Date.now()-22*864e5).toLocaleString('ko-KR')},

    {name:'Kim Robert', type:'대면 미팅', date:dAgo(18),
     text:'Anthem MAPD 플랜 가입 완료. 종합 커버리지 $7,500 코페이먼트 추가 견적 준비 중.',
     ts:new Date(Date.now()-18*864e5).toLocaleString('ko-KR')},

    {name:'강 정숙', type:'전화 상담', date:dAgo(45),
     text:'Anthem MAPD PCP 변경 처리. 처방약 Metformin·Amlodipine 커버 확인.',
     ts:new Date(Date.now()-45*864e5).toLocaleString('ko-KR')},
    {name:'강 정숙', type:'플랜 변경', date:dAgo(90),
     text:'AEP 갱신. 기존 플랜 유지 결정. 약 리스트 업데이트.',
     ts:new Date(Date.now()-90*864e5).toLocaleString('ko-KR')},

    {name:'이 수진', type:'전화 상담', date:dAgo(10),
     text:'65세 Medicare 전환 안내. Part A/B 자동 등록 확인. MAPD vs Original Medicare 비교 설명.',
     ts:new Date(Date.now()-10*864e5).toLocaleString('ko-KR')},

    {name:'장 정순', type:'전화 상담', date:dAgo(7),
     text:'UCLA Health MAPD 만족도 확인. 심장 전문의 Dr. Choi 연계 완료. 생일 축하 문자 발송.',
     ts:new Date(Date.now()-7*864e5).toLocaleString('ko-KR')},
  ];

  allPlanInfo=[
    {name:'홍 문례',
     mbi:'1EG4-TE5-MK72', medical_no:'50123456A',
     pcp:'황인용', pcp_phone:'949-321-0001',
     network:'센타메디칼 IPA', group_no:'GRP-1023',
     meds:'Metformin 500mg, Lisinopril 10mg, Atorvastatin 20mg, Omeprazole 20mg',
     conditions:'당뇨 2형, 고혈압'},

    {name:'김 철수',
     mbi:'2AB7-RF3-XP91', medical_no:'',
     pcp:'황인용', pcp_phone:'949-321-0001',
     network:'Humana HMO', group_no:'GRP-2041',
     meds:'Amlodipine 5mg, Metoprolol 25mg, Aspirin 81mg',
     conditions:'고혈압, 페니실린 알레르기'},

    {name:'Lee Grace',
     mbi:'6LM2-QR8-ST55', medical_no:'',
     pcp:'Dr. Park Jennifer', pcp_phone:'714-555-9900',
     network:'Blue Shield PPO', group_no:'GRP-6088',
     meds:'Atorvastatin 20mg, Metoprolol 50mg',
     conditions:'고혈압'},

    {name:'박 영자',
     mbi:'3CD5-PQ7-WX44', medical_no:'80234567B',
     pcp:'Dr. Kim Susan', pcp_phone:'562-555-1100',
     network:'Humana IPA', group_no:'GRP-3012',
     meds:'Furosemide 20mg, Atorvastatin 40mg, Gabapentin 300mg',
     conditions:'심부전, 당뇨 2형, 고혈압'},

    {name:'Park James',
     mbi:'4EF9-RT2-YZ88', medical_no:'',
     pcp:'Dr. Johnson Mike', pcp_phone:'657-555-2200',
     network:'Anthem PPO', group_no:'GRP-4055',
     meds:'Losartan 50mg, Simvastatin 20mg',
     conditions:'고혈압'},

    {name:'강 정숙',
     mbi:'5GH1-UV4-AB22', medical_no:'90345678C',
     pcp:'Dr. Yoon James', pcp_phone:'213-555-3300',
     network:'Anthem IPA', group_no:'GRP-5077',
     meds:'Metformin 1000mg, Amlodipine 10mg, Lisinopril 20mg, Atorvastatin 40mg',
     conditions:'당뇨 2형, 고혈압, 고지혈증'},

    {name:'이 수진',
     mbi:'7JK3-NP5-CD66', medical_no:'',
     pcp:'Dr. Han Grace', pcp_phone:'323-555-4400',
     network:'CIGNA HMO', group_no:'GRP-7099',
     meds:'Metformin 500mg, Lisinopril 5mg',
     conditions:'당뇨 초기, 고혈압'},

    {name:'장 정순',
     mbi:'8RS4-TU6-EF77', medical_no:'',
     pcp:'Dr. Choi Andrew', pcp_phone:'213-555-5500',
     network:'UCLA Health Network', group_no:'GRP-8011',
     meds:'Warfarin 5mg, Metoprolol 100mg, Furosemide 40mg',
     conditions:'심방세동, 심부전'},

    {name:'윤 명숙',
     mbi:'9VW5-XY7-GH88', medical_no:'70456789D',
     pcp:'Dr. Lim Patricia', pcp_phone:'213-555-6600',
     network:'SCAN IPA', group_no:'GRP-9022',
     meds:'Amlodipine 5mg, Omeprazole 20mg',
     conditions:'고혈압, 역류성 식도염'},
  ];

  // 데모용 수동 일정 (localStorage에 없으면 샘플 삽입)
  if(!localStorage.getItem('fcrm_schedules')){
    const today = new Date();
    function schedDate(offset){ const d=new Date(today); d.setDate(d.getDate()+offset); return d.toISOString().slice(0,10); }
    const demoSched = [
      {id:'demo_s1', date:schedDate(2),  time:'10:00', type:'상담',    title:'홍 문례 — PDP 갱신 상담', target:'홍 문례', note:'약값 비교 자료 준비', created:new Date().toLocaleString('ko-KR')},
      {id:'demo_s2', date:schedDate(4),  time:'14:00', type:'전화',    title:'이 수진 — Medicare 전환 안내', target:'이 수진', note:'65세 전환 서류 안내', created:new Date().toLocaleString('ko-KR')},
      {id:'demo_s3', date:schedDate(7),  time:'11:00', type:'미팅',    title:'강 정숙 — PCP 변경 후속', target:'강 정숙', note:'처방약 커버리지 재확인', created:new Date().toLocaleString('ko-KR')},
      {id:'demo_s4', date:schedDate(10), time:'15:30', type:'갱신 안내', title:'AEP 설명회 — 단체 상담', target:'', note:'MAPD/PDP 비교 세미나', created:new Date().toLocaleString('ko-KR')},
    ];
    localStorage.setItem('fcrm_schedules', JSON.stringify(demoSched));
  }

  // 데모용 SMS 발송 이력
  smsHistory = [
    {time:new Date(Date.now()-2*864e5).toLocaleString('ko'), name:'홍 문례',   phone:'949-664-0113', msg:'안녕하세요 홍 문례님! 생일을 진심으로 축하드립니다…', status:'✅ 발송됨(데모)'},
    {time:new Date(Date.now()-5*864e5).toLocaleString('ko'), name:'최 순희',   phone:'323-555-0540', msg:'안녕하세요 최 순희님, 플랜 갱신 시즌이 다가왔습니다…', status:'✅ 발송됨(데모)'},
    {time:new Date(Date.now()-8*864e5).toLocaleString('ko'), name:'장 정순',   phone:'213-555-3344', msg:'🎂 생일 축하드립니다! 항상 건강하세요…',             status:'✅ 발송됨(데모)'},
    {time:new Date(Date.now()-12*864e5).toLocaleString('ko'), name:'이 수진', phone:'323-555-1122', msg:'65세 Medicare 전환 관련 안내드립니다…',              status:'✅ 발송됨(데모)'},
  ];
  localStorage.setItem('sms_history', JSON.stringify(smsHistory));

  bootApp();
}
