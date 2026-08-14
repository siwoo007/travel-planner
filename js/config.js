/* ============================================================
   설정 파일 — 이 파일만 수정하면 됩니다 (SETUP.md 안내 참고)
   ============================================================

   [1] 구글맵 API 키
       - 아직 없으면 "" 그대로 두세요. 앱은 정상 작동하고,
         경로 버튼은 구글맵 앱으로 연결됩니다.
       - 키를 넣으면 앱 안에서 지도·경로·장소 자동완성이 켜집니다.

   [2] Firebase 설정 (클라우드 동기화)
       - 아직 없으면 null 그대로 두세요. 데이터는 이 기기에만 저장됩니다.
       - Firebase 콘솔에서 받은 설정값을 붙여넣으면
         Google 로그인 + 기기 간 동기화 + 동행자 공유가 켜집니다.
*/

window.APP_CONFIG = {

  // [1] 구글맵 API 키 — 따옴표 안에 붙여넣기
  mapsApiKey: "",

  // [2] Firebase 설정 — null 을 지우고 아래 예시처럼 붙여넣기
  //
  // firebase: {
  //   apiKey: "AIza....",
  //   authDomain: "xxxx.firebaseapp.com",
  //   projectId: "xxxx",
  //   storageBucket: "xxxx.appspot.com",
  //   messagingSenderId: "1234567890",
  //   appId: "1:1234567890:web:abcdef"
  // },
  firebase: null

};
