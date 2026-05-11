(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  window.setLang = function(lang) {
      // Very basic implementation, assuming i18n from app.js isn't loaded on dashboard
      document.querySelectorAll('[data-i18n]').forEach(el => {
          // If we had the dict here...
      });
      document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
  };

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
          const maxRisk = Math.max(fRisk, qRisk, fiRisk);
          const integratedEl = document.getElementById('integratedRiskVal');
          const integratedStatus = document.getElementById('integratedRiskStatus');
          const integratedCard = document.getElementById('integratedRiskCard');

          if(integratedEl) {
              integratedEl.textContent = maxRisk + '%';
              
              if(maxRisk > 50) {
                  integratedStatus.textContent = 'DANGER: SOS ALERT';
                  integratedStatus.style.color = '#ff4b2b';
                  integratedEl.style.color = '#ff4b2b';
                  document.getElementById('integratedRiskCircle').style.borderColor = '#ff4b2b';
                  integratedCard.classList.add('sos-glow');
              } else if (maxRisk > 20) {
                  integratedStatus.textContent = 'ADVISORY: Monitor situation';
                  integratedStatus.style.color = '#fbc02d';
                  integratedEl.style.color = '#fbc02d';
                  document.getElementById('integratedRiskCircle').style.borderColor = '#fbc02d';
                  integratedCard.classList.remove('sos-glow');
              } else {
                  integratedStatus.textContent = 'System Normal';
                  integratedStatus.style.color = '#4ade80';
                  integratedEl.style.color = '#4ade80';
                  document.getElementById('integratedRiskCircle').style.borderColor = '#4ade80';
                  integratedCard.classList.remove('sos-glow');
              }
          }
      }

      function getRiskClass(risk) {
          if (risk > 50) return 'danger';
          if (risk > 20) return 'warning';
          return 'safe';
      }

      window.addEventListener('fg:firebase-ready', (ev) => {
          if (!ev.detail || !ev.detail.available || !window.FG_DB) return;

          // Listen to Flood Data
          FG_DB.collection('flood_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.flood = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });

          // Listen to Quake Data
          FG_DB.collection('quake_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.quake = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });

          // Listen to Fire Data
          FG_DB.collection('fire_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  riskScores.fire = snap.docs[0].data().ai_risk_score || 0;
                  updateDashboard();
              }
          });
      });
  });
})();
