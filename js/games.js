const Games = {
    data: [],
    GITHUB_REPO: 'MCookinho/AcervoGamer',
    CACHE_KEY: 'acervogamer_games_cache',
    CACHE_TTL: 1000 * 60 * 30,

    async loadGames() {
        try {
            const cached = this.getCached();
            if (cached) {
                this.data = cached;
                return;
            }

            const apiUrl = `https://api.github.com/repos/${this.GITHUB_REPO}/contents/data/games`;
            const res = await fetch(apiUrl);
            if (!res.ok) throw new Error('GitHub API error');
            const files = await res.json();

            const jsonFiles = files.filter(f =>
                f.type === 'file' && f.name.endsWith('.json') && f.name !== 'index.json'
            );

            const promises = jsonFiles.map(f =>
                fetch(f.download_url).then(r => r.json())
            );
            this.data = await Promise.all(promises);
            this.setCache(this.data);
        } catch (error) {
            console.error('Erro ao carregar jogos:', error);
            this.data = [];
        }
    },

    getCached() {
        try {
            const raw = localStorage.getItem(this.CACHE_KEY);
            if (!raw) return null;
            const { data, timestamp } = JSON.parse(raw);
            if (Date.now() - timestamp > this.CACHE_TTL) return null;
            return data;
        } catch { return null; }
    },

    setCache(data) {
        try {
            localStorage.setItem(this.CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch {}
    },

    clearCache() {
        localStorage.removeItem(this.CACHE_KEY);
    },

    getGame(slug) {
        return this.data.find(g => g.slug === slug);
    },

    renderLandingHighlight(container) {
        const gamesHTML = this.data.map((game, i) => `
            <div class="game-card-3d animate-in stagger-${i + 1}">
                <div class="p5-card game-card-inner" onclick="Router.goTo('#/jogos/${game.slug}')">
                    <div class="p5-card-image">
                        <img src="${game.cover}" alt="${game.name}" loading="lazy">
                        <div class="p5-card-image-overlay"></div>
                        <div class="p5-card-badge">${game.genre}</div>
                    </div>
                    <div class="p5-card-body">
                        <h3 class="p5-card-title">${game.name}</h3>
                        <p class="p5-card-genre">${game.developer} • ${game.year}</p>
                        <p class="p5-card-desc">${game.shortDescription}</p>
                    </div>
                    <div class="p5-card-footer">
                        <span class="p5-card-action">VER DETALHES</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = gamesHTML;
    },

    renderGamesPage(container) {
        const gamesHTML = this.data.map((game, i) => `
            <div class="game-card-3d animate-in stagger-${i + 1}">
                <div class="p5-card game-card-inner" onclick="Router.goTo('#/jogos/${game.slug}')">
                    <div class="p5-card-image">
                        <img src="${game.cover}" alt="${game.name}" loading="lazy">
                        <div class="p5-card-image-overlay"></div>
                        <div class="p5-card-badge">${game.genre}</div>
                    </div>
                    <div class="p5-card-body">
                        <h3 class="p5-card-title">${game.name}</h3>
                        <p class="p5-card-genre">${game.developer} • ${game.year}</p>
                        <p class="p5-card-desc">${game.shortDescription}</p>
                    </div>
                    <div class="p5-card-footer">
                        <span class="p5-card-action">VER DETALHES</span>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="landing-section">
                <h2 class="p5-section-title animate-in">TODOS OS JOGOS</h2>
                <p class="p5-section-subtitle animate-in stagger-1">Explore nosso acervo completo</p>
                <div class="games-grid">${gamesHTML}</div>
            </div>
        `;
    },

    renderGameDetail(container, slug) {
        const game = this.getGame(slug);
        if (!game) {
            container.innerHTML = '<div class="landing-section"><h2 class="p5-section-title">Jogo não encontrado</h2></div>';
            return;
        }

        const tabs = ['Visão Geral', 'Traduções', 'Mods', 'Trilha Sonora', 'Gameplays', 'Comentários'];
        const tabIds = ['overview', 'translations', 'mods', 'soundtrack', 'gameplays', 'comments'];

        container.innerHTML = `
            <div class="p5-game-header">
                <div class="p5-game-header-bg" style="background-image: url('${game.background}')"></div>
                <div class="p5-game-header-overlay"></div>
                <div class="p5-game-header-content">
                    <div class="p5-game-info animate-in">
                        <h1>${game.name}</h1>
                        <p class="genre">${game.genre} • ${game.developer} • ${game.year}</p>
                        <p class="description">${game.fullDescription}</p>
                    </div>
                </div>
            </div>
            <div class="game-tabs-content">
                <div class="p5-tabs animate-in stagger-2">
                    ${tabs.map((tab, i) => `
                        <button class="p5-tab ${i === 0 ? 'active' : ''}" data-tab="${tabIds[i]}">
                            <span>${tab}</span>
                        </button>
                    `).join('')}
                </div>
                <div id="tab-content" class="animate-in stagger-3"></div>
            </div>
        `;

        const tabContent = Utils.$('#tab-content');
        this.renderTab(tabContent, game, 'overview');

        container.querySelectorAll('.p5-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.classList.contains('active')) return;
                container.querySelectorAll('.p5-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                tabContent.classList.add('tab-transition-exit');
                setTimeout(() => {
                    this.renderTab(tabContent, game, tab.dataset.tab);
                    tabContent.classList.remove('tab-transition-exit');
                    tabContent.classList.add('tab-transition-enter', 'tab-content-reveal');
                    setTimeout(() => {
                        tabContent.classList.remove('tab-transition-enter');
                    }, 350);
                }, 250);
            });
        });
    },

    renderTab(container, game, tabId) {
        switch (tabId) {
            case 'overview':
                this.renderOverview(container, game);
                break;
            case 'translations':
                this.renderTranslations(container, game);
                break;
            case 'mods':
                this.renderMods(container, game);
                break;
            case 'soundtrack':
                this.renderSoundtrack(container, game);
                break;
            case 'gameplays':
                this.renderGameplays(container, game);
                break;
            case 'comments':
                Comments.render(container, game.slug);
                break;
        }
    },

    renderOverview(container, game) {
        container.innerHTML = `
            <div class="animate-in">
                <h3 style="font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 3px; margin-bottom: 20px; color: var(--br-green);">SOBRE O JOGO</h3>
                <p style="color: var(--br-gray-light); line-height: 1.8; margin-bottom: 30px; font-size: 1rem;">${game.fullDescription}</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px;">
                    <div class="p5-stat-card">
                        <div class="p5-stat-number" style="font-size: 1.5rem;">${game.genre}</div>
                        <div class="p5-stat-label">Gênero</div>
                    </div>
                    <div class="p5-stat-card">
                        <div class="p5-stat-number" style="font-size: 1.5rem;">${game.developer}</div>
                        <div class="p5-stat-label">Desenvolvedor</div>
                    </div>
                    <div class="p5-stat-card">
                        <div class="p5-stat-number" style="font-size: 1.5rem;">${game.year}</div>
                        <div class="p5-stat-label">Ano de Lançamento</div>
                    </div>
                </div>
                ${game.videoPreview ? `
                    <h4 style="font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 2px; margin-bottom: 16px;">TRAILER</h4>
                    <div class="video-embed">
                        <iframe src="${game.videoPreview}" allowfullscreen></iframe>
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderTranslations(container, game) {
        const traductions = game.translations || [];
        if (traductions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-title">Nenhuma tradução disponível</div>
                    <div class="empty-state-text">Traduções serão adicionadas em breve!</div>
                </div>
            `;
            return;
        }
        container.innerHTML = traductions.map((t, i) => `
            <div class="traduction-item animate-in stagger-${i + 1}">
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <div class="file-name">${t.name}</div>
                    <div class="file-meta">
                        <span>Versão: ${t.version}</span>
                        <span>Data: ${Utils.formatDate(t.date)}</span>
                        <span>Tamanho: ${t.size}</span>
                    </div>
                </div>
                <a href="${t.downloadUrl}" class="file-download" target="_blank">BAIXAR</a>
            </div>
        `).join('');
    },

    renderMods(container, game) {
        const mods = game.mods || [];
        if (mods.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔧</div>
                    <div class="empty-state-title">Nenhum mod disponível</div>
                    <div class="empty-state-text">Mods serão adicionados em breve!</div>
                </div>
            `;
            return;
        }
        container.innerHTML = mods.map((m, i) => `
            <div class="mod-item animate-in stagger-${i + 1}">
                <div class="file-icon">🔧</div>
                <div class="file-info">
                    <div class="file-name">${m.name}</div>
                    <div class="file-meta">
                        <span>Versão: ${m.version}</span>
                        <span>Autor: ${m.author}</span>
                        ${m.nexusUrl ? `<a href="${m.nexusUrl}" target="_blank" style="color: var(--br-green-light);">NexusMods ↗</a>` : ''}
                    </div>
                </div>
                <a href="${m.downloadUrl}" class="file-download" target="_blank">BAIXAR</a>
            </div>
        `).join('');
    },

    renderSoundtrack(container, game) {
        const tracks = game.soundtrack || [];
        if (tracks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎵</div>
                    <div class="empty-state-title">Nenhuma trilha sonora disponível</div>
                    <div class="empty-state-text">Faixas serão adicionadas em breve!</div>
                </div>
            `;
            return;
        }
        container.innerHTML = tracks.map((t, i) => `
            <div class="soundtrack-item animate-in stagger-${Math.min(i + 1, 8)}">
                <div class="soundtrack-number">${String(i + 1).padStart(2, '0')}</div>
                <div class="soundtrack-info">
                    <div class="soundtrack-title">${t.title}</div>
                    <div class="soundtrack-artist">${t.artist || game.developer}</div>
                </div>
                <div class="soundtrack-links">
                    ${t.spotifyUrl ? `<a href="${t.spotifyUrl}" target="_blank" class="soundtrack-link">SPOTIFY</a>` : ''}
                    ${t.youtubeUrl ? `<a href="${t.youtubeUrl}" target="_blank" class="soundtrack-link">YOUTUBE</a>` : ''}
                </div>
            </div>
        `).join('');
    },

    renderGameplays(container, game) {
        const gameplays = game.gameplays || [];
        if (gameplays.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎮</div>
                    <div class="empty-state-title">Nenhuma gameplay disponível</div>
                    <div class="empty-state-text">Gameplays serão adicionadas em breve!</div>
                </div>
            `;
            return;
        }
        container.innerHTML = gameplays.map((g, i) => `
            <div class="gameplay-card animate-in stagger-${Math.min(i + 1, 8)}">
                <div class="video-embed">
                    <iframe src="${g.embedUrl}" allowfullscreen></iframe>
                </div>
                <div class="gameplay-card-info">
                    <div class="gameplay-card-title">${g.title}</div>
                    <a href="${g.youtubeUrl}" target="_blank" class="gameplay-card-link">Ver no YouTube ↗</a>
                </div>
            </div>
        `).join('');
    }
};
