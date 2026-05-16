(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(()=>{
      const riskValEl = document.getElementById('riskVal');
      const riskCircle = document.getElementById('riskCircle');
      const riskStatusEl = document.getElementById('riskStatus');
      
      const seismoCtx = document.getElementById('seismoChart').getContext('2d');
      const seismoChart = new Chart(seismoCtx, {
          type: 'line',
          data: {
              labels: [],
              datasets: [{
                  label: 'Vibration Amplitude',
                  data: [],
                  borderColor: '#8b5cf6',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  fill: true,
                  tension: 0.2
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                  y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                  x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
              },
              plugins: { legend: { display: false } }
          }
      });

      function updateRiskUI(riskScore) {
          riskValEl.textContent = riskScore + '%';
          
          let status = 'Safe';
          let color = '#4ade80';
          
          if (riskScore > 50) {
              status = 'Structural Threat';
              color = '#ff4b2b';
          } else if (riskScore > 20) {
              status = 'Moderate Tremor';
              color = '#fbc02d';
          }
          
          riskStatusEl.textContent = status;
          riskCircle.style.borderColor = color;
          riskValEl.style.color = color;
          riskStatusEl.style.color = color;
          riskStatusEl.className = 'status ' + (riskScore > 50 ? 'danger' : riskScore > 20 ? 'warning' : 'safe');
      }

      function updateChart(vibX) {
          const now = new Date().toLocaleTimeString();
          seismoChart.data.labels.push(now);
          seismoChart.data.datasets[0].data.push(vibX);
          if (seismoChart.data.labels.length > 15) {
              seismoChart.data.labels.shift();
              seismoChart.data.datasets[0].data.shift();
          }
          seismoChart.update();
      }

      window.addEventListener('lg:firebase-ready', (ev) => {
          if (!ev.detail || !ev.detail.available || !window.LG_DB) {
              document.getElementById('status').textContent = 'Status: Disconnected';
              return;
          }
          
          document.getElementById('status').textContent = 'Status: Connected';
          document.getElementById('status').className = 'status connected';

          LG_DB.collection('quake_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  const data = snap.docs[0].data();
                  
                  // Update DOM
                  document.getElementById('vibXVal').textContent = (data.vib_x || 0).toFixed(2);
                  document.getElementById('vibYVal').textContent = (data.vib_y || 0).toFixed(2);
                  document.getElementById('vibZVal').textContent = (data.vib_z || 0).toFixed(2);
                  
                  const shockVal = data.shock_alert ? 'YES' : 'NO';
                  const shockEl = document.getElementById('shockVal');
                  shockEl.textContent = shockVal;
                  shockEl.style.color = data.shock_alert ? '#ff4b2b' : '#4ade80';

                  updateRiskUI(data.ai_risk_score || 0);
                  updateChart(data.vib_x || 0);
              }
          });
      });
  });
})();
