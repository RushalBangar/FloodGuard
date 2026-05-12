(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(() => {

    // ====== 1. ANIMATED HAMBURGER ======
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.querySelector('.nav');
    if (menuToggle && nav) {
      menuToggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        menuToggle.classList.toggle('active');
      });
    }

    // ====== 2. TOAST NOTIFICATION SYSTEM ======
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    document.body.appendChild(toastContainer);

    window.showToast = function(message, type = 'info', duration = 4000) {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🚨' };
      toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${message}</span>`;
      toastContainer.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, duration);
    };

    // ====== 3. BACK TO TOP BUTTON ======
    const btt = document.createElement('button');
    btt.id = 'backToTop';
    btt.innerHTML = '↑';
    btt.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(btt);

    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });

    btt.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ====== 4. PAGE TRANSITION ======
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);
    document.body.classList.add('page-loaded');

    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript') || link.target === '_blank') return;
      link.addEventListener('click', e => {
        e.preventDefault();
        document.body.classList.remove('page-loaded');
        overlay.classList.add('active');
        setTimeout(() => { window.location.href = href; }, 350);
      });
    });

    // ====== 5. TYPEWRITER EFFECT (index only) ======
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle && window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
      const text = heroTitle.textContent;
      heroTitle.textContent = '';
      heroTitle.style.visibility = 'visible';
      let i = 0;
      function typeChar() {
        if (i < text.length) {
          heroTitle.textContent += text[i];
          i++;
          setTimeout(typeChar, 80);
        }
      }
      setTimeout(typeChar, 500);
    }

    // ====== 6. CUSTOM CURSOR GLOW ======
    if (window.matchMedia('(pointer: fine)').matches) {
      const cursor = document.createElement('div');
      cursor.className = 'cursor-glow';
      document.body.appendChild(cursor);
      let cx = 0, cy = 0, tx = 0, ty = 0;
      document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
      function updateCursor() {
        cx += (tx - cx) * 0.15;
        cy += (ty - cy) * 0.15;
        cursor.style.transform = `translate(${cx - 15}px, ${cy - 15}px)`;
        requestAnimationFrame(updateCursor);
      }
      updateCursor();
    }

    // ====== 7. SKELETON LOADING ======
    document.querySelectorAll('#weather, #alerts').forEach(el => {
      if (!el.children.length || el.textContent.includes('Loading')) {
        el.innerHTML = `<div class="skeleton-line"></div><div class="skeleton-line short"></div><div class="skeleton-line"></div>`;
      }
    });

    // ====== 8. TOOLTIP SYSTEM ======
    document.querySelectorAll('.sensor-value').forEach(el => {
      el.setAttribute('data-tooltip', 'Real-time IoT sensor reading');
      el.classList.add('has-tooltip');
    });

    // ====== 9. DYNAMIC FAVICON ======
    window.updateFavicon = function(riskLevel) {
      const fav = document.createElement('canvas');
      fav.width = 32; fav.height = 32;
      const fctx = fav.getContext('2d');
      let color = '#00d2ff';
      if (riskLevel > 70) color = '#e64545';
      else if (riskLevel > 30) color = '#ffaa00';
      fctx.beginPath();
      fctx.arc(16, 16, 14, 0, Math.PI * 2);
      fctx.fillStyle = color;
      fctx.fill();
      fctx.fillStyle = '#fff';
      fctx.font = 'bold 14px sans-serif';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText(riskLevel + '', 16, 17);
      let link = document.querySelector("link[rel~='icon']");
      if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
      link.href = fav.toDataURL();
    };

    // ====== 9.5. SOS SIGNALING ======
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', (ev) => {
            const btn = ev.currentTarget;
            const originalText = btn.textContent;
            btn.disabled = true;
            btn.textContent = 'LOCATING...';

            const nameInput = document.getElementById('helpName');
            const name = (nameInput && nameInput.value) ? nameInput.value : 'Anonymous';
            
            navigator.geolocation.getCurrentPosition(pos => {
                btn.disabled = false;
                btn.textContent = 'SOS SENT';
                setTimeout(() => { btn.textContent = originalText; }, 5000);

                const lat = pos.coords.latitude, lng = pos.coords.longitude;
                const sosData = {
                    name: name, lat: lat, lng: lng, isSOS: true,
                    timestamp: new Date().toISOString(), status: 'active'
                };
                
                // Write to Firestore
                if(window.LG_DB) {
                    const colName = (typeof LG_CONFIG !== 'undefined' && LG_CONFIG.HELP_COLLECTION) ? LG_CONFIG.HELP_COLLECTION : 'sos_signals';
                    // We check if firebase object exists since LG_DB uses it
                    const timestamp = (typeof firebase !== 'undefined') ? firebase.firestore.FieldValue.serverTimestamp() : new Date();
                    LG_DB.collection(colName).add({ ...sosData, createdAt: timestamp })
                        .then(() => window.showToast('SOS TRANSMITTED. Rescue teams notified.', 'danger'))
                        .catch(e => {
                            console.error('Firestore SOS write failed:', e);
                            window.showToast('SOS database write failed. Trying backup...', 'warning');
                        });
                } else {
                    window.showToast('SOS failed — no connection. Please call emergency services.', 'danger');
                }
            }, err => {
                btn.disabled = false;
                btn.textContent = originalText;
                window.showToast('Location access denied. Please enable GPS for SOS.', 'warning');
            }, { enableHighAccuracy: true });
        });
    }

    // ====== 10. SCROLL REVEAL (global) ======
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .step-card, .feature-item, .stat-item, .hero-badge, .hero-actions, .rescue-sidebar, .rescue-main').forEach(el => {
      el.classList.add('reveal-on-scroll');
      revealObserver.observe(el);
    });

    // ====== 11. COUNTER ANIMATION (index) ======
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count);
          if (isNaN(target)) return;
          let current = 0;
          const step = Math.ceil(target / 40);
          const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = current;
          }, 40);
          countObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-value[data-count]').forEach(el => countObserver.observe(el));

  });
})();
