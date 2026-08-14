/* store.js — 데이터 저장/동기화 계층
   - Firebase 설정이 있으면: Google 로그인 + Firestore 클라우드 동기화
   - 없으면: 이 기기(localStorage)에만 저장하는 로컬 모드            */

const Store = (() => {

  const LS = {
    trips: "tp_trips",        // 로컬 모드: 모든 여행 데이터
    current: "tp_current",    // 마지막으로 보던 여행 id
    rates: "tp_rates",        // 환율 캐시
    routes: "tp_routes",      // 경로 검색 결과 캐시
    myTrips: "tp_mytrips",    // 클라우드 모드: 이 기기에서 열어본 여행 id 목록
    myName: "tp_myname"       // 이 기기 사용자의 표시 이름
  };

  const S = {
    mode: "local",            // 'local' | 'cloud'
    user: null,               // { uid, name }
    tripId: null,
    trip: null,               // 현재 여행 데이터
    tripList: [],             // [{id, name, city, startDate, endDate}]
    ready: false,
    authed: false
  };

  let db = null, auth = null, unsubTrip = null;
  let onChange = () => {};
  let saveTimer = null;

  /* ---------- 공통 유틸 ---------- */

  function uid() {
    return (crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 20)
      : "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function lsGet(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }

  function emit() { onChange(S); }

  /* ---------- 기본 템플릿 ---------- */

  const CHECK_TEMPLATE = [
    { section: "필수 준비물", items: ["여권 (유효기간 확인)", "항공권 예약 확인서", "숙소 바우처", "여행자 보험 가입", "환전"] },
    { section: "전자기기", items: ["충전기 · 케이블", "보조배터리", "멀티 어댑터", "유심 / 로밍 신청"] },
    { section: "생활용품", items: ["상비약", "세면도구", "우산"] }
  ];

  function newTrip({ name, city, startDate, endDate, currency }) {
    const checklist = [];
    CHECK_TEMPLATE.forEach(sec =>
      sec.items.forEach(it => checklist.push({
        id: uid(), section: sec.section, name: it, assignee: "나", done: false
      }))
    );
    return {
      id: uid(),
      name, city: city || name, startDate, endDate,
      currency: currency || "JPY",
      memberNames: ["나"],
      schedule: [],
      expenses: [],
      checklist,
      documents: [{
        id: uid(), icon: "phone", title: "긴급 연락처", subtitle: "잃어버렸을 때 · 아플 때",
        rows: [
          { k: "영사콜센터 (24시간)", v: "+82-2-3210-0404" },
          { k: "현지 응급", v: "국가별 긴급번호 입력" }
        ]
      }],
      createdAt: Date.now()
    };
  }

  /* ---------- 로컬 모드 ---------- */

  function localLoad() {
    const all = lsGet(LS.trips, {});
    S.tripList = Object.values(all).map(t => ({
      id: t.id, name: t.name, city: t.city, startDate: t.startDate, endDate: t.endDate
    })).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
    const cur = lsGet(LS.current, null);
    S.tripId = (cur && all[cur]) ? cur : (S.tripList[0] ? S.tripList[0].id : null);
    S.trip = S.tripId ? all[S.tripId] : null;
    S.ready = true;
    emit();
  }

  function localSave() {
    if (!S.trip) return;
    const all = lsGet(LS.trips, {});
    all[S.trip.id] = S.trip;
    lsSet(LS.trips, all);
    lsSet(LS.current, S.trip.id);
  }

  /* ---------- 클라우드 모드 ---------- */

  /* 로그인 화면 없이 동작합니다.
     - Firebase 익명 인증으로 눈에 보이지 않게 자동 인증 (사용자 조작 없음)
     - 여행 접근 권한은 "주소에 담긴 여행 코드"가 대신합니다 (링크를 아는 사람만 열람) */

  function cloudInit() {
    firebase.initializeApp(APP_CONFIG.firebase);
    auth = firebase.auth();
    db = firebase.firestore();
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    auth.onAuthStateChanged(u => {
      if (u) {
        S.user = { uid: u.uid, name: lsGet(LS.myName, "나") };
        S.authed = true;
        cloudLoadList();
      }
    });
    auth.signInAnonymously().catch(e => {
      console.error(e);
      S.cloudError = "클라우드 연결에 실패했습니다. Firebase 설정을 확인해주세요.";
      S.ready = true; emit();
    });
  }

  function logout() { /* 로그인 화면이 없으므로 사용하지 않음 */ }

  // 주소(#t=코드)에 여행 코드가 있으면 그 여행을 우선 엽니다.
  function hashTripId() {
    const m = (location.hash || "").match(/[#&]t=([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : null;
  }

  async function cloudLoadList() {
    try {
      const ids = lsGet(LS.myTrips, []);
      const linked = hashTripId();
      if (linked && !ids.includes(linked)) ids.unshift(linked);

      const docs = await Promise.all(ids.map(id =>
        db.collection("trips").doc(id).get().catch(() => null)));

      const alive = [];
      S.tripList = [];
      docs.forEach((d, i) => {
        if (d && d.exists) {
          const t = d.data();
          alive.push(ids[i]);
          S.tripList.push({ id: ids[i], name: t.name, city: t.city, startDate: t.startDate, endDate: t.endDate });
        }
      });
      lsSet(LS.myTrips, alive);
      S.tripList.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

      const cur = lsGet(LS.current, null);
      const pick = linked && alive.includes(linked) ? linked
                 : (alive.includes(cur) ? cur : (alive[0] || null));
      if (pick) subscribeTrip(pick);
      else { S.trip = null; S.tripId = null; S.ready = true; emit(); }
    } catch (e) {
      console.error(e);
      S.ready = true; emit();
    }
  }

  function rememberTrip(id) {
    const ids = lsGet(LS.myTrips, []);
    if (!ids.includes(id)) { ids.unshift(id); lsSet(LS.myTrips, ids); }
  }

  function subscribeTrip(id) {
    if (unsubTrip) unsubTrip();
    S.tripId = id;
    lsSet(LS.current, id);
    rememberTrip(id);
    unsubTrip = db.collection("trips").doc(id).onSnapshot(doc => {
      if (doc.exists) S.trip = doc.data();
      S.ready = true;
      emit();
    }, err => { console.error(err); S.ready = true; emit(); });
  }

  function cloudSave() {
    if (!S.trip) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      db.collection("trips").doc(S.trip.id).set(S.trip).catch(e => console.error(e));
    }, 400);
  }

  /* ---------- 공개 API ---------- */

  function init(cb) {
    onChange = cb;
    const cfg = window.APP_CONFIG || {};
    if (cfg.firebase && cfg.firebase.apiKey) {
      S.mode = "cloud";
      cloudInit();
    } else {
      S.mode = "local";
      S.user = { uid: "local", name: lsGet(LS.myName, "나") };
      S.authed = true;
      localLoad();
    }
    // 다른 여행 링크를 열었을 때 즉시 전환
    window.addEventListener("hashchange", () => {
      const id = hashTripId();
      if (id && id !== S.tripId && S.mode === "cloud") joinTrip(id);
    });
  }

  // 현재 여행 데이터를 변경할 때는 반드시 이 함수를 통해서
  function update(fn) {
    if (!S.trip) return;
    fn(S.trip);
    if (S.mode === "cloud") cloudSave(); else localSave();
    emit();
  }

  function createTrip(info) {
    const t = newTrip(info);
    if (S.mode === "cloud") {
      t.ownerUid = S.user.uid;
      db.collection("trips").doc(t.id).set(t);
      S.tripList.push({ id: t.id, name: t.name, city: t.city, startDate: t.startDate, endDate: t.endDate });
      subscribeTrip(t.id);
    } else {
      S.trip = t; S.tripId = t.id;
      localSave(); localLoad();
    }
    return t.id;
  }

  function switchTrip(id) {
    if (S.mode === "cloud") { subscribeTrip(id); }
    else {
      const all = lsGet(LS.trips, {});
      if (all[id]) { S.tripId = id; S.trip = all[id]; lsSet(LS.current, id); emit(); }
    }
  }

  function deleteTrip(id) {
    if (S.mode === "cloud") {
      db.collection("trips").doc(id).delete();
      lsSet(LS.myTrips, lsGet(LS.myTrips, []).filter(x => x !== id));
      S.tripList = S.tripList.filter(t => t.id !== id);
      if (S.tripId === id) {
        if (unsubTrip) { unsubTrip(); unsubTrip = null; }
        S.trip = null; S.tripId = null;
        lsSet(LS.current, null);
      }
      cloudLoadList();
    } else {
      const all = lsGet(LS.trips, {});
      delete all[id];
      lsSet(LS.trips, all);
      if (S.tripId === id) lsSet(LS.current, null);
      localLoad();
    }
  }

  // 공유 링크(또는 여행 코드)로 동행자의 여행 열기 — 로그인 불필요
  async function joinTrip(input) {
    let code = (input || "").trim();
    const m = code.match(/[#&?]t=([A-Za-z0-9_-]{6,})/);
    if (m) code = m[1];
    if (!code) return { ok: false, msg: "공유 링크나 여행 코드를 입력해주세요." };
    if (S.mode !== "cloud") {
      return { ok: false, msg: "링크 공유는 클라우드 동기화 설정 후 사용할 수 있어요." };
    }
    try {
      const doc = await db.collection("trips").doc(code).get();
      if (!doc.exists) return { ok: false, msg: "해당 링크의 여행을 찾을 수 없습니다." };
      rememberTrip(code);
      await cloudLoadList();
      subscribeTrip(code);
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: "여행을 여는 데 실패했습니다: " + (e.message || e) };
    }
  }

  // 이 기기의 표시 이름 (체크리스트 담당자 표시에 사용)
  function setMyName(name) {
    lsSet(LS.myName, name);
    if (S.user) S.user.name = name;
    emit();
  }

  // 동행자에게 보낼 공유 링크
  function shareLink() {
    if (!S.tripId) return "";
    return location.origin + location.pathname + "#t=" + S.tripId;
  }

  /* ---------- 환율 ---------- */

  async function getRate(currency) {
    if (currency === "KRW") return 1;
    const today = new Date().toISOString().slice(0, 10);
    const cache = lsGet(LS.rates, {});
    if (cache[currency] && cache[currency].date === today) return cache[currency].krw;
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/" + currency);
      const data = await res.json();
      if (data && data.rates && data.rates.KRW) {
        cache[currency] = { krw: data.rates.KRW, date: today };
        lsSet(LS.rates, cache);
        return data.rates.KRW;
      }
    } catch {}
    // 오프라인 등 실패 시: 마지막으로 저장된 환율 사용
    return cache[currency] ? cache[currency].krw : null;
  }

  /* ---------- 경로 캐시 ---------- */

  function routeCacheGet(key) {
    const all = lsGet(LS.routes, {});
    return all[key] || null;
  }
  function routeCacheSet(key, val) {
    const all = lsGet(LS.routes, {});
    all[key] = val;
    lsSet(LS.routes, all);
  }

  /* ---------- 데이터 백업 ---------- */

  function exportData() {
    const data = (S.mode === "local") ? lsGet(LS.trips, {}) : { [S.trip.id]: S.trip };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "여행플래너_백업_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
  }

  function importData(json) {
    try {
      const data = JSON.parse(json);
      const all = lsGet(LS.trips, {});
      Object.values(data).forEach(t => { if (t && t.id) all[t.id] = t; });
      lsSet(LS.trips, all);
      if (S.mode === "local") localLoad();
      return true;
    } catch { return false; }
  }

  return {
    S, init, update, logout,
    createTrip, switchTrip, deleteTrip, joinTrip,
    setMyName, shareLink,
    getRate, routeCacheGet, routeCacheSet,
    exportData, importData, uid
  };
})();
