// Product page functionality
// Loads and displays products on category pages

const getProductContainers = () => {
    const containers = document.querySelectorAll('[data-products-container]');
    if (containers.length > 0) {
        return Array.from(containers);
    }

    const fallback = document.getElementById('productsContainer');
    return fallback ? [fallback] : [];
};

// Expose helper so filters.js can reuse it
window.getProductContainers = getProductContainers;

class ProductLoader {
    constructor() {
        this.apiClient = new APIClient();
        this.currentCategory = this.getCategoryFromURL();
        this.isLoading = false;
        this.hasLoaded = false;
    }

    getCategoryFromURL() {
        const path = window.location.pathname.toLowerCase();
        const filename = path.split('/').pop() || '';
        
        // Check for exact matches first (more specific)
        if (path.includes('/smart-home') || filename === 'smart-home.html' || filename.startsWith('smart-home')) {
            return 'smart-home';
        }
        if (path.includes('/laptops') || filename === 'laptops.html' || filename.startsWith('laptops')) {
            return 'laptops';
        }
        if (path.includes('/phones') || filename === 'phones.html' || filename.startsWith('phones')) {
            return 'phones';
        }
        if (path.includes('/cameras') || filename === 'cameras.html' || filename.startsWith('cameras')) {
            return 'cameras';
        }
        if (path.includes('/audio') || filename === 'audio.html' || filename.startsWith('audio')) {
            return 'audio';
        }
        if (path.includes('/accessories') || filename === 'accessories.html' || filename.startsWith('accessories')) {
            return 'accessories';
        }
        if (path.includes('/deals') || filename === 'deals.html' || filename.startsWith('deals')) {
            return 'deals';
        }
        
        console.log('⚠️ No category detected from URL:', path);
        return null;
    }

    async loadProducts() {
        // Prevent multiple simultaneous requests
        if (this.isLoading || this.hasLoaded) {
            console.log('⏳ Products already loading or loaded, skipping...');
            return;
        }

        this.isLoading = true;
        
        try {
            console.log(`🔄 Loading products for category: ${this.currentCategory || 'all'}`);
            console.log(`📍 Current URL: ${window.location.pathname}`);
            console.log(`📍 Detected category: ${this.currentCategory}`);
            
            if (!this.currentCategory) {
                console.warn('⚠️ WARNING: No category detected! Products from all categories will be shown.');
            }
            
            this.showLoading();
            
            const data = await this.apiClient.getProducts(this.currentCategory);
            
            if (data.success && data.data.products && data.data.products.length > 0) {
                this.displayProducts(data.data.products);
                console.log(`✅ Displayed ${data.data.products.length} products`);
            } else {
                this.showNoProducts();
                console.log('❌ No products found');
            }
            
            this.hasLoaded = true;
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showError();
        } finally {
            this.isLoading = false;
        }
    }

    displayProducts(products) {
        const containers = getProductContainers();
        if (containers.length === 0) {
            console.error('❌ productsContainer element not found');
            return;
        }

        const markup = products.map(product => this.createProductCard(product)).join('');
        containers.forEach(container => {
            container.innerHTML = markup;
        });
    }

    createProductCard(product) {
        // Handle image URL safely with better fallback logic
        let imageUrl = '/images/default.jpg';
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
            if (primaryImage && primaryImage.url) {
                imageUrl = primaryImage.url;
            }
        }
        
        // Normalize image URL (replace broken local upload paths)
        if (imageUrl.includes('/images/uploads/') || imageUrl.includes('images/uploads/')) {
            console.warn('⚠️ Replacing broken local upload path with placeholder:', imageUrl);
            imageUrl = '/images/default.jpg';
        }
        
        // Handle pricing safely
        const price = Number(product.price) || 0;
        const originalPrice = Number(product.originalPrice) || 0;
        
        const originalPriceHtml = originalPrice > price 
            ? `<span class="original-price">KSh ${originalPrice.toLocaleString()}</span>`
            : '';
        
        const discount = originalPrice > price
            ? `<span class="discount-badge">-${Math.round(((originalPrice - price) / originalPrice) * 100)}%</span>`
            : '';

        // Escape strings for HTML safely
        const safeName = this.escapeHtml(product.name || 'Unknown Product');
        const safeDescription = this.escapeHtml(product.description || '');
        const safeBrand = this.escapeHtml(product.brand || '');

