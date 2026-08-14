/* app.js — 화면 렌더링과 사용자 동작 처리 */

const App = (() => {

  /* ================= 상태 ================= */

  const U = {
    tab: "home",
    schedDay: 0,            // 일정 탭에서 선택된 일차 (0부터)
    schedView: "timeline",  // 'timeline' | 'table'
    checkFilter: "all",     // 'all' | 구성원 이름
    rate: null,             // 현재 통화 → KRW 환율
    routeMode: "TRANSIT"
  };

  const $ = id => document.getElementById(id);
  const view = () => $("view");

  /* ================= 유틸 ================= */

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const comma = n => Math.round(n).toLocaleString("ko-KR");
  const fmtKRW = n => "₩ " + comma(n);

  const CURRENCIES = [
    ["JPY", "일본 엔", "¥"], ["USD", "미국 달러", "$"], ["EUR", "유로", "€"],
    ["CNY", "중국 위안", "¥"], ["TWD", "대만 달러", "NT$"], ["THB", "태국 바트", "฿"],
    ["VND", "베트남 동", "₫"], ["SGD", "싱가포르 달러", "S$"], ["HKD", "홍콩 달러", "HK$"],
    ["PHP", "필리핀 페소", "₱"], ["GBP", "영국 파운드", "£"], ["AUD", "호주 달러", "A$"],
    ["KRW", "한국 원", "₩"]
  ];
  const curSym = c => (CURRENCIES.find(x => x[0] === c) || ["", "", c])[2];

  const CATS = ["식비", "교통", "쇼핑", "관광", "숙박", "기타"];
  const DONUT_COLORS = ["#3182F6", "#30BD94", "#FFB331", "#8C7CF0", "#F04452", "#B0B8C1"];

  const ICONS = {
    food: '<path d="M5 3v7a3 3 0 006 0V3M8 3v18M17 3c-1.5 1.5-2 4-2 6v3h3v9M18 3v9"/>',
    transit: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M9 21l1.5-3M15 21l-1.5-3"/>',
    shopping: '<path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/>',
    tour: '<path d="M3 8a2 2 0 012-2h2l2-3h6l2 3h2a2 2 0 012 2v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
    hotel: '<path d="M4 21V8l8-5 8 5v13M9 21v-6h6v6"/>',
    etc: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    walk: '<circle cx="12" cy="5" r="2"/><path d="M12 7v5l-3 7M12 12l3 3v6M9 10l3-2 3 2"/>',
    car: '<path d="M5 17l1.5-6a2 2 0 012-1.5h7a2 2 0 012 1.5L19 17M4 17h16v3h-2M4 17v3h2"/><circle cx="8" cy="18.5" r="1"/><circle cx="16" cy="18.5" r="1"/>',
    flight: '<path d="M10.5 13.5L3 11l1.5-2 6.5 1L16 4.5 18.5 6l-3 6.5 4.5 3-2 1.5-5-2-3 4-1.5-1z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
    note: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/>',
    chev: '<path d="M6 9l6 6 6-6"/>'
  };
  const icon = (name, cls) =>
    '<svg viewBox="0 0 24 24" class="' + (cls || "") + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICONS[name] + "</svg>";
  const CAT_ICON = { "식비": "food", "교통": "transit", "쇼핑": "shopping", "관광": "tour", "숙박": "hotel", "기타": "etc" };

  /* ---- 날짜 ---- */
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function dateList(trip) {
    const out = [];
    if (!trip.startDate || !trip.endDate) return out;
    const d = new Date(trip.startDate + "T00:00:00");
    const end = new Date(trip.endDate + "T00:00:00");
    while (d <= end && out.length < 60) {
      out.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  function fmtMD(ds) {
    const d = new Date(ds + "T00:00:00");
    return (d.getMonth() + 1) + "." + d.getDate();
  }
  function fmtMDW(ds) {
    const d = new Date(ds + "T00:00:00");
    return fmtMD(ds) + " " + WD[d.getDay()];
  }
  function dayDiff(a, b) { // b - a (일)
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }

  /* ================= 공통 렌더 ================= */

  function render() {
    const S = Store.S;
    if (!S.ready) {
      if (S.cloudError) $("loading-msg").textContent = S.cloudError;
      return;
    }
    $("loading-screen").classList.add("hidden");
    $("app").classList.remove("hidden");

    document.querySelectorAll("#tabbar button").forEach(b =>
      b.classList.toggle("on", b.dataset.tab === U.tab));

    if (!S.trip) { renderNoTrip(); return; }

    // 환율 준비
    if (U.rate === null || U.rateCur !== S.trip.currency) {
      U.rateCur = S.trip.currency;
      Store.getRate(S.trip.currency).then(r => {
        if (r !== U.rate) { U.rate = r; if (["home", "budget"].includes(U.tab)) render(); }
      });
    }

    ({ home: renderHome, schedule: renderSchedule, budget: renderBudget, check: renderCheck, docs: renderDocs }[U.tab])();
  }

  function setTab(t) { U.tab = t; render(); window.scrollTo(0, 0); }

  function renderNoTrip() {
    view().innerHTML =
      '<div style="padding-top:15vh; text-align:center">' +
      '<div class="login-logo" style="margin-bottom:20px">' + icon("flight") + "</div>" +
      '<h1 style="font-size:24px; font-weight:800">첫 여행을 만들어보세요</h1>' +
      '<p style="color:var(--text3); font-size:14px; line-height:1.6; margin:10px 0 28px">여행 이름과 날짜만 입력하면<br>일정 · 가계부 · 체크리스트가 준비됩니다</p>' +
      '<button class="btn" style="max-width:280px; margin:0 auto" onclick="App.tripCreateSheet()">새 여행 만들기</button>' +
      (Store.S.mode === "cloud"
        ? '<button class="btn ghost" style="max-width:280px; margin:12px auto 0" onclick="App.joinSheet()">공유 링크로 열기</button>'
        : "") +
      "</div>";
    document.querySelectorAll(".fab").forEach(f => f.remove());
  }

  /* ================= 홈 ================= */

  // 기본 배경 — 언덕 위 나무 한 그루 풍경 (설정에서 직접 찍은 사진으로 교체 가능)
  function heroSVG() {
    return '<svg class="bg" viewBox="0 0 335 170" preserveAspectRatio="xMidYMid slice">' +
      "<defs>" +
      '<linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#5FA6DC"/><stop offset="55%" stop-color="#9CCBEA"/><stop offset="100%" stop-color="#D6EAF6"/></linearGradient>' +
      '<linearGradient id="hhill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#E0B44A"/><stop offset="100%" stop-color="#C08E28"/></linearGradient>' +
      '<linearGradient id="hfield" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#7FB74F"/><stop offset="100%" stop-color="#4E8A34"/></linearGradient>' +
      "</defs>" +
      // 하늘
      '<rect width="335" height="170" fill="url(#hsky)"/>' +
      // 구름
      '<g fill="#fff" opacity=".85">' +
      '<ellipse cx="46" cy="30" rx="40" ry="11"/><ellipse cx="74" cy="24" rx="26" ry="9"/>' +
      '<ellipse cx="252" cy="20" rx="46" ry="10"/><ellipse cx="286" cy="27" rx="30" ry="8"/>' +
      '<ellipse cx="150" cy="14" rx="34" ry="8"/>' +
      "</g>" +
      '<g fill="#fff" opacity=".6">' +
      '<ellipse cx="300" cy="74" rx="34" ry="7"/><ellipse cx="30" cy="66" rx="28" ry="6"/>' +
      "</g>" +
      // 황금빛 언덕
      '<path d="M0 118 C60 96 110 84 168 84 C226 84 278 97 335 117 L335 170 L0 170 Z" fill="url(#hhill)"/>' +
      // 언덕 위 밭이랑 결
      '<g stroke="#B8862A" stroke-width="1" opacity=".35" fill="none">' +
      '<path d="M0 124 C62 103 112 91 168 91 C226 91 278 104 335 123"/>' +
      '<path d="M0 132 C64 112 114 100 168 100 C226 100 280 113 335 131"/>' +
      "</g>" +
      // 나무 (전나무)
      '<g fill="#2C5738">' +
      '<rect x="165" y="112" width="6" height="20" fill="#4A3421"/>' +
      '<path d="M168 26 L157 60 L179 60 Z"/>' +
      '<path d="M168 44 L151 82 L185 82 Z"/>' +
      '<path d="M168 62 L145 104 L191 104 Z"/>' +
      '<path d="M168 82 L139 130 L197 130 Z"/>' +
      "</g>" +
      '<g fill="#204527" opacity=".55">' +
      '<path d="M168 26 L168 60 L179 60 Z"/><path d="M168 44 L168 82 L185 82 Z"/>' +
      '<path d="M168 62 L168 104 L191 104 Z"/><path d="M168 82 L168 130 L197 130 Z"/>' +
      "</g>" +
      // 앞쪽 초록 들판
      '<path d="M0 126 C70 118 120 126 168 130 C220 134 272 128 335 122 L335 170 L0 170 Z" fill="url(#hfield)"/>' +
      '<g stroke="#3F7A2C" stroke-width="1" opacity=".3" fill="none">' +
      '<path d="M0 140 C72 132 122 140 168 144 C220 148 272 142 335 136"/>' +
      '<path d="M0 154 C74 146 124 154 168 158 C220 162 272 156 335 150"/>' +
      "</g></svg>";
  }

  function heroBG(trip) {
    return trip.photo
      ? '<img class="bg" src="' + trip.photo + '" alt="">'
      : heroSVG();
  }

  function ddayInfo(trip) {
    const t = todayStr();
    if (t < trip.startDate) {
      return { tag: "출발까지", main: "D-" + dayDiff(t, trip.startDate), state: "before" };
    }
    if (t > trip.endDate) {
      return { tag: "여행을 다녀왔어요", main: "여행 완료", state: "after" };
    }
    const n = dayDiff(trip.startDate, t) + 1;
    const total = dayDiff(trip.startDate, trip.endDate) + 1;
    return { tag: "여행 중", main: "여행 " + n + "일차", sub: "/ " + total + "일", state: "during", day: n };
  }

  function donutSVG(byCat, size) {
    const total = byCat.reduce((s, c) => s + c.amount, 0);
    if (!total) return "";
    const C = 251.33; // 2πr, r=40
    let off = 0, segs = "";
    byCat.forEach(c => {
      const len = C * c.amount / total;
      segs += '<circle cx="60" cy="60" r="40" fill="none" stroke="' + c.color + '" stroke-width="17" stroke-dasharray="' + len.toFixed(2) + " " + C + '" stroke-dashoffset="' + (-off).toFixed(2) + '"/>';
      off += len;
    });
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 120 120">' +
      '<g transform="rotate(-90 60 60)">' + segs + "</g>" +
      '<text x="60" y="57" text-anchor="middle" font-size="12" font-weight="700" fill="#8B95A1">최다 지출</text>' +
      '<text x="60" y="73" text-anchor="middle" font-size="13" font-weight="800" fill="#191F28">' + esc(byCat[0].label) + "</text></svg>";
  }

  function catBreakdown(trip) {
    const map = {};
    trip.expenses.forEach(e => {
      const k = e.category || "기타";
      map[k] = (map[k] || 0) + (e.krw || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([label, amount], i) => ({
        label, amount, color: DONUT_COLORS[i % DONUT_COLORS.length],
        pct: total ? Math.round(amount / total * 100) : 0
      }));
  }

  function donutBlock(trip, extraStyle) {
    const byCat = catBreakdown(trip);
    if (!byCat.length) return "";
    return '<div class="donut-wrap" style="' + (extraStyle || "") + '">' +
      donutSVG(byCat, 108) +
      '<div class="legend">' +
      byCat.map(c =>
        '<div class="lg-row"><span class="lg-dot" style="background:' + c.color + '"></span>' + esc(c.label) +
        '<span class="lg-amt">' + fmtKRW(c.amount) + " · " + c.pct + "%</span></div>").join("") +
      "</div></div>";
  }

  function spendStats(trip) {
    const total = trip.expenses.reduce((s, e) => s + (e.krw || 0), 0);
    const t = todayStr();
    const today = trip.expenses.filter(e => e.date === t).reduce((s, e) => s + (e.krw || 0), 0);
    const days = new Set(trip.expenses.map(e => e.date)).size || 1;
    return { total, today, avg: total / days };
  }

  function renderHome() {
    const S = Store.S, trip = S.trip;
    const dd = ddayInfo(trip);
    const st = spendStats(trip);
    const dates = dateList(trip);
    const previewDate = dd.state === "during" ? dates[dd.day - 1] : dates[0];
    const preview = trip.schedule
      .filter(i => i.date === previewDate)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
      .slice(0, 4);
    const memberCnt = (trip.memberNames || ["나"]).length;
    const done = trip.checklist.filter(c => c.done).length;
    const totalChk = trip.checklist.length;
    const pct = totalChk ? Math.round(done / totalChk * 100) : 0;

    let ddayCard;
    if (dd.state === "after") {
      ddayCard =
        '<div class="card"><div class="label">' + dd.tag + '</div>' +
        '<div class="dday-num" style="color:var(--text)">여행 완료</div>' +
        '<div class="bar-meta" style="margin-top:6px"><span>총 지출 ' + fmtKRW(st.total) + "</span><span>일정 " + trip.schedule.length + "개</span></div></div>";
    } else {
      ddayCard =
        '<div class="card"><div class="label">' + dd.tag + '</div>' +
        '<div class="dday-num">' + dd.main + (dd.sub ? " <small>" + dd.sub + "</small>" : "") + "</div>" +
        '<div class="bar-meta" style="margin-top:2px"><span>체크리스트 ' + done + "/" + totalChk + ' 완료</span><span class="blue" style="font-weight:700">' + pct + "%</span></div>" +
        '<div class="bar-track" style="margin-top:8px"><div class="bar-fill" style="width:' + pct + '%"></div></div></div>';
    }

    view().innerHTML =
      '<div class="appbar">' +
      '<button class="tt" onclick="App.tripListSheet()">' + esc(trip.name) + icon("chev") + "</button>" +
      '<button onclick="App.settingsSheet()" style="color:var(--text3)">' + icon("gear", "") + "</button>" +
      "</div>" +
      '<div class="hero">' + heroBG(trip) +
      '<button class="share" onclick="App.shareSheet()">공유중 ' + memberCnt + "명</button>" +
      '<div class="ov"><div class="t">' + esc(trip.name) + '</div>' +
      '<div class="d">' + trip.startDate.replaceAll("-", ".") + " – " + trip.endDate.slice(5).replace("-", ".") +
      " · " + (dates.length - 1) + "박 " + dates.length + "일</div></div></div>" +
      (S.mode === "local" ? '<div class="banner">클라우드 동기화 미설정 — 데이터는 이 기기에만 저장됩니다. 설정 방법은 SETUP 안내를 참고하세요.</div>' : "") +
      ddayCard +
      '<div class="card"><div class="label">지금까지 쓴 돈</div>' +
      '<div class="big">' + fmtKRW(st.total) + "</div>" +
      '<div class="bar-meta" style="margin-top:6px"><span>오늘 ' + fmtKRW(st.today) + "</span><span>하루 평균 " + fmtKRW(st.avg) + "</span></div>" +
      donutBlock(trip) +
      "</div>" +
      '<div class="card"><div class="label" style="margin-bottom:6px">' +
      (dd.state === "during" ? "오늘 일정" : "1일차 일정 미리보기") + "</div>" +
      (preview.length
        ? preview.map(i =>
            '<div class="today-item"><div class="tm">' + esc(i.time || "--:--") + '</div>' +
            "<div><div class=\"nm\">" + esc(i.title) + '</div><div class="pl">' + esc(i.place || "") + "</div></div></div>").join("")
        : '<div class="empty" style="padding:20px 0 12px">아직 일정이 없어요<br>일정 탭에서 추가해보세요</div>') +
      "</div>";

    removeFab();
  }

  /* ================= 일정 ================= */

  function removeFab() { document.querySelectorAll(".fab").forEach(f => f.remove()); }
  function addFab(fn) {
    removeFab();
    const b = document.createElement("button");
    b.className = "fab";
    b.innerHTML = icon("plus");
    b.onclick = fn;
    document.body.appendChild(b);
  }

  function renderSchedule() {
    const trip = Store.S.trip;
    const dates = dateList(trip);
    if (U.schedDay >= dates.length) U.schedDay = 0;
    const curDate = dates[U.schedDay];
    const items = trip.schedule
      .filter(i => i.date === curDate)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    let body;
    if (!items.length) {
      body = '<div class="empty">이 날의 일정이 아직 없어요<br>오른쪽 아래 + 버튼으로 추가하세요</div>';
    } else if (U.schedView === "table") {
      body = '<table class="sch-table"><tr><th style="width:52px">시간</th><th>일정</th><th>장소 · 메모</th></tr>' +
        items.map(i =>
          '<tr onclick="App.schedSheet(\'' + i.id + '\')"><td class="tm">' + esc(i.time || "-") + "</td>" +
          "<td style=\"font-weight:600\">" + esc(i.title) + "</td>" +
          "<td style=\"color:var(--text3)\">" + esc(i.place || "") + (i.memo ? "<br>" + esc(i.memo) : "") + "</td></tr>").join("") +
        "</table>";
    } else {
      body = items.map((i, idx) => {
        let html =
          '<button class="sch-card" onclick="App.schedSheet(\'' + i.id + '\')">' +
          '<div class="tm">' + esc(i.time || "--:--") + '</div>' +
          "<div><div class=\"nm\">" + esc(i.title) + "</div>" +
          (i.place ? '<div class="pl">' + esc(i.place) + "</div>" : "") +
          (i.memo ? '<div class="memo">' + esc(i.memo) + "</div>" : "") +
          "</div></button>";
        const next = items[idx + 1];
        if (next) html += transitRow(i, next, idx);
        return html;
      }).join("");
    }

    view().innerHTML =
      '<div class="appbar"><span class="tt">일정</span>' +
      '<button class="chip" onclick="App.toggleSchedView()">' + (U.schedView === "table" ? "타임라인 보기" : "표로 보기") + "</button></div>" +
      '<div class="day-tabs">' +
      dates.map((d, i) =>
        '<button class="day-tab' + (i === U.schedDay ? " on" : "") + '" onclick="App.setSchedDay(' + i + ')">' +
        (i + 1) + "일차<strong>" + fmtMDW(d) + "</strong></button>").join("") +
      "</div>" + body;

    addFab(() => App.schedSheet());
    if (U.schedView === "timeline") fetchTransits(items);
  }

  function transitRow(a, b, idx) {
    const hasCoords = a.lat && a.lng && b.lat && b.lng;
    if (!hasCoords) {
      // 좌표가 없으면 장소 이름으로 구글맵 딥링크
      if (!(a.place || a.title) || !(b.place || b.title)) return "";
      const link = Maps.mapsLink({ name: a.place || a.title }, { name: b.place || b.title }, "TRANSIT");
      return '<a class="transit" style="text-decoration:none" href="' + link + '" target="_blank" rel="noopener">' +
        icon("walk") + '이동 경로<span class="go">구글맵에서 보기</span></a>';
    }
    if (!Maps.hasKey()) {
      const link = Maps.mapsLink(a, b, "TRANSIT");
      return '<a class="transit" style="text-decoration:none" href="' + link + '" target="_blank" rel="noopener">' +
        icon("transit") + '이동 경로<span class="go">구글맵에서 보기</span></a>';
    }
    return '<button class="transit" id="tr-' + idx + '" onclick="App.openRoute(\'' + a.id + "','" + b.id + '\')">' +
      '<span id="tr-ico-' + idx + '">' + icon("transit") + "</span>" +
      '<span id="tr-txt-' + idx + '">이동 시간 확인 중…</span><span class="go">경로 보기</span></button>';
  }

  // "1시간 20분" → 80
  function parseMinutes(t) {
    if (!t) return 9999;
    const h = /(\d+)\s*시간/.exec(t), m = /(\d+)\s*분/.exec(t);
    return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
  }

  const MODE_LABEL = { TRANSIT: "대중교통", WALKING: "도보", DRIVING: "차량" };
  const MODE_ICON = { TRANSIT: "transit", WALKING: "walk", DRIVING: "car" };

  // 대중교통 → (없으면) 도보 → (멀면) 차량 순으로 자동 대체
  // 일본 등 일부 국가는 구글 지도 API가 대중교통 정보를 제공하지 않습니다.
  function bestRoute(o, d) {
    return Maps.getRouteSummary(o, d, "TRANSIT").then(t => {
      if (t && !t.none) return t;
      return Maps.getRouteSummary(o, d, "WALKING").then(w => {
        if (w && !w.none && parseMinutes(w.duration) <= 25) return w;
        return Maps.getRouteSummary(o, d, "DRIVING").then(c => (c && !c.none) ? c : w);
      });
    });
  }

  function fetchTransits(items) {
    items.forEach((a, idx) => {
      const b = items[idx + 1];
      if (!b || !(a.lat && a.lng && b.lat && b.lng) || !Maps.hasKey()) return;
      bestRoute({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }).then(sum => {
        const el = $("tr-txt-" + idx), ic = $("tr-ico-" + idx);
        if (!el) return;
        if (!sum || sum.none) { el.textContent = "이동 정보 없음"; return; }
        if (ic) ic.innerHTML = icon(MODE_ICON[sum.mode] || "transit");
        el.textContent = (MODE_LABEL[sum.mode] || "") + " " + sum.duration +
          (sum.fare ? " · " + sum.fare : (sum.distance ? " · " + sum.distance : ""));
      });
    });
  }

  /* ---- 경로 상세 오버레이 ---- */

  function openRoute(aId, bId) {
    const trip = Store.S.trip;
    const a = trip.schedule.find(i => i.id === aId);
    const b = trip.schedule.find(i => i.id === bId);
    if (!a || !b) return;
    U.routeMode = "TRANSIT";
    const ov = $("route-overlay");
    ov.classList.remove("hidden");
    renderRoute(a, b);
  }

  // 지도 자리에 구글맵 화면을 그대로 띄움 (Maps Embed API — 무료·무제한)
  function showEmbed(a, b, mode) {
    const el = $("ro-map");
    if (!el) return;
    el.style.height = "440px";
    el.innerHTML = '<iframe src="' + esc(Maps.embedDirections(a, b, mode)) + '" ' +
      'style="width:100%; height:100%; border:0" loading="lazy" allowfullscreen ' +
      'referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  }

  function renderRoute(a, b) {
    const ov = $("route-overlay");
    const modes = [["TRANSIT", "대중교통"], ["DRIVING", "차량"], ["WALKING", "도보"]];
    ov.innerHTML =
      '<div class="ro-head">' +
      '<button onclick="App.closeRoute()">' + icon("back") + "</button>" +
      "<div><div class=\"tt\">" + esc(a.place || a.title) + " → " + esc(b.place || b.title) + "</div>" +
      '<div class="st">' + fmtMDW(a.date) + " · " + esc(a.time || "") + " 일정에서 이동</div></div></div>" +
      '<div class="ro-map" id="ro-map"></div>' +
      '<div class="mode-tabs">' +
      modes.map(m => '<button class="' + (U.routeMode === m[0] ? "on" : "") + '" onclick="App.setRouteMode(\'' + m[0] + "','" + a.id + "','" + b.id + '\')">' + m[1] + "</button>").join("") +
      "</div>" +
      '<div class="card" id="ro-detail"><div class="empty" style="padding:24px 0">경로를 불러오는 중…</div></div>' +
      '<a class="btn ghost" style="text-decoration:none" href="' + Maps.mapsLink(a, b, U.routeMode) + '" target="_blank" rel="noopener">구글맵 앱에서 열기</a>';

    Maps.getRouteFull({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng }, U.routeMode).then(res => {
      const det = $("ro-detail");
      if (!det) return;
      if (!res) {
        if (U.routeMode === "TRANSIT") {
          // 경로 API가 대중교통을 제공하지 않는 지역 → 구글맵 화면을 그대로 임베드
          showEmbed(a, b, "TRANSIT");
          det.innerHTML =
            '<div class="label" style="margin-bottom:6px">구글 지도 대중교통 경로</div>' +
            '<div style="font-size:13px; color:var(--text2); line-height:1.6">' +
            '위 지도에서 출발 시각, 환승, 소요 시간을 확인할 수 있어요.<br>' +
            '더 자세히 보려면 아래 <b>구글맵 앱에서 열기</b>를 누르세요.</div>';
        } else {
          det.innerHTML = '<div class="empty" style="padding:24px 0">이 수단의 경로를 찾지 못했어요</div>';
        }
        return;
      }
      Maps.drawRoute($("ro-map"), res);
      const leg = res.routes[0].legs[0];
      const fare = res.routes[0].fare ? " · " + res.routes[0].fare.text : "";
      const steps = Maps.parseSteps(res);
      det.innerHTML =
        '<div style="font-size:18px; font-weight:800; margin-bottom:6px">' + leg.duration.text +
        ' <span style="font-size:14px; color:var(--text3); font-weight:600">· ' + leg.distance.text + fare + "</span></div>" +
        steps.map(s =>
          '<div class="step"><div class="dot' + (s.type === "walk" ? " gray" : "") + '"></div>' +
          "<div><div class=\"t1\">" + esc(s.main) + '</div><div class="t2">' + esc(s.sub) + "</div></div></div>").join("");
    });
  }

  /* ================= 가계부 ================= */

  function rateChip(trip) {
    if (trip.currency === "KRW" || !U.rate) return "";
    const per100 = U.rate < 20;
    const v = per100 ? U.rate * 100 : U.rate;
    return '<span class="chip">' + (per100 ? "100" : "1") + curSym(trip.currency) + " = " + comma(v) + "원</span>";
  }

  function renderBudget() {
    const trip = Store.S.trip;
    const st = spendStats(trip);
    const dates = dateList(trip);

    // 일자별 막대
    const byDay = dates.map(d => ({
      d, sum: trip.expenses.filter(e => e.date === d).reduce((s, e) => s + (e.krw || 0), 0)
    }));
    const others = trip.expenses.filter(e => !dates.includes(e.date))
      .reduce((s, e) => s + (e.krw || 0), 0);
    if (others > 0) byDay.unshift({ d: "사전 지출", sum: others, pre: true });
    const max = Math.max(...byDay.map(x => x.sum), 1);
    const maxIdx = byDay.reduce((mi, x, i) => x.sum > byDay[mi].sum ? i : mi, 0);
    const bars = byDay.map((x, i) =>
      '<div class="col"><div class="bar' + (i === maxIdx && x.sum > 0 ? " hot" : "") + '" style="height:' + Math.round(x.sum / max * 100) + '%"></div>' +
      '<div class="cap">' + (x.pre ? "사전" : fmtMD(x.d)) + "</div></div>").join("");

    // 날짜별 그룹 목록
    const groups = {};
    trip.expenses.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0))
      .forEach(e => { (groups[e.date] = groups[e.date] || []).push(e); });

    const listHTML = Object.keys(groups).length
      ? Object.entries(groups).map(([date, arr]) =>
        '<div class="card"><div class="label" style="margin-bottom:4px">' + fmtMDW(date) + "</div>" +
        arr.map(e =>
          '<button class="list-row" onclick="App.expSheet(\'' + e.id + '\')">' +
          '<div class="cat-ico">' + icon(CAT_ICON[e.category] || "etc") + "</div>" +
          '<div style="flex:1; min-width:0"><div class="exp-name">' + esc(e.title) + '</div>' +
          '<div class="exp-sub">' + esc(e.category || "기타") + " · " + esc(e.method || "카드") + "</div></div>" +
          "<div><div class=\"exp-amt\">" + curSym(e.currency || trip.currency) + " " + comma(e.amount) + "</div>" +
          (e.krw != null && (e.currency || trip.currency) !== "KRW" ? '<div class="exp-krw">' + fmtKRW(e.krw) + "</div>" : "") +
          "</div></button>").join("") +
        "</div>").join("")
      : '<div class="empty">아직 지출 기록이 없어요<br>오른쪽 아래 + 버튼으로 추가하세요</div>';

    view().innerHTML =
      '<div class="appbar"><span class="tt">가계부</span>' + rateChip(trip) + "</div>" +
      '<div class="card"><div class="label">지금까지 쓴 돈</div>' +
      '<div class="big red">' + fmtKRW(st.total) + "</div>" +
      '<div class="bar-meta" style="margin-top:6px"><span>오늘 ' + fmtKRW(st.today) + "</span><span>하루 평균 " + fmtKRW(st.avg) + "</span></div>" +
      (st.total > 0 ? '<div class="chart">' + bars + "</div>" : "") +
      donutBlock(trip, "border-top:1px solid var(--line2); padding-top:16px") +
      "</div>" + listHTML;

    addFab(() => App.expSheet());
  }

  /* ================= 체크리스트 ================= */

  function renderCheck() {
    const trip = Store.S.trip;
    const members = trip.memberNames || ["나"];
    if (U.checkFilter !== "all" && !members.includes(U.checkFilter)) U.checkFilter = "all";
    const all = trip.checklist;
    const shown = U.checkFilter === "all" ? all : all.filter(c => c.assignee === U.checkFilter);
    const done = shown.filter(c => c.done).length;
    const pct = shown.length ? Math.round(done / shown.length * 100) : 0;

    const cnt = name => {
      const arr = name === "all" ? all : all.filter(c => c.assignee === name);
      return arr.filter(c => c.done).length + "/" + arr.length;
    };

    const sections = {};
    shown.forEach(c => { (sections[c.section] = sections[c.section] || []).push(c); });

    view().innerHTML =
      '<div class="appbar"><span class="tt">체크리스트</span>' +
      '<span class="chip blue">' + all.filter(c => c.done).length + " / " + all.length + "</span></div>" +
      '<div class="member-chips">' +
      '<button class="mchip' + (U.checkFilter === "all" ? " on" : "") + '" onclick="App.setCheckFilter(\'all\')">전체<small>' + cnt("all") + "</small></button>" +
      members.map(m =>
        '<button class="mchip' + (U.checkFilter === m ? " on" : "") + '" onclick="App.setCheckFilter(\'' + esc(m) + '\')">' + esc(m) + "<small>" + cnt(m) + "</small></button>").join("") +
      "</div>" +
      '<div class="card" style="padding:16px 20px">' +
      '<div class="bar-track" style="margin-top:0"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="bar-meta"><span>준비 완료 ' + done + "개</span><span>남은 항목 " + (shown.length - done) + "개</span></div></div>" +
      (Object.keys(sections).length
        ? Object.entries(sections).map(([sec, arr]) =>
          '<div class="sec-title">' + esc(sec) + '</div><div class="card" style="padding:6px 20px">' +
          arr.map(c =>
            '<div class="chk-row' + (c.done ? " off" : "") + '">' +
            '<button class="chk' + (c.done ? " done" : "") + '" onclick="App.toggleCheck(\'' + c.id + '\')"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></button>' +
            '<button class="nm" style="background:none; text-align:left; font-size:15px; font-weight:600" onclick="App.chkSheet(\'' + c.id + '\')">' + esc(c.name) + "</button>" +
            '<span class="assignee' + (c.assignee === Store.S.user.name || c.assignee === "나" ? " me" : "") + '">' + esc(c.assignee) + "</span></div>").join("") +
          "</div>").join("")
        : '<div class="empty">표시할 항목이 없어요</div>');

    addFab(() => App.chkSheet());
  }

  /* ================= 보관함 ================= */

  function renderDocs() {
    const trip = Store.S.trip;
    view().innerHTML =
      '<div class="appbar"><span class="tt">보관함</span></div>' +
      (trip.documents.length
        ? trip.documents.map(d =>
          '<button class="card" style="width:100%; text-align:left" onclick="App.docSheet(\'' + d.id + '\')">' +
          '<div class="doc-head"><div class="cat-ico">' + icon(d.icon || "note") + "</div>" +
          "<div><div class=\"tt\">" + esc(d.title) + '</div>' +
          (d.subtitle ? '<div class="st">' + esc(d.subtitle) + "</div>" : "") + "</div></div>" +
          (d.rows || []).map(r =>
            '<div class="kv"><span class="k">' + esc(r.k) + '</span><span class="v">' + esc(r.v) + "</span></div>").join("") +
          "</button>").join("")
        : '<div class="empty">저장된 문서가 없어요<br>오른쪽 아래 + 버튼으로 추가하세요</div>');
    addFab(() => App.docSheet());
  }

  /* ================= 바텀시트 ================= */

  function sheet(html) {
    $("sheet").innerHTML = '<div class="sheet-handle"></div>' + html;
    $("sheet").classList.remove("hidden");
    $("sheet-backdrop").classList.remove("hidden");
  }
  function closeSheet() {
    $("sheet").classList.add("hidden");
    $("sheet-backdrop").classList.add("hidden");
  }

  /* ---- 여행 만들기 / 목록 / 참여 ---- */

  function tripCreateSheet(existing) {
    const t = existing ? Store.S.trip : null;
    sheet(
      '<div class="sheet-title">' + (t ? "여행 정보 수정" : "새 여행 만들기") + "</div>" +
      "<label>여행 이름</label>" +
      '<input id="f-name" placeholder="예: 오사카 여행" value="' + esc(t ? t.name : "") + '">' +
      '<div class="grid2"><div><label>출발일</label><input type="date" id="f-start" value="' + (t ? t.startDate : "") + '"></div>' +
      "<div><label>도착일(귀국)</label><input type=\"date\" id=\"f-end\" value=\"" + (t ? t.endDate : "") + '"></div></div>' +
      "<label>현지 통화</label>" +
      '<select id="f-cur">' +
      CURRENCIES.map(c => '<option value="' + c[0] + '"' + ((t ? t.currency : "JPY") === c[0] ? " selected" : "") + ">" + c[1] + " (" + c[2] + ")</option>").join("") +
      "</select>" +
      '<div class="sheet-actions"><button class="btn ghost" onclick="App.closeSheet()">취소</button>' +
      '<button class="btn" onclick="App.saveTrip(' + (t ? "true" : "false") + ')">저장</button></div>'
    );
  }

  function saveTrip(isEdit) {
    const name = $("f-name").value.trim();
    const s = $("f-start").value, e = $("f-end").value;
    if (!name || !s || !e) { alert("이름과 날짜를 모두 입력해주세요."); return; }
    if (e < s) { alert("도착일이 출발일보다 빠를 수 없어요."); return; }
    if (isEdit) {
      Store.update(t => { t.name = name; t.startDate = s; t.endDate = e; t.currency = $("f-cur").value; });
    } else {
      Store.createTrip({ name, city: name, startDate: s, endDate: e, currency: $("f-cur").value });
    }
    U.rate = null;
    closeSheet();
  }

  function tripListSheet() {
    const S = Store.S;
    sheet(
      '<div class="sheet-title">내 여행</div>' +
      S.tripList.map(t =>
        '<button class="pick-row" onclick="App.pickTrip(\'' + t.id + '\')">' +
        "<div style=\"flex:1\"><div class=\"nm\">" + esc(t.name) + '</div>' +
        '<div class="sub">' + (t.startDate || "") + " ~ " + (t.endDate || "") + "</div></div>" +
        (t.id === S.tripId ? '<span class="chip blue">현재</span>' : "") + "</button>").join("") +
      '<div class="sheet-actions"><button class="btn" onclick="App.closeSheet(); App.tripCreateSheet()">새 여행 만들기</button></div>' +
      (S.mode === "cloud" ? '<button class="btn ghost" style="margin-top:10px" onclick="App.closeSheet(); App.joinSheet()">공유 링크로 열기</button>' : "")
    );
  }
  function pickTrip(id) { Store.switchTrip(id); U.rate = null; U.schedDay = 0; closeSheet(); }

  function joinSheet() {
    sheet(
      '<div class="sheet-title">공유 링크로 열기</div>' +
      '<div class="sheet-sub">동행자에게 받은 공유 링크를 붙여넣으면 같은 여행을 함께 편집할 수 있어요. 보통은 링크를 누르기만 하면 바로 열립니다.</div>' +
      "<label>공유 링크</label><input id=\"f-code\" placeholder=\"https://... #t=...\">" +
      '<div class="sheet-actions"><button class="btn ghost" onclick="App.closeSheet()">취소</button>' +
      '<button class="btn" onclick="App.doJoin()">열기</button></div>'
    );
  }
  async function doJoin() {
    const r = await Store.joinTrip($("f-code").value);
    if (r.ok) closeSheet(); else alert(r.msg);
  }

  function shareSheet() {
    const S = Store.S, trip = S.trip;
    const link = Store.shareLink();
    sheet(
      '<div class="sheet-title">동행자와 공유</div>' +
      (S.mode === "cloud"
        ? '<div class="sheet-sub">아래 링크를 카톡 등으로 보내주세요. <b>동행자는 로그인 없이 링크만 누르면</b> 바로 같은 여행을 보고 함께 편집할 수 있어요.</div>' +
          '<div class="code-box" style="font-size:12px; letter-spacing:0">' + esc(link) + "</div>" +
          '<div class="sheet-actions"><button class="btn" onclick="App.copyCode()">링크 복사</button></div>' +
          '<div class="sheet-sub" style="margin-top:14px">링크를 아는 사람은 누구나 열 수 있으니 동행자에게만 보내주세요.</div>'
        : '<div class="sheet-sub">링크 공유는 클라우드 동기화(Firebase) 설정 후 사용할 수 있어요. SETUP 안내를 참고해주세요.<br><br>지금은 체크리스트 구성원만 추가해 항목을 나눠 관리할 수 있습니다.</div>') +
      "<label>내 이름 (체크리스트 담당자 표시용)</label>" +
      '<div style="display:flex; gap:8px"><input id="f-myname" value="' + esc(S.user.name) + '" placeholder="예: 김지훈">' +
      '<button class="btn sm" style="width:90px" onclick="App.saveMyName()">저장</button></div>' +
      "<label>체크리스트 구성원</label>" +
      '<div class="cat-chips" style="margin-bottom:4px">' +
      (trip.memberNames || ["나"]).map(m =>
        '<button onclick="App.removeMember(\'' + esc(m) + '\')">' + esc(m) + (m !== "나" ? " ×" : "") + "</button>").join("") +
      "</div>" +
      '<div style="display:flex; gap:8px; margin-top:10px"><input id="f-member" placeholder="이름 추가 (예: 김수현)">' +
      '<button class="btn sm" style="width:90px" onclick="App.addMember()">추가</button></div>' +
      '<div class="sheet-actions"><button class="btn ghost" onclick="App.closeSheet()">닫기</button></div>'
    );
  }
  function copyCode() {
    const link = Store.shareLink();
    if (navigator.share) {
      navigator.share({ title: Store.S.trip.name, url: link }).catch(() => {});
      return;
    }
    (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject())
      .then(() => alert("공유 링크가 복사되었습니다."))
      .catch(() => prompt("아래 링크를 길게 눌러 복사하세요", link));
  }
  function saveMyName() {
    const n = $("f-myname").value.trim();
    if (!n) return;
    Store.setMyName(n);
    Store.update(t => {
      t.memberNames = t.memberNames || ["나"];
      if (!t.memberNames.includes(n)) t.memberNames.push(n);
    });
    shareSheet();
  }
  function addMember() {
    const name = $("f-member").value.trim();
    if (!name) return;
    Store.update(t => {
      t.memberNames = t.memberNames || ["나"];
      if (!t.memberNames.includes(name)) t.memberNames.push(name);
    });
    shareSheet();
  }
  function removeMember(name) {
    if (name === "나") return;
    if (!confirm('"' + name + '" 구성원을 빼시겠어요? 담당 항목은 "나"로 옮겨집니다.')) return;
    Store.update(t => {
      t.memberNames = (t.memberNames || []).filter(m => m !== name);
      t.checklist.forEach(c => { if (c.assignee === name) c.assignee = "나"; });
    });
    shareSheet();
  }

  function settingsSheet() {
    const S = Store.S;
    sheet(
      '<div class="sheet-title">설정</div>' +
      '<button class="pick-row" onclick="App.closeSheet(); App.tripCreateSheet(true)"><div class="nm">여행 정보 수정</div></button>' +
      '<button class="pick-row" onclick="App.closeSheet(); App.photoSheet()"><div class="nm">홈 화면 사진 바꾸기</div></button>' +
      '<button class="pick-row" onclick="App.closeSheet(); App.shareSheet()"><div class="nm">동행자 · 구성원 관리</div></button>' +
      '<button class="pick-row" onclick="Store.exportData()"><div class="nm">데이터 백업 (파일 저장)</div></button>' +
      '<button class="pick-row" onclick="App.importSheet()"><div class="nm">백업 불러오기</div></button>' +
      (S.mode === "cloud" ? '<button class="pick-row" onclick="App.closeSheet(); App.joinSheet()"><div class="nm">공유 링크로 열기</div></button>' : "") +
      '<button class="pick-row" onclick="App.deleteTripConfirm()"><div class="nm" style="color:var(--red)">이 여행 삭제</div></button>' +
      '<div class="sheet-actions"><button class="btn ghost" onclick="App.closeSheet()">닫기</button></div>'
    );
  }
  function deleteTripConfirm() {
    const t = Store.S.trip;
    if (!confirm('"' + t.name + '" 여행을 삭제할까요? 일정·가계부·체크리스트가 모두 지워집니다.')) return;
    Store.deleteTrip(t.id);
    closeSheet();
  }
  /* ---- 홈 화면 사진 ---- */

  function photoSheet() {
    const trip = Store.S.trip;
    sheet(
      '<div class="sheet-title">홈 화면 사진 바꾸기</div>' +
      '<div class="sheet-sub">여행지 사진을 골라주세요. 자동으로 줄여서 저장되니 용량 걱정 없이 고르시면 됩니다.</div>' +
      '<div class="hero" style="height:130px; margin:14px 0">' + heroBG(trip) + "</div>" +
      '<input type="file" id="f-photo" accept="image/*" style="padding:10px" onchange="App.applyPhoto()">' +
      '<div class="sheet-actions">' +
      (trip.photo ? '<button class="btn danger" onclick="App.clearPhoto()">기본 그림으로</button>' : "") +
      '<button class="btn ghost" onclick="App.closeSheet()">닫기</button></div>'
    );
  }

  function applyPhoto() {
    const f = $("f-photo").files[0];
    if (!f) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    img.onload = () => {
      const W = 750, H = 380;                       // 홈 이미지 비율에 맞춰 잘라내기
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const scale = Math.max(W / img.width, H / img.height);
      const w = img.width * scale, h = img.height * scale;
      cv.getContext("2d").drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      const data = cv.toDataURL("image/jpeg", 0.72);
      if (data.length > 900000) { alert("사진 용량이 너무 큽니다. 다른 사진을 골라주세요."); return; }
      Store.update(t => { t.photo = data; });
      photoSheet();
    };
    img.onerror = () => alert("사진을 읽을 수 없습니다.");
    reader.readAsDataURL(f);
  }

  function clearPhoto() {
    Store.update(t => { delete t.photo; });
    photoSheet();
  }

  function importSheet() {
    sheet(
      '<div class="sheet-title">백업 불러오기</div>' +
      '<div class="sheet-sub">백업 파일(.json)을 선택하면 여행 데이터를 복원합니다.</div>' +
      '<input type="file" id="f-import" accept=".json,application/json" style="padding:10px">' +
      '<div class="sheet-actions"><button class="btn ghost" onclick="App.closeSheet()">취소</button>' +
      '<button class="btn" onclick="App.doImport()">불러오기</button></div>'
    );
  }
  function doImport() {
    const f = $("f-import").files[0];
    if (!f) { alert("파일을 선택해주세요."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      if (Store.importData(reader.result)) { alert("복원되었습니다."); closeSheet(); }
      else alert("파일을 읽을 수 없습니다.");
    };
    reader.readAsText(f);
  }

  /* ---- 일정 추가/수정 ---- */

  function schedSheet(id) {
    const trip = Store.S.trip;
    const item = id ? trip.schedule.find(i => i.id === id) : null;
    const dates = dateList(trip);
    const defDate = item ? item.date : dates[U.schedDay];
    sheet(
      '<div class="sheet-title">' + (item ? "일정 수정" : "일정 추가") + "</div>" +
      '<div class="grid2"><div><label>날짜</label><select id="f-date">' +
      dates.map((d, i) => '<option value="' + d + '"' + (d === defDate ? " selected" : "") + ">" + (i + 1) + "일차 · " + fmtMDW(d) + "</option>").join("") +
      "</select></div>" +
      "<div><label>시간</label><input type=\"time\" id=\"f-time\" value=\"" + esc(item ? item.time : "") + '"></div></div>' +
      "<label>일정 이름</label><input id=\"f-title\" placeholder=\"예: 도톤보리 구경\" value=\"" + esc(item ? item.title : "") + '">' +
      "<label>장소" + (Maps.hasKey() ? " (검색하면 자동완성됩니다)" : "") + "</label>" +
      '<input id="f-place" placeholder="예: 글리코상" value="' + esc(item ? item.place : "") + '" autocomplete="off">' +
      "<label>메모</label><input id=\"f-memo\" placeholder=\"예약번호, 참고사항 등\" value=\"" + esc(item ? item.memo : "") + '">' +
      '<div class="sheet-actions">' +
      (item ? '<button class="btn danger" onclick="App.deleteSched(\'' + item.id + '\')">삭제</button>' : '<button class="btn ghost" onclick="App.closeSheet()">취소</button>') +
      '<button class="btn" onclick="App.saveSched(' + (item ? "'" + item.id + "'" : "null") + ')">저장</button></div>'
    );
    // 장소 자동완성 (API 키가 있을 때)
    U.pickedPlace = null;
    Maps.attachAutocomplete($("f-place"), p => { U.pickedPlace = p; });
  }

  function saveSched(id) {
    const title = $("f-title").value.trim();
    if (!title) { alert("일정 이름을 입력해주세요."); return; }
    const vals = {
      date: $("f-date").value, time: $("f-time").value,
      title, place: $("f-place").value.trim(), memo: $("f-memo").value.trim()
    };
    Store.update(t => {
      if (id) {
        const it = t.schedule.find(i => i.id === id);
        if (!it) return;
        // 장소 텍스트가 바뀌었는데 자동완성 좌표가 없으면 기존 좌표 무효화
        if (U.pickedPlace) { it.lat = U.pickedPlace.lat; it.lng = U.pickedPlace.lng; }
        else if (it.place !== vals.place) { delete it.lat; delete it.lng; }
        Object.assign(it, vals);
      } else {
        const it = Object.assign({ id: Store.uid(), createdAt: Date.now() }, vals);
        if (U.pickedPlace) { it.lat = U.pickedPlace.lat; it.lng = U.pickedPlace.lng; }
        t.schedule.push(it);
      }
    });
    closeSheet();
  }
  function deleteSched(id) {
    Store.update(t => { t.schedule = t.schedule.filter(i => i.id !== id); });
    closeSheet();
  }

  /* ---- 지출 추가/수정 ---- */

  function expSheet(id) {
    const trip = Store.S.trip;
    const item = id ? trip.expenses.find(e => e.id === id) : null;
    const dates = dateList(trip);
    const today = todayStr();
    const defDate = item ? item.date : (dates.includes(today) ? today : dates[0]);
    U.expCat = item ? (item.category || "기타") : "식비";
    sheet(
      '<div class="sheet-title">' + (item ? "지출 수정" : "지출 추가") + "</div>" +
      "<label>날짜</label><select id=\"f-date\">" +
      dates.map((d, i) => '<option value="' + d + '"' + (d === defDate ? " selected" : "") + ">" + (i + 1) + "일차 · " + fmtMDW(d) + "</option>").join("") +
      '<option value="' + today + '"' + (!dates.includes(defDate) ? " selected" : "") + ">사전 지출 (오늘)</option>" +
      "</select>" +
      "<label>내용</label><input id=\"f-title\" placeholder=\"예: 이치란 라멘\" value=\"" + esc(item ? item.title : "") + '">' +
      "<label>카테고리</label>" +
      '<div class="cat-chips" id="f-cats">' +
      CATS.map(c => '<button class="' + (U.expCat === c ? "on" : "") + '" onclick="App.pickCat(\'' + c + '\')">' + c + "</button>").join("") +
      "</div>" +
      '<div class="grid2"><div><label>금액 (' + esc(trip.currency) + " " + curSym(trip.currency) + ')</label>' +
      '<input type="number" inputmode="decimal" id="f-amount" placeholder="0" value="' + (item ? item.amount : "") + '" oninput="App.previewKRW()"></div>' +
      "<div><label>결제 수단</label><select id=\"f-method\">" +
      ["카드", "현금", "기타"].map(m => "<option" + (item && item.method === m ? " selected" : "") + ">" + m + "</option>").join("") +
      "</select></div></div>" +
      '<div class="sheet-sub" id="f-krw-preview" style="margin-top:8px"></div>' +
      '<div class="sheet-actions">' +
      (item ? '<button class="btn danger" onclick="App.deleteExp(\'' + item.id + '\')">삭제</button>' : '<button class="btn ghost" onclick="App.closeSheet()">취소</button>') +
      '<button class="btn" onclick="App.saveExp(' + (item ? "'" + item.id + "'" : "null") + ')">저장</button></div>'
    );
    previewKRW();
  }
  function pickCat(c) {
    U.expCat = c;
    document.querySelectorAll("#f-cats button").forEach(b => b.classList.toggle("on", b.textContent === c));
  }
  function previewKRW() {
    const el = $("f-krw-preview");
    if (!el) return;
    const trip = Store.S.trip;
    const amt = parseFloat($("f-amount").value) || 0;
    if (trip.currency === "KRW") { el.textContent = ""; return; }
    el.textContent = (U.rate && amt)
      ? "원화 환산: 약 " + fmtKRW(amt * U.rate) + " (자동 환율 적용)"
      : (U.rate ? "" : "환율 정보를 불러오지 못해 원화 환산 없이 저장됩니다.");
  }
  function saveExp(id) {
    const title = $("f-title").value.trim();
    const amt = parseFloat($("f-amount").value);
    if (!title || !amt) { alert("내용과 금액을 입력해주세요."); return; }
    const trip = Store.S.trip;
    const krw = trip.currency === "KRW" ? amt : (U.rate ? amt * U.rate : null);
    const vals = {
      date: $("f-date").value, title, category: U.expCat,
      amount: amt, currency: trip.currency, krw, method: $("f-method").value
    };
    Store.update(t => {
      if (id) {
        const it = t.expenses.find(e => e.id === id);
        if (it) Object.assign(it, vals);
      } else {
        t.expenses.push(Object.assign({ id: Store.uid(), createdAt: Date.now() }, vals));
      }
    });
    closeSheet();
  }
  function deleteExp(id) {
    Store.update(t => { t.expenses = t.expenses.filter(e => e.id !== id); });
    closeSheet();
  }

  /* ---- 체크리스트 추가/수정 ---- */

  function chkSheet(id) {
    const trip = Store.S.trip;
    const item = id ? trip.checklist.find(c => c.id === id) : null;
    const sections = [...new Set(trip.checklist.map(c => c.section))];
    if (!sections.length) sections.push("필수 준비물");
    const members = trip.memberNames || ["나"];
    sheet(
      '<div class="sheet-title">' + (item ? "항목 수정" : "체크리스트 추가") + "</div>" +
      "<label>항목 이름</label><input id=\"f-name\" placeholder=\"예: 보조배터리\" value=\"" + esc(item ? item.name : "") + '">' +
      '<div class="grid2"><div><label>구분</label><select id="f-section">' +
      sections.map(s => "<option" + (item && item.section === s ? " selected" : "") + ">" + esc(s) + "</option>").join("") +
      "<option value=\"__new__\">+ 새 구분 만들기</option></select></div>" +
      "<div><label>담당자</label><select id=\"f-assignee\">" +
      members.map(m => "<option" + (item && item.assignee === m ? " selected" : "") + ">" + esc(m) + "</option>").join("") +
      "</select></div></div>" +
      '<div id="f-newsec-wrap" class="hidden"><label>새 구분 이름</label><input id="f-newsec" placeholder="예: 쇼핑 리스트"></div>' +
      '<div class="sheet-actions">' +
      (item ? '<button class="btn danger" onclick="App.deleteChk(\'' + item.id + '\')">삭제</button>' : '<button class="btn ghost" onclick="App.closeSheet()">취소</button>') +
      '<button class="btn" onclick="App.saveChk(' + (item ? "'" + item.id + "'" : "null") + ')">저장</button></div>'
    );
    $("f-section").addEventListener("change", e => {
      $("f-newsec-wrap").classList.toggle("hidden", e.target.value !== "__new__");
    });
  }
  function saveChk(id) {
    const name = $("f-name").value.trim();
    if (!name) { alert("항목 이름을 입력해주세요."); return; }
    let section = $("f-section").value;
    if (section === "__new__") {
      section = $("f-newsec").value.trim() || "기타";
    }
    const assignee = $("f-assignee").value;
    Store.update(t => {
      if (id) {
        const it = t.checklist.find(c => c.id === id);
        if (it) Object.assign(it, { name, section, assignee });
      } else {
        t.checklist.push({ id: Store.uid(), name, section, assignee, done: false });
      }
    });
    closeSheet();
  }
  function toggleCheck(id) {
    Store.update(t => {
      const it = t.checklist.find(c => c.id === id);
      if (it) it.done = !it.done;
    });
  }
  function deleteChk(id) {
    Store.update(t => { t.checklist = t.checklist.filter(c => c.id !== id); });
    closeSheet();
  }

  /* ---- 보관함 추가/수정 ---- */

  function docSheet(id) {
    const trip = Store.S.trip;
    const item = id ? trip.documents.find(d => d.id === id) : null;
    const presets = [["flight", "항공권"], ["hotel", "숙소"], ["phone", "긴급 연락처"], ["note", "기타 메모"]];
    U.docIcon = item ? (item.icon || "note") : "flight";
    const rowsText = item
      ? (item.rows || []).map(r => r.k + " | " + r.v).join("\n")
      : "예약번호 | \n체크인 | ";
    sheet(
      '<div class="sheet-title">' + (item ? "문서 수정" : "문서 추가") + "</div>" +
      "<label>종류</label>" +
      '<div class="cat-chips" id="f-doctypes">' +
      presets.map(p => '<button class="' + (U.docIcon === p[0] ? "on" : "") + '" onclick="App.pickDocIcon(\'' + p[0] + '\')">' + p[1] + "</button>").join("") +
      "</div>" +
      "<label>제목</label><input id=\"f-title\" placeholder=\"예: 항공권\" value=\"" + esc(item ? item.title : "") + '">' +
      "<label>부제목 (선택)</label><input id=\"f-sub\" placeholder=\"예: 대한항공\" value=\"" + esc(item ? item.subtitle : "") + '">' +
      "<label>내용 — 한 줄에 하나씩, \"항목 | 내용\" 형식</label>" +
      '<textarea id="f-rows" rows="5" style="resize:vertical">' + esc(rowsText) + "</textarea>" +
      '<div class="sheet-actions">' +
      (item ? '<button class="btn danger" onclick="App.deleteDoc(\'' + item.id + '\')">삭제</button>' : '<button class="btn ghost" onclick="App.closeSheet()">취소</button>') +
      '<button class="btn" onclick="App.saveDoc(' + (item ? "'" + item.id + "'" : "null") + ')">저장</button></div>'
    );
  }
  function pickDocIcon(ic) {
    U.docIcon = ic;
    const names = { flight: "항공권", hotel: "숙소", phone: "긴급 연락처", note: "기타 메모" };
    document.querySelectorAll("#f-doctypes button").forEach(b =>
      b.classList.toggle("on", b.textContent === names[ic]));
    if ($("f-title") && !$("f-title").value) $("f-title").value = names[ic];
  }
  function saveDoc(id) {
    const title = $("f-title").value.trim();
    if (!title) { alert("제목을 입력해주세요."); return; }
    const rows = $("f-rows").value.split("\n").map(line => {
      const i = line.indexOf("|");
      if (i < 0) return line.trim() ? { k: line.trim(), v: "" } : null;
      return { k: line.slice(0, i).trim(), v: line.slice(i + 1).trim() };
    }).filter(r => r && (r.k || r.v));
    const vals = { title, subtitle: $("f-sub").value.trim(), icon: U.docIcon, rows };
    Store.update(t => {
      if (id) {
        const it = t.documents.find(d => d.id === id);
        if (it) Object.assign(it, vals);
      } else {
        t.documents.push(Object.assign({ id: Store.uid() }, vals));
      }
    });
    closeSheet();
  }
  function deleteDoc(id) {
    Store.update(t => { t.documents = t.documents.filter(d => d.id !== id); });
    closeSheet();
  }

  /* ================= 초기화 ================= */

  function init() {
    document.querySelectorAll("#tabbar button").forEach(b =>
      b.addEventListener("click", () => setTab(b.dataset.tab)));
    $("sheet-backdrop").addEventListener("click", closeSheet);
    Store.init(render);
    Maps.load(); // 키가 있으면 미리 로드

    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    setTab, closeSheet,
    tripCreateSheet, saveTrip, tripListSheet, pickTrip, joinSheet, doJoin,
    shareSheet, copyCode, saveMyName, addMember, removeMember,
    settingsSheet, deleteTripConfirm, importSheet, doImport,
    photoSheet, applyPhoto, clearPhoto,
    setSchedDay: i => { U.schedDay = i; render(); },
    toggleSchedView: () => { U.schedView = U.schedView === "table" ? "timeline" : "table"; render(); },
    schedSheet, saveSched, deleteSched,
    openRoute, closeRoute: () => $("route-overlay").classList.add("hidden"),
    setRouteMode: (m, aId, bId) => {
      U.routeMode = m;
      const t = Store.S.trip;
      renderRoute(t.schedule.find(i => i.id === aId), t.schedule.find(i => i.id === bId));
    },
    expSheet, pickCat, previewKRW, saveExp, deleteExp,
    setCheckFilter: f => { U.checkFilter = f; render(); },
    chkSheet, saveChk, toggleCheck, deleteChk,
    docSheet, pickDocIcon, saveDoc, deleteDoc
  };
})();
