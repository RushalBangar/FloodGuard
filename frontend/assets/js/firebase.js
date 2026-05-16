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
      for(const url of urls) {
        await loadScript(url);
      }
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
            console.log('[FCM] Message received in foreground:', payload);
            const { title, body } = payload.notification;
            if (window.showToast) {
              window.showToast(`${title}: ${body}`, 'danger', 6000);
            }
          });

          // Global function to request permission and register token
          window.requestNotificationPermission = async function() {
            try {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                console.log('[FCM] Notification permission granted.');
                
                const token = await messaging.getToken({
                  vapidKey: (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.VAPID_KEY !== 'YOUR_PUBLIC_VAPID_KEY') ? LG_CONFIG.VAPID_KEY : undefined
                });

                if (token) {
                  console.log('[FCM] Token generated:', token);
                  // Save token to Firestore for targeting
                  await window.LG_DB.collection('push_tokens').doc(token).set({
                    token: token,
                    platform: 'web',
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                    userAgent: navigator.userAgent
                  });
                  if (window.showToast) window.showToast('Emergency alerts enabled successfully!', 'success');
                  return true;
                } else {
                  console.warn('[FCM] No registration token available.');
                }
              } else {
                console.warn('[FCM] Unable to get permission to notify.');
                if (window.showToast) window.showToast('Notification permission denied.', 'warning');
              }
            } catch (err) {
              console.error('[FCM] Error during permission request:', err);
              if (window.showToast) window.showToast('Failed to enable alerts. Check console.', 'danger');
            }
            return false;
          };
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
