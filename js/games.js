const Games = {
    data: [],
    GITHUB_REPO: 'MCookinho/AcervoGamer',
    CACHE_KEY: 'acervogamer_games_cache_v5',
    CACHE_TTL: 1000 * 60 * 30,
    _folderCache: {},

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
            const items = await res.json();

            if (!Array.isArray(items)) throw new Error('Unexpected API response');

            const gameFolders = items.filter(i =>
                i.type === 'dir' && i.name !== 'Songs'
            );

            if (gameFolders.length === 0) throw new Error('No game folders found');

            const promises = gameFolders.map(f =>
                fetch(`https://raw.githubusercontent.com/${this.GITHUB_REPO}/main/data/games/${f.name}/${f.name}.json`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
            );
            const results = await Promise.all(promises);
            const loaded = results.filter(Boolean);
            if (loaded.length === 0) throw new Error('All game fetches failed');
            this.data = loaded;
            this.setCache(this.data);
        } catch (error) {
            console.error('Erro ao carregar jogos:', error);
            this.data = [];
        }
    },

    getCached() {
        try {
            const raw = sessionStorage.getItem(this.CACHE_KEY);
            if (!raw) return null;
            const { data, timestamp } = JSON.parse(raw);
            if (Date.now() - timestamp > this.CACHE_TTL) return null;
            return data;
        } catch { return null; }
    },

    setCache(data) {
        try {
            sessionStorage.setItem(this.CACHE_KEY, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch {}
    },

    clearCache() {
        sessionStorage.removeItem(this.CACHE_KEY);
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
                        ${game.previewGif ? `<img class="card-gif" src="${game.previewGif}" alt="${game.name} preview" loading="lazy">` : ''}
                        <div class="p5-card-image-overlay"></div>
                        <div class="p5-card-badges">${this.renderGenreTags(game.genre, false)}</div>
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

    _searchState: { query: '', genres: [], devs: [], platforms: [], eras: [], scales: [], ratings: [] },

    splitGenres(genre) {
        if (!genre) return [];
        return genre.split('/').map(g => g.trim()).filter(Boolean);
    },

    renderGenreTags(genre, small) {
        const genres = this.splitGenres(genre);
        const cls = small ? 'genre-tag genre-tag-sm' : 'genre-tag';
        return genres.map(g => `<span class="${cls}">${g}</span>`).join('');
    },

    getFilterOptions() {
        const genres = [...new Set(this.data.flatMap(g => this.splitGenres(g.genre)))].sort();
        const scales = [...new Set(this.data.map(g => g.productionScale).filter(Boolean))].sort();
        const devs = [...new Set(this.data.map(g => g.developer))].sort();
        const ratings = [...new Set(this.data.map(g => g.ageRating).filter(Boolean))].sort((a, b) => {
            const order = ['L', '10', '12', '14', '16', '18'];
            return order.indexOf(a) - order.indexOf(b);
        });
        const platforms = [...new Set(this.data.flatMap(g => (g.platforms || []).map(p => p.name)))].sort();
        return { genres, scales, devs, ratings, platforms };
    },

    filterGames() {
        const s = this._searchState;
        return this.data.filter(g => {
            if (s.query && !g.name.toLowerCase().includes(s.query.toLowerCase())) return false;
            if (s.genres.length > 0 && !s.genres.some(f => this.splitGenres(g.genre).includes(f))) return false;
            if (s.devs.length > 0 && !s.devs.includes(g.developer)) return false;
            if (s.platforms.length > 0 && !s.platforms.some(f => (g.platforms || []).some(p => p.name === f))) return false;
            if (s.scales.length > 0 && !s.scales.includes(g.productionScale)) return false;
            if (s.ratings.length > 0 && !s.ratings.includes(g.ageRating)) return false;
            if (s.eras.length > 0) {
                const y = g.year;
                const match = s.eras.some(e => {
                    if (e === '2010-2014') return y >= 2010 && y <= 2014;
                    if (e === '2015-2019') return y >= 2015 && y <= 2019;
                    if (e === '2020-2024') return y >= 2020 && y <= 2024;
                    if (e === '2025+') return y >= 2025;
                    return false;
                });
                if (!match) return false;
            }
            return true;
        });
    },

    renderGameCard(game, i) {
        return `
            <div class="game-card-3d animate-in stagger-${Math.min(i + 1, 6)}">
                <div class="p5-card game-card-inner" onclick="Router.goTo('#/jogos/${game.slug}')">
                    <div class="p5-card-image">
                        <img src="${game.cover}" alt="${game.name}" loading="lazy">
                        ${game.previewGif ? `<img class="card-gif" src="${game.previewGif}" alt="${game.name} preview" loading="lazy">` : ''}
                        <div class="p5-card-image-overlay"></div>
                        <div class="p5-card-badges">${this.renderGenreTags(game.genre, false)}</div>
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
        `;
    },

    onSearchInput(value) {
        this._searchState.query = value;
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => this.updateGamesGrid(), 200);
    },


    /* Tag Input Component */
    _tagInputTimers: {},

    renderTagInput(id, label, options, selected, placeholder) {
        const tags = selected.map(v =>
            `<span class="tag-input-tag">${v}<button class="tag-input-remove" onclick="Games.removeTag('${id}', '${v.replace(/'/g, "\\'")}')">&times;</button></span>`
        ).join('');
        return `
            <div class="filter-group tag-input-group">
                <label class="filter-label">${label}</label>
                <div class="tag-input-container" id="tag-container-${id}">
                    ${tags}
                    <input type="text" class="tag-input-field" id="tag-input-${id}"
                        placeholder="${selected.length ? '' : placeholder}"
                        autocomplete="off"
                        oninput="Games.onTagInput('${id}', this.value)"
                        onkeydown="Games.onTagKeydown(event, '${id}')"
                        onfocus="Games.showTagDropdown('${id}')"
                        onblur="Games.scheduleHideTagDropdown('${id}')">
                </div>
                <div class="tag-input-dropdown" id="tag-dropdown-${id}"></div>
            </div>
        `;
    },

    onTagInput(id, value) {
        clearTimeout(this._tagInputTimers[id]);
        this._tagInputTimers[id] = setTimeout(() => this.filterTagDropdown(id, value), 100);
    },

    onTagKeydown(event, id) {
        if (event.key === 'Escape') {
            this.hideTagDropdown(id);
        }
    },

    filterTagDropdown(id, value) {
        const stateKey = { genre: 'genres', dev: 'devs', platform: 'platforms', era: 'eras', scale: 'scales', rating: 'ratings' }[id];
        const selected = this._searchState[stateKey];
        const allOptions = this._tagFilterOptions[id] || [];
        const filtered = allOptions.filter(o => !selected.includes(o) && o.toLowerCase().includes(value.toLowerCase()));
        const dropdown = document.getElementById(`tag-dropdown-${id}`);
        if (!dropdown) return;
        if (filtered.length === 0 && value) {
            dropdown.innerHTML = `<div class="tag-input-empty">Nenhum resultado</div>`;
            dropdown.classList.add('open');
            return;
        }
        if (filtered.length === 0) {
            dropdown.innerHTML = allOptions.filter(o => !selected.includes(o)).map(o =>
                `<div class="tag-input-option" onmousedown="Games.addTag('${id}', '${o.replace(/'/g, "\\'")}')">${o}</div>`
            ).join('');
        } else {
            dropdown.innerHTML = filtered.map(o =>
                `<div class="tag-input-option" onmousedown="Games.addTag('${id}', '${o.replace(/'/g, "\\'")}')">${o}</div>`
            ).join('');
        }
        dropdown.classList.add('open');
    },

    showTagDropdown(id) {
        const input = document.getElementById(`tag-input-${id}`);
        const value = input ? input.value : '';
        this.filterTagDropdown(id, value);
    },

    scheduleHideTagDropdown(id) {
        setTimeout(() => this.hideTagDropdown(id), 200);
    },

    hideTagDropdown(id) {
        const dropdown = document.getElementById(`tag-dropdown-${id}`);
        if (dropdown) dropdown.classList.remove('open');
    },

    addTag(id, value) {
        const stateKey = { genre: 'genres', dev: 'devs', platform: 'platforms', era: 'eras', scale: 'scales', rating: 'ratings' }[id];
        if (!this._searchState[stateKey].includes(value)) {
            this._searchState[stateKey].push(value);
        }
        const input = document.getElementById(`tag-input-${id}`);
        if (input) input.value = '';
        this.updateTagInputTags(id);
        this.hideTagDropdown(id);
        this.updateGamesGrid();
    },

    removeTag(id, value) {
        const stateKey = { genre: 'genres', dev: 'devs', platform: 'platforms', era: 'eras', scale: 'scales', rating: 'ratings' }[id];
        this._searchState[stateKey] = this._searchState[stateKey].filter(v => v !== value);
        this.updateTagInputTags(id);
        this.updateGamesGrid();
    },

    updateTagInputTags(id) {
        const stateKey = { genre: 'genres', dev: 'devs', platform: 'platforms', era: 'eras', scale: 'scales', rating: 'ratings' }[id];
        const selected = this._searchState[stateKey];
        const container = document.getElementById(`tag-container-${id}`);
        const input = document.getElementById(`tag-input-${id}`);
        if (!container || !input) return;
        const existingTags = container.querySelectorAll('.tag-input-tag');
        existingTags.forEach(t => t.remove());
        selected.forEach(v => {
            const tag = document.createElement('span');
            tag.className = 'tag-input-tag';
            tag.innerHTML = `${v}<button class="tag-input-remove" onclick="Games.removeTag('${id}', '${v.replace(/'/g, "\\'")}')">&times;</button>`;
            container.insertBefore(tag, input);
        });
        input.placeholder = selected.length ? '' : (this._tagInputPlaceholders[id] || '');
    },

    _tagFilterOptions: {},
    _tagInputPlaceholders: {},

    clearFilters() {
        this._searchState = { query: '', genres: [], devs: [], platforms: [], eras: [], scales: [], ratings: [] };
        const input = document.getElementById('games-search-input');
        if (input) input.value = '';
        ['genre', 'dev', 'platform', 'era', 'scale', 'rating'].forEach(id => {
            this.updateTagInputTags(id);
            const input = document.getElementById(`tag-input-${id}`);
            if (input) input.placeholder = this._tagInputPlaceholders[id] || '';
        });
        this.updateGamesGrid();
    },

    hasActiveFilters() {
        const s = this._searchState;
        return s.query || s.genres.length > 0 || s.devs.length > 0 || s.platforms.length > 0 || s.eras.length > 0 || s.scales.length > 0 || s.ratings.length > 0;
    },

    updateGamesGrid() {
        const grid = document.getElementById('games-grid');
        const counter = document.getElementById('games-counter');
        if (!grid) return;
        const filtered = this.filterGames();
        if (counter) counter.textContent = `${filtered.length} jogo${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`;
        const clearBtn = document.getElementById('games-clear-btn');
        if (clearBtn) clearBtn.style.display = this.hasActiveFilters() ? 'inline-flex' : 'none';
        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">Nenhum jogo encontrado</div>
                    <div class="empty-state-text">Tente ajustar os filtros ou a busca.</div>
                </div>
            `;
            return;
        }
        grid.innerHTML = filtered.map((g, i) => this.renderGameCard(g, i)).join('');
    },

    toggleAdvancedSearch() {
        const panel = document.getElementById('advanced-search-panel');
        const btn = document.getElementById('advanced-search-toggle');
        if (!panel) return;
        const isOpen = panel.classList.contains('open');
        panel.classList.toggle('open');
        if (btn) btn.classList.toggle('open');
    },

    renderGamesPage(container) {
        const { genres, scales, devs, ratings, platforms } = this.getFilterOptions();
        const s = this._searchState;

        const eraOptions = ['2010-2014', '2015-2019', '2020-2024', '2025+'];

        this._tagFilterOptions = { genre: genres, dev: devs, platform: platforms, era: eraOptions, scale: scales, rating: ratings };
        this._tagInputPlaceholders = { genre: 'Digitar gênero...', dev: 'Digitar desenvolvedor...', platform: 'Digitar plataforma...', era: 'Digitar época...', scale: 'Digitar escala...', rating: 'Digitar classificação...' };

        const hasFilters = this.hasActiveFilters();

        container.innerHTML = `
            <div class="landing-section">
                <h2 class="p5-section-title animate-in">TODOS OS JOGOS</h2>
                <p class="p5-section-subtitle animate-in stagger-1">Explore nosso acervo completo</p>

                <div class="games-search-bar animate-in stagger-2">
                    <span class="games-search-icon">🔍</span>
                    <input type="text" id="games-search-input" class="games-search-input"
                        placeholder="Pesquisar jogos..."
                        value="${s.query}"
                        oninput="Games.onSearchInput(this.value)">
                </div>

                <div class="games-search-toolbar animate-in stagger-3">
                    <button id="advanced-search-toggle" class="advanced-search-toggle ${hasFilters ? 'open' : ''}" onclick="Games.toggleAdvancedSearch()">
                        <span>⚙ Busca Avançada</span>
                        <span class="advanced-search-arrow">▾</span>
                    </button>
                    <button id="games-clear-btn" class="games-clear-btn" style="display: ${hasFilters ? 'inline-flex' : 'none'}" onclick="Games.clearFilters()">✕ Limpar filtros</button>
                    <span id="games-counter" class="games-counter">${this.filterGames().length} jogo${this.filterGames().length !== 1 ? 's' : ''} encontrado${this.filterGames().length !== 1 ? 's' : ''}</span>
                </div>

                <div id="advanced-search-panel" class="advanced-search-panel ${hasFilters ? 'open' : ''}">
                    <div class="advanced-search-grid">
                        ${this.renderTagInput('genre', 'Gênero', genres, s.genres, 'Digitar gênero...')}
                        ${this.renderTagInput('platform', 'Plataforma', platforms, s.platforms, 'Digitar plataforma...')}
                        ${this.renderTagInput('dev', 'Desenvolvedor', devs, s.devs, 'Digitar desenvolvedor...')}
                        ${this.renderTagInput('era', 'Época', eraOptions, s.eras, 'Digitar época...')}
                        ${this.renderTagInput('scale', 'Escala de Produção', scales, s.scales, 'Digitar escala...')}
                        ${this.renderTagInput('rating', 'Classificação', ratings, s.ratings, 'Digitar classificação...')}
                    </div>
                </div>

                <div id="games-grid" class="games-grid">
                    ${this.filterGames().map((g, i) => this.renderGameCard(g, i)).join('')}
                </div>
            </div>
        `;
    },

    renderGameDetail(container, slug) {
        const game = this.getGame(slug);
        if (!game) {
            container.innerHTML = '<div class="landing-section"><h2 class="p5-section-title">Jogo não encontrado</h2></div>';
            return;
        }

        const tabs = ['Visão Geral', 'Comprar', 'Traduções', 'Mods', 'Trilha Sonora', 'Gameplays', 'Comentários'];
        const tabIds = ['overview', 'stores', 'translations', 'mods', 'soundtrack', 'gameplays', 'comments'];

        container.innerHTML = `
            <div class="p5-game-header">
                ${game.bannerGif
                    ? `<img class="p5-game-header-bg p5-game-header-gif" src="${game.bannerGif}" alt="${game.name} banner" loading="lazy">`
                    : `<div class="p5-game-header-bg" style="background-image: url('${game.background}')"></div>`
                }
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
            case 'stores':
                this.renderStores(container, game);
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

    getPlatformColor(name) {
        const n = name.toLowerCase();
        if (n === 'pc') return '#00c853';
        if (n === 'mobile') return '#9c27b0';
        if (n.includes('playstation') || n === 'ps4' || n === 'ps5' || n === 'ps vita') return '#2962ff';
        if (n.includes('xbox')) return '#1b5e20';
        if (n.includes('nintendo') || n === 'switch') return '#d50000';
        if (n === 'macos' || n === 'mac') return '#424242';
        return '#616161';
    },

    getPlatformIcon(name) {
        const n = name.toLowerCase();
        if (n === 'pc') return '💻';
        if (n === 'mobile') return '📱';
        if (n.includes('playstation') || n === 'ps4' || n === 'ps5') return '🎮';
        if (n === 'ps vita') return '🎮';
        if (n.includes('xbox')) return '🎮';
        if (n.includes('nintendo') || n === 'switch') return '🎮';
        if (n === 'macos' || n === 'mac') return '🍎';
        return '🎮';
    },

    toggleRequirements(id) {
        const el = document.getElementById(id);
        const btn = el?.previousElementSibling;
        if (!el) return;
        const isOpen = el.classList.contains('open');
        el.classList.toggle('open');
        if (btn) btn.classList.toggle('open');
    },

    renderOverview(container, game) {
        const ageRatingColors = {
            'L': '#00c853',
            '10': '#ffeb3b',
            '12': '#ffc107',
            '14': '#ff9800',
            '16': '#f44336',
            '18': '#9c27b0'
        };
        const ageRatingLabels = {
            'L': 'Livre',
            '10': '10 anos',
            '12': '12 anos',
            '14': '14 anos',
            '16': '16 anos',
            '18': '18 anos'
        };
        const ratingColor = ageRatingColors[game.ageRating] || '#999';
        const ratingLabel = ageRatingLabels[game.ageRating] || game.ageRating;

        const platforms = game.platforms || [];
        const platformBadges = platforms.map(p => {
            const color = this.getPlatformColor(p.name);
            const icon = this.getPlatformIcon(p.name);
            return `<span class="platform-badge" style="--badge-color: ${color};">${icon} ${p.name}</span>`;
        }).join('');

        const reqPlatforms = platforms.filter(p => p.requirements);
        let requirementsHtml = '';
        if (reqPlatforms.length > 0) {
            const panels = reqPlatforms.map(p => {
                const r = p.requirements;
                const minFields = Object.entries(r.minimum || {}).map(([k, v]) => {
                    const labels = { os: 'SO', processor: 'Processador', memory: 'Memória', graphics: 'Placa de Vídeo', storage: 'Armazenamento', directX: 'DirectX' };
                    return `<div class="req-field"><span class="req-label">${labels[k] || k}</span><span class="req-value">${v}</span></div>`;
                }).join('');
                const recFields = Object.entries(r.recommended || {}).map(([k, v]) => {
                    const labels = { os: 'SO', processor: 'Processador', memory: 'Memória', graphics: 'Placa de Vídeo', storage: 'Armazenamento', directX: 'DirectX' };
                    return `<div class="req-field"><span class="req-label">${labels[k] || k}</span><span class="req-value">${v}</span></div>`;
                }).join('');
                return `
                    <div class="req-panel">
                        <h4 class="req-panel-title">${this.getPlatformIcon(p.name)} ${p.name}</h4>
                        <div class="req-columns">
                            <div class="req-column">
                                <h5 class="req-column-title">Mínimos</h5>
                                ${minFields}
                            </div>
                            <div class="req-column">
                                <h5 class="req-column-title">Recomendados</h5>
                                ${recFields}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            requirementsHtml = `
                <button class="requirements-toggle" onclick="Games.toggleRequirements('requirements-content-${game.slug}')">
                    <span class="requirements-toggle-text">Requisitos de Hardware</span>
                    <span class="requirements-toggle-arrow">▾</span>
                </button>
                <div class="requirements-content" id="requirements-content-${game.slug}">
                    ${panels}
                </div>
            `;
        }

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
                        <div class="p5-stat-number" style="font-size: 1.5rem;">${game.productionScale || '—'}</div>
                        <div class="p5-stat-label">Escala de Produção</div>
                    </div>
                    <div class="p5-stat-card">
                        <div class="p5-stat-number" style="font-size: 1.5rem;">${game.developer}</div>
                        <div class="p5-stat-label">Desenvolvedor</div>
                    </div>
                    <div class="p5-stat-card">
                        <div class="p5-stat-number" style="font-size: 1.5rem;">${game.year}</div>
                        <div class="p5-stat-label">Ano de Lançamento</div>
                    </div>
                    <div class="p5-stat-card" style="position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: ${ratingColor}; border-radius: 2px;"></div>
                        <div class="p5-stat-number" style="font-size: 1.5rem; padding-left: 12px;">${ratingLabel}</div>
                        <div class="p5-stat-label" style="padding-left: 12px;">Classificação Indicativa</div>
                    </div>
                </div>
                ${platforms.length > 0 ? `
                    <h3 style="font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 3px; margin-bottom: 20px; color: var(--br-green);">PLATAFORMAS</h3>
                    <div class="platforms-list">${platformBadges}</div>
                    ${requirementsHtml}
                ` : ''}
                ${game.trailer ? `
                    <h3 style="font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 3px; margin-bottom: 20px; color: var(--br-green);">TRAILER</h3>
                    <div class="video-embed">
                        <iframe src="${game.trailer}" allowfullscreen></iframe>
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderStores(container, game) {
        const stores = (game.stores || []).slice()
            .filter(s => s.price != null && !isNaN(s.price))
            .sort((a, b) => a.price - b.price);
        if (stores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛒</div>
                    <div class="empty-state-title">Nenhuma loja disponível</div>
                    <div class="empty-state-text">Links de compra serão adicionados em breve!</div>
                </div>
            `;
            return;
        }

        const bestPrice = stores.length > 0 ? stores[0].price : null;

        const storeIcons = {
            'Steam': { class: 'store-icon-steam', icon: '🎮' },
            'GOG': { class: 'store-icon-gog', icon: '🌌' },
            'Humble Bundle': { class: 'store-icon-humble', icon: '📦' },
            'Fanatical': { class: 'store-icon-fanatical', icon: '🎯' },
            'Eneba': { class: 'store-icon-eneba', icon: '🔑' },
            'GamersGate': { class: 'store-icon-default', icon: '🎮' },
            'GreenManGaming': { class: 'store-icon-default', icon: '🟢' },
            'Uplay': { class: 'store-icon-default', icon: ' Ubisoft' },
            'WinGameStore': { class: 'store-icon-default', icon: '🎮' },
            'GameBillet': { class: 'store-icon-default', icon: '🎮' },
            'Epic Games Store': { class: 'store-icon-default', icon: '🏪' },
            'Gamesplanet': { class: 'store-icon-default', icon: '🎮' },
            'Gamesload': { class: 'store-icon-default', icon: '🎮' },
            'IndieGala': { class: 'store-icon-default', icon: '🎉' },
            'DreamGame': { class: 'store-icon-default', icon: '🎮' },
            'PlayStation Store': { class: 'store-icon-playstation', icon: '🎮' },
            'Nintendo eShop': { class: 'store-icon-nintendo', icon: '🍄' },
            'Xbox Store': { class: 'store-icon-xbox', icon: '🟢' },
        };

        container.innerHTML = `
            <div class="animate-in">
                <h3 style="font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 3px; margin-bottom: 8px; color: var(--br-green);">ONDE COMPRAR</h3>
                <p style="color: var(--br-gray-light); font-size: 0.85rem; margin-bottom: 24px;">Preços atualizados automaticamente a cada 6 horas</p>
                <div class="store-cards">
                    ${stores.map((s, i) => {
                        const iconInfo = storeIcons[s.store] || { class: 'store-icon-default', icon: '🏪' };
                        const isBest = bestPrice !== null && s.price === bestPrice && s.price > 0;
                        const isFree = s.price === 0;
                        return `
                            <div class="store-card ${isBest ? 'store-card-best' : ''} animate-in stagger-${Math.min(i + 1, 8)}">
                                <div class="store-icon ${iconInfo.class}">${iconInfo.icon}</div>
                                <div class="store-info">
                                    <div class="store-name">${s.store}${s.coupon ? ` <span class="store-coupon">CUPOM: ${s.coupon}</span>` : ''}</div>
                                    <div class="store-platform">${s.platform}</div>
                                </div>
                                <div class="store-price-area">
                                    <div class="store-price ${isFree ? 'store-price-free' : ''}">${isFree ? 'GRÁTIS' : (s.price != null ? `R$ ${s.price.toFixed(2).replace('.', ',')}` : 'Indisponível')}</div>
                                    ${s.priceOriginal && s.priceOriginal !== 'Grátis' ? `<div class="store-price-original">${s.priceOriginal}</div>` : ''}
                                </div>
                                <a href="${s.url}" target="_blank" class="store-buy">COMPRAR</a>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="store-updated">Preços consultados em ${game._pricesUpdated ? new Date(game._pricesUpdated).toLocaleDateString('pt-BR') : 'data desconhecida'}</div>
            </div>
        `;
    },

    async fetchFolderItems(type, slug) {
        const cacheKey = `${type}/${slug}`;
        if (this._folderCache[cacheKey]) return this._folderCache[cacheKey];
        const lsKey = `acervogamer_folders_${cacheKey}`;
        try {
            const raw = sessionStorage.getItem(lsKey);
            if (raw) {
                const { data, ts } = JSON.parse(raw);
                if (Date.now() - ts < this.CACHE_TTL) { this._folderCache[cacheKey] = data; return data; }
            }
        } catch {}
        const apiUrl = `https://api.github.com/repos/${this.GITHUB_REPO}/contents/data/games/${slug}/${type}`;
        try {
            const res = await fetch(apiUrl);
            if (!res.ok) { this._folderCache[cacheKey] = []; return []; }
            const items = await res.json();
            if (!Array.isArray(items)) { this._folderCache[cacheKey] = []; return []; }
            const dirs = items.filter(i => i.type === 'dir');
            this._folderCache[cacheKey] = dirs;
            try { sessionStorage.setItem(lsKey, JSON.stringify({ data: dirs, ts: Date.now() })); } catch {}
            return dirs;
        } catch { this._folderCache[cacheKey] = []; return []; }
    },

    async fetchInfoJson(type, slug, folderName) {
        const cacheKey = `${type}/${slug}/${folderName}`;
        if (this._folderCache[cacheKey]) return this._folderCache[cacheKey];
        const lsKey = `acervogamer_info_${cacheKey}`;
        try {
            const raw = sessionStorage.getItem(lsKey);
            if (raw) {
                const { data, ts } = JSON.parse(raw);
                if (Date.now() - ts < this.CACHE_TTL) { this._folderCache[cacheKey] = data; return data; }
            }
        } catch {}
        const url = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/main/data/games/${slug}/${type}/${folderName}/info.json`;
        try {
            const res = await fetch(url);
            if (!res.ok) { this._folderCache[cacheKey] = null; return null; }
            const data = await res.json();
            this._folderCache[cacheKey] = data;
            try { sessionStorage.setItem(lsKey, JSON.stringify({ data, ts: Date.now() })); } catch {}
            return data;
        } catch { this._folderCache[cacheKey] = null; return null; }
    },

    getDownloadUrl(type, slug, folderName, zipFile) {
        return `https://github.com/${this.GITHUB_REPO}/raw/main/data/games/${slug}/${type}/${folderName}/${zipFile}`;
    },

    async fetchOPCards(slug) {
        const cacheKey = `opcards/${slug}`;
        if (this._folderCache[cacheKey] !== undefined) return this._folderCache[cacheKey];
        const lsKey = `acervogamer_${cacheKey}`;
        try {
            const raw = sessionStorage.getItem(lsKey);
            if (raw) {
                const { data, ts } = JSON.parse(raw);
                if (Date.now() - ts < this.CACHE_TTL) { this._folderCache[cacheKey] = data; return data; }
            }
        } catch {}
        const url = `https://raw.githubusercontent.com/${this.GITHUB_REPO}/main/data/games/${slug}/OPCards.json`;
        try {
            const res = await fetch(url);
            if (!res.ok) { this._folderCache[cacheKey] = []; return []; }
            const json = await res.json();
            const cards = Array.isArray(json.cards) ? json.cards : [];
            this._folderCache[cacheKey] = cards;
            try { sessionStorage.setItem(lsKey, JSON.stringify({ data: cards, ts: Date.now() })); } catch {}
            return cards;
        } catch { this._folderCache[cacheKey] = []; return []; }
    },

    renderOPCards(cards) {
        if (!cards || cards.length === 0) return '';
        return cards.map((c, i) => {
            const badgeHtml = c.badge ? `<span class="op-card-badge" style="background: ${c.color}">${c.badge}</span>` : '';
            const statsHtml = c.stats ? `<span class="op-card-stats">${c.stats}</span>` : '';
            const btnHtml = c.siteUrl ? `<a href="${c.siteUrl}" class="op-card-btn" style="background: ${c.color}" target="_blank">${c.buttonLabel || 'ABRIR SITE'}</a>` : '';
            return `
                <div class="op-card animate-in stagger-${i + 1}" style="--op-color: ${c.color}">
                    <div class="op-card-accent" style="background: ${c.color}"></div>
                    <div class="op-card-content">
                        <div class="op-card-header">
                            <h4 class="op-card-title">${c.title}</h4>
                            ${badgeHtml}
                        </div>
                        <p class="op-card-desc">${c.description}</p>
                        <div class="op-card-footer">
                            ${statsHtml}
                            ${btnHtml}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async renderTranslations(container, game) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <div class="empty-state-title">Carregando traduções...</div>
            </div>
        `;
        const folders = await this.fetchFolderItems('translations', game.slug);
        if (folders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📄</div>
                    <div class="empty-state-title">Nenhuma tradução disponível</div>
                    <div class="empty-state-text">Traduções serão adicionadas em breve!</div>
                </div>
            `;
            return;
        }
        const infos = await Promise.all(folders.map(f => this.fetchInfoJson('translations', game.slug, f.name)));
        const items = folders.map((f, i) => ({ folder: f.name, info: infos[i] })).filter(i => i.info);
        container.innerHTML = items.map((item, i) => {
            const t = item.info;
            let actionBtn = '';
            if (t.zipFile) {
                const downloadUrl = this.getDownloadUrl('translations', game.slug, item.folder, t.zipFile);
                actionBtn = `<a href="${downloadUrl}" class="file-download" target="_blank">BAIXAR</a>`;
            } else if (t.officialUrl) {
                actionBtn = `<a href="${t.officialUrl}" class="file-download" target="_blank">ABRIR SITE</a>`;
            }
            return `
                <div class="traduction-item animate-in stagger-${i + 1}">
                    <div class="file-icon">📄</div>
                    <div class="file-info">
                        <div class="file-name">${t.name}</div>
                        <div class="file-meta">
                            <span>Versão: ${t.version}</span>
                            <span>Autor: ${t.author}</span>
                            ${t.date ? `<span>Data: ${Utils.formatDate(t.date)}</span>` : ''}
                        </div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
    },

    async renderMods(container, game) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <div class="empty-state-title">Carregando mods...</div>
            </div>
        `;
        const [folders, opCards] = await Promise.all([
            this.fetchFolderItems('mods', game.slug),
            this.fetchOPCards(game.slug)
        ]);
        const infos = await Promise.all(folders.map(f => this.fetchInfoJson('mods', game.slug, f.name)));
        const items = folders.map((f, i) => ({ folder: f.name, info: infos[i] })).filter(i => i.info);
        const hasOpcards = opCards && opCards.length > 0;
        const opcardsVisible = localStorage.getItem('acervogamer_opcards_visible') !== 'false';
        const opCardsHtml = hasOpcards ? this.renderOPCards(opCards) : '';
        if (items.length === 0 && !hasOpcards) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔧</div>
                    <div class="empty-state-title">Nenhum mod disponível</div>
                    <div class="empty-state-text">Mods serão adicionados em breve!</div>
                </div>
            `;
            return;
        }
        const toggleHtml = hasOpcards ? `
            <div class="opcards-toggle" onclick="Games.toggleOpcards()">
                <span class="opcards-toggle-icon">${opcardsVisible ? '👁' : '👁‍🗨'}</span>
                <span class="opcards-toggle-text">${opcardsVisible ? 'Ocultar cards' : 'Mostrar cards'}</span>
            </div>
        ` : '';
        const opCardsWrapper = hasOpcards ? `
            <div id="opcards-wrapper" class="opcards-wrapper ${opcardsVisible ? '' : 'opcards-hidden'}">
                ${opCardsHtml}
            </div>
        ` : '';
        const modsHtml = items.map((item, i) => {
            const m = item.info;
            let actionBtn = '';
            if (m.zipFile) {
                const downloadUrl = this.getDownloadUrl('mods', game.slug, item.folder, m.zipFile);
                actionBtn = `<a href="${downloadUrl}" class="file-download" target="_blank">BAIXAR</a>`;
            } else if (m.officialUrl) {
                actionBtn = `<a href="${m.officialUrl}" class="file-download" target="_blank">ABRIR SITE</a>`;
            }
            return `
                <div class="mod-item animate-in stagger-${Math.min(i + 1, 6)}">
                    <div class="file-icon">🔧</div>
                    <div class="file-info">
                        <div class="file-name">${m.name}</div>
                        <div class="file-meta">
                            <span>Versão: ${m.version}</span>
                            <span>Autor: ${m.author}</span>
                            ${m.date ? `<span>Data: ${Utils.formatDate(m.date)}</span>` : ''}
                        </div>
                    </div>
                    ${actionBtn}
                </div>
            `;
        }).join('');
        container.innerHTML = `${toggleHtml}${opCardsWrapper}${modsHtml}`;
    },

    toggleOpcards() {
        const wrapper = document.getElementById('opcards-wrapper');
        const toggle = document.querySelector('.opcards-toggle');
        if (!wrapper || !toggle) return;
        const isVisible = !wrapper.classList.contains('opcards-hidden');
        if (isVisible) {
            wrapper.classList.add('opcards-hiding');
            wrapper.addEventListener('animationend', () => {
                wrapper.classList.add('opcards-hidden');
                wrapper.classList.remove('opcards-hiding');
            }, { once: true });
            toggle.querySelector('.opcards-toggle-icon').textContent = '👁‍🗨';
            toggle.querySelector('.opcards-toggle-text').textContent = 'Mostrar cards';
            localStorage.setItem('acervogamer_opcards_visible', 'false');
        } else {
            wrapper.classList.remove('opcards-hidden', 'opcards-hiding');
            wrapper.classList.add('opcards-showing');
            wrapper.addEventListener('animationend', () => {
                wrapper.classList.remove('opcards-showing');
            }, { once: true });
            toggle.querySelector('.opcards-toggle-icon').textContent = '👁';
            toggle.querySelector('.opcards-toggle-text').textContent = 'Ocultar cards';
            localStorage.setItem('acervogamer_opcards_visible', 'true');
        }
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
                    <div class="soundtrack-artist">${t.artist || game.developer}${t.extra ? ` <span class="soundtrack-extra">${t.extra}</span>` : ''}</div>
                    <div class="soundtrack-links">
                        ${t.spotifyUrl ? `<a href="${t.spotifyUrl}" target="_blank" class="soundtrack-link">Spotify ↗</a>` : ''}
                        ${t.youtubeUrl ? `<a href="${t.youtubeUrl}" target="_blank" class="soundtrack-link">YouTube ↗</a>` : ''}
                    </div>
                </div>
                <div class="soundtrack-play-area">
                    <span class="soundtrack-duration">${t.duration || ''}</span>
                    ${t.youtubeUrl ? `<button class="soundtrack-play-btn" onclick="AudioPlayer.playFromSoundtrack(${JSON.stringify(t).replace(/"/g, '&quot;')}, '${game.name}')">▶</button>` : ''}
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
                <div class="gameplay-header">
                    <div class="gameplay-info">
                        <div class="gameplay-title">${g.title}</div>
                        <div class="gameplay-channel">
                            <a href="${g.channelUrl}" target="_blank" class="gameplay-channel-name">${g.channelName}</a>
                            <span class="gameplay-subscribers" data-channel-url="${g.channelUrl}">...</span>
                        </div>
                    </div>
                </div>
                <div class="video-embed">
                    <iframe src="${g.embedUrl}" allowfullscreen></iframe>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.gameplay-subscribers').forEach(el => {
            const channelUrl = el.dataset.channelUrl;
            this.fetchSubscribers(channelUrl).then(count => {
                el.textContent = count;
            }).catch(() => {
                el.textContent = '';
            });
        });
    },

    async fetchSubscribers(channelUrl) {
        try {
            const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${await this.getChannelId(channelUrl)}`);
            const text = await res.text();
            const match = text.match(/<yt:statistics[^>]*subscriberCount="([^"]+)"/);
            if (match) {
                const num = parseInt(match[1]);
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M inscritos`;
                if (num >= 1000) return `${(num / 1000).toFixed(1)}K inscritos`;
                return `${num} inscritos`;
            }
            return '';
        } catch {
            return '';
        }
    },

    async getChannelId(channelUrl) {
        try {
            const res = await fetch(channelUrl);
            const html = await res.text();
            const match = html.match(/"externalId"\s*:\s*"([^"]+)"/);
            return match ? match[1] : '';
        } catch {
            return '';
        }
    }
};
