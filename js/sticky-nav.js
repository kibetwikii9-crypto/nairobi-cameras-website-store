// Sticky Navigation System
// Makes navigation bars float/stick when scrolling

class StickyNavigation {
    constructor() {
        this.navbar = null;
        this.isSticky = false;
        this.scrollThreshold = 100; // Pixels to scroll before making nav sticky
        this.init();
    }

    init() {
        // Prefer the desktop main navigation bar, fall back to other nav elements.
        const navSelectors = [
            '.main-nav',
            '.desktop-shell .main-nav',
            '.top-header',
            '.navbar',
            'nav'
        ];

        this.navbar = navSelectors
            .map(selector => document.querySelector(selector))
            .find(element => element);

        this.secondaryElements = [];
        const desktopHeader = document.querySelector('.top-header');
        if (desktopHeader && desktopHeader !== this.navbar) {
            this.secondaryElements.push(desktopHeader);
        }
        
        if (!this.navbar) {
            console.warn('⚠️ No navigation element found for sticky nav');
            return;
        }

        console.log('🔧 Initializing sticky navigation');
        this.setupScrollListener();
        this.setupResizeListener();
    }

    setupScrollListener() {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateStickyState();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            this.updateStickyState();
        });
    }

    updateStickyState() {
        const scrollY = window.scrollY;
        const shouldBeSticky = scrollY > this.scrollThreshold;

        if (shouldBeSticky && !this.isSticky) {
            this.makeSticky();
        } else if (!shouldBeSticky && this.isSticky) {
            this.removeSticky();
        }
    }

    makeSticky() {
        if (this.isSticky) return;

        console.log('📌 Making navigation sticky');
        
        // Add sticky class
        this.navbar.classList.add('sticky-nav');
        this.secondaryElements.forEach(element => element.classList.add('sticky-nav'));
        document.body.classList.add('sticky-nav-active');
        
        // Store original styles
        this.originalStyles = {
            position: this.navbar.style.position,
            top: this.navbar.style.top,
            left: this.navbar.style.left,
            right: this.navbar.style.right,
            zIndex: this.navbar.style.zIndex,
            background: this.navbar.style.background,
            boxShadow: this.navbar.style.boxShadow
        };

        this.isSticky = true;
        
        // Add smooth transition
        this.navbar.style.transition = 'all 0.3s ease';
    }

    removeSticky() {
        if (!this.isSticky) return;

        console.log('📌 Removing sticky navigation');
        
        // Remove sticky class
        this.navbar.classList.remove('sticky-nav');
        this.secondaryElements.forEach(element => element.classList.remove('sticky-nav'));
        document.body.classList.remove('sticky-nav-active');
        
        // Restore original styles
        if (this.originalStyles) {
            Object.assign(this.navbar.style, this.originalStyles);
        }

        this.isSticky = false;
    }

    // Method to manually toggle sticky state
    toggleSticky() {
        if (this.isSticky) {
            this.removeSticky();
        } else {
            this.makeSticky();
        }
    }

    // Method to update scroll threshold
    setScrollThreshold(threshold) {
        this.scrollThreshold = threshold;
        this.updateStickyState();
    }

    // Method to destroy the sticky navigation
    destroy() {
        this.removeSticky();
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
    }
}

class SearchEnhancements {
    constructor() {
        this.inputs = [];
        this.activeInput = null;
        this.panel = null;
        this.cache = new Map();
        this.debounceTimer = null;
        this.recentSearchKey = 'gst-recent-searches';
        this.maxRecent = 6;
        this.init();
    }

    init() {
        this.panel = document.createElement('div');
        this.panel.className = 'search-suggestions-dropdown';
        document.body.appendChild(this.panel);
        this.panel.addEventListener('click', (event) => this.handlePanelClick(event));

        this.scanForInputs();
        // Re-scan occasionally for dynamically loaded inputs (mobile layouts etc.)
        this.scanInterval = setInterval(() => this.scanForInputs(), 2000);

        document.addEventListener('click', (event) => {
            if (!this.panel.contains(event.target) && !this.inputs.includes(event.target)) {
                this.hidePanel();
            }
        });

        window.addEventListener('scroll', () => this.repositionPanel(), { passive: true });
        window.addEventListener('resize', () => this.repositionPanel());
    }

    scanForInputs() {
        const selectors = ['#globalSearch', '#globalSearchMobile', '#searchInput'];
        selectors.forEach(selector => {
            const input = document.querySelector(selector);
            if (input && !this.inputs.includes(input)) {
                this.attachToInput(input);
            }
        });
    }

    attachToInput(input) {
        this.inputs.push(input);
        input.setAttribute('autocomplete', 'off');
        input.addEventListener('input', (event) => this.handleInput(event));
        input.addEventListener('focus', (event) => this.handleFocus(event));
        input.addEventListener('blur', () => {
            setTimeout(() => this.hidePanel(), 150);
        });
    }

    handleInput(event) {
        const term = event.target.value.trim();
        this.activeInput = event.target;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (term.length < 2) {
            this.debounceTimer = setTimeout(() => this.showRecentSearches(), 120);
            return;
        }

        this.debounceTimer = setTimeout(() => this.fetchSuggestions(term), 220);
    }

    handleFocus(event) {
        this.activeInput = event.target;
        const term = event.target.value.trim();
        if (term.length >= 2) {
            this.fetchSuggestions(term);
        } else {
            this.showRecentSearches();
        }
    }

