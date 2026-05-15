(function(){
  const canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
  
  const bgAnim = document.getElementById('bgAnim');
  if (!bgAnim) return;
  bgAnim.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: false }); // Performance optimization
  let w, h, particles = [], mouse = { x: null, y: null, radius: 150 };
  
  // Adaptive particle count
  const PARTICLE_COUNT = window.innerWidth < 768 ? 30 : 60;
  const CONNECTION_DIST = 140;
  const CONNECTION_DIST_SQ = CONNECTION_DIST * CONNECTION_DIST;
  const BASE_COLOR = { r: 0, g: 210, b: 255 }; // Primary cyan

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener('mouseleave', () => { mouse.x = null; mouse.y = null; });

  class Particle {
    constructor() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.size = Math.random() * 2 + 0.5;
      this.baseAlpha = Math.random() * 0.5 + 0.2;
      this.alpha = this.baseAlpha;
      this.pulse = Math.random() * Math.PI * 2;
    }
    update() {
      this.pulse += 0.02;
      this.alpha = this.baseAlpha + Math.sin(this.pulse) * 0.15;
      
      // Mouse repulsion
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.vx += (dx / dist) * force * 0.3;
          this.vy += (dy / dist) * force * 0.3;
        }
      }

      // Damping
      this.vx *= 0.99;
      this.vy *= 0.99;

      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0) this.x = w;
      if (this.x > w) this.x = 0;
      if (this.y < 0) this.y = h;
      if (this.y > h) this.y = 0;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${BASE_COLOR.r},${BASE_COLOR.g},${BASE_COLOR.b},${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  function drawConnections() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < CONNECTION_DIST_SQ) {
          const dist = Math.sqrt(distSq);
          const alpha = (1 - dist / CONNECTION_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${BASE_COLOR.r},${BASE_COLOR.g},${BASE_COLOR.b},${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Mouse connections
    if (mouse.x !== null) {
      particles.forEach(p => {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(${BASE_COLOR.r},${BASE_COLOR.g},${BASE_COLOR.b},${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      });
    }
  }

  function animate() {
    // Semi-transparent clear for motion blur effect (if alpha was true)
    // But we use alpha:false for performance, so full clear
    ctx.fillStyle = '#0f172a'; // Matches --bg-dark
    ctx.fillRect(0, 0, w, h);
    
    particles.forEach(p => { p.update(); p.draw(); });
    drawConnections();
    requestAnimationFrame(animate);
  }
  animate();
})();
