const Comments = {
    async render(container, gameSlug) {
        let html = '';

        if (Auth.isLoggedIn()) {
            html += `
                <div style="margin-bottom: 24px; display: flex; gap: 12px; align-items: flex-start;">
                    <div class="comment-avatar" style="background-image: url('${Auth.userProfile?.avatar || ''}')">${Auth.userProfile?.avatar ? '' : Utils.getInitials(Auth.userProfile?.displayName)}</div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                        <textarea class="p5-textarea" id="comment-input" placeholder="Deixe seu comentário..." maxlength="1000" style="min-height: 80px;"></textarea>
                        <button class="p5-btn p5-btn-small p5-ripple" id="comment-submit-btn"><span>ENVIAR</span></button>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="login-prompt">
                    <a href="#/auth">Faça login</a> para comentar.
                </div>
            `;
        }

        try {
            const snapshot = await db.collection('game_comments')
                .where('gameSlug', '==', gameSlug)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (comments.length === 0) {
                html += `
                    <div class="empty-state">
                        <div class="empty-state-icon">💬</div>
                        <div class="empty-state-title">Nenhum comentário ainda</div>
                        <div class="empty-state-text">Seja o primeiro a comentar!</div>
                    </div>
                `;
            } else {
                html += comments.map((c, i) => `
                    <div class="comment-item animate-in stagger-${Math.min(i + 1, 8)}">
                        <div class="comment-avatar" style="background-image: url('${c.authorAvatar || ''}')">${c.authorAvatar ? '' : Utils.getInitials(c.authorName)}</div>
                        <div class="comment-body">
                            <div class="comment-header">
                                <span class="comment-author">${Utils.escapeHtml(c.authorName)}</span>
                                <span class="comment-time">${Utils.timeAgo(c.createdAt?.toDate())}</span>
                            </div>
                            <p class="comment-text">${Utils.escapeHtml(c.text)}</p>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            html += `
                <div class="empty-state">
                    <div class="empty-state-icon">💬</div>
                    <div class="empty-state-title">Nenhum comentário ainda</div>
                    <div class="empty-state-text">Seja o primeiro a comentar!</div>
                </div>
            `;
        }

        container.innerHTML = html;

        const submitBtn = Utils.$('#comment-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const input = Utils.$('#comment-input');
                const text = Utils.sanitizeInput(input.value);
                if (!text) {
                    Utils.toast('Escreva um comentário.', 'error');
                    return;
                }

                try {
                    await db.collection('game_comments').add({
                        gameSlug,
                        text,
                        authorId: Auth.currentUser.uid,
                        authorName: Auth.userProfile?.displayName || Auth.currentUser.displayName,
                        authorAvatar: Auth.userProfile?.avatar || '',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    Utils.toast('Comentário publicado!', 'success');
                    this.render(container, gameSlug);
                } catch (error) {
                    Utils.toast('Erro ao publicar comentário.', 'error');
                }
            });
        }
    }
};
