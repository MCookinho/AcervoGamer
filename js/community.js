const Community = {
    async renderCommunityPage(container) {
        container.innerHTML = `
            <div class="landing-section">
                <h2 class="p5-section-title animate-in">COMUNIDADE</h2>
                <p class="p5-section-subtitle animate-in stagger-1">Conecte-se com outros gamers</p>
                <div class="p5-tabs animate-in stagger-2">
                    <button class="p5-tab active" data-tab="announcements"><span>ANÚNCIOS</span></button>
                    <button class="p5-tab" data-tab="forums"><span>FÓRUNS</span></button>
                    <button class="p5-tab" data-tab="profiles"><span>PERFIS</span></button>
                </div>
                <div id="community-content" class="animate-in stagger-3"></div>
            </div>
        `;

        const content = Utils.$('#community-content');
        this.renderAnnouncements(content);

        container.querySelectorAll('.p5-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                container.querySelectorAll('.p5-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const tabId = tab.dataset.tab;
                if (tabId === 'announcements') this.renderAnnouncements(content);
                else if (tabId === 'forums') this.renderForums(content);
                else if (tabId === 'profiles') this.renderProfiles(content);
            });
        });
    },

    async renderAnnouncements(container) {
        try {
            const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').limit(20).get();
            const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (announcements.length === 0) {
                container.innerHTML = '<p style="color: var(--br-gray-light); padding: 20px;">Nenhum anúncio ainda.</p>';
                return;
            }

            container.innerHTML = announcements.map((a, i) => `
                <div class="announcement-card animate-in stagger-${Math.min(i + 1, 8)}">
                    <div class="announcement-date">${Utils.formatDate(a.createdAt?.toDate())}</div>
                    <h3 class="announcement-title">${Utils.escapeHtml(a.title)}</h3>
                    <p class="announcement-text">${Utils.escapeHtml(a.text)}</p>
                </div>
            `).join('');
        } catch (error) {
            container.innerHTML = '<p style="color: var(--br-gray-light); padding: 20px;">Nenhum anúncio ainda.</p>';
        }
    },

    async renderForums(container) {
        try {
            const snapshot = await db.collection('forums').orderBy('createdAt', 'desc').limit(30).get();
            const forums = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            let html = '';
            if (Auth.isLoggedIn()) {
                html += `
                    <div style="margin-bottom: 24px;">
                        <button class="p5-btn p5-ripple" id="create-forum-btn"><span>CRIAR FÓRUM</span></button>
                    </div>
                    <div id="create-forum-form" class="hidden" style="margin-bottom: 24px;">
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <input type="text" class="p5-input" id="forum-title" placeholder="Título do fórum" maxlength="100">
                            <textarea class="p5-textarea" id="forum-body" placeholder="Escreva algo..." maxlength="2000"></textarea>
                            <button class="p5-btn p5-ripple" id="submit-forum-btn" style="align-self:flex-start"><span>PUBLICAR</span></button>
                        </div>
                    </div>
                `;
            } else {
                html += `<p style="color: var(--br-gray-light); margin-bottom: 20px;"><a href="#/auth" style="color: var(--br-green);">Faça login</a> para criar fóruns.</p>`;
            }

            if (forums.length === 0) {
                html += '<p style="color: var(--br-gray-light); padding: 20px;">Nenhum fórum criado ainda.</p>';
            } else {
                html += '<div class="forums-preview">';
                html += forums.map((f, i) => `
                    <div class="forum-card animate-in stagger-${Math.min(i + 1, 8)}" onclick="Community.openForum('${f.id}')">
                        <div class="forum-card-title">${Utils.escapeHtml(f.title)}</div>
                        <div class="forum-card-meta">
                            <span>Por ${Utils.escapeHtml(f.authorName || 'Anônimo')}</span>
                            <span>${Utils.timeAgo(f.createdAt?.toDate())}</span>
                        </div>
                        <div class="forum-card-excerpt">${Utils.escapeHtml((f.body || '').substring(0, 150))}${(f.body || '').length > 150 ? '...' : ''}</div>
                    </div>
                `).join('');
                html += '</div>';
            }

            container.innerHTML = html;

            const createBtn = Utils.$('#create-forum-btn');
            if (createBtn) {
                createBtn.addEventListener('click', () => {
                    Utils.toggle('#create-forum-form', 'hidden');
                });
            }

            const submitBtn = Utils.$('#submit-forum-btn');
            if (submitBtn) {
                submitBtn.addEventListener('click', async () => {
                    const title = Utils.sanitizeInput(Utils.$('#forum-title').value);
                    const body = Utils.sanitizeInput(Utils.$('#forum-body').value);
                    if (!title || !body) {
                        Utils.toast('Preencha todos os campos.', 'error');
                        return;
                    }
                    try {
                        await db.collection('forums').add({
                            title,
                            body,
                            authorId: Auth.currentUser.uid,
                            authorName: Auth.userProfile?.displayName || Auth.currentUser.displayName,
                            authorAvatar: Auth.userProfile?.avatar || '',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                            replies: 0
                        });
                        Utils.toast('Fórum criado!', 'success');
                        this.renderForums(container);
                    } catch (error) {
                        Utils.toast('Erro ao criar fórum.', 'error');
                    }
                });
            }
        } catch (error) {
            container.innerHTML = '<p style="color: var(--br-gray-light); padding: 20px;">Nenhum fórum criado ainda.</p>';
        }
    },

    async openForum(forumId) {
        try {
            const doc = await db.collection('forums').doc(forumId).get();
            if (!doc.exists) return;
            const forum = { id: doc.id, ...doc.data() };

            const repliesSnap = await db.collection('forums').doc(forumId).collection('replies').orderBy('createdAt', 'asc').get();
            const replies = repliesSnap.docs.map(r => ({ id: r.id, ...r.data() }));

            const overlay = Utils.$('#modal-overlay');
            const content = Utils.$('#modal-content');

            let repliesHTML = replies.map(r => `
                <div class="comment-item">
                    <div class="comment-avatar" style="background-image: url('${r.authorAvatar || ''}')">${r.authorAvatar ? '' : Utils.getInitials(r.authorName)}</div>
                    <div class="comment-body">
                        <div class="comment-header">
                            <span class="comment-author">${Utils.escapeHtml(r.authorName)}</span>
                            <span class="comment-time">${Utils.timeAgo(r.createdAt?.toDate())}</span>
                        </div>
                        <p class="comment-text">${Utils.escapeHtml(r.text)}</p>
                    </div>
                </div>
            `).join('');

            let replyForm = '';
            if (Auth.isLoggedIn()) {
                replyForm = `
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <input type="text" class="p5-input" id="forum-reply-input" placeholder="Responder..." style="flex:1">
                        <button class="p5-btn p5-btn-small" id="forum-reply-btn"><span>ENVIAR</span></button>
                    </div>
                `;
            }

            content.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h2 style="font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 3px; margin-bottom: 8px;">${Utils.escapeHtml(forum.title)}</h2>
                    <div style="font-size: 0.85rem; color: var(--br-gray-light); margin-bottom: 16px;">
                        Por ${Utils.escapeHtml(forum.authorName)} • ${Utils.timeAgo(forum.createdAt?.toDate())}
                    </div>
                    <p style="color: var(--br-gray-light); line-height: 1.6;">${Utils.escapeHtml(forum.body)}</p>
                </div>
                <div class="p5-divider"></div>
                <h3 style="font-family: var(--font-display); font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 16px;">RESPOSTAS (${replies.length})</h3>
                ${repliesHTML || '<p style="color: var(--br-gray-mid);">Nenhuma resposta ainda.</p>'}
                ${replyForm}
                <button class="p5-btn p5-btn-small" style="margin-top: 20px;" id="close-modal-btn"><span>FECHAR</span></button>
            `;

            Utils.show(overlay);

            Utils.$('#close-modal-btn')?.addEventListener('click', () => Utils.hide(overlay));
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) Utils.hide(overlay);
            });

            const replyBtn = Utils.$('#forum-reply-btn');
            if (replyBtn) {
                replyBtn.addEventListener('click', async () => {
                    const input = Utils.$('#forum-reply-input');
                    const text = Utils.sanitizeInput(input.value);
                    if (!text) return;
                    try {
                        await db.collection('forums').doc(forumId).collection('replies').add({
                            text,
                            authorId: Auth.currentUser.uid,
                            authorName: Auth.userProfile?.displayName || Auth.currentUser.displayName,
                            authorAvatar: Auth.userProfile?.avatar || '',
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        await db.collection('forums').doc(forumId).update({
                            replies: firebase.firestore.FieldValue.increment(1)
                        });
                        input.value = '';
                        Utils.hide(overlay);
                        this.openForum(forumId);
                        Utils.toast('Resposta enviada!', 'success');
                    } catch (error) {
                        Utils.toast('Erro ao responder.', 'error');
                    }
                });
            }
        } catch (error) {
            Utils.toast('Erro ao carregar fórum.', 'error');
        }
    },

    async renderProfiles(container) {
        container.innerHTML = `
            <div class="search-bar" style="margin-bottom: 30px;">
                <span class="search-icon">🔍</span>
                <input type="text" class="p5-input" id="profile-search" placeholder="Buscar perfis por nome..." style="padding-left: 50px;">
            </div>
            <div id="profiles-grid" class="community-grid"></div>
        `;

        const grid = Utils.$('#profiles-grid');
        await this.loadProfiles(grid, '');

        Utils.$('#profile-search').addEventListener('input', Utils.debounce(async (e) => {
            await this.loadProfiles(grid, e.target.value);
        }, 400));
    },

    async loadProfiles(grid, query) {
        try {
            let ref = db.collection('users').orderBy('displayName');
            if (query) {
                ref = ref.where('displayName', '>=', query).where('displayName', '<=', query + '\uf8ff');
            }
            const snapshot = await ref.limit(20).get();
            const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (profiles.length === 0) {
                grid.innerHTML = '<p style="color: var(--br-gray-light); padding: 20px; grid-column: 1/-1;">Nenhum perfil encontrado.</p>';
                return;
            }

            grid.innerHTML = profiles.map((p, i) => `
                <div class="profile-card animate-in stagger-${Math.min(i + 1, 8)}" onclick="Community.viewProfile('${p.id}')">
                    <div class="profile-banner" style="background-image: url('${p.banner || ''}')"></div>
                    <div class="profile-avatar-wrapper">
                        <div class="profile-avatar-large" style="background-image: url('${p.avatar || ''}')">${p.avatar ? '' : Utils.getInitials(p.displayName)}</div>
                    </div>
                    <div class="profile-info">
                        <div class="profile-name">${Utils.escapeHtml(p.displayName)}</div>
                        <div class="profile-bio">${Utils.escapeHtml(p.bio || 'Sem biografia')}</div>
                        <div class="profile-meta">
                            ${p.favoriteGame ? `<span class="profile-meta-item">🎮 ${Utils.escapeHtml(p.favoriteGame)}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            grid.innerHTML = '<p style="color: var(--br-gray-light); padding: 20px; grid-column: 1/-1;">Nenhum perfil encontrado.</p>';
        }
    },

    async viewProfile(uid) {
        const profile = await Auth.getProfile(uid);
        if (!profile) {
            Utils.toast('Perfil não encontrado.', 'error');
            return;
        }

        const overlay = Utils.$('#modal-overlay');
        const content = Utils.$('#modal-content');

        content.innerHTML = `
            <div style="margin: -40px; margin-bottom: 0; height: 150px; background: ${profile.banner ? `url('${profile.banner}') center/cover` : 'var(--gradient-p5)'}; clip-path: polygon(20px 0, 100% 0, 100% 100%, 0 100%, 0 20px);"></div>
            <div style="display: flex; align-items: flex-end; gap: 16px; margin-top: -40px; margin-bottom: 20px; padding: 0 0 16px;">
                <div class="profile-avatar-large" style="background-image: url('${profile.avatar || ''}')">${profile.avatar ? '' : Utils.getInitials(profile.displayName)}</div>
                <div>
                    <h2 style="font-family: var(--font-display); font-size: 1.8rem; letter-spacing: 3px;">${Utils.escapeHtml(profile.displayName)}</h2>
                </div>
            </div>
            ${profile.bio ? `<p style="color: var(--br-gray-light); line-height: 1.6; margin-bottom: 16px;">${Utils.escapeHtml(profile.bio)}</p>` : ''}
            <div class="profile-details-grid" style="grid-template-columns: 1fr; margin-bottom: 16px;">
                ${profile.favoriteGame ? `<div class="profile-detail-item"><div class="profile-detail-label">Jogo Favorito</div><div class="profile-detail-value">🎮 ${Utils.escapeHtml(profile.favoriteGame)}</div></div>` : ''}
                ${profile.personalSite ? `<div class="profile-detail-item"><div class="profile-detail-label">Site Pessoal</div><div class="profile-detail-value"><a href="${Utils.escapeHtml(profile.personalSite)}" target="_blank" style="color: var(--br-green);">${Utils.escapeHtml(profile.personalSite)}</a></div></div>` : ''}
            </div>
            <button class="p5-btn p5-btn-small" style="margin-top: 10px;" id="close-modal-btn"><span>FECHAR</span></button>
        `;

        Utils.show(overlay);
        Utils.$('#close-modal-btn')?.addEventListener('click', () => Utils.hide(overlay));
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) Utils.hide(overlay);
        });
    },

    renderProfileEdit(container) {
        if (!Auth.isLoggedIn()) {
            container.innerHTML = `
                <div class="landing-section" style="text-align: center;">
                    <h2 class="p5-section-title">ACESSO RESTRITO</h2>
                    <p style="color: var(--br-gray-light); margin: 20px 0;"><a href="#/auth" style="color: var(--br-green);">Faça login</a> para editar seu perfil.</p>
                </div>
            `;
            return;
        }

        const p = Auth.userProfile || {};
        const avatares = Auth.getAllAvatares();
        const banners = Auth.getAllBanners();

        container.innerHTML = `
            <div class="landing-section" style="max-width: 800px; margin: 0 auto;">
                <h2 class="p5-section-title animate-in">EDITAR PERFIL</h2>
                <p class="p5-section-subtitle animate-in stagger-1">Personalize seu perfil</p>

                <div class="animate-in stagger-2" style="margin-bottom: 30px;">
                    <h3 style="font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 2px; margin-bottom: 12px; color: var(--br-green);">AVATAR</h3>
                    <div class="preset-grid" id="avatar-grid">
                        ${avatares.map(a => `
                            <div class="preset-option ${p.avatar === a ? 'selected' : ''}" style="background-image: url('${a}')" data-avatar="${a}"></div>
                        `).join('')}
                    </div>
                </div>

                <div class="animate-in stagger-3" style="margin-bottom: 30px;">
                    <h3 style="font-family: var(--font-display); font-size: 1.3rem; letter-spacing: 2px; margin-bottom: 12px; color: var(--br-green);">BANNER</h3>
                    <div class="preset-banner-grid" id="banner-grid">
                        ${banners.map(b => `
                            <div class="preset-banner-option ${p.banner === b ? 'selected' : ''}" style="background-image: url('${b}')" data-banner="${b}"></div>
                        `).join('')}
                    </div>
                </div>

                <div class="animate-in stagger-4" style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label style="font-family: var(--font-heading); font-size: 0.85rem; color: var(--br-gray-light); letter-spacing: 1px; margin-bottom: 6px; display: block;">NOME</label>
                        <input type="text" class="p5-input" id="edit-name" value="${Utils.escapeHtml(p.displayName || '')}" maxlength="30">
                    </div>
                    <div>
                        <label style="font-family: var(--font-heading); font-size: 0.85rem; color: var(--br-gray-light); letter-spacing: 1px; margin-bottom: 6px; display: block;">BIOGRAFIA</label>
                        <textarea class="p5-textarea" id="edit-bio" maxlength="300" placeholder="Conte algo sobre você...">${Utils.escapeHtml(p.bio || '')}</textarea>
                    </div>
                    <div>
                        <label style="font-family: var(--font-heading); font-size: 0.85rem; color: var(--br-gray-light); letter-spacing: 1px; margin-bottom: 6px; display: block;">JOGO FAVORITO</label>
                        <input type="text" class="p5-input" id="edit-fav-game" value="${Utils.escapeHtml(p.favoriteGame || '')}" maxlength="50">
                    </div>
                    <div>
                        <label style="font-family: var(--font-heading); font-size: 0.85rem; color: var(--br-gray-light); letter-spacing: 1px; margin-bottom: 6px; display: block;">SITE PESSOAL</label>
                        <input type="url" class="p5-input" id="edit-site" value="${Utils.escapeHtml(p.personalSite || '')}" placeholder="https://...">
                    </div>
                    <button class="p5-btn p5-ripple" id="save-profile-btn" style="align-self: flex-start;"><span>SALVAR</span></button>
                </div>
            </div>
        `;

        let selectedAvatar = p.avatar || '';
        let selectedBanner = p.banner || '';

        Utils.$$('#avatar-grid .preset-option').forEach(opt => {
            opt.addEventListener('click', () => {
                Utils.$$('#avatar-grid .preset-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedAvatar = opt.dataset.avatar;
            });
        });

        Utils.$$('#banner-grid .preset-banner-option').forEach(opt => {
            opt.addEventListener('click', () => {
                Utils.$$('#banner-grid .preset-banner-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedBanner = opt.dataset.banner;
            });
        });

        Utils.$('#save-profile-btn').addEventListener('click', async () => {
            const data = {
                displayName: Utils.sanitizeInput(Utils.$('#edit-name').value),
                bio: Utils.sanitizeInput(Utils.$('#edit-bio').value),
                favoriteGame: Utils.sanitizeInput(Utils.$('#edit-fav-game').value),
                personalSite: Utils.sanitizeInput(Utils.$('#edit-site').value),
                avatar: selectedAvatar,
                banner: selectedBanner
            };

            if (!data.displayName) {
                Utils.toast('O nome é obrigatório.', 'error');
                return;
            }

            await Auth.updateProfile(data);
            Auth.updateUI();
        });
    }
};
