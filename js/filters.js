// Advanced Filtering and Sorting System for Golden Source Technologies
class ProductFilter {
    constructor() {
        this.allProducts = [];
        this.filteredProducts = [];
        this.currentFilters = {
            category: null,
            subcategory: null,
            priceRange: null,
            brand: null,
            availability: null,
            featured: null,
            search: null
        };
        this.currentSort = 'popularity';
        this.isLoading = false;
    }

    // Initialize the filter system
    async init() {
        console.log('🔍 Initializing advanced filter system');
        await this.loadAllProducts();
        this.setupEventListeners();
        this.applyFilters();
    }

    // Load all products for filtering
    async loadAllProducts() {
        try {
            // Use the existing API client if available
            if (window.api) {
                const data = await window.api.getProducts();
                if (data.success && data.data.products) {
                    this.allProducts = data.data.products;
                    this.filteredProducts = [...this.allProducts];
                    console.log(`📦 Loaded ${this.allProducts.length} products for filtering`);
                    return;
                }
            }
            
            // Fallback to direct API call
            const response = await fetch('/api/products?limit=1000');
            const data = await response.json();
            
            if (data.success && data.data.products) {
                this.allProducts = data.data.products;
                this.filteredProducts = [...this.allProducts];
                console.log(`📦 Loaded ${this.allProducts.length} products for filtering`);
            } else {
                console.warn('⚠️ No products loaded, using fallback data');
                this.allProducts = this.getFallbackProducts();
                this.filteredProducts = [...this.allProducts];
            }
        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.allProducts = this.getFallbackProducts();
            this.filteredProducts = [...this.allProducts];
        }
    }

