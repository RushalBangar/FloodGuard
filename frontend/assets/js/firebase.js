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
    if(typeof LG_CONFIG === 'undefined' || !LG_CONFIG.FIREBASE_CONFIG){
      // No client-side firebase configured — emit ready event anyway so app can fallback
      window.dispatchEvent(new CustomEvent('lg:firebase-ready', {detail:{available:false}}));
      return;
    }

    const urls = [
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js',
      'https://www.gstatic.com/firebasejs/9.22.2/firebase-messaging-compat.js'
    ];

    try{
      await Promise.all(urls.map(loadScript));
      // Initialize
      try{
        firebase.initializeApp(LG_CONFIG.FIREBASE_CONFIG);
        window.LG_FIREBASE = firebase;
        window.LG_DB = firebase.firestore();
        
        // Push Notifications
        if ('serviceWorker' in navigator) {
          const messaging = firebase.messaging();
          window.LG_MESSAGING = messaging;
          
          messaging.onMessage((payload) => {
            console.log('Message received. ', payload);
            if (typeof window.showAlert === 'function') {
                window.showAlert(payload.notification.title + ": " + payload.notification.body, "urgent");
            }
          });
        }

        console.log('Firebase initialized (client)');
        window.dispatchEvent(new CustomEvent('lg:firebase-ready', {detail:{available:true}}));
      }catch(e){
        console.error('Firebase init failed', e);
        window.dispatchEvent(new CustomEvent('lg:firebase-ready', {detail:{available:false}}));
      }
    }catch(e){
      console.error('Failed to load Firebase SDK', e);
      window.dispatchEvent(new CustomEvent('lg:firebase-ready', {detail:{available:false}}));
    }
  }

  if(document.readyState !== 'loading') initFirebase(); else document.addEventListener('DOMContentLoaded', initFirebase);
})();
