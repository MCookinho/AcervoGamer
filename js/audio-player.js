const AudioPlayer = {
    audio: null,
    isPlaying: false,
    currentTrack: null,
    playlist: [],
    currentIndex: 0,

    init() {
        this.audio = new Audio();
        this.audio.volume = 0.7;
        this.setupEvents();
        this.setupControls();
    },

    setupEvents() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
    },

    setupControls() {
        const playBtn = Utils.$('#audio-play');
        const prevBtn = Utils.$('#audio-prev');
        const nextBtn = Utils.$('#audio-next');
        const muteBtn = Utils.$('#audio-mute');
        const closeBtn = Utils.$('#audio-close');
        const volumeSlider = Utils.$('#audio-volume-slider');
        const progressBar = Utils.$('#audio-progress-bar');

        if (playBtn) playBtn.addEventListener('click', () => this.togglePlay());
        if (prevBtn) prevBtn.addEventListener('click', () => this.prev());
        if (nextBtn) nextBtn.addEventListener('click', () => this.next());
        if (muteBtn) muteBtn.addEventListener('click', () => this.toggleMute());
        if (closeBtn) closeBtn.addEventListener('click', () => this.stop());
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.audio.volume = e.target.value / 100;
                this.updateVolumeIcon();
            });
        }
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                this.audio.currentTime = percent * this.audio.duration;
            });
        }
    },

    show() {
        const player = Utils.$('#audio-player');
        if (player) {
            player.classList.remove('hidden');
            requestAnimationFrame(() => {
                player.classList.add('visible');
            });
        }
        Utils.$('.main-content')?.classList.add('with-player');
    },

    hide() {
        const player = Utils.$('#audio-player');
        if (player) {
            player.classList.remove('visible');
            const onEnd = () => {
                player.classList.add('hidden');
                player.removeEventListener('transitionend', onEnd);
            };
            player.addEventListener('transitionend', onEnd);
        }
        Utils.$('.main-content')?.classList.remove('with-player');
    },

    playFromSoundtrack(track, gameName) {
        const audioUrl = track.audioUrl || '';
        this.currentTrack = { ...track, gameName };

        if (audioUrl) {
            this.audio.src = audioUrl;
            this.audio.play().catch(() => {});
        } else if (track.youtubeUrl) {
            window.open(track.youtubeUrl, '_blank');
            return;
        }

        this.updateInfo(this.currentTrack);
        this.show();
    },

    playTrack(track) {
        this.currentTrack = track;
        if (track.src) {
            this.audio.src = track.src;
            this.audio.play().catch(() => {});
        }
        this.updateInfo(track);
        this.show();
    },

    setPlaylist(tracks, startIndex = 0) {
        this.playlist = tracks;
        this.currentIndex = startIndex;
        if (tracks.length > 0) {
            this.playTrack(tracks[startIndex]);
        }
    },

    togglePlay() {
        if (!this.audio.src) return;
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play().catch(() => {});
        }
    },

    next() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.playTrack(this.playlist[this.currentIndex]);
    },

    prev() {
        if (this.playlist.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.playTrack(this.playlist[this.currentIndex]);
    },

    stop() {
        this.audio.pause();
        this.audio.src = '';
        this.isPlaying = false;
        this.currentTrack = null;
        this.hide();
        this.updatePlayButton();
    },

    toggleMute() {
        this.audio.muted = !this.audio.muted;
        this.updateVolumeIcon();
    },

    updateProgress() {
        const fill = Utils.$('#audio-progress-fill');
        const thumb = Utils.$('#audio-progress-thumb');
        const currentTime = Utils.$('#audio-current-time');
        if (!this.audio.duration) return;
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        if (fill) fill.style.width = percent + '%';
        if (thumb) thumb.style.left = percent + '%';
        if (currentTime) currentTime.textContent = this.formatTime(this.audio.currentTime);
    },

    updateDuration() {
        const duration = Utils.$('#audio-duration');
        if (duration) duration.textContent = this.formatTime(this.audio.duration);
    },

    updatePlayButton() {
        const btn = Utils.$('#audio-play');
        if (btn) btn.textContent = this.isPlaying ? '⏸' : '▶';
    },

    updateVolumeIcon() {
        const btn = Utils.$('#audio-mute');
        if (!btn) return;
        if (this.audio.muted || this.audio.volume === 0) btn.textContent = '🔇';
        else if (this.audio.volume < 0.5) btn.textContent = '🔉';
        else btn.textContent = '🔊';
    },

    updateInfo(track) {
        const title = Utils.$('#audio-title');
        const artist = Utils.$('#audio-artist');
        const thumb = Utils.$('#audio-thumb');
        if (title) title.textContent = track.title || 'Nenhuma música';
        if (artist) artist.textContent = track.artist || '';
        if (thumb) thumb.style.backgroundImage = track.cover ? `url(${track.cover})` : '';
    },

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
};
