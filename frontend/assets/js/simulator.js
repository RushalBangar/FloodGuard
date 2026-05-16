/**
 * LifeGuard Sensor Simulator
 * Allows manual overriding of sensor values for demonstration purposes.
 */

(function() {
    const simulatorHTML = `
        <div id="simulatorPanel" class="simulator-panel glass">
            <div class="simulator-header">
                <h3><span data-i18n="label_simulator">Sensor Simulator</span></h3>
                <button id="closeSimulator" class="close-btn">&times;</button>
            </div>
            <div class="simulator-body">
                <div class="sim-section">
                    <h4 style="font-size: 0.7rem; color: var(--primary); margin-bottom: 0.5rem; opacity: 0.7;">NODE 1: FLOOD</h4>
                    <div class="sim-control">
                        <label data-i18n="label_sim_water">Water Level (0-1)</label>
                        <input type="range" id="simWater" min="0" max="1" step="0.01" value="0.1">
                        <span id="valWater">0.1</span>
                    </div>
                    <div class="sim-control">
                        <label data-i18n="label_sim_rain">Rainfall (0-50 mm/h)</label>
                        <input type="range" id="simRain" min="0" max="50" step="1" value="5">
                        <span id="valRain">5</span>
                    </div>
                </div>

                <div class="sim-section">
                    <h4 style="font-size: 0.7rem; color: #8b5cf6; margin-bottom: 0.5rem; opacity: 0.7;">NODE 2: QUAKE</h4>
                    <div class="sim-control">
                        <label data-i18n="label_sim_tremor">Tremor Intensity (0-10)</label>
                        <input type="range" id="simTremor" min="0" max="10" step="0.1" value="0">
                        <span id="valTremor">0</span>
                    </div>
                    <div class="sim-control toggle-control">
                        <label>Shock Alert</label>
                        <input type="checkbox" id="simShock">
                    </div>
                </div>

                <div class="sim-section">
                    <h4 style="font-size: 0.7rem; color: #f97316; margin-bottom: 0.5rem; opacity: 0.7;">NODE 3: FIRE</h4>
                    <div class="sim-control">
                        <label data-i18n="label_sim_smoke">Smoke / Gas (PPM)</label>
                        <input type="range" id="simGas" min="0" max="2000" step="10" value="100">
                        <span id="valGas">100</span>
                    </div>
                    <div class="sim-control">
                        <label>Temperature (°C)</label>
                        <input type="range" id="simTemp" min="0" max="100" step="1" value="25">
                        <span id="valTemp">25</span>
                    </div>
                    <div class="sim-control">
                        <label>Humidity (%)</label>
                        <input type="range" id="simHum" min="0" max="100" step="1" value="50">
                        <span id="valHum">50</span>
                    </div>
                    <div class="sim-control toggle-control">
                        <label>Flame Detected</label>
                        <input type="checkbox" id="simFlame">
                    </div>
                </div>
                
                <button id="resetSim" class="hero-btn ghost-btn" style="width:100%; margin-top:1rem;">Reset Sensors</button>
            </div>
        </div>
        <button id="openSimulator" class="simulator-fab" title="Open Simulator" style="display:none;">⚙️</button>
    `;

    // Inject styles directly or assume they exist in style.css
    const style = document.createElement('style');
    style.textContent = `
        .simulator-fab { position: fixed; bottom: 2rem; right: 2rem; width: 60px; height: 60px; border-radius: 50%; background: var(--primary); color: #000; border: none; font-size: 1.5rem; cursor: pointer; box-shadow: 0 10px 25px rgba(0, 210, 255, 0.4); z-index: 1000; transition: 0.3s; display: flex; align-items: center; justify-content: center; }
        .simulator-fab:hover { transform: scale(1.1) rotate(45deg); }
        .simulator-panel { position: fixed; bottom: 6rem; right: 2rem; width: 340px; border-radius: 24px; z-index: 1001; transform: translateY(20px); opacity: 0; pointer-events: none; transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); padding: 1.5rem; max-height: 80vh; overflow-y: auto; }
        .simulator-panel.active { transform: translateY(0); opacity: 1; pointer-events: auto; }
        .simulator-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .simulator-header h3 { font-size: 1rem; margin: 0; color: var(--primary); }
        .close-btn { background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
        .sim-section { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sim-section:last-child { border-bottom: none; }
        .sim-control { margin-bottom: 1rem; position: relative; }
        .sim-control label { display: block; font-size: 0.75rem; color: var(--text-dim); margin-bottom: 0.5rem; }
        .sim-control input[type="range"] { width: 100%; cursor: pointer; accent-color: var(--primary); }
        .sim-control span { font-size: 0.75rem; color: white; float: right; margin-top: -1.5rem; }
        .toggle-control { display: flex; justify-content: space-between; align-items: center; }
        .toggle-control label { margin-bottom: 0; }
        .toggle-control input[type="checkbox"] { width: 40px; height: 20px; cursor: pointer; }
    `;
    document.head.appendChild(style);

    // Inject HTML
    const div = document.createElement('div');
    div.innerHTML = simulatorHTML;
    document.body.appendChild(div);

    const panel = document.getElementById('simulatorPanel');
    const fab = document.getElementById('openSimulator');
    const closeBtn = document.getElementById('closeSimulator');
    const resetBtn = document.getElementById('resetSim');

    closeBtn.onclick = () => panel.classList.remove('active');

    // Key shortcut Alt + S to toggle simulator
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 's') {
            panel.classList.toggle('active');
        }
    });

    // Logic to override dashboard data
    const controls = {
        water: document.getElementById('simWater'),
        rain: document.getElementById('simRain'),
        tremor: document.getElementById('simTremor'),
        shock: document.getElementById('simShock'),
        gas: document.getElementById('simGas'),
        temp: document.getElementById('simTemp'),
        hum: document.getElementById('simHum'),
        flame: document.getElementById('simFlame')
    };

    const labels = {
        water: document.getElementById('valWater'),
        rain: document.getElementById('valRain'),
        tremor: document.getElementById('valTremor'),
        gas: document.getElementById('valGas'),
        temp: document.getElementById('valTemp'),
        hum: document.getElementById('valHum')
    };

    function updateSimulation() {
        if (labels.water) labels.water.textContent = controls.water.value;
        if (labels.rain) labels.rain.textContent = controls.rain.value;
        if (labels.tremor) labels.tremor.textContent = controls.tremor.value;
        if (labels.gas) labels.gas.textContent = controls.gas.value;
        if (labels.temp) labels.temp.textContent = controls.temp.value;
        if (labels.hum) labels.hum.textContent = controls.hum.value;

        // Dispatch values to dashboard.js via a custom event
        window.dispatchEvent(new CustomEvent('lg:sim-data', {
            detail: {
                water_level: parseFloat(controls.water.value),
                rainfall: parseFloat(controls.rain.value),
                vib_x: parseFloat(controls.tremor.value), // Mapping tremor to vib_x for now
                vib_y: parseFloat(controls.tremor.value) * 0.5,
                vib_z: parseFloat(controls.tremor.value) * 0.8,
                shock_alert: controls.shock.checked,
                gas_ppm: parseFloat(controls.gas.value),
                temperature: parseFloat(controls.temp.value),
                humidity: parseFloat(controls.hum.value),
                flame_detected: controls.flame.checked
            }
        }));
    }

    Object.values(controls).forEach(c => {
        if (c.type === 'range') c.oninput = updateSimulation;
        else c.onchange = updateSimulation;
    });

    resetBtn.onclick = () => {
        controls.water.value = 0.1;
        controls.rain.value = 5;
        controls.tremor.value = 0;
        controls.shock.checked = false;
        controls.gas.value = 100;
        controls.temp.value = 25;
        controls.hum.value = 50;
        controls.flame.checked = false;
        updateSimulation();
    };

})();


})();
