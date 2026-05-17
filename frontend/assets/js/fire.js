(function(){
  function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(()=>{
      const riskValEl = document.getElementById('riskVal');
      const riskCircle = document.getElementById('riskCircle');
      const riskStatusEl = document.getElementById('riskStatus');
      
      const gasCtx = document.getElementById('gasChart').getContext('2d');
      const gasChart = new Chart(gasCtx, {
          type: 'line',
          data: {
              labels: [],
              datasets: [{
                  label: 'Gas/Smoke PPM',
                  data: [],
                  borderColor: '#f97316',
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
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
              status = 'High Fire Risk';
              color = '#ff4b2b';
              rgbColor = { r: 255, g: 75, b: 43 }; // Crimson/Orange
          } else if (riskScore > 20) {
              status = 'Elevated Smoke';
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
              bgAnim.classList.toggle('wildfire', riskScore > 20);
              bgAnim.classList.toggle('active', riskScore > 50);
          }

          // Dispatch color update to the particle network
          window.dispatchEvent(new CustomEvent('lg:risk-color', { detail: { color: rgbColor } }));
      }

      function updateChart(gasPPM) {
          const now = new Date().toLocaleTimeString();
          gasChart.data.labels.push(now);
          gasChart.data.datasets[0].data.push(gasPPM);
          if (gasChart.data.labels.length > 15) {
              gasChart.data.labels.shift();
              gasChart.data.datasets[0].data.shift();
          }
          gasChart.update();
      }

      window.addEventListener('lg:firebase-ready', (ev) => {
          if (!ev.detail || !ev.detail.available || !window.LG_DB) {
              document.getElementById('status').textContent = 'Status: Disconnected';
              return;
          }
          
          document.getElementById('status').textContent = 'Status: Connected';
          document.getElementById('status').className = 'status connected';

          LG_DB.collection('fire_data').orderBy('timestamp', 'desc').limit(1).onSnapshot(snap => {
              if(!snap.empty) {
                  const data = snap.docs[0].data();
                  
                  // Handle gas display (ppm or raw)
                  let displayPPM = (data.gas_ppm !== undefined) ? data.gas_ppm : (data.gas_raw / 4095.0 * 2000);
                  
                  // Update DOM
                  document.getElementById('gasVal').textContent = displayPPM.toFixed(1) + ' PPM';
                  document.getElementById('tempVal').textContent = (data.temperature || 25).toFixed(1) + ' °C';
                  document.getElementById('humVal').textContent = (data.humidity || 50).toFixed(1) + ' %';
                  
                  const flameVal = data.flame_detected ? 'YES' : 'NO';
                  const flameEl = document.getElementById('flameVal');
                  flameEl.textContent = flameVal;
                  flameEl.style.color = data.flame_detected ? '#ff4b2b' : '#4ade80';

                  updateRiskUI(data.ai_risk_score || 0);
                  updateChart(displayPPM);
              }
          });
      });
  });
})();