    async fetchSuggestions(term) {
        try {
            const cached = this.cache.get(term);
            if (cached && Date.now() - cached.timestamp < 60000) {
                this.renderPanel(term, cached.items);
                return;
            }

            const response = await fetch(`/api/search?q=${encodeURIComponent(term)}&limit=5`);
            const data = await response.json();
            const items = (data.success && data.data?.products) ? data.data.products : [];
            this.cache.set(term, { items, timestamp: Date.now() });
            this.renderPanel(term, items);
        } catch (error) {
            console.error('Search suggestion error:', error);
            this.showRecentSearches();
        }
    }

    renderPanel(term, products = []) {
        if (!this.activeInput) return;

        this.repositionPanel();

        let html = '';

        const safeTerm = this.escapeAttribute(term);

        if (products.length) {
            html += `
                <div class="search-suggestions-head">
                    <span>Quick results</span>
                    <button data-action="view-search" data-term="${safeTerm}">View all</button>
                </div>
                <ul class="search-suggestions-list">
                    ${products.map(product => this.renderSuggestionRow(product)).join('')}
                </ul>
            `;
        } else {
            html += `
                <div class="search-suggestions-head">
                    <span>Start typing to see products</span>
                </div>
            `;
        }

        html += this.renderRecentSearches();

        this.panel.innerHTML = html;
        this.panel.classList.add('visible');
    }

    renderSuggestionRow(product) {
        const img = (product.images && product.images[0] && (product.images[0].url || product.images[0])) || '/images/default.jpg';
        const price = Number(product.price || 0).toLocaleString();
        const category = product.category ? product.category.replace('-', ' ') : 'Product';
        const id = product._id || product.id;
        const safeId = this.escapeAttribute(id);
        const safeName = this.escapeHTML(product.name || 'Product');
        const safeCategory = this.escapeHTML(category);
        const safeImage = this.escapeAttribute(img);

        return `
            <li class="suggestion-row" data-action="view-product" data-product-id="${safeId}">
                <img src="${safeImage}" alt="${safeName}" class="suggestion-thumb" onerror="this.onerror=null;this.src='/images/default.jpg';">
                <div class="suggestion-info">
                    <h5>${safeName}</h5>
                    <div class="suggestion-meta">${safeCategory}</div>
                </div>
                <div class="suggestion-price">KSh ${price}</div>
            </li>
        `;
    }

    renderRecentSearches() {
        const recent = this.getRecentSearches();
        if (!recent.length) {
            return '';
        }

        const chips = recent.map(term => {
            const safeTerm = this.escapeAttribute(term);
            const label = this.escapeHTML(term);
            return `<span class="recent-search-chip" data-action="recent-search" data-term="${safeTerm}">
                        <i class="fas fa-clock"></i>${label}
                    </span>`;
        }).join('');

        return `
            <div class="recent-searches">
                <div class="recent-search-label">Recent searches</div>
                ${chips}
            </div>
        `;
    }

    showRecentSearches() {
        if (!this.activeInput) return;
        this.renderPanel('', []);
    }

    handlePanelClick(event) {
        const actionTarget = event.target.closest('[data-action]');
        if (!actionTarget) return;

        const action = actionTarget.dataset.action;
        const term = actionTarget.dataset.term;

        if (action === 'view-product') {
            const productId = actionTarget.dataset.productId;
            if (productId) {
                window.location.href = `/product?id=${productId}`;
            }
            return;
        }

        if (term) {
            this.navigateToSearch(term);
        }
    }

    navigateToSearch(term) {
        this.recordSearchTerm(term);
        window.location.href = `/search?q=${encodeURIComponent(term)}`;
    }

    repositionPanel() {
        if (!this.activeInput || !this.panel.classList.contains('visible')) return;
        const rect = this.activeInput.getBoundingClientRect();
        this.panel.style.width = `${rect.width}px`;
        this.panel.style.left = `${rect.left + window.scrollX}px`;
        this.panel.style.top = `${rect.bottom + window.scrollY + 8}px`;
    }

    hidePanel() {
        this.panel.classList.remove('visible');
    }

    recordSearchTerm(term) {
        if (!term || !term.trim()) {
            return;
        }

        const cleanTerm = term.trim();
        const recent = this.getRecentSearches().filter(item => item.toLowerCase() !== cleanTerm.toLowerCase());
        recent.unshift(cleanTerm);
        const updated = recent.slice(0, this.maxRecent);

        try {
            localStorage.setItem(this.recentSearchKey, JSON.stringify(updated));
        } catch (error) {
            console.warn('Unable to persist recent searches', error);
        }
    }

    getRecentSearches() {
        try {
            const stored = localStorage.getItem(this.recentSearchKey);
            if (!stored) return [];
            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Unable to read recent searches', error);
            return [];
        }
    }

    escapeHTML(value) {
        if (value === undefined || value === null) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeAttribute(value) {
        if (value === undefined || value === null) return '';
        return String(value).replace(/"/g, '&quot;');
    }
}

// Auto-initialize helpers when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Auto-initializing navigation + discovery helpers');
    window.stickyNav = new StickyNavigation();
    window.searchEnhancements = new SearchEnhancements();
});

// Make classes globally accessible
window.StickyNavigation = StickyNavigation;
window.SearchEnhancements = SearchEnhancements;
