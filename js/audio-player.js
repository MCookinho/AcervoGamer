const AudioPlayer = {
    audio: null,
    isPlaying: false,
    currentTrack: null,
    playlist: [],
    currentIndex: 0,
    mode: null,
    ytPlayer: null,
    ytReady: false,
    ytWaiting: false,
    ytUpdateInterval: null,

    init() {
        this.audio = new Audio();
        this.audio.volume = 0.7;
        this.setupEvents();
        this.setupControls();
        this.loadYouTubeAPI();
    },

    loadYouTubeAPI() {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player('yt-player', {
                height: '0',
                width: '0',
                playerVars: { autoplay: 0, controls: 0 },
                events: {
                    onReady: () => { this.ytReady = true; },
                    onStateChange: (e) => this.onYTStateChange(e),
                }
            });
        };
    },

    onYTStateChange(e) {
        if (e.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.updatePlayButton();
            this.startYTUpdate();
        } else if (e.data === YT.PlayerState.PAUSED) {
            this.isPlaying = false;
            this.updatePlayButton();
        } else if (e.data === YT.PlayerState.ENDED) {
            this.stopYTUpdate();
            this.isPlaying = false;
            this.updatePlayButton();
            this.next();
        }
    },

    startYTUpdate() {
        this.stopYTUpdate();
        this.ytUpdateInterval = setInterval(() => {
            if (!this.ytPlayer || !this.ytPlayer.getDuration) return;
            const current = this.ytPlayer.getCurrentTime();
            const duration = this.ytPlayer.getDuration();
            if (!duration) return;
            const percent = (current / duration) * 100;
            const fill = Utils.$('#audio-progress-fill');
            const thumb = Utils.$('#audio-progress-thumb');
            const currentTime = Utils.$('#audio-current-time');
            if (fill) fill.style.width = percent + '%';
            if (thumb) thumb.style.left = percent + '%';
            if (currentTime) currentTime.textContent = this.formatTime(current);
            const durationEl = Utils.$('#audio-duration');
            if (durationEl) durationEl.textContent = this.formatTime(duration);
        }, 250);
    },

    stopYTUpdate() {
        if (this.ytUpdateInterval) {
            clearInterval(this.ytUpdateInterval);
            this.ytUpdateInterval = null;
        }
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
                const vol = e.target.value / 100;
                this.audio.volume = vol;
                if (this.ytPlayer && this.ytReady) this.ytPlayer.setVolume(vol * 100);
                this.updateVolumeIcon();
            });
        }
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                if (this.mode === 'youtube' && this.ytPlayer && this.ytReady) {
                    const duration = this.ytPlayer.getDuration();
                    this.ytPlayer.seekTo(percent * duration, true);
                } else if (this.audio.duration) {
                    this.audio.currentTime = percent * this.audio.duration;
                }
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
        this.currentTrack = { ...track, gameName };

        if (track.youtubeUrl) {
            this.playYouTube(track.youtubeUrl);
        }

        this.updateInfo(this.currentTrack);
        this.show();
    },

    playYouTube(youtubeUrl) {
        this.mode = 'youtube';
        this.audio.pause();
        this.audio.src = '';

        if (!this.ytReady || !this.ytPlayer) {
            this.ytWaiting = true;
            const check = setInterval(() => {
                if (this.ytReady && this.ytPlayer) {
                    clearInterval(check);
                    this.loadYTVideo(youtubeUrl);
                }
            }, 200);
            return;
        }
        this.loadYTVideo(youtubeUrl);
    },

    loadYTVideo(url) {
        let videoId = '';
        try {
            const u = new URL(url);
            videoId = u.searchParams.get('v') || '';
        } catch {}
        if (!videoId) return;
        this.ytPlayer.loadVideoById(videoId);
        const volSlider = Utils.$('#audio-volume-slider');
        if (volSlider) this.ytPlayer.setVolume(volSlider.value);
    },

    playTrack(track) {
        this.currentTrack = track;
        if (track.youtubeUrl) {
            this.playYouTube(track.youtubeUrl);
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
        if (this.mode === 'youtube') {
            if (!this.ytPlayer || !this.ytReady) return;
            if (this.isPlaying) {
                this.ytPlayer.pauseVideo();
            } else {
                this.ytPlayer.playVideo();
            }
        } else {
            if (!this.audio.src) return;
            if (this.isPlaying) {
                this.audio.pause();
            } else {
                this.audio.play().catch(() => {});
            }
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
        this.stopYTUpdate();
        this.audio.pause();
        this.audio.src = '';
        if (this.ytPlayer && this.ytReady) {
            this.ytPlayer.stopVideo();
        }
        this.isPlaying = false;
        this.mode = null;
        this.currentTrack = null;
        this.hide();
        this.updatePlayButton();
    },

    toggleMute() {
        if (this.mode === 'youtube' && this.ytPlayer && this.ytReady) {
            if (this.ytPlayer.isMuted()) {
                this.ytPlayer.unMute();
            } else {
                this.ytPlayer.mute();
            }
        } else {
            this.audio.muted = !this.audio.muted;
        }
        this.updateVolumeIcon();
    },

    updateProgress() {
        if (this.mode === 'youtube') return;
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
        if (this.mode === 'youtube') return;
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
        let muted = false;
        let vol = this.audio.volume;
        if (this.mode === 'youtube' && this.ytPlayer && this.ytReady) {
            muted = this.ytPlayer.isMuted();
            vol = this.ytPlayer.getVolume() / 100;
        } else {
            muted = this.audio.muted;
        }
        if (muted || vol === 0) btn.textContent = '🔇';
        else if (vol < 0.5) btn.textContent = '🔉';
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
