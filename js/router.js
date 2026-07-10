const Router = {
    routes: {},
    currentRoute: null,

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    },

    register(path, handler) {
        this.routes[path] = handler;
    },

    async navigate() {
        const hash = window.location.hash.slice(1) || '/';
        const path = hash.split('?')[0];

        if (this.currentRoute === path) return;

        const slash = document.getElementById('slash-transition');
        const container = document.getElementById('page-container');

        if (this.currentRoute && this.currentRoute !== path) {
            slash.classList.remove('hidden');
            slash.classList.add('active');
            await Utils.sleep(400);
        }

        this.currentRoute = path;
        this.updateActiveNav(path);

        const handler = this.routes[path] || this.routes['*'];
        if (handler) {
            container.innerHTML = '';
            await handler(container, path);
            Animations.animatePageEntry(container);
            Animations.initScrollReveal();
            Animations.addHoverTilt(container.querySelectorAll('.game-card-3d'));
        }

        if (this.currentRoute && this.currentRoute !== path) {
            await Utils.sleep(300);
            slash.classList.remove('active');
            slash.classList.add('hidden');
            const line = slash.querySelector('.slash-center-line');
            if (line) line.style.width = '0';
        }

        Utils.scrollToTop();
    },

    updateActiveNav(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const route = link.getAttribute('data-route');
            if (route === path || (route === '/' && path === '/') || (route !== '/' && path.startsWith(route))) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    },

    goTo(hash) {
        window.location.hash = hash;
    }
};
