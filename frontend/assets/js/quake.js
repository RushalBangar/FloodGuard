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
          let rgbColor = { r: 74, g: 222, b: 128 }; // Green
          
          if (riskScore > 50) {
              status = 'Structural Threat';
              color = '#ff4b2b';
              rgbColor = { r: 139, g: 92, b: 246 }; // Deep Violet
          } else if (riskScore > 20) {
              status = 'Moderate Tremor';
              color = '#fbc02d';
              rgbColor = { r: 245, g: 158, b: 11 }; // Amber
          } else {
              rgbColor = { r: 0, g: 210, b: 255 }; // Clean Cyan
          }
          
          riskStatusEl.textContent = status;
          riskCircle.style.borderColor = color;
          riskValEl.style.color = color;
          riskStatusEl.style.color = color;
          riskStatusEl.className = 'status ' + (riskScore > 50 ? 'danger' : riskScore > 20 ? 'warning' : 'safe');

          // Control dynamic background animations
          const bgAnim = document.getElementById('bgAnim');
          if (bgAnim) {
              bgAnim.classList.toggle('earthquake', riskScore > 20);
              bgAnim.classList.toggle('active', riskScore > 50);
          }

          // Trigger physical full-screen tremors on the document body based on threat levels
          const body = document.body;
          if (body) {
              body.classList.toggle('tremor-severe-active', riskScore > 50);
              body.classList.toggle('tremor-mild-active', riskScore > 20 && riskScore <= 50);
          }

          // Dispatch color update to the particle network
          window.dispatchEvent(new CustomEvent('lg:risk-color', { detail: { color: rgbColor } }));
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
