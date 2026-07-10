const Auth = {
    currentUser: null,
    userProfile: null,

    init() {
        auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            this.updateUI();
            if (user) {
                await this.loadProfile(user.uid);
            } else {
                this.userProfile = null;
            }
        });
    },

    async register(email, password, displayName) {
        try {
            const cred = await auth.createUserWithEmailAndPassword(email, password);
            await cred.user.updateProfile({ displayName });
            await this.createProfile(cred.user.uid, displayName, email);
            await cred.user.sendEmailVerification();
            Utils.toast('Conta criada! Verifique seu email.', 'success');
            return { success: true };
        } catch (error) {
            const messages = {
                'auth/email-already-in-use': 'Este email já está em uso.',
                'auth/invalid-email': 'Email inválido.',
                'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.'
            };
            Utils.toast(messages[error.code] || 'Erro ao criar conta.', 'error');
            return { success: false, error };
        }
    },

    async login(email, password) {
        try {
            await auth.signInWithEmailAndPassword(email, password);
            Utils.toast('Login realizado com sucesso!', 'success');
            return { success: true };
        } catch (error) {
            const messages = {
                'auth/user-not-found': 'Usuário não encontrado.',
                'auth/wrong-password': 'Senha incorreta.',
                'auth/invalid-email': 'Email inválido.',
                'auth/too-many-requests': 'Muitas tentativas. Tente novamente mais tarde.'
            };
            Utils.toast(messages[error.code] || 'Erro ao fazer login.', 'error');
            return { success: false, error };
        }
    },

    async logout() {
        try {
            await auth.signOut();
            Utils.toast('Você saiu da sua conta.', 'success');
            Router.goTo('/');
        } catch (error) {
            Utils.toast('Erro ao sair.', 'error');
        }
    },

    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            Utils.toast('Email de redefinição enviado!', 'success');
        } catch (error) {
            Utils.toast('Erro ao enviar email de redefinição.', 'error');
        }
    },

    isLoggedIn() {
        return !!this.currentUser;
    },

    async createProfile(uid, displayName, email) {
        const defaultAvatar = this.getRandomAvatar();
        const defaultBanner = this.getRandomBanner();
        await db.collection('users').doc(uid).set({
            displayName,
            email,
            bio: '',
            avatar: defaultAvatar,
            banner: defaultBanner,
            favoriteGame: '',
            personalSite: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            emailVerified: false
        });
    },

    async loadProfile(uid) {
        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) {
                this.userProfile = { id: doc.id, ...doc.data() };
                this.updateUI();
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
        }
    },

    async updateProfile(data) {
        if (!this.currentUser) return;
        try {
            await db.collection('users').doc(this.currentUser.uid).update(data);
            this.userProfile = { ...this.userProfile, ...data };
            Utils.toast('Perfil atualizado!', 'success');
            return { success: true };
        } catch (error) {
            Utils.toast('Erro ao atualizar perfil.', 'error');
            return { success: false };
        }
    },

    async getProfile(uid) {
        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    async searchProfiles(query) {
        try {
            const snapshot = await db.collection('users')
                .where('displayName', '>=', query)
                .where('displayName', '<=', query + '\uf8ff')
                .limit(20)
                .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            return [];
        }
    },

    getRandomAvatar() {
        const avatares = [
            'assets/images/presets/avatares/undertale/frisk.png',
            'assets/images/presets/avatares/undertale/sans.png',
            'assets/images/presets/avatares/undertale/papyrus.png',
            'assets/images/presets/avatares/undertale/toriel.png',
            'assets/images/presets/avatares/undertale/undyne.png',
            'assets/images/presets/avatares/undertale/alphys.png',
            'assets/images/presets/avatares/undertale/mettaton.png',
            'assets/images/presets/avatares/undertale/flowey.png',
            'assets/images/presets/avatares/undertale/asgore.png',
            'assets/images/presets/avatares/undertale/asriel.png',
            'assets/images/presets/avatares/undertale/napstablook.png',
            'assets/images/presets/avatares/undertale/snowdrake.png',
            'assets/images/presets/avatares/deltarune/ralsei.png',
            'assets/images/presets/avatares/deltarune/susie.png',
            'assets/images/presets/avatares/deltarune/kris.png',
            'assets/images/presets/avatares/deltarune/noelle.png',
            'assets/images/presets/avatares/deltarune/berdly.png',
            'assets/images/presets/avatares/deltarune/lancer.png',
            'assets/images/presets/avatares/deltarune/rouxls.png',
            'assets/images/presets/avatares/deltarune/spamton.png',
            'assets/images/presets/avatares/deltarune/jevil.png',
            'assets/images/presets/avatares/omori/omori.png',
            'assets/images/presets/avatares/omori/aubrey.png',
            'assets/images/presets/avatares/omori/hero.png',
            'assets/images/presets/avatares/omori/kel.png',
            'assets/images/presets/avatares/omori/basil.png',
            'assets/images/presets/avatares/omori/mari.png',
            'assets/images/presets/avatares/omori/sunny.png',
            'assets/images/presets/avatares/gerais/controle.png',
            'assets/images/presets/avatares/gerais/pixel.png',
            'assets/images/presets/avatares/gerais/retro.png',
        ];
        return avatares[Math.floor(Math.random() * avatares.length)];
    },

    getRandomBanner() {
        const banners = [
            'assets/images/presets/banners/undertale/banner1.png',
            'assets/images/presets/banners/undertale/banner2.png',
            'assets/images/presets/banners/deltarune/banner1.png',
            'assets/images/presets/banners/deltarune/banner2.png',
            'assets/images/presets/banners/omori/banner1.png',
            'assets/images/presets/banners/omori/banner2.png',
            'assets/images/presets/banners/gerais/banner1.png',
            'assets/images/presets/banners/gerais/banner2.png',
        ];
        return banners[Math.floor(Math.random() * banners.length)];
    },

    getAllAvatares() {
        return [
            'assets/images/presets/avatares/undertale/frisk.png',
            'assets/images/presets/avatares/undertale/sans.png',
            'assets/images/presets/avatares/undertale/papyrus.png',
            'assets/images/presets/avatares/undertale/toriel.png',
            'assets/images/presets/avatares/undertale/undyne.png',
            'assets/images/presets/avatares/undertale/alphys.png',
            'assets/images/presets/avatares/undertale/mettaton.png',
            'assets/images/presets/avatares/undertale/flowey.png',
            'assets/images/presets/avatares/undertale/asgore.png',
            'assets/images/presets/avatares/undertale/asriel.png',
            'assets/images/presets/avatares/undertale/napstablook.png',
            'assets/images/presets/avatares/undertale/snowdrake.png',
            'assets/images/presets/avatares/deltarune/ralsei.png',
            'assets/images/presets/avatares/deltarune/susie.png',
            'assets/images/presets/avatares/deltarune/kris.png',
            'assets/images/presets/avatares/deltarune/noelle.png',
            'assets/images/presets/avatares/deltarune/berdly.png',
            'assets/images/presets/avatares/deltarune/lancer.png',
            'assets/images/presets/avatares/deltarune/rouxls.png',
            'assets/images/presets/avatares/deltarune/spamton.png',
            'assets/images/presets/avatares/deltarune/jevil.png',
            'assets/images/presets/avatares/omori/omori.png',
            'assets/images/presets/avatares/omori/aubrey.png',
            'assets/images/presets/avatares/omori/hero.png',
            'assets/images/presets/avatares/omori/kel.png',
            'assets/images/presets/avatares/omori/basil.png',
            'assets/images/presets/avatares/omori/mari.png',
            'assets/images/presets/avatares/omori/sunny.png',
            'assets/images/presets/avatares/gerais/controle.png',
            'assets/images/presets/avatares/gerais/pixel.png',
            'assets/images/presets/avatares/gerais/retro.png',
        ];
    },

    getAllBanners() {
        return [
            'assets/images/presets/banners/undertale/banner1.png',
            'assets/images/presets/banners/undertale/banner2.png',
            'assets/images/presets/banners/deltarune/banner1.png',
            'assets/images/presets/banners/deltarune/banner2.png',
            'assets/images/presets/banners/omori/banner1.png',
            'assets/images/presets/banners/omori/banner2.png',
            'assets/images/presets/banners/gerais/banner1.png',
            'assets/images/presets/banners/gerais/banner2.png',
        ];
    },

    updateUI() {
        const authBtn = Utils.$('#auth-btn');
        const userMenu = Utils.$('#user-menu');

        if (this.currentUser) {
            Utils.hide(authBtn);
            Utils.show(userMenu);

            const avatarEl = Utils.$('#header-avatar');
            const dropAvatar = Utils.$('#dropdown-avatar');
            const dropName = Utils.$('#dropdown-name');
            const dropEmail = Utils.$('#dropdown-email');

            if (this.userProfile) {
                if (avatarEl) {
                    avatarEl.style.backgroundImage = `url(${this.userProfile.avatar})`;
                    avatarEl.textContent = '';
                }
                if (dropAvatar) {
                    dropAvatar.style.backgroundImage = `url(${this.userProfile.avatar})`;
                    dropAvatar.textContent = '';
                }
                if (dropName) dropName.textContent = this.userProfile.displayName || this.currentUser.displayName;
            } else {
                const name = this.currentUser.displayName || 'U';
                if (avatarEl) {
                    avatarEl.textContent = Utils.getInitials(name);
                    avatarEl.style.backgroundImage = '';
                }
                if (dropAvatar) {
                    dropAvatar.textContent = Utils.getInitials(name);
                    dropAvatar.style.backgroundImage = '';
                }
                if (dropName) dropName.textContent = name;
            }
            if (dropEmail) dropEmail.textContent = this.currentUser.email;
        } else {
            Utils.show(authBtn);
            Utils.hide(userMenu);
        }
    },

    renderAuthPage(container) {
        const isLogin = !container.querySelector('[data-mode="register"]');
        container.innerHTML = `
            <div class="auth-container animate-in">
                <h2 class="auth-title" id="auth-title">${isLogin ? 'ENTRAR' : 'CRIAR CONTA'}</h2>
                <form class="auth-form" id="auth-form">
                    ${!isLogin ? '<input type="text" class="p5-input" id="auth-name" placeholder="Nome de usuário" required>' : ''}
                    <input type="email" class="p5-input" id="auth-email" placeholder="Email" required>
                    <input type="password" class="p5-input" id="auth-password" placeholder="Senha" required minlength="6">
                    ${isLogin ? '<input type="password" class="p5-input" id="auth-password-confirm" placeholder="Confirmar senha" required minlength="6">' : ''}
                    <button type="submit" class="p5-btn-large" style="width:100%;text-align:center">
                        <span>${isLogin ? 'ENTRAR' : 'CRIAR CONTA'}</span>
                    </button>
                </form>
                <div class="auth-switch" id="auth-switch">
                    ${isLogin
                        ? 'Não tem conta? <a href="#" id="auth-toggle">Criar conta</a>'
                        : 'Já tem conta? <a href="#" id="auth-toggle">Entrar</a>'}
                </div>
                ${isLogin ? '<div class="auth-switch" style="margin-top:10px"><a href="#" id="auth-forgot">Esqueceu a senha?</a></div>' : ''}
            </div>
        `;

        const form = Utils.$('#auth-form');
        const toggle = Utils.$('#auth-toggle');
        const forgot = Utils.$('#auth-forgot');

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (isLogin) {
                this.renderRegisterPage(container);
            } else {
                this.renderLoginPage(container);
            }
        });

        if (forgot) {
            forgot.addEventListener('click', (e) => {
                e.preventDefault();
                const email = Utils.$('#auth-email').value;
                if (email) {
                    this.resetPassword(email);
                } else {
                    Utils.toast('Digite seu email primeiro.', 'error');
                }
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = Utils.$('#auth-email').value;
            const password = Utils.$('#auth-password').value;

            if (isLogin) {
                await this.login(email, password);
            } else {
                const name = Utils.$('#auth-name').value;
                const confirm = Utils.$('#auth-password-confirm').value;
                if (password !== confirm) {
                    Utils.toast('As senhas não coincidem.', 'error');
                    return;
                }
                await this.register(email, password, name);
            }
        });
    },

    renderLoginPage(container) {
        container.innerHTML = '';
        this.renderAuthPage(container);
    },

    renderRegisterPage(container) {
        container.innerHTML = `
            <div class="auth-container animate-in" data-mode="register"></div>
        `;
        this.renderAuthPage(container.querySelector('.auth-container'));
    }
};
