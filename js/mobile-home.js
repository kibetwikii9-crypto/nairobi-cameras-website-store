// Mobile Homepage Functionality
(function() {
    'use strict';
    
    // =========================================================================
    // Logo Header Scroll Behavior - Smooth and Stable (No Blinking)
    // =========================================================================
    let logoHeader = document.getElementById('mobileLogoHeader');
    const body = document.body;
    let lastScrollY = window.scrollY;
    let ticking = false;
    let isHeaderHidden = false;
    
    // Re-initialize logo header if not found initially (for pages that load content dynamically)
    function initLogoHeaderScroll() {
        if (!logoHeader) {
            logoHeader = document.getElementById('mobileLogoHeader');
        }
        
        if (logoHeader && !logoHeader.dataset.scrollListenerAttached) {
            console.log('📱 Initializing logo header scroll behavior');
            logoHeader.dataset.scrollListenerAttached = 'true';
            attachScrollListeners();
        }
    }
    
    function updateLogoHeader() {
        // Get scroll position from window (works on all pages including cart)
        const currentScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        const scrollDelta = currentScrollY - lastScrollY;
        
        // Only update if scroll is significant enough (25px threshold to prevent blinking)
        if (Math.abs(scrollDelta) < 25) {
            ticking = false;
            return;
        }
        
        // Smooth scroll detection with proper threshold
        if (currentScrollY > 150) {
            if (scrollDelta > 0 && !isHeaderHidden) {
                // Scrolling down - hide logo header smoothly
                isHeaderHidden = true;
                logoHeader?.classList.add('hidden');
                body.classList.add('logo-header-hidden');
                console.log('📱 Logo header hidden (scrolling down)');
            } else if (scrollDelta < 0 && isHeaderHidden) {
                // Scrolling up - show logo header smoothly
                isHeaderHidden = false;
                logoHeader?.classList.remove('hidden');
                body.classList.remove('logo-header-hidden');
                console.log('📱 Logo header shown (scrolling up)');
            }
        } else {
            // Near top - always show
            if (isHeaderHidden) {
                isHeaderHidden = false;
                logoHeader?.classList.remove('hidden');
                body.classList.remove('logo-header-hidden');
                console.log('📱 Logo header shown (near top)');
            }
        }
        
        lastScrollY = currentScrollY;
        ticking = false;
    }
    
    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(updateLogoHeader);
            ticking = true;
        }
    }
    
    // Attach scroll listeners (works on all pages including cart)
    function attachScrollListeners() {
        // Remove any existing listeners to prevent duplicates
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('scroll', onScroll);
        
        // Attach to window (primary - works on all pages)
        window.addEventListener('scroll', onScroll, { passive: true });
        
        // Also attach to document for compatibility
        document.addEventListener('scroll', onScroll, { passive: true });
        
        console.log('📱 Scroll listeners attached for logo header');
    }
    
    // Initialize scroll listener
    initLogoHeaderScroll();
    
    // Also try on DOMContentLoaded in case header loads later
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogoHeaderScroll);
    }
    
    // Try again after a short delay for dynamically loaded content
    setTimeout(initLogoHeaderScroll, 100);
    setTimeout(initLogoHeaderScroll, 500);
    
    // =========================================================================
    // Automatic Header Height Detection and Padding Application
    // =========================================================================
    function updateMobileHeaderPadding() {
        // Only run on mobile viewport
        if (window.innerWidth > 991) {
            return; // Desktop - don't apply mobile padding
        }
        
        const logoHeaderEl = document.getElementById('mobileLogoHeader');
        const iconHeader = document.querySelector('.mobile-icon-header');
        
        if (!iconHeader) {
            console.warn('⚠️ Mobile icon header not found');
            return;
        }
        
        // Get actual heights
        let logoHeaderHeight = 0;
        let iconHeaderHeight = 0;
        
        if (logoHeaderEl) {
            const logoRect = logoHeaderEl.getBoundingClientRect();
            const logoComputed = window.getComputedStyle(logoHeaderEl);
            // Check if logo is visible (not hidden by transform or class)
            const isLogoVisible = !logoHeaderEl.classList.contains('hidden') && 
                                 !body.classList.contains('logo-header-hidden') &&
                                 logoRect.height > 0 && 
                                 logoComputed.transform !== 'matrix(1, 0, 0, 1, 0, -100)' &&
                                 logoComputed.transform !== 'matrix(1, 0, 0, 1, 0, -56)';
            
            if (isLogoVisible) {
                logoHeaderHeight = logoRect.height;
            }
        }
        
        const iconRect = iconHeader.getBoundingClientRect();
        iconHeaderHeight = iconRect.height;
        
        // Calculate combined height
        const totalHeaderHeight = logoHeaderHeight + iconHeaderHeight;
        
        console.log('📐 Header heights detected:', {
            logo: logoHeaderHeight,
            icon: iconHeaderHeight,
            total: totalHeaderHeight
        });
        
        // Apply padding to all mobile content containers
        const contentSelectors = [
            '.mobile-category',
            '.mobile-cart-page',
            'main.mobile-category',
            'main.mobile-cart-page',
            '.mobile-category.mobile-cart-page'
        ];
        
        contentSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.paddingTop = `${totalHeaderHeight}px`;
                console.log(`📐 Applied ${totalHeaderHeight}px padding-top to`, selector);
            });
        });
        
        // Also update CSS custom property for potential future use
        document.documentElement.style.setProperty('--mobile-header-height', `${totalHeaderHeight}px`);
    }
    
    // Initialize header padding on load and when headers change
    function initHeaderPadding() {
        // Initial call
        updateMobileHeaderPadding();
        
        // Update when logo header visibility changes
        if (logoHeader) {
            const headerObserver = new MutationObserver(() => {
                // Small delay to ensure transform animation completes
                setTimeout(updateMobileHeaderPadding, 150);
            });
            
            headerObserver.observe(logoHeader, {
                attributes: true,
                attributeFilter: ['class']
            });
            
            headerObserver.observe(body, {
                attributes: true,
                attributeFilter: ['class']
            });
        }
        
        // Update on resize
        window.addEventListener('resize', updateMobileHeaderPadding, { passive: true });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderPadding);
    } else {
        initHeaderPadding();
    }
    
    // =========================================================================
    // Menu Drawer
    // =========================================================================
    const menuToggle = document.getElementById('mobileMenuToggle');
    const menuClose = document.getElementById('mobileMenuClose');
    const menuDrawer = document.getElementById('mobileMenuDrawer');
    const menuOverlay = document.getElementById('mobileMenuOverlay');
    let isMenuOpen = false;
    
    function openMenu() {
        if (!isMenuOpen) {
            isMenuOpen = true;
            menuDrawer?.classList.add('open');
            menuOverlay?.classList.add('visible');
            body.classList.add('mobile-menu-open');
            // Change hamburger to X
            const menuIcon = menuToggle?.querySelector('i');
            if (menuIcon) {
                menuIcon.classList.remove('fa-bars');
                menuIcon.classList.add('fa-xmark');
            }
        }
    }
    
    function closeMenu() {
        if (isMenuOpen) {
            isMenuOpen = false;
            menuDrawer?.classList.remove('open');
            menuOverlay?.classList.remove('visible');
            body.classList.remove('mobile-menu-open');
            // Change X back to hamburger
            const menuIcon = menuToggle?.querySelector('i');
            if (menuIcon) {
                menuIcon.classList.remove('fa-xmark');
                menuIcon.classList.add('fa-bars');
            }
        }
    }
    
    menuToggle?.addEventListener('click', () => {
        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    });
    menuClose?.addEventListener('click', closeMenu);
    menuOverlay?.addEventListener('click', closeMenu);
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });
    
    // =========================================================================
    // Search Panel
    // =========================================================================
    const searchToggle = document.getElementById('mobileSearchToggle');
    const searchClose = document.getElementById('mobileSearchClose');
    const searchPanel = document.getElementById('mobileSearchPanel');
    const searchOverlay = document.getElementById('mobileSearchOverlay');
    const searchInput = document.getElementById('mobileSearchInput');
    const searchForm = document.getElementById('mobileSearchForm');
    
    function openSearch() {
        searchPanel?.classList.add('open');
        searchOverlay?.classList.add('visible');
        body.classList.add('mobile-search-open');
        setTimeout(() => {
            searchInput?.focus();
        }, 100);
    }
    
    function closeSearch() {
        searchPanel?.classList.remove('open');
        searchOverlay?.classList.remove('visible');
        body.classList.remove('mobile-search-open');
        if (searchInput) searchInput.value = '';
    }
    
    searchToggle?.addEventListener('click', openSearch);
    searchClose?.addEventListener('click', closeSearch);
    searchOverlay?.addEventListener('click', closeSearch);
    
    // Handle search form submission
    searchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput?.value.trim();
        if (query) {
            window.location.href = `/search?q=${encodeURIComponent(query)}`;
        }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && searchPanel?.classList.contains('open')) {
            closeSearch();
        }
    });
    
    // =========================================================================
    // Product Carousel - Load Products (4 cards visible)
    // =========================================================================
    async function loadMobileProducts(containerId, category = null, limit = 12) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        try {
            let url = '/api/products';
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            params.append('limit', limit);
            if (params.toString()) url += '?' + params.toString();
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success && data.data.products && data.data.products.length > 0) {
                renderMobileCarousel(container, data.data.products);
            } else {
                container.innerHTML = '<div class="mobile-loading"><span>No products available</span></div>';
            }
        } catch (error) {
            console.error('Error loading mobile products:', error);
            container.innerHTML = '<div class="mobile-loading"><span>Error loading products</span></div>';
        }
    }
    
    function renderMobileCarousel(container, products) {
        const track = container.querySelector('.mobile-carousel-track') || container;
        track.innerHTML = products.map(product => createMobileProductCard(product)).join('');
    }
    
    function createMobileProductCard(product) {
        let imageUrl = product.images?.[0]?.url || '/images/default.jpg';
        // Replace broken local upload paths
        if (imageUrl.includes('/images/uploads/') || imageUrl.includes('images/uploads/')) {
            imageUrl = '/images/default.jpg';
        }
        const price = Number(product.price) || 0;
        const originalPrice = Number(product.originalPrice) || 0;
        const safeName = escapeHtml(product.name || 'Product');
        const discount = originalPrice > price 
            ? `<span class="mobile-product-badge">-${Math.round(((originalPrice - price) / originalPrice) * 100)}%</span>`
            : '';
        const originalPriceHtml = originalPrice > price 
            ? `KSh ${originalPrice.toLocaleString()}`
            : '';
        
        return `
            <div class="mobile-product-card" onclick="viewProduct(${product.id})">
                ${discount}
                <img src="${imageUrl}" alt="${safeName}" class="mobile-product-image" 
                     loading="lazy"
                     decoding="async"
                     onerror="this.src='/images/default.jpg'">
                <div class="mobile-product-info">
                    <h3 class="mobile-product-name">${safeName}</h3>
                    <div class="mobile-product-price-container">
                        <div class="mobile-product-price">KSh ${price.toLocaleString()}</div>
                        ${originalPriceHtml ? `<div class="mobile-product-original-price">${originalPriceHtml}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Load products when page loads (only on mobile shell)
    if (document.querySelector('.mobile-shell')) {
        document.addEventListener('DOMContentLoaded', () => {
            loadMobileProducts('mobileCarouselTrack', null, 12);
            loadMobileProducts('mobilePopularTrack', null, 12);
        });
    }
    
    // Make viewProduct available globally
    window.viewProduct = function(productId) {
        window.location.href = `/product?id=${productId}`;
    };
    
    // =========================================================================
    // Automatic Active Page Detection for Navigation
    // =========================================================================
    function setActiveNavigationItem() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || '';
        const fullPath = currentPath.toLowerCase();
        
        console.log('📍 Current page detected:', currentPage, 'Full path:', currentPath);
        
        // Determine current page identifier - check both path and filename
        let currentPageId = 'home';
        
        // Check for home page
        if (fullPath === '/' || fullPath === '/index.html' || currentPage === '' || currentPage === 'index.html') {
            currentPageId = 'home';
        }
        // Check for category pages (both /laptops and laptops.html formats)
        else if (fullPath.includes('laptop')) {
            currentPageId = 'laptops';
        } else if (fullPath.includes('phone')) {
            currentPageId = 'phones';
        } else if (fullPath.includes('camera')) {
            currentPageId = 'cameras';
        } else if (fullPath.includes('audio')) {
            currentPageId = 'audio';
        } else if (fullPath.includes('accessor')) {
            currentPageId = 'accessories';
        } else if (fullPath.includes('smart-home') || fullPath.includes('smarthome')) {
            currentPageId = 'smart-home';
        } else if (fullPath.includes('deal')) {
            currentPageId = 'deals';
        } else if (fullPath.includes('cart')) {
            currentPageId = 'cart';
        } else if (fullPath.includes('product')) {
            currentPageId = 'product';
        }
        
        console.log('📍 Active page ID:', currentPageId);
        
        // Update mobile menu links
        const mobileMenuLinks = document.querySelectorAll('.mobile-menu-links a');
        console.log('📍 Found', mobileMenuLinks.length, 'mobile menu links');
        
        mobileMenuLinks.forEach(link => {
            const href = link.getAttribute('href') || '';
            const hrefLower = href.toLowerCase();
            
            // Remove active class first
            link.classList.remove('active');
            
            // Check if this link matches current page
            let shouldBeActive = false;
            
            if (currentPageId === 'home') {
                if (href === '/' || href === '/index.html' || href === 'index.html' || href === '' || hrefLower.includes('index')) {
                    shouldBeActive = true;
                }
            } else if (currentPageId === 'laptops') {
                if (hrefLower.includes('laptop')) {
                    shouldBeActive = true;
                }
            } else if (currentPageId === 'phones') {
                if (hrefLower.includes('phone')) {
                    shouldBeActive = true;
                }
            } else if (currentPageId === 'cameras') {
                if (hrefLower.includes('camera')) {
                    shouldBeActive = true;
                }
            } else if (currentPageId === 'audio') {
                if (hrefLower.includes('audio')) {
                    shouldBeActive = true;
                }
            } else if (currentPageId === 'accessories') {
                if (hrefLower.includes('accessor')) {
                    shouldBeActive = true;
                }
            } else if (currentPageId === 'smart-home') {
                if (hrefLower.includes('smart-home') || hrefLower.includes('smarthome')) {
                    shouldBeActive = true;
                }
            } else if (currentPageId === 'deals') {
                if (hrefLower.includes('deal')) {
                    shouldBeActive = true;
                }
            }
            
            if (shouldBeActive) {
                link.classList.add('active');
                console.log('📍 Mobile: Marked', link.textContent.trim(), 'as active (href:', href, ')');
            }
        });
        
        // Update mobile header page title
        const iconHeader = document.querySelector('.mobile-icon-header');
        if (iconHeader) {
            // Remove existing page title if any
            const existingTitle = iconHeader.querySelector('.mobile-page-title');
            if (existingTitle) {
                existingTitle.remove();
            }
            
            // Create page title element
            const pageTitles = {
                'home': 'Home',
                'laptops': 'Laptops',
                'phones': 'Phones',
                'cameras': 'Cameras',
                'audio': 'Audio',
                'accessories': 'Accessories',
                'smart-home': 'Smart Home',
                'deals': 'Deals',
                'cart': 'Cart',
                'product': 'Product'
            };
            
            const pageTitle = pageTitles[currentPageId] || '';
            if (pageTitle) {
                const titleEl = document.createElement('div');
                titleEl.className = 'mobile-page-title';
                titleEl.textContent = pageTitle;
                iconHeader.appendChild(titleEl);
                console.log('📍 Added page title to mobile header:', pageTitle);
            }
        }
        
        // Update desktop navigation links
        const desktopNavLinks = document.querySelectorAll('.navbar-nav .nav-link');
        desktopNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // Remove active class first
            link.classList.remove('active');
            
            // Check if this link matches current page
            if (href === '/' || href === '/index.html' || href === 'index.html') {
                if (currentPageId === 'home') {
                    link.classList.add('active');
                    console.log('📍 Desktop: Marked Home as active');
                }
            } else if (href.includes('/laptops') && currentPageId === 'laptops') {
                link.classList.add('active');
                console.log('📍 Desktop: Marked Laptops as active');
            } else if (href.includes('/phones') && currentPageId === 'phones') {
                link.classList.add('active');
                console.log('📍 Desktop: Marked Phones as active');
            } else if (href.includes('/cameras') && currentPageId === 'cameras') {
                link.classList.add('active');
                console.log('📍 Desktop: Marked Cameras as active');
            } else if (href.includes('/audio') && currentPageId === 'audio') {
                link.classList.add('active');
                console.log('📍 Desktop: Marked Audio as active');
            } else if (href.includes('/accessories') && currentPageId === 'accessories') {
                link.classList.add('active');
                console.log('📍 Desktop: Marked Accessories as active');
            } else if (href.includes('/smart-home') && currentPageId === 'smart-home') {
                link.classList.add('active');
                console.log('📍 Desktop: Marked Smart Home as active');
            } else if (href.includes('/deals') && currentPageId === 'deals') {
                link.classList.add('active');
                console.log('📍 Desktop: Marked Deals as active');
            }
        });
    }
    
    // Initialize active navigation on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setActiveNavigationItem);
    } else {
        setActiveNavigationItem();
    }
    
    // Also run after a short delay to catch dynamically loaded menus
    setTimeout(setActiveNavigationItem, 100);
    setTimeout(setActiveNavigationItem, 500);
})();

