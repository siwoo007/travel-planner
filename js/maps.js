/* maps.js — 구글맵 연동
   API 키가 없으면: 경로 버튼이 구글맵 앱/웹으로 연결 (딥링크)
   API 키가 있으면: 앱 내 지도, 경로 검색(대중교통 포함), 장소 자동완성 */

const Maps = (() => {

  let ready = false;
  let loading = false;
  const pending = [];

  function hasKey() {
    return !!(window.APP_CONFIG && APP_CONFIG.mapsApiKey);
  }

  function load() {
    if (!hasKey() || ready || loading) return;
    loading = true;
    window.__gmapsReady = () => {
      ready = true;
      pending.splice(0).forEach(f => { try { f(); } catch (e) { console.error(e); } });
    };
    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + APP_CONFIG.mapsApiKey
          + "&libraries=places&language=ko&callback=__gmapsReady";
    s.async = true;
    document.head.appendChild(s);
  }

  function whenReady(fn) {
    if (ready) { fn(); return; }
    pending.push(fn);
    load();
  }

  /* ---------- 경로 검색 ---------- */

  function routeKey(o, d, mode) {
    const r = n => Math.round(n * 10000) / 10000;
    return r(o.lat) + "," + r(o.lng) + "|" + r(d.lat) + "," + r(d.lng) + "|" + mode;
  }

  // 요약 정보 조회 (캐시 우선 → 없으면 API 호출 후 캐시 저장)
  function getRouteSummary(o, d, mode) {
    return new Promise(resolve => {
      const key = routeKey(o, d, mode);
      const cached = Store.routeCacheGet(key);
      if (cached) { resolve(cached); return; }
      if (!hasKey()) { resolve(null); return; }
      whenReady(() => {
        const svc = new google.maps.DirectionsService();
        svc.route({
          origin: o, destination: d,
          travelMode: google.maps.TravelMode[mode]
        }, (res, status) => {
          if (status === "OK" && res.routes[0]) {
            const leg = res.routes[0].legs[0];
            const sum = {
              duration: leg.duration ? leg.duration.text : "",
              distance: leg.distance ? leg.distance.text : "",
              fare: (res.routes[0].fare && res.routes[0].fare.text) || "",
              mode
            };
            Store.routeCacheSet(key, sum);
            resolve(sum);
          } else if (status === "ZERO_RESULTS") {
            const sum = { duration: "", distance: "", fare: "", mode, none: true };
            Store.routeCacheSet(key, sum);
            resolve(sum);
          } else {
            resolve(null);
          }
        });
      });
    });
  }

  // 상세 경로 (경로 오버레이용 — 지도에 그릴 전체 결과 반환)
  function getRouteFull(o, d, mode) {
    return new Promise(resolve => {
      if (!hasKey()) { resolve(null); return; }
      whenReady(() => {
        const svc = new google.maps.DirectionsService();
        svc.route({
          origin: o, destination: d,
          travelMode: google.maps.TravelMode[mode]
        }, (res, status) => {
          resolve(status === "OK" ? res : null);
        });
      });
    });
  }

  // 상세 결과에서 단계별 안내 추출
  function parseSteps(res) {
    const leg = res.routes[0].legs[0];
    return leg.steps.map(st => {
      if (st.travel_mode === "TRANSIT" && st.transit) {
        const t = st.transit;
        const line = (t.line.short_name || t.line.name || "");
        return {
          type: "transit",
          main: line + " · " + (t.headsign ? t.headsign + " 방면" : ""),
          sub: t.departure_stop.name + " → " + t.arrival_stop.name
             + " · " + t.num_stops + "개 정거장 · " + st.duration.text
        };
      }
      const text = (st.instructions || "").replace(/<[^>]+>/g, "");
      return {
        type: "walk",
        main: text || "이동",
        sub: (st.distance ? st.distance.text + " · " : "") + (st.duration ? st.duration.text : "")
      };
    });
  }

  /* ---------- 지도 그리기 ---------- */

  function drawRoute(el, res) {
    whenReady(() => {
      const map = new google.maps.Map(el, {
        disableDefaultUI: true, zoomControl: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
      });
      const renderer = new google.maps.DirectionsRenderer({
        map, directions: res,
        polylineOptions: { strokeColor: "#3182F6", strokeWeight: 5 }
      });
      return renderer;
    });
  }

  /* ---------- 장소 자동완성 ---------- */

  function attachAutocomplete(input, onPick) {
    if (!hasKey()) return;
    whenReady(() => {
      const ac = new google.maps.places.Autocomplete(input, {
        fields: ["name", "geometry", "formatted_address"]
      });
      ac.addListener("place_changed", () => {
        const p = ac.getPlace();
        if (p && p.geometry && p.geometry.location) {
          onPick({
            name: p.name || input.value,
            lat: p.geometry.location.lat(),
            lng: p.geometry.location.lng()
          });
        }
      });
    });
  }

  /* ---------- 구글맵 딥링크 ---------- */

  function mapsLink(o, d, mode) {
    const m = { TRANSIT: "transit", WALKING: "walking", DRIVING: "driving" }[mode] || "transit";
    const enc = p => (p.lat && p.lng) ? (p.lat + "," + p.lng) : encodeURIComponent(p.name || "");
    return "https://www.google.com/maps/dir/?api=1&origin=" + enc(o)
         + "&destination=" + enc(d) + "&travelmode=" + m;
  }

  return { hasKey, load, whenReady, getRouteSummary, getRouteFull, parseSteps, drawRoute, attachAutocomplete, mapsLink };
})();
