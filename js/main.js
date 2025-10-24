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

// Render helper for home sections
function renderInto(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!products || products.length === 0) {
        container.innerHTML = '<div style="padding:16px;color:#666;">No products found.</div>';
        return;
    }
    container.innerHTML = products.map(function(p){
        const img = (p.images && p.images[0] && p.images[0].url) ? p.images[0].url : '/images/default.jpg';
        const original = p.originalPrice ? '<span class="original-price">KSh ' + Number(p.originalPrice).toLocaleString() + '</span>' : '';
        const pid = p._id || p.id;
        const isWishlisted = window.wishlistManager ? window.wishlistManager.isInWishlist(pid) : false;
        
        // Ensure product ID is valid
        if (!pid) {
            console.warn('⚠️ Product missing ID:', p.name);
            return ''; // Skip products without IDs
        }
        // Calculate discount percentage
        let discountBadge = '';
        if (p.originalPrice && p.originalPrice > p.price) {
            const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
            discountBadge = '<div class="discount-badge">-' + discount + '%</div>';
        }
        
        return (
            '<div class="product-item clickable-card" data-product-id="'+pid+'" onclick="console.log(\'Card clicked, product ID:\', \''+pid+'\'); viewProduct(\''+pid+'\');">'
            +  '<div class="product-image">'
            +    '<img src="'+img+'" alt="'+p.name+'" class="product-img" onerror="this.onerror=null;this.src=\'/images/default.jpg\';">'
            +    discountBadge
            +  '</div>'
            +  '<div class="product-info">'
            +    '<h3>'+p.name+'</h3>'
            +    '<div class="product-price">'
            +      '<span class="current-price">KSh ' + Number(p.price).toLocaleString() + '</span>'
            +      original
            +    '</div>'
            +    '<div class="product-actions">'
            +      '<button class="btn btn-primary home-add-cart-btn" onclick="event.stopPropagation(); event.preventDefault(); addToCart(\''+pid+'\', \''+p.name.replace(/'/g, '\\\'').replace(/"/g, '\\"')+'\', '+p.price+', \''+img.replace(/'/g, '\\\'').replace(/"/g, '\\"')+'\')">Add to Cart</button>'
            +    '</div>'
            +  '</div>'
            +'</div>'
        );
    }).join('');
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
            const allProducts = data.data.products;
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
                    <i class="fas fa-plus-circle"></i>
                    <h4>No products yet</h4>
                    <p>Add products through the admin panel to see them here</p>
                    <a href="/admin" class="btn btn-primary">Go to Admin</a>
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

// Test function accessibility
console.log('🔧 viewProduct function available:', typeof window.viewProduct);
console.log('🔧 viewProduct function:', window.viewProduct);

// Global search functionality
function performGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    const searchTerm = searchInput.value.trim();
    
    if (searchTerm) {
        console.log('🔍 Performing global search for:', searchTerm);
        window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;
    } else {
        console.log('⚠️ No search term provided');
        alert('Please enter a search term');
    }
}

// Make search function globally accessible
window.performGlobalSearch = performGlobalSearch;

// Add Enter key support for search
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performGlobalSearch();
            }
        });
    }
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
                this.allProducts = data.data.products;
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
        
        this.renderInto('homePopular', filteredProducts);
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
        
        this.renderInto('homeFeatured', filteredProducts);
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
        
        this.renderInto('homeOffers', filteredProducts);
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

    renderInto(containerId, products) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div style="padding:16px;color:#666;">No products found.</div>';
            return;
        }
        
        container.innerHTML = products.map(p => {
            const img = (p.images && p.images[0] && p.images[0].url) ? p.images[0].url : '/images/default.jpg';
            const original = p.originalPrice ? '<span class="original-price">KSh ' + Number(p.originalPrice).toLocaleString() + '</span>' : '';
            const pid = p._id || p.id;
            const isWishlisted = window.wishlistManager ? window.wishlistManager.isInWishlist(pid) : false;
            
            // Ensure product ID is valid
            if (!pid) {
                console.warn('⚠️ Product missing ID:', p.name);
                return ''; // Skip products without IDs
            }
            // Calculate discount percentage
            let discountBadge = '';
            if (p.originalPrice && p.originalPrice > p.price) {
                const discount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
                discountBadge = '<div class="discount-badge">-' + discount + '%</div>';
            }
            
            return (
                '<div class="product-item clickable-card" data-product-id="'+pid+'" onclick="console.log(\'HomePageTabs card clicked, product ID:\', \''+pid+'\'); viewProduct(\''+pid+'\');">'
                +  '<div class="product-image">'
                +    '<img src="'+img+'" alt="'+p.name+'" class="product-img" onerror="this.onerror=null;this.src=\'/images/default.jpg\';">'
                +    discountBadge
                +  '</div>'
                +  '<div class="product-info">'
                +    '<h3>'+p.name+'</h3>'
                +    '<div class="product-price">'
                +      '<span class="current-price">KSh ' + Number(p.price).toLocaleString() + '</span>'
                +      original
                +    '</div>'
                +    '<div class="product-actions">'
                +      '<button class="btn btn-primary home-add-cart-btn" onclick="event.stopPropagation(); addToCart(\''+pid+'\', \''+p.name.replace(/'/g, '\\\'').replace(/"/g, '\\"')+'\', '+p.price+', \''+img.replace(/'/g, '\\\'').replace(/"/g, '\\"')+'\')">Add to Cart</button>'
                +    '</div>'
                +  '</div>'
                +'</div>'
            );
        }).join('');
    }
}

// Initialize home page tabs when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏠 Initializing home page tabs');
    window.homePageTabs = new HomePageTabs();
});
