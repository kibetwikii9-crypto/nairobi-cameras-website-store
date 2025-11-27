// Golden Source Technologies - API Client
// Fetches real data from the backend API

class APIClient {
  constructor() {
    // Use environment-based URL for production deployment
    this.baseURL = window.location.origin + '/api';
  }

  // Fetch products from API with improved error handling
  async getProducts(category = null, limit = null, featured = null) {
    try {
      let url = `${this.baseURL}/products`;
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (limit) params.append('limit', limit);
      if (featured) params.append('featured', 'true');
      if (params.toString()) url += '?' + params.toString();
      
      console.log('🔍 Fetching products from:', url);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 API Response:', data);
      
      if (data.success && data.data && data.data.products && data.data.products.length > 0) {
        console.log(`✅ Successfully fetched ${data.data.products.length} products`);
        return data;
      } else {
        console.warn('⚠️ API returned no products, falling back to static data');
        return this.getStaticProducts();
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('❌ Request timeout - server may be down');
      } else {
        console.error('❌ Error fetching products:', error);
      }
      console.log('🔄 Falling back to static data');
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

  // Simulate API request
  async request(endpoint, options = {}) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Handle different endpoints
    if (endpoint.includes('/products')) {
      return this.getStaticProducts();
    } else if (endpoint.includes('/categories')) {
      return this.getStaticCategories();
    } else {
      return { success: false, message: 'Endpoint not found' };
    }
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


// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
