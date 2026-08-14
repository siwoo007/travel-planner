/* ============================================================
   설정 파일 — 이 파일만 수정하면 됩니다 (SETUP.md 안내 참고)
   ============================================================

   [1] 구글맵 API 키
       - 아직 없으면 "" 그대로 두세요. 앱은 정상 작동하고,
         경로 버튼은 구글맵 앱으로 연결됩니다.
       - 키를 넣으면 앱 안에서 지도·경로·장소 자동완성이 켜집니다.
       - 키를 넣을 때는 반드시 Google Cloud 콘솔에서
         "웹사이트 제한(HTTP 리퍼러)"과 "일일 사용량 상한"을 설정하세요.

   [2] Firebase 설정 (온라인 저장 + 링크 공유)
       - 아래는 travel-planner-c60e5 프로젝트에 연결된 상태입니다.
*/

window.APP_CONFIG = {

  // [1] 구글맵 API 키 — 따옴표 안에 붙여넣기 (아직 없으면 그대로 두세요)
  mapsApiKey: "",

  // [2] Firebase 설정 — 연결 완료
  firebase: {
    apiKey: "AIzaSyAcQ1-o0qn3SBU7c5xpsfpF1wRD3YfkXjA",
    authDomain: "travel-planner-c60e5.firebaseapp.com",
    projectId: "travel-planner-c60e5",
    storageBucket: "travel-planner-c60e5.firebasestorage.app",
    messagingSenderId: "585526287369",
    appId: "1:585526287369:web:ff04f1aacbc0914d7e2cd8"
  }

};
