// Main website functionality
// Moved from inline scripts to external file for CSP compliance

// API connection test
async function testAPIConnection() {
    try {
        const response = await fetch(window.location.origin + '/api/health');
        const data = await response.json();
        console.log('✅ API connection successful:', data);
        return true;
    } catch (error) {
        console.error('❌ API connection failed:', error);
        return false;
    }
}

function normalizeProductImages(product) {
    if (!product) return product;
    
    if (!product.images) {
        product.images = [];
        return product;
    }
    
    if (typeof product.images === 'string') {
        try {
            const parsed = JSON.parse(product.images);
            product.images = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('⚠️ Could not parse product images string for', product.name, error);
            product.images = [];
        }
    } else if (!Array.isArray(product.images)) {
        product.images = [];
    }
    
    return product;
}

// Shared slot helpers for rendering content in multiple layouts
function getSlotContainers(slotName) {
    if (!slotName) return [];
    const containers = Array.from(document.querySelectorAll(`[data-slot=\"${slotName}\"]`));
    const elementById = document.getElementById(slotName);
    if (elementById && !containers.includes(elementById)) {
        containers.push(elementById);
    }
    return containers;
}

function setSlotMessage(slotName, html) {
    const containers = getSlotContainers(slotName);
    if (!containers.length) return;
    containers.forEach(container => {
        container.innerHTML = html;
    });
}

function renderSlot(slotName, products) {
    const containers = getSlotContainers(slotName);
    if (!containers.length) {
        return;
    }

    if (!Array.isArray(products) || products.length === 0) {
        containers.forEach(container => {
            container.innerHTML = '<div style="padding:16px;color:#666;">No products found.</div>';
        });
        return;
    }

    const markup = products.map(buildProductCardMarkup).join('');
    containers.forEach(container => {
        container.innerHTML = markup;
    });
}