    // Fallback products for demo
    getFallbackProducts() {
        return [
            {
                id: 1,
                name: "MacBook Pro 14-inch M3",
                price: 250000,
                originalPrice: 280000,
                category: "laptops",
                brand: "Apple",
                subcategory: "business",
                isFeatured: true,
                stock: 10,
                createdAt: new Date('2024-01-15').toISOString(),
                images: [{ url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500", isPrimary: true }]
            },
            {
                id: 2,
                name: "Gaming Mouse RGB",
                price: 15000,
                category: "accessories",
                brand: "Logitech",
                subcategory: "mice",
                isFeatured: false,
                stock: 25,
                createdAt: new Date('2024-01-20').toISOString(),
                images: [{ url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500", isPrimary: true }]
            },
            {
                id: 3,
                name: "Canon 50mm Lens",
                price: 45000,
                category: "cameras",
                brand: "Canon",
                subcategory: "lenses",
                isFeatured: true,
                stock: 5,
                createdAt: new Date('2024-01-10').toISOString(),
                images: [{ url: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=500", isPrimary: true }]
            },
            {
                id: 4,
                name: "iPhone 15 Pro",
                price: 150000,
                originalPrice: 170000,
                category: "phones",
                brand: "Apple",
                subcategory: "smartphone",
                isFeatured: true,
                stock: 20,
                createdAt: new Date('2024-01-05').toISOString(),
                images: [{ url: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500", isPrimary: true }]
            },
            {
                id: 5,
                name: "Gaming Laptop RTX 4070",
                price: 180000,
                category: "laptops",
                brand: "ASUS",
                subcategory: "gaming",
                isFeatured: false,
                stock: 8,
                createdAt: new Date('2024-01-12').toISOString(),
                images: [{ url: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500", isPrimary: true }]
            }
        ];
    }

    // Setup event listeners for filter buttons
    setupEventListeners() {
        console.log('🔧 Setting up event listeners');
        
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        console.log(`🔘 Found ${filterButtons.length} filter buttons`);
        
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleFilterClick(btn);
            });
        });

        // Sort dropdown
        const sortSelect = document.querySelector('.sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.handleSortChange(e.target.value);
            });
        }

        // Search input - integrate with existing global search
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            // Remove existing event listeners to prevent conflicts
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            
            newSearchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Price range filters
        document.querySelectorAll('[data-filter="price"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handlePriceFilter(btn.dataset.priceRange);
            });
        });
    }

    // Handle filter button clicks
    handleFilterClick(button) {
        const filterType = button.dataset.filter;
        const filterValue = button.dataset.value || button.textContent.trim();

        // Remove active class from all buttons in the same group
        const buttonGroup = button.closest('.filter-section') || button.closest('.quick-links');
        if (buttonGroup) {
            buttonGroup.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }

        // Add active class to clicked button
        button.classList.add('active');

        // Apply the filter
        this.applyFilter(filterType, filterValue);
    }

    // Apply specific filter
    applyFilter(type, value) {
        console.log(`🔍 Applying filter: ${type} = ${value}`);

        // Reset all special filters first
        this.currentFilters.newArrivals = false;
        this.currentFilters.limitedTime = false;
        this.currentFilters.featured = false;
        this.currentFilters.subcategory = null;

        switch (type) {
            case 'all':
                // Keep all filters reset
                break;
            case 'new-arrivals':
                this.currentFilters.newArrivals = true;
                break;
            case 'limited-time':
                this.currentFilters.limitedTime = true;
                break;
            case 'featured':
                this.currentFilters.featured = true;
                break;
            case 'gaming':
            case 'business':
            case 'ultrabook':
            case 'workstation':
            case 'budget':
                this.currentFilters.subcategory = type;
                break;
            case 'mice':
            case 'lenses':
            case 'keyboards':
            case 'headphones':
            case 'speakers':
            case 'security':
            case 'lights':
            case 'climate':
            case 'cameras':
                this.currentFilters.subcategory = type;
                break;
            case 'iphone':
            case 'samsung':
            case 'huawei':
            case 'xiaomi':
            case 'oneplus':
                this.currentFilters.brand = type;
                break;
            default:
                this.currentFilters.subcategory = value.toLowerCase();
        }

        this.applyFilters();
    }

    // Handle sort change
    handleSortChange(sortType) {
        console.log(`📊 Sorting by: ${sortType}`);
        
        // Map HTML options to internal sort types
        const sortMapping = {
            'Sort by popularity': 'popularity',
            'Sort by average rating': 'popularity',
            'Sort by latest': 'latest',
            'Sort by price: low to high': 'price-low-high',
            'Sort by price: high to low': 'price-high-low'
        };
        
        this.currentSort = sortMapping[sortType] || sortType;
        this.applyFilters();
    }

    // Handle search
    handleSearch(searchTerm) {
        console.log(`🔍 Searching for: ${searchTerm}`);
        this.currentFilters.search = searchTerm.toLowerCase();
        this.applyFilters();
    }

    // Handle price filter
    handlePriceFilter(priceRange) {
        console.log(`💰 Price filter: ${priceRange}`);
        this.currentFilters.priceRange = priceRange;
        this.applyFilters();
    }

    // Apply all filters and sorting
    applyFilters() {
        if (this.isLoading) {
            console.log('⏳ Filters already being applied, skipping...');
            return;
        }

        this.isLoading = true;
        console.log('🔄 Applying filters and sorting...');
        console.log('🔍 Current filter state:', this.currentFilters);
        
        // Show loading state
        this.showLoading();

        let filtered = [...this.allProducts];

        // Apply category filter (from URL)
        const currentCategory = this.getCurrentCategory();
        if (currentCategory) {
            filtered = filtered.filter(product => product.category === currentCategory);
        }

        // Apply subcategory filter
        if (this.currentFilters.subcategory) {
            filtered = filtered.filter(product => 
                product.subcategory === this.currentFilters.subcategory ||
                product.brand?.toLowerCase() === this.currentFilters.subcategory ||
                product.name.toLowerCase().includes(this.currentFilters.subcategory)
            );
        }

        // Apply new arrivals filter
        if (this.currentFilters.newArrivals) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            filtered = filtered.filter(product => {
                const productDate = new Date(product.createdAt);
                return productDate > oneWeekAgo;
            });
            console.log(`📅 New arrivals filter applied: ${filtered.length} products`);
        }

        // Apply limited time filter (products with discounts)
        if (this.currentFilters.limitedTime) {
            filtered = filtered.filter(product => 
                product.originalPrice && product.originalPrice > product.price
            );
            console.log(`⏰ Limited time filter applied: ${filtered.length} products`);
        }

        // Apply featured filter
        if (this.currentFilters.featured) {
            filtered = filtered.filter(product => product.isFeatured);
            console.log(`⭐ Featured filter applied: ${filtered.length} products`);
        }

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search;
            filtered = filtered.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                product.brand?.toLowerCase().includes(searchTerm) ||
                product.description?.toLowerCase().includes(searchTerm)
            );
        }

        // Apply price range filter
        if (this.currentFilters.priceRange) {
            const [min, max] = this.currentFilters.priceRange.split('-').map(Number);
            filtered = filtered.filter(product => {
                const price = product.price;
                if (max) {
                    return price >= min && price <= max;
                } else {
                    return price >= min;
                }
            });
        }

        // Apply sorting
        filtered = this.sortProducts(filtered, this.currentSort);

        this.filteredProducts = filtered;
        this.displayFilteredProducts();
        this.updateResultsCount();

        this.isLoading = false;
        console.log(`✅ Filtered to ${filtered.length} products`);
    }

    // Show loading state
    showLoading() {
        const container = document.getElementById('productsContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-message">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>Filtering products...</p>
                </div>
            `;
        }
    }

    // Sort products
    sortProducts(products, sortType) {
        const sorted = [...products];

        switch (sortType) {
            case 'price-low-high':
                return sorted.sort((a, b) => a.price - b.price);
            case 'price-high-low':
                return sorted.sort((a, b) => b.price - a.price);
            case 'latest':
                return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            case 'popularity':
                return sorted.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
            case 'name':
                return sorted.sort((a, b) => a.name.localeCompare(b.name));
            default:
                return sorted;
        }
    }

    // Get current category from URL
    getCurrentCategory() {
        const path = window.location.pathname;
        // Support both clean URLs and .html URLs
        if (path.includes('laptops') || path.includes('/laptops')) return 'laptops';
        if (path.includes('phones') || path.includes('/phones')) return 'phones';
        if (path.includes('cameras') || path.includes('/cameras')) return 'cameras';
        if (path.includes('audio.html')) return 'audio';
        if (path.includes('accessories.html')) return 'accessories';
        if (path.includes('smart-home.html')) return 'smart-home';
        return null;
    }

    // Display filtered products
    displayFilteredProducts() {
        const container = document.getElementById('productsContainer');
        if (!container) return;

        if (this.filteredProducts.length === 0) {
            container.innerHTML = `
                <div class="no-products">
                    <i class="fas fa-search"></i>
                    <h3>No products found</h3>
                    <p>Try adjusting your filters or search terms.</p>
                    <button class="btn btn-primary" onclick="window.productFilter.clearFilters()">Clear Filters</button>
                </div>
            `;
            return;
        }

        // Use the existing product card creation from products.js
        if (window.ProductLoader) {
            const productLoader = new window.ProductLoader();
            container.innerHTML = this.filteredProducts.map(product => 
                productLoader.createProductCard(product)
            ).join('');
        } else {
            // Fallback product card creation
            container.innerHTML = this.filteredProducts.map(product => 
                this.createProductCard(product)
            ).join('');
        }
    }

    // Create product card (fallback)
    createProductCard(product) {
        const imageUrl = product.images?.[0]?.url || '/images/default.jpg';
        const price = Number(product.price) || 0;
        const originalPrice = Number(product.originalPrice) || 0;
        
        const originalPriceHtml = originalPrice > price 
            ? `<span class="original-price">KSh ${originalPrice.toLocaleString()}</span>`
            : '';
        
        const discount = originalPrice > price
            ? `<span class="discount-badge">-${Math.round(((originalPrice - price) / originalPrice) * 100)}%</span>`
            : '';

        return `
            <div class="product-card clickable-card" data-product-id="${product.id}" onclick="viewProduct(${product.id})">
                <div class="product-image">
                    <img src="${imageUrl}" alt="${product.name}" class="product-img">
                    ${discount}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-brand">${product.brand || ''}</p>
                    <div class="product-price">
                        <span class="current-price">KSh ${price.toLocaleString()}</span>
                        ${originalPriceHtml}
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-primary add-to-cart" onclick="event.stopPropagation(); addToCart('${product.id}', '${product.name}', ${price}, '${imageUrl}')">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Update results count
    updateResultsCount() {
        const countElement = document.querySelector('.sort-section span');
        if (countElement) {
            const total = this.allProducts.length;
            const filtered = this.filteredProducts.length;
            countElement.textContent = `Showing ${filtered} of ${total} results`;
        }
    }

    // Clear all filters
    clearFilters() {
        this.currentFilters = {
            category: null,
            subcategory: null,
            priceRange: null,
            brand: null,
            availability: null,
            featured: null,
            newArrivals: false,
            limitedTime: false,
            search: null
        };
        
        // Remove active classes
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set "Shop All" as active
        const shopAllBtn = document.querySelector('[data-filter="all"]');
        if (shopAllBtn) {
            shopAllBtn.classList.add('active');
        }
        
        // Reset search input
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) searchInput.value = '';
        
        this.applyFilters();
    }
}

// Initialize filter system when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Only initialize on category pages
    const currentPage = window.location.pathname;
    const categoryPages = ['laptops.html', 'phones.html', 'cameras.html', 'audio.html', 'accessories.html', 'smart-home.html'];
    
    if (!categoryPages.some(page => currentPage.includes(page))) {
        console.log('🔍 Not a category page, skipping filter system');
        return;
    }
    
    console.log('🔍 Initializing advanced filter system');
    window.productFilter = new ProductFilter();
    window.productFilter.init();
});

// Export for global access
window.ProductFilter = ProductFilter;
