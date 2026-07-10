const Animations = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,
    isRunning: false,

    init() {
        this.canvas = document.getElementById('particles-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.start();
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    createParticle() {
        const types = ['diamond', 'line', 'dot', 'cross'];
        const type = types[Math.floor(Math.random() * types.length)];
        return {
            x: Math.random() * this.canvas.width,
            y: this.canvas.height + 20,
            size: Math.random() * 6 + 2,
            speedY: -(Math.random() * 0.8 + 0.2),
            speedX: (Math.random() - 0.5) * 0.5,
            opacity: Math.random() * 0.4 + 0.1,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 2,
            type: type,
            color: Math.random() > 0.7 ? '#E60012' : '#FFFFFF',
            life: 0,
            maxLife: Math.random() * 400 + 200
        };
    },

    drawParticle(p) {
        this.ctx.save();
        this.ctx.globalAlpha = p.opacity * (1 - p.life / p.maxLife);
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation * Math.PI / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.strokeStyle = p.color;

        switch (p.type) {
            case 'diamond':
                this.ctx.beginPath();
                this.ctx.moveTo(0, -p.size);
                this.ctx.lineTo(p.size * 0.6, 0);
                this.ctx.lineTo(0, p.size);
                this.ctx.lineTo(-p.size * 0.6, 0);
                this.ctx.closePath();
                this.ctx.fill();
                break;
            case 'line':
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(-p.size, 0);
                this.ctx.lineTo(p.size, 0);
                this.ctx.stroke();
                break;
            case 'dot':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size * 0.4, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'cross':
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(-p.size * 0.5, -p.size * 0.5);
                this.ctx.lineTo(p.size * 0.5, p.size * 0.5);
                this.ctx.moveTo(p.size * 0.5, -p.size * 0.5);
                this.ctx.lineTo(-p.size * 0.5, p.size * 0.5);
                this.ctx.stroke();
                break;
        }
        this.ctx.restore();
    },

    update() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (Math.random() < 0.03 && this.particles.length < 50) {
            this.particles.push(this.createParticle());
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.speedX;
            p.y += p.speedY;
            p.rotation += p.rotationSpeed;
            p.life++;

            if (p.life > p.maxLife || p.y < -50) {
                this.particles.splice(i, 1);
                continue;
            }

            this.drawParticle(p);
        }

        this.animationId = requestAnimationFrame(() => this.update());
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.update();
    },

    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },

    async playSlashTransition(callback) {
        const slash = document.getElementById('slash-transition');
        if (!slash) return;
        slash.classList.remove('hidden');
        slash.classList.add('active');
        await Utils.sleep(400);
        if (callback) callback();
        await Utils.sleep(600);
        slash.classList.remove('active');
        slash.classList.add('hidden');
        slash.querySelector('.slash-center-line').style.width = '0';
    },

    animatePageEntry(container) {
        if (!container) return;
        container.classList.add('page-enter');
        const elements = container.querySelectorAll('.animate-on-enter');
        elements.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.animationDelay = `${i * 0.1}s`;
            el.classList.add('animate-in');
        });
    },

    initScrollReveal() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.scroll-reveal').forEach(el => {
            observer.observe(el);
        });
    },

    animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);
        const update = () => {
            start += increment;
            if (start >= target) {
                element.textContent = target;
                return;
            }
            element.textContent = Math.floor(start);
            requestAnimationFrame(update);
        };
        update();
    },

    addHoverTilt(elements) {
        elements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / centerY * -5;
                const rotateY = (x - centerX) / centerX * 5;
                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
            });
        });
    }
};
