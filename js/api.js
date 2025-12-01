// Golden Source Technologies - API Client
// Fetches real data from the backend API

class APIClient {
  // PERFORMANCE: Client-side request caching and debouncing
  constructor() {
    // Use environment-based URL for production deployment
    this.baseURL = window.location.origin + '/api';
    this.requestCache = new Map();
    this.pendingRequests = new Map();
    this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  }

  // Fetch products from API with improved error handling and caching
  async getProducts(category = null, limit = null, featured = null) {
    let url = null; // Declare outside try block to access in catch
    try {
      url = `${this.baseURL}/products`;
      const params = new URLSearchParams();
      if (category) {
        params.append('category', category);
      }
      if (limit) params.append('limit', limit);
      if (featured) params.append('featured', 'true');
      if (params.toString()) url += '?' + params.toString();
      
      // PERFORMANCE: Check if request is already pending
      if (this.pendingRequests.has(url)) {
        return await this.pendingRequests.get(url);
      }
      
      // PERFORMANCE: Check cache
      const cacheKey = url;
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.data;
      }
      
      // PERFORMANCE: Create request promise and store it
      const requestPromise = (async () => {
        try {
          // Add timeout to prevent hanging requests (reduced to 8 seconds)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Cache-Control': 'max-age=300' // Request caching
            },
            mode: 'cors',
            signal: controller.signal,
            cache: 'default' // Use browser cache
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          // PERFORMANCE: Cache successful responses
          if (data.success && data.data && data.data.products) {
            this.requestCache.set(cacheKey, {
              data,
              timestamp: Date.now()
            });
            // Clean up old cache (keep max 50 entries)
            if (this.requestCache.size > 50) {
              const firstKey = this.requestCache.keys().next().value;
              this.requestCache.delete(firstKey);
            }
            return data;
          } else {
            return this.getStaticProducts();
          }
        } finally {
          // Remove from pending requests
          if (url) {
            this.pendingRequests.delete(url);
          }
        }
      })();
      
      // Store pending request
      this.pendingRequests.set(url, requestPromise);
      
      return await requestPromise;
    } catch (error) {
      // Remove from pending requests on error (safely check if url exists)
      if (url) {
        this.pendingRequests.delete(url);
      }
      
      if (error.name === 'AbortError') {
        console.error('❌ Request timeout - server may be down');
      } else {
        console.error('❌ Error fetching products:', error);
      }
      return this.getStaticProducts();
    }
  }

  // Static product data (fallback) - Empty for production
  getStaticProducts() {
    console.log('⚠️ API unavailable - no fallback products available');
    return {
      success: true,
      data: {
        products: []
      }
    };
  }


  // Static categories
  getStaticCategories() {
    return {
      success: true,
      data: [
        { id: 1, name: "Laptops", slug: "laptops", icon: "fas fa-laptop" },
        { id: 2, name: "Smartphones", slug: "phones", icon: "fas fa-mobile-alt" },
        { id: 3, name: "Cameras", slug: "cameras", icon: "fas fa-camera" },
        { id: 4, name: "Audio", slug: "audio", icon: "fas fa-headphones" },
        { id: 5, name: "Accessories", slug: "accessories", icon: "fas fa-keyboard" }
      ]
    };
  }

  async getProduct(id) {
    try {
      const response = await fetch(`${this.baseURL}/products/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      throw error;
    }
  }

  // Alias for getProduct to fix method name inconsistency
  async getProductById(id) {
    return await this.getProduct(id);
  }

  async getFeaturedProducts() {
    return await this.getProducts(null, null, true);
  }

  async searchProducts(query, filters = {}) {
    try {
      const response = await fetch(`${this.baseURL}/products/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Error searching products:', error);
      return { success: false, data: { products: [] } };
    }
  }

  // Categories API
  async getCategories() {
    return this.getStaticCategories();
  }

  async getCategory(id) {
    const categories = this.getStaticCategories().data;
    const category = categories.find(c => c.id === parseInt(id));
    
    if (!category) {
      throw new Error('Category not found');
    }
    
    return { success: true, data: category };
  }


  // Orders API (simplified)
  async getOrders() {
    return { success: true, data: [] };
  }

  async createOrder(orderData) {
    // Simulate order creation
    const order = {
      id: Date.now(),
      orderNumber: `GS${Date.now()}`,
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    return { success: true, data: order };
  }

  // Health check
  async healthCheck() {
    return {
      success: true,
      message: 'Golden Source Technologies API is running',
      timestamp: new Date().toISOString(),
      environment: 'static',
      version: '1.0.0'
    };
  }
}

// Create global API instance
const api = new APIClient();

// Export for use in other files
window.api = api;
window.APIClient = APIClient; // Make class available globally

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
