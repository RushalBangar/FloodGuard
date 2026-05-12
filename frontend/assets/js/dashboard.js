(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }



  ready(()=>{
      // We will listen to Firebase directly for the 3 collections: flood_data, quake_data, fire_data.
      let riskScores = { flood: 0, quake: 0, fire: 0 };

      function updateDashboard() {
          // Update the 3 module cards
          const fRisk = riskScores.flood;
          const qRisk = riskScores.quake;
          const fiRisk = riskScores.fire;

          const fEl = document.getElementById('floodRiskSummary');
          const qEl = document.getElementById('quakeRiskSummary');
          const fiEl = document.getElementById('fireRiskSummary');

          if(fEl) { fEl.textContent = fRisk + '%'; fEl.className = 'status ' + getRiskClass(fRisk); }
          if(qEl) { qEl.textContent = qRisk + '%'; qEl.className = 'status ' + getRiskClass(qRisk); }
          if(fiEl) { fiEl.textContent = fiRisk + '%'; fiEl.className = 'status ' + getRiskClass(fiRisk); }

          // Calculate Integrated Risk
          updateIntegratedRisk();

          // Cache for offline mode
          if (window.cacheSensorData) {
            window.cacheSensorData({
              floodRisk: riskScores.flood,
              quakeRisk: riskScores.quake,
              fireRisk: riskScores.fire
            });
          }
      }

      function updateIntegratedRisk() {
          const maxRisk = Math.max(riskScores.flood, riskScores.quake, riskScores.fire);
          const valEl = document.getElementById('riskValue');
          const statusEl = document.getElementById('riskStatus');
          const circle = document.getElementById('riskCircle');
          const bgAnim = document.getElementById('bgAnim');

          if(valEl) {
              valEl.textContent = maxRisk + '%';
              const offset = 565 - (565 * maxRisk / 100);
              if(circle) {
                  circle.style.strokeDashoffset = offset;
                  
                  if(maxRisk > 50) {
                      circle.style.stroke = 'var(--danger)';
                      if(statusEl) statusEl.textContent = 'Critical Alert';
                      if(bgAnim) bgAnim.classList.add('emergency-red');
                  } else if (maxRisk > 20) {
                      circle.style.stroke = 'var(--warning)';
                      if(statusEl) statusEl.textContent = 'Elevated Risk';
                      if(bgAnim) bgAnim.classList.remove('emergency-red');
                  } else {
                      circle.style.stroke = 'var(--primary)';
                      if(statusEl) statusEl.textContent = 'System Standby';
                      if(bgAnim) bgAnim.classList.remove('emergency-red');
                  }
              }
          }
      }

      function getRiskClass(risk) {
          if (risk > 50) return 'danger';
          if (risk > 20) return 'warning';
          return 'safe';
      }

      window.addEventListener('lg:firebase-ready', (ev) => {
          if (!ev.detail || !ev.detail.available || !window.LG_DB) return;

          // Listen to Flood Data
          LG_DB.collection('flood_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.flood = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });

          // Listen to Quake Data
          LG_DB.collection('quake_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.quake = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });

          // Listen to Fire Data
          LG_DB.collection('fire_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.fire = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });
      });
  });
})();