function buildProductCardMarkup(product) {
    const safeProduct = normalizeProductImages({ ...product });
    const pid = safeProduct._id || safeProduct.id;

    if (!pid) {
        console.warn('⚠️ Product missing ID:', safeProduct.name);
        return '';
    }

    const price = Number(safeProduct.price) || 0;
    const originalPrice = Number(safeProduct.originalPrice) || 0;
    const discountPercent = originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;

    const discountBadge = discountPercent > 0
        ? `<span class="discount-badge">-${discountPercent}%</span>`
        : '';

    const originalPriceHtml = originalPrice > price
        ? `<span class="original-price">KSh ${originalPrice.toLocaleString()}</span>`
        : '';

    let imageUrl = '/images/default.jpg';
    if (Array.isArray(safeProduct.images) && safeProduct.images.length > 0) {
        const primaryImage = safeProduct.images.find(img => img && img.isPrimary) || safeProduct.images[0];
        if (primaryImage && primaryImage.url) {
            imageUrl = primaryImage.url.startsWith('http')
                ? primaryImage.url
                : primaryImage.url.startsWith('/')
                    ? primaryImage.url
                    : `/${primaryImage.url}`;
        }
    }

    const rawName = safeProduct.name || 'Untitled Product';
    const rawDescription = safeProduct.description || '';
    const safeName = escapeHtmlSafe(rawName);
    const safeDescription = escapeHtmlSafe(rawDescription);
    const safeBrand = escapeHtmlSafe(safeProduct.brand || '');
    const safePidAttr = escapeHtmlSafe(String(pid));
    const wishlistManager = window.wishlistManager;
    const isWishlisted = wishlistManager ? wishlistManager.isInWishlist(pid) : false;
    const wishlistIcon = isWishlisted ? 'fas fa-heart' : 'far fa-heart';
    const wishlistTitle = isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist';
    const pidLiteral = encodeForInlineScript(pid);
    const nameLiteral = encodeForInlineScript(rawName);
    const imageLiteral = encodeForInlineScript(imageUrl);
    const descriptionLiteral = encodeForInlineScript(rawDescription);
    const stock = Number(safeProduct.stock ?? safeProduct.quantity ?? 0);
    const stockMarkup = stock <= 0
        ? '<span class="out-of-stock">Out of Stock</span>'
        : (stock < 5 ? `<span class="stock-warning">Only ${stock} left!</span>` : '');
    const addToCartDisabled = stock <= 0 ? 'disabled' : '';
    const addToCartLabel = stock <= 0 ? 'Out of Stock' : 'Add to Cart';
    const addToCartHandler = `event.stopPropagation(); addToCart && addToCart(decodeURIComponent("${pidLiteral}"), decodeURIComponent("${nameLiteral}"), ${price}, decodeURIComponent("${imageLiteral}"))`;

    return `
        <div class="product-card clickable-card" data-product-id="${safePidAttr}"
            onclick='viewProduct(decodeURIComponent("${pidLiteral}"))'>
            <div class="product-image">
                <img src="${imageUrl}" alt="${safeName}" class="product-img loading" loading="lazy"
                    onload="this.classList.remove('loading')"
                    onerror="this.onerror=null;this.src='/images/default.jpg';this.classList.remove('loading');">
                ${discountBadge}
                <button class="floating-wishlist ${isWishlisted ? 'active' : ''}" title="${wishlistTitle}"
                    onclick='event.stopPropagation(); window.toggleWishlist && window.toggleWishlist(
                        decodeURIComponent("${pidLiteral}"),
                        decodeURIComponent("${nameLiteral}"),
                        ${price},
                        decodeURIComponent("${imageLiteral}"),
                        decodeURIComponent("${descriptionLiteral}")
                    )'>
                    <i class="${wishlistIcon}"></i>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-name">${safeName}</h3>
                ${safeBrand ? `<p class="product-brand">${safeBrand}</p>` : ''}
                <div class="product-price">
                    <span class="current-price">KSh ${price.toLocaleString()}</span>
                    ${originalPriceHtml}
                </div>
                ${stockMarkup}
                <div class="product-actions">
                    <button class="btn btn-primary add-to-cart" ${addToCartDisabled}
                        onclick='${addToCartHandler}'>
                        <i class="fas fa-shopping-cart"></i> ${addToCartLabel}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function escapeHtmlSafe(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

function encodeForInlineScript(value) {
    return encodeURIComponent(value == null ? '' : String(value));
}

function renderInto(slotName, products) {
    renderSlot(slotName, products);
}

// Load products for home sections (only once)
let homeProductsLoaded = false;

(async function loadHome(){
    if (homeProductsLoaded) {
        console.log('⏳ Home products already loaded, skipping...');
        return;
    }
    
    console.log('🚀 Starting automatic product loading...');
    homeProductsLoaded = true;
    
    try {
        console.log('📡 Fetching products from API...');
        
        // Use the API client
        const apiClient = new APIClient();
        const data = await apiClient.getProducts();
        console.log('📊 API Response:', data);
        
        if (data.success && data.data.products && data.data.products.length > 0) {
            const allProducts = data.data.products.map(normalizeProductImages);
            console.log('✅ Found', allProducts.length, 'products in database');
            
            // Split products into sections
            const featuredProducts = allProducts.slice(0, 6);
            const popularProducts = allProducts.slice(6, 12);
            const hotOffersProducts = allProducts.slice(12, 18);
            
            console.log('🎨 Rendering products to website...');
            renderInto('homeFeatured', featuredProducts);
            renderInto('homePopular', popularProducts);
            renderInto('homeOffers', hotOffersProducts);
            console.log('✅ Products rendered successfully to website!');
            
            // Show success message
            setTimeout(() => {
                console.log('🌐 Products should now be visible on the website!');
            }, 1000);
        } else {
            console.log('❌ No products found in API response');
            // Show fallback message
            renderInto('homeFeatured', []);
            renderInto('homePopular', []);
            renderInto('homeOffers', []);
            
            // Show message to add products via admin
            document.getElementById('homeFeatured').innerHTML = `
                <div class="no-products-message">
                    <i class="fas fa-box-open"></i>
                    <h4>No products available</h4>
                    <p>Check back soon for our latest products!</p>
                </div>
            `;
        }
    } catch(e) { 
        console.error('❌ Error loading products:', e);
        // Show fallback message
        document.getElementById('homeFeatured').innerHTML = '<div style="padding:20px;text-align:center;color:#666;">❌ Error loading products. Click "Load Products" button to try again.</div>';
        document.getElementById('homePopular').innerHTML = '<div style="padding:20px;text-align:center;color:#666;">❌ Error loading products. Click "Load Products" button to try again.</div>';
        document.getElementById('homeOffers').innerHTML = '<div style="padding:20px;text-align:center;color:#666;">❌ Error loading products. Click "Load Products" button to try again.</div>';
    }
})();



// View product function - navigates to product detail page
function viewProduct(productId) {
    console.log('🔍 Viewing product:', productId);
    console.log('🔍 Product ID type:', typeof productId);
    console.log('🔍 Product ID value:', productId);
    
    // Validate product ID
    if (!productId || productId === 'undefined' || productId === 'null') {
        console.error('❌ Invalid product ID:', productId);
        alert('Error: Invalid product ID. Please try again.');
        return;
    }
    
    // Ensure product ID is a string
    const cleanProductId = String(productId).trim();
    if (!cleanProductId) {
        console.error('❌ Empty product ID after cleaning');
        alert('Error: Product ID is empty. Please try again.');
        return;
    }
    
    try {
        // Navigate to product detail page (clean URL without .html)
        const productUrl = `/product?id=${encodeURIComponent(cleanProductId)}`;
        console.log('🔗 Navigating to:', productUrl);
        window.location.href = productUrl;
    } catch (error) {
        console.error('❌ Error navigating to product:', error);
        alert('Error navigating to product page. Please try again.');
    }
}

// Make viewProduct globally accessible
window.viewProduct = viewProduct;

// Test function accessibility
console.log('🔧 viewProduct function available:', typeof window.viewProduct);
console.log('🔧 viewProduct function:', window.viewProduct);

// Global search functionality
function performGlobalSearch(inputId = 'globalSearch') {
    const candidateIds = [inputId, 'globalSearch', 'globalSearchMobile'];
    let searchInput = null;

    for (const id of candidateIds) {
        if (!id) continue;
        const element = document.getElementById(id);
        if (element) {
            searchInput = element;
            break;
        }
    }

    const searchTerm = searchInput ? searchInput.value.trim() : '';

    if (searchInput && searchTerm) {
        console.log('🔍 Performing global search for:', searchTerm);
        if (window.searchEnhancements && typeof window.searchEnhancements.recordSearchTerm === 'function') {
            window.searchEnhancements.recordSearchTerm(searchTerm);
        }
        window.location.href = `/search?q=${encodeURIComponent(searchTerm)}`;
    } else {
        console.log('⚠️ No search term provided or search input not found');
        alert('Please enter a search term');
    }
}

// Make search function globally accessible
window.performGlobalSearch = performGlobalSearch;

// Add Enter key support for search (desktop + mobile)
document.addEventListener('DOMContentLoaded', function() {
    ['globalSearch', 'globalSearchMobile'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    performGlobalSearch(id);
                }
            });
        }
    });
});

// Home page tab functionality
class HomePageTabs {
    constructor() {
        this.allProducts = [];
        this.currentSection = null;
        this.init();
    }

    async init() {
        console.log('🏠 Initializing home page tabs');
        await this.loadProducts();
        this.setupTabListeners();
    }

    async loadProducts() {
        try {
            const apiClient = new APIClient();
            const data = await apiClient.getProducts();
            
            if (data.success && data.data.products) {
                this.allProducts = data.data.products.map(normalizeProductImages);
                console.log(`📦 Loaded ${this.allProducts.length} products for home tabs`);
            } else {
                console.warn('⚠️ No products loaded for home tabs');
                this.allProducts = [];
            }
        } catch (error) {
            console.error('❌ Error loading products for home tabs:', error);
            this.allProducts = [];
        }
    }

    setupTabListeners() {
        // Popular Products tabs
        const popularTabs = document.querySelectorAll('.popular-products .tab-btn');
        popularTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePopularTab(tab);
            });
        });

        // Featured Products tabs
        const featuredTabs = document.querySelectorAll('.featured-products .tab-btn');
        featuredTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFeaturedTab(tab);
            });
        });

        // Hot Offers tabs
        const offersTabs = document.querySelectorAll('.hot-offers .tab-btn');
        offersTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleOffersTab(tab);
            });
        });
    }

    handlePopularTab(clickedTab) {
        // Remove active class from all tabs in this section
        const section = clickedTab.closest('.popular-products');
        section.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        clickedTab.classList.add('active');
        
        const tabText = clickedTab.textContent.trim();
        console.log(`📊 Popular tab clicked: ${tabText}`);
        
        let filteredProducts = [];
        
        switch (tabText) {
            case 'Best Sellers':
                filteredProducts = this.getBestSellers();
                break;
            case 'Top Rated':
                filteredProducts = this.getTopRated();
                break;
            case 'New Arrivals':
                filteredProducts = this.getNewArrivals();
                break;
            default:
                filteredProducts = this.allProducts.slice(0, 6);
        }
        
        renderInto('homePopular', filteredProducts);
    }

    handleFeaturedTab(clickedTab) {
        // Remove active class from all tabs in this section
        const section = clickedTab.closest('.featured-products');
        section.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        clickedTab.classList.add('active');
        
        const tabText = clickedTab.textContent.trim();
        console.log(`🔥 Featured tab clicked: ${tabText}`);
        
        let filteredProducts = [];
        
        switch (tabText) {
            case 'Under KSh 30,000':
                filteredProducts = this.getProductsUnderPrice(30000);
                break;
            case 'Under KSh 75,000':
                filteredProducts = this.getProductsUnderPrice(75000);
                break;
            case 'Shop All':
                filteredProducts = this.allProducts.slice(0, 6);
                break;
            default:
                filteredProducts = this.allProducts.slice(0, 6);
        }
        
        renderInto('homeFeatured', filteredProducts);
    }

    handleOffersTab(clickedTab) {
        // Remove active class from all tabs in this section
        const section = clickedTab.closest('.hot-offers');
        section.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
        
        // Add active class to clicked tab
        clickedTab.classList.add('active');
        
        const tabText = clickedTab.textContent.trim();
        console.log(`🔥 Offers tab clicked: ${tabText}`);
        
        let filteredProducts = [];
        
        switch (tabText) {
            case 'Flash Deals':
                filteredProducts = this.getFlashDeals();
                break;
            case 'Limited Time':
                filteredProducts = this.getLimitedTime();
                break;
            case 'Clearance':
                filteredProducts = this.getClearance();
                break;
            default:
                filteredProducts = this.allProducts.slice(0, 6);
        }
        
        renderInto('homeOffers', filteredProducts);
    }

    // Filter methods
    getBestSellers() {
        // Sort by featured status and price (simulate best sellers)
        return [...this.allProducts]
            .sort((a, b) => {
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                return b.price - a.price;
            })
            .slice(0, 6);
    }

    getTopRated() {
        // Sort by price (simulate top rated - higher price = better quality)
        return [...this.allProducts]
            .sort((a, b) => b.price - a.price)
            .slice(0, 6);
    }

    getNewArrivals() {
        // Sort by creation date
        return [...this.allProducts]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 6);
    }

    getProductsUnderPrice(maxPrice) {
        return this.allProducts
            .filter(product => product.price <= maxPrice)
            .slice(0, 6);
    }

    getFlashDeals() {
        // Products with significant discounts
        return this.allProducts
            .filter(product => product.originalPrice && product.originalPrice > product.price)
            .sort((a, b) => {
                const discountA = ((a.originalPrice - a.price) / a.originalPrice) * 100;
                const discountB = ((b.originalPrice - b.price) / b.originalPrice) * 100;
                return discountB - discountA;
            })
            .slice(0, 6);
    }

    getLimitedTime() {
        // Products with discounts (limited time offers)
        return this.allProducts
            .filter(product => product.originalPrice && product.originalPrice > product.price)
            .slice(0, 6);
    }

    getClearance() {
        // Cheapest products (clearance items)
        return [...this.allProducts]
            .sort((a, b) => a.price - b.price)
            .slice(0, 6);
    }

}

// Initialize home page tabs when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Initializing home page tabs');
    window.homePageTabs = new HomePageTabs();
});

