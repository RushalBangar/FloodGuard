(function(){
    function ready(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

    ready(() => {
        const bgAnim = document.getElementById('bgAnim');
        if (!bgAnim) return;

        // Create Particles
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.width = Math.random() * 3 + 1 + 'px';
            p.style.height = p.style.width;
            p.style.opacity = Math.random() * 0.5 + 0.1;
            p.style.animationDuration = Math.random() * 20 + 10 + 's';
            p.style.animationDelay = Math.random() * 10 + 's';
            bgAnim.appendChild(p);
        }
    });
})();
