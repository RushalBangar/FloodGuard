// Firebase initializer (loads compat SDKs dynamically and initializes Firestore/Auth)
(function(){
  function loadScript(url){
    return new Promise((resolve,reject)=>{
      const s = document.createElement('script');
      s.src = url; s.async = true; s.onload = ()=>resolve(); s.onerror = (e)=>reject(e);
      document.head.appendChild(s);
    });
  }

  async function initFirebase(){
    if(typeof FG_CONFIG === 'undefined' || !FG_CONFIG.FIREBASE_CONFIG){
      // No client-side firebase configured — emit ready event anyway so app can fallback
      window.dispatchEvent(new CustomEvent('fg:firebase-ready', {detail:{available:false}}));
      return;
    }

    const urls = [
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js'
    ];

    try{
      await Promise.all(urls.map(loadScript));
      // Initialize
      try{
        firebase.initializeApp(FG_CONFIG.FIREBASE_CONFIG);
        window.FG_FIREBASE = firebase;
        window.FG_AUTH = firebase.auth();
        window.FG_DB = firebase.firestore();
        console.log('Firebase initialized (client)');
        window.dispatchEvent(new CustomEvent('fg:firebase-ready', {detail:{available:true}}));
      }catch(e){
        console.error('Firebase init failed', e);
        window.dispatchEvent(new CustomEvent('fg:firebase-ready', {detail:{available:false}}));
      }
    }catch(e){
      console.error('Failed to load Firebase SDK', e);
      window.dispatchEvent(new CustomEvent('fg:firebase-ready', {detail:{available:false}}));
    }
  }

  if(document.readyState !== 'loading') initFirebase(); else document.addEventListener('DOMContentLoaded', initFirebase);
})();