        // Stock status
        const stock = Number(product.stock) || 0;
        const stockStatus = stock > 0 ? 
            (stock < 5 ? `<span class="stock-warning">Only ${stock} left!</span>` : '') : 
            `<span class="out-of-stock">Out of Stock</span>`;

        // Featured badge
        const featuredBadge = product.isFeatured ? 
            `<span class="featured-badge">Featured</span>` : '';

        return `
            <div class="product-card clickable-card" data-product-id="${product.id}" onclick="viewProduct(${product.id})">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${safeName}" 
                         onerror="this.handleImageError(this)" 
                         onload="this.classList.remove('loading')"
                         loading="lazy"
                         class="product-img loading">
                    ${discount}
                    ${featuredBadge}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${safeName}</h3>
                    ${safeBrand ? `<p class="product-brand">${safeBrand}</p>` : ''}
                    <div class="product-price">
                        <span class="current-price">KSh ${price.toLocaleString()}</span>
                        ${originalPriceHtml}
                    </div>
                    ${stockStatus}
                </div>
            </div>
        `;
    }

    // Helper method to escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Handle image loading errors
    handleImageError(img) {
        if (window.imageHandler) {
            window.imageHandler.handleImageError(img);
        } else {
            // Fallback to basic error handling
            img.onerror = null;
            img.src = '/images/default.jpg';
            img.classList.remove('loading');
        }
    }

    showNoProducts() {
        const containers = getProductContainers();
        if (containers.length > 0) {
            const markup = `
                <div class="no-products">
                    <i class="fas fa-box-open"></i>
                    <h3>No products found</h3>
                    <p>No products are available in this category at the moment.</p>
                    <p>Check back soon for our latest products!</p>
                </div>
            `;
            containers.forEach(container => {
                container.innerHTML = markup;
            });
        }
    }

    showLoading() {
        const containers = getProductContainers();
        if (containers.length > 0) {
            const markup = `
                <div class="loading-message">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading products...</p>
                </div>
            `;
            containers.forEach(container => {
                container.innerHTML = markup;
            });
        }
    }

    showError() {
        const containers = getProductContainers();
        if (containers.length > 0) {
            const markup = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Error loading products</h3>
                    <p>There was an error loading the products. Please try again later.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
            containers.forEach(container => {
                container.innerHTML = markup;
            });
        }
    }
}

// Global functions for product interactions

// viewProduct function - make it globally available for category pages
function viewProduct(productId) {
    console.log('🔍 Viewing product from category page:', productId);
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
        // Navigate to product detail page
        const productUrl = `product.html?id=${encodeURIComponent(cleanProductId)}`;
        console.log('🔗 Navigating to:', productUrl);
        window.location.href = productUrl;
    } catch (error) {
        console.error('❌ Error navigating to product:', error);
        alert('Error navigating to product page. Please try again.');
    }
}

// Make viewProduct globally accessible
window.viewProduct = viewProduct;



// Add CSS animations for feedback
const productStyle = document.createElement('style');
productStyle.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(productStyle);

// Initialize product loading when page loads (only if no filter system is present)
let productLoaderInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    // Check if filter system is present - if so, skip this initialization
    if (window.productFilter) {
        console.log('🔍 Filter system detected, skipping basic product loader');
        return;
    }
    
    if (productLoaderInitialized) {
        console.log('⏳ Product loader already initialized, skipping...');
        return;
    }
    
    // Check if we're on a category page (has product container) or homepage (no container)
    const containers = getProductContainers();
    const isHomepage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname.endsWith('index.html');
    
    // Skip initialization on homepage - it uses carousels instead
    if (isHomepage && containers.length === 0) {
        console.log('🏠 Homepage detected - skipping product loader (uses carousels instead)');
        return;
    }
    
    // Skip if no product container found (not a category page)
    if (containers.length === 0) {
        console.log('⏭️ No product container found - skipping product loader');
        return;
    }
    
    console.log('📱 Page loaded - initializing product loader');
    const productLoader = new ProductLoader();
    
    // Add a small delay to ensure API is ready
    setTimeout(() => {
        productLoader.loadProducts();
    }, 100);
    
    productLoaderInitialized = true;
});

// Export ProductLoader to global scope for filter system
window.ProductLoader = ProductLoader;
