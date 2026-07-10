const Router = {
    routes: [],
    currentRoute: null,
    previousRoute: null,
    isNavigating: false,

    init() {
        window.addEventListener('hashchange', () => this.navigate());
        this.navigate();
    },

    register(pattern, handler) {
        this.routes.push({ pattern, handler });
    },

    matchRoute(path) {
        for (const route of this.routes) {
            if (route.pattern.includes(':')) {
                const regex = new RegExp('^' + route.pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
                const match = path.match(regex);
                if (match) {
                    return { handler: route.handler, params: match.slice(1) };
                }
            } else if (route.pattern === path) {
                return { handler: route.handler, params: [] };
            }
        }
        return null;
    },

    async navigate() {
        if (this.isNavigating) return;

        const hash = window.location.hash.slice(1) || '/';
        const path = hash.split('?')[0];

        if (this.currentRoute === path) return;

        this.isNavigating = true;
        this.previousRoute = this.currentRoute;

        const isInitialLoad = !this.previousRoute;
        const container = document.getElementById('page-container');

        if (!isInitialLoad && container) {
            container.classList.add('page-transition', 'cube-exit');
            await Utils.sleep(400);
            container.classList.remove('cube-exit');
        }

        this.currentRoute = path;
        this.updateActiveNav(path);

        const match = this.matchRoute(path);
        if (match) {
            container.innerHTML = '';
            container.classList.remove('page-enter', 'cube-enter');
            void container.offsetWidth;
            container.classList.add('page-enter', 'cube-enter');

            await match.handler(container, path, ...match.params);

            Animations.initScrollReveal();
            Animations.addHoverTilt(container.querySelectorAll('.game-card-3d'));
        } else {
            container.innerHTML = '';
            container.classList.remove('page-enter', 'cube-enter');
            void container.offsetWidth;
            container.classList.add('page-enter', 'cube-enter');

            const fallback = this.matchRoute('*');
            if (fallback) await fallback.handler(container, path);
        }

        if (!isInitialLoad && container) {
            await Utils.sleep(50);
            container.classList.remove('cube-enter');
        }

        this.isNavigating = false;
        Utils.scrollToTop();
    },

    updateActiveNav(path) {
        document.querySelectorAll('.nav-link').forEach(link => {
            const route = link.getAttribute('data-route');
            let isActive = false;
            if (route === '/') {
                isActive = path === '/';
            } else {
                isActive = path === route || path.startsWith(route + '/');
            }
            link.classList.toggle('active', isActive);
        });
    },

    goTo(hash) {
        window.location.hash = hash;
    }
};
