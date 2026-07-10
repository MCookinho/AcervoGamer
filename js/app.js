const App = {
    async init() {
        await this.splash();

        Animations.init();
        AudioPlayer.init();
        Auth.init();
        await Games.loadGames();

        this.setupNavigation();
        this.setupUserMenu();
        this.setupMobileMenu();
        this.registerRoutes();

        Utils.show('#main-header');
        Utils.show('#main-content');

        Router.init();
    },

    async splash() {
        await Utils.sleep(2200);
        const splash = Utils.$('#splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.transition = 'opacity 0.4s ease';
            await Utils.sleep(400);
            splash.remove();
        }
    },

    setupNavigation() {
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-navigate]');
            if (el) {
                e.preventDefault();
                Router.goTo(el.dataset.navigate);
            }
        });
    },

    setupUserMenu() {
        const avatarBtn = Utils.$('#user-avatar-btn');
        const dropdown = Utils.$('#user-dropdown');
        const logoutBtn = Utils.$('#logout-btn');

        if (avatarBtn && dropdown) {
            avatarBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                dropdown.classList.add('hidden');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => Auth.logout());
        }
    },

    setupMobileMenu() {
        const btn = Utils.$('#mobile-menu-btn');
        const nav = Utils.$('.main-nav');
        if (btn && nav) {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                nav.classList.toggle('open');
            });
            nav.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    btn.classList.remove('active');
                    nav.classList.remove('open');
                });
            });
        }
    },

    registerRoutes() {
        Router.register('/', (container) => this.renderHome(container));
        Router.register('/jogos', (container) => Games.renderGamesPage(container));
        Router.register('/jogos/:slug', (container, path, slug) => {
            Games.renderGameDetail(container, slug);
        });
        Router.register('/comunidade', (container) => Community.renderCommunityPage(container));
        Router.register('/comunidade/perfil', (container) => Community.renderProfileEdit(container));
        Router.register('/auth', (container) => Auth.renderAuthPage(container));
        Router.register('/sobre', (container) => this.renderAbout(container));
        Router.register('*', (container) => this.render404(container));
    },

    async renderHome(container) {
        let totalTranslations = 0;
        let totalMods = 0;
        let usersCount = 0;

        Games.data.forEach(g => {
            totalTranslations += (g.translations?.length || 0);
            totalMods += (g.mods?.length || 0);
        });

        try {
            const usersSnap = await db.collection('users').get();
            usersCount = usersSnap.size;
        } catch (e) {}

        container.innerHTML = `
            <div class="landing-hero">
                <div class="landing-hero-bg"></div>
                <div class="landing-hero-content">
                    <h1 class="landing-hero-title animate-in">
                        ACERVO<br><span>GAMER</span>
                    </h1>
                    <p class="landing-hero-subtitle animate-in stagger-1">O seu acervo definitivo de jogos</p>
                    <div class="landing-hero-cta animate-in stagger-2">
                        <button class="p5-btn-large p5-ripple" onclick="Router.goTo('#/jogos')"><span>EXPLORAR JOGOS</span></button>
                        <button class="p5-btn-outline p5-ripple" onclick="Router.goTo('#/comunidade')"><span>COMUNIDADE</span></button>
                    </div>
                </div>
            </div>

            <div class="landing-section scroll-reveal">
                <h2 class="p5-section-title animate-on-enter">DESTAQUES</h2>
                <p class="p5-section-subtitle animate-on-enter">Jogos em destaque no acervo</p>
                <div id="home-games-grid" class="games-grid"></div>
            </div>

            <div class="landing-section scroll-reveal">
                <h2 class="p5-section-title animate-on-enter">ESTATÍSTICAS</h2>
                <p class="p5-section-subtitle animate-on-enter">Números do Acervo Gamer</p>
                <div class="stats-grid">
                    <div class="p5-stat-card animate-in stagger-1">
                        <div class="p5-stat-number">${Games.data.length}</div>
                        <div class="p5-stat-label">Jogos</div>
                    </div>
                    <div class="p5-stat-card animate-in stagger-2">
                        <div class="p5-stat-number">${totalTranslations}</div>
                        <div class="p5-stat-label">Traduções</div>
                    </div>
                    <div class="p5-stat-card animate-in stagger-3">
                        <div class="p5-stat-number">${totalMods}</div>
                        <div class="p5-stat-label">Mods</div>
                    </div>
                    <div class="p5-stat-card animate-in stagger-4">
                        <div class="p5-stat-number">${usersCount}</div>
                        <div class="p5-stat-label">Usuários</div>
                    </div>
                </div>
            </div>

            <div class="landing-section scroll-reveal">
                <h2 class="p5-section-title animate-on-enter">FÓRUNS RECENTES</h2>
                <p class="p5-section-subtitle animate-on-enter">Últimas discussões da comunidade</p>
                <div id="home-forums" class="forums-preview"></div>
            </div>

            <div class="landing-section scroll-reveal">
                <h2 class="p5-section-title animate-on-enter">ÚLTIMAS ATUALIZAÇÕES</h2>
                <p class="p5-section-subtitle animate-on-enter">Novidades do Acervo Gamer</p>
                <div id="home-updates" class="updates-timeline"></div>
            </div>
        `;

        const gamesGrid = Utils.$('#home-games-grid');
        if (gamesGrid) Games.renderLandingHighlight(gamesGrid);

        const forumsEl = Utils.$('#home-forums');
        if (forumsEl) this.loadHomeForums(forumsEl);

        const updatesEl = Utils.$('#home-updates');
        if (updatesEl) this.loadHomeUpdates(updatesEl);
    },

    async loadHomeForums(container) {
        try {
            const snapshot = await db.collection('forums').orderBy('createdAt', 'desc').limit(5).get();
            const forums = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (forums.length === 0) {
                container.innerHTML = '<p style="color: var(--br-gray-light);">Nenhum fórum ainda.</p>';
                return;
            }
            container.innerHTML = forums.map((f, i) => `
                <div class="forum-card animate-in stagger-${i + 1}" onclick="Community.openForum('${f.id}')">
                    <div class="forum-card-title">${Utils.escapeHtml(f.title)}</div>
                    <div class="forum-card-meta">
                        <span>Por ${Utils.escapeHtml(f.authorName || 'Anônimo')}</span>
                        <span>${Utils.timeAgo(f.createdAt?.toDate())}</span>
                        <span>${f.replies || 0} respostas</span>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            container.innerHTML = '<p style="color: var(--br-gray-light);">Nenhum fórum ainda.</p>';
        }
    },

    async loadHomeUpdates(container) {
        try {
            const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').limit(5).get();
            const updates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (updates.length === 0) {
                container.innerHTML = '<p style="color: var(--br-gray-light);">Nenhuma atualização ainda.</p>';
                return;
            }
            container.innerHTML = updates.map((u, i) => `
                <div class="update-item animate-in stagger-${i + 1}">
                    <div class="update-date">${Utils.formatDate(u.createdAt?.toDate())}</div>
                    <h4 class="update-title">${Utils.escapeHtml(u.title)}</h4>
                    <p class="update-text">${Utils.escapeHtml(u.text)}</p>
                </div>
            `).join('');
        } catch (e) {
            container.innerHTML = '<p style="color: var(--br-gray-light);">Nenhuma atualização ainda.</p>';
        }
    },

    renderAbout(container) {
        container.innerHTML = `
            <div class="about-container">
                <h1 class="p5-section-title animate-in">SOBRE</h1>
                <p class="p5-section-subtitle animate-in stagger-1">Conheça o Acervo Gamer</p>

                <div class="about-section animate-in stagger-2 scroll-reveal">
                    <h2>O QUE É O ACERVO GAMER?</h2>
                    <p>O Acervo Gamer é um site 100% open source criado para ser o seu acervo definitivo de jogos. Aqui você encontra traduções, mods, trilhas sonoras, gameplays e muito mais, tudo organizado e de fácil acesso.</p>
                    <p>Nosso objetivo é criar uma comunidade gamers brasileira unida, onde todos possam compartilhar, contribuir e descobrir conteúdos incríveis sobre seus jogos favoritos.</p>
                </div>

                <div class="about-section animate-in stagger-3 scroll-reveal">
                    <h2>COMO USAR</h2>
                    <p><strong>1. Explore os Jogos:</strong> Navegue pela seção de jogos e descubra tudo o que cada título tem a oferecer.</p>
                    <p><strong>2. Baixe Conteúdo:</strong> Acesse traduções, mods e muito mais diretamente no site.</p>
                    <p><strong>3. Ouça a Trilha Sonora:</strong> Curta as trilhas sonoras dos jogos pelo player integrado.</p>
                    <p><strong>4. Participe da Comunidade:</strong> Crie seu perfil, comente, crie fóruns e conecte-se com outros gamers.</p>
                </div>

                <div class="about-section animate-in stagger-4 scroll-reveal">
                    <h2>OPEN SOURCE</h2>
                    <p>O Acervo Gamer é 100% open source e feito com amor pela comunidade. Qualquer pessoa pode contribuir com pull requests no GitHub!</p>
                    <a href="https://github.com/MCookinho/AcervoGamer" target="_blank" class="about-link">📂 Repositório no GitHub</a>
                </div>

                <div class="about-section animate-in stagger-5 scroll-reveal">
                    <h2>TECNOLOGIAS</h2>
                    <p>O site foi construído com as seguintes tecnologias:</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;">
                        <span class="p5-tag active">HTML5</span>
                        <span class="p5-tag active">CSS3</span>
                        <span class="p5-tag active">JavaScript</span>
                        <span class="p5-tag active">Firebase</span>
                        <span class="p5-tag active">Firestore</span>
                        <span class="p5-tag active">GitHub Pages</span>
                    </div>
                </div>

                <div class="about-section animate-in stagger-6 scroll-reveal">
                    <h2>SOBRE O CRIADOR</h2>
                    <p>O Acervo Gamer foi criado por Peu Borges, um gamer brasileiro apaixonado por jogos e desenvolvimento web.</p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px;">
                        <a href="https://github.com/MCookinho" target="_blank" class="about-link">💻 GitHub</a>
                    </div>
                </div>
            </div>
        `;
    },

    render404(container) {
        container.innerHTML = `
            <div class="landing-section" style="text-align: center; padding: 120px 20px;">
                <h1 class="p5-section-title animate-in" style="font-size: 6rem;">404</h1>
                <p class="p5-section-subtitle animate-in stagger-1">Página não encontrada</p>
                <button class="p5-btn-large p5-ripple animate-in stagger-2" onclick="Router.goTo('#/')" style="margin-top: 30px;">
                    <span>VOLTAR AO INÍCIO</span>
                </button>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
