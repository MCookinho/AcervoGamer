const Utils = {
    $(selector) {
        return document.querySelector(selector);
    },

    $$(selector) {
        return document.querySelectorAll(selector);
    },

    show(el) {
        if (typeof el === 'string') el = this.$(el);
        if (el) el.classList.remove('hidden');
    },

    hide(el) {
        if (typeof el === 'string') el = this.$(el);
        if (el) el.classList.add('hidden');
    },

    toggle(el, className) {
        if (typeof el === 'string') el = this.$(el);
        if (el) el.classList.toggle(className);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    formatDateTime(date) {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    timeAgo(date) {
        const now = new Date();
        const d = date instanceof Date ? date : new Date(date);
        const seconds = Math.floor((now - d) / 1000);
        if (seconds < 60) return 'agora mesmo';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `há ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `há ${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `há ${days}d`;
        const months = Math.floor(days / 30);
        if (months < 12) return `há ${months} meses`;
        const years = Math.floor(months / 12);
        return `há ${years} anos`;
    },

    toast(message, type = 'info') {
        const container = this.$('#toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 3500);
    },

    debounce(fn, delay = 300) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    getInitials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    },

    randomColor() {
        const colors = ['#009C3B', '#FFDF00', '#0045AD', '#2ECC40', '#E6C800', '#002776'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    sanitizeInput(input) {
        return input.replace(/[<>]/g, '').trim();
    }
};
