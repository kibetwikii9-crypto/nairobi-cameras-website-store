// Modern Admin Panel JavaScript
const API_BASE = '/api';
let authToken = localStorage.getItem('adminToken');
let currentUser = null;
let currentPage = 1;
let currentSection = 'dashboard';

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    if (!authToken) {
        showLoginModal();
    } else {
        initializeAdmin();
    }
    
    setupEventListeners();
    setupMobileMenu();
});

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active nav
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }

    // Signup form
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            signup();
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }

    // Search functionality
    document.getElementById('productSearch')?.addEventListener('input', debounce(loadProducts, 500));
    document.getElementById('orderSearch')?.addEventListener('input', debounce(loadOrders, 500));
    document.getElementById('userSearch')?.addEventListener('input', debounce(loadUsers, 500));

    // Product modal event listeners
    const productModal = document.getElementById('productModal');
    if (productModal) {
        productModal.addEventListener('hidden.bs.modal', function() {
            resetProductForm();
        });
    }

    // Image uploads (file picker)
    const imageFileInput = document.getElementById('imageFileInput');
    if (imageFileInput) {
        imageFileInput.addEventListener('change', handleImageFileUpload);
    }
}

// Setup mobile menu
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('adminSidebar');
    
    mobileMenuBtn?.addEventListener('click', function() {
        sidebar.classList.toggle('show');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                sidebar.classList.remove('show');
            }
        }
    });
}

// Initialize admin panel
async function initializeAdmin() {
    try {
        await loadDashboard();
        showSection('dashboard');
    } catch (error) {
        console.error('Initialization error:', error);
        showAlert('Failed to initialize admin panel', 'danger');
    }
}

// Show login modal
function showLoginModal() {
    const modalElement = document.getElementById('loginModal');
    const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',  // Prevent closing by clicking outside
        keyboard: false       // Prevent closing with ESC key
    });
    modal.show();
}

// Login function
async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showAlert('Please enter both email and password', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            currentUser = data.user;
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modal) {
                modal.hide();
            }
            
            // Clear login form
            document.getElementById('loginForm').reset();
            
            // Initialize admin
            try {
                await initializeAdmin();
                showAlert('Login successful!', 'success');
            } catch (initError) {
                console.error('Initialization error:', initError);
                showAlert('Login successful! Please refresh if needed.', 'success');
            }
        } else {
            showAlert(data.message || 'Invalid email or password', 'danger');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('Login failed: ' + (error.message || 'Please check your connection and try again.'), 'danger');
    }
}

// Signup function
async function signup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    if (!name || !email || !password) {
        showAlert('Please fill in all fields', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store credentials
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            currentUser = data.user;
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            if (modal) {
                modal.hide();
            }
            
            // Clear signup form
            document.getElementById('signupForm').reset();
            
            // Initialize admin panel
            try {
                await initializeAdmin();
                showAlert('Account created and logged in successfully!', 'success');
            } catch (initError) {
                console.error('Initialization error:', initError);
                showAlert('Account created! Please refresh the page.', 'success');
            }
        } else {
            showAlert(data.message || 'Signup failed', 'danger');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('Signup failed: ' + (error.message || 'Please try again.'), 'danger');
    }
}

// Logout function
function logout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    currentUser = null;
    showLoginModal();
    showAlert('Logged out successfully', 'info');
}

// Show section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        currentSection = section;

        // Load section data
        switch(section) {
            case 'dashboard':
                loadDashboard();
                break;
            case 'products':
                loadProducts();
                break;
            case 'orders':
                loadOrders();
                break;
            case 'users':
                loadUsers();
                break;
            case 'analytics':
                loadAnalytics();
                break;
        }
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/admin/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Update stats
            document.getElementById('totalUsers').textContent = data.data.stats.totalUsers || 0;
            document.getElementById('totalProducts').textContent = data.data.stats.totalProducts || 0;
            document.getElementById('totalOrders').textContent = data.data.stats.totalOrders || 0;
            document.getElementById('pendingOrders').textContent = data.data.stats.pendingOrders || 0;

            // Update recent orders
            updateRecentOrders(data.data.recentOrders || []);
            
            // Update top products
            updateTopProducts(data.data.topProducts || []);
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
        showAlert('Failed to load dashboard data', 'danger');
    }
}

// Update recent orders
function updateRecentOrders(orders) {
    const container = document.getElementById('recentOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No recent orders</p>';
        return;
    }

    const ordersHtml = orders.map(order => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <h6 class="mb-1">Order #${order.orderNumber || order.id}</h6>
                <small class="text-muted">${order.user?.name || order.customerName || 'Unknown Customer'}</small>
            </div>
            <div class="text-end">
                <span class="status-badge status-${order.orderStatus}">${order.orderStatus}</span>
                <div class="text-muted small">$${order.total}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = ordersHtml;
}

// Update top products
function updateTopProducts(products) {
    const container = document.getElementById('topProducts');
    
    if (products.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No products available</p>';
        return;
    }

    const productsHtml = products.map(product => `
        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
            <div>
                <h6 class="mb-1">${product.name}</h6>
                <small class="text-muted">${product.brand}</small>
            </div>
            <div class="text-end">
                <div class="fw-bold">$${product.price}</div>
                <small class="text-muted">Stock: ${product.stock}</small>
            </div>
        </div>
    `).join('');

    container.innerHTML = productsHtml;
}

// Load products
async function loadProducts() {
    try {
        const search = document.getElementById('productSearch')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const status = document.getElementById('statusFilter')?.value || '';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...(search && { search }),
            ...(category && { category }),
            ...(status && { isActive: status })
        });

        const response = await fetch(`${API_BASE}/admin/products?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            updateProductsTable(data.data.products, data.data.pagination);
        }
    } catch (error) {
        console.error('Products load error:', error);
        showAlert('Failed to load products', 'danger');
    }
}

// Update products table
function updateProductsTable(products, pagination) {
    const container = document.getElementById('productsTable');
    
    if (products.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No products found</p>';
        return;
    }

    const tableHtml = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    <img src="${product.images?.[0]?.url || '/images/placeholder.svg'}" 
                                         class="rounded me-3" width="50" height="50" style="object-fit: cover;">
                                    <div>
                                        <h6 class="mb-1">${product.name}</h6>
                                        <small class="text-muted">${product.brand}</small>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge bg-secondary">${product.category}</span>
                            </td>
                            <td>
                                <strong>$${product.price}</strong>
                                ${product.originalPrice && product.originalPrice > product.price ? 
                                    `<div class="text-muted small">Was $${product.originalPrice}</div>` : ''}
                            </td>
                            <td>
                                <span class="badge ${product.stock > 10 ? 'bg-success' : product.stock > 0 ? 'bg-warning' : 'bg-danger'}">
                                    ${product.stock}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge status-${product.isActive ? 'active' : 'inactive'}">
                                    ${product.isActive ? 'Active' : 'Inactive'}
                                </span>
                                ${product.isFeatured ? '<span class="featured-badge ms-2">Featured</span>' : ''}
                            </td>
                            <td>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="editProduct(${product.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-${product.isFeatured ? 'warning' : 'success'}" 
                                            onclick="toggleFeatured(${product.id}, ${!product.isFeatured})">
                                        <i class="fas fa-star"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="deleteProduct(${product.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${generatePagination(pagination)}
    `;

    container.innerHTML = tableHtml;
}

// Load orders
async function loadOrders() {
    try {
        const search = document.getElementById('orderSearch')?.value || '';
        const status = document.getElementById('orderStatusFilter')?.value || '';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...(search && { search }),
            ...(status && { status })
        });

        const response = await fetch(`${API_BASE}/admin/orders?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            updateOrdersTable(data.data.orders, data.data.pagination);
        }
    } catch (error) {
        console.error('Orders load error:', error);
        showAlert('Failed to load orders', 'danger');
    }
}

// Update orders table
function updateOrdersTable(orders, pagination) {
    const container = document.getElementById('ordersTable');
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No orders found</p>';
        return;
    }

    const tableHtml = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>
                                <strong>#${order.orderNumber || order.id}</strong>
                            </td>
                            <td>
                                <div>
                                    <div>${order.user?.name || order.customerName || 'Unknown'}</div>
                                    <small class="text-muted">${order.user?.email || order.customerEmail || ''}</small>
                                </div>
                            </td>
                            <td>
                                <strong>$${order.total}</strong>
                            </td>
                            <td>
                                <span class="status-badge status-${order.orderStatus}">${order.orderStatus}</span>
                            </td>
                            <td>
                                ${new Date(order.createdAt).toLocaleDateString()}
                            </td>
                            <td>
                                <select class="form-select form-select-sm" onchange="updateOrderStatus(${order.id}, this.value)">
                                    <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
                                    <option value="processing" ${order.orderStatus === 'processing' ? 'selected' : ''}>Processing</option>
                                    <option value="shipped" ${order.orderStatus === 'shipped' ? 'selected' : ''}>Shipped</option>
                                    <option value="delivered" ${order.orderStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
                                    <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${generatePagination(pagination)}
    `;

    container.innerHTML = tableHtml;
}

// Load users
async function loadUsers() {
    try {
        const search = document.getElementById('userSearch')?.value || '';
        const role = document.getElementById('userRoleFilter')?.value || '';

        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...(search && { search }),
            ...(role && { role })
        });

        const response = await fetch(`${API_BASE}/admin/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            updateUsersTable(data.data.users, data.data.pagination);
        }
    } catch (error) {
        console.error('Users load error:', error);
        showAlert('Failed to load users', 'danger');
    }
}

// Update users table
function updateUsersTable(users, pagination) {
    const container = document.getElementById('usersTable');
    
    if (users.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No users found</p>';
        return;
    }

    const tableHtml = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>
                                <div class="d-flex align-items-center">
                                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                                         style="width: 40px; height: 40px;">
                                        ${user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h6 class="mb-1">${user.name}</h6>
                                        <small class="text-muted">ID: ${user.id}</small>
                                    </div>
                                </div>
                            </td>
                            <td>${user.email}</td>
                            <td>
                                <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${user.role}</span>
                            </td>
                            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                            <td>
                                <select class="form-select form-select-sm" onchange="updateUserRole(${user.id}, this.value)">
                                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ${generatePagination(pagination)}
    `;

    container.innerHTML = tableHtml;
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/admin/analytics`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Update analytics cards
            document.getElementById('totalRevenue').textContent = `$${data.data.totalRevenue || 0}`;
            document.getElementById('avgOrderValue').textContent = `$${Math.round((data.data.totalRevenue || 0) / (data.data.totalOrders || 1))}`;
            document.getElementById('conversionRate').textContent = '2.5%'; // Placeholder
            document.getElementById('newCustomers').textContent = '12'; // Placeholder

            // Create charts
            createSalesChart(data.data.salesData || []);
            createCategoryChart(data.data.categoryStats || []);
        }
    } catch (error) {
        console.error('Analytics load error:', error);
        showAlert('Failed to load analytics', 'danger');
    }
}

// Create sales chart
function createSalesChart(salesData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: salesData.map(item => item._id || item.date),
            datasets: [{
                label: 'Sales',
                data: salesData.map(item => item.totalSales || item.revenue || 0),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Create category chart
function createCategoryChart(categoryData) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map(item => item.category || item._id),
            datasets: [{
                data: categoryData.map(item => item.count || item.totalProducts || 1),
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444',
                    '#8b5cf6',
                    '#06b6d4'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Product management functions
function editProduct(productId) {
    // Load product data and populate form
    fetch(`${API_BASE}/products/${productId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const product = data.data.product;
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.name;
                document.getElementById('productBrand').value = product.brand;
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productOriginalPrice').value = product.originalPrice || '';
                document.getElementById('productStock').value = product.stock;
                document.getElementById('productCategory').value = product.category;
                document.getElementById('productStatus').value = product.isActive;
                document.getElementById('productDescription').value = product.description;
                document.getElementById('productSpecifications').value = product.specifications ? JSON.stringify(product.specifications, null, 2) : '';
                document.getElementById('productFeatured').checked = product.isFeatured;
                
                // Display existing images
                displayExistingImages(product.images || []);
                
                document.getElementById('productModalTitle').textContent = 'Edit Product';
                new bootstrap.Modal(document.getElementById('productModal')).show();
            }
        })
        .catch(error => {
            console.error('Load product error:', error);
            showAlert('Failed to load product', 'danger');
        });
}

function displayExistingImages(images) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';

    images.forEach((image, index) => {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'd-inline-block me-2 mb-2';
        imgContainer.innerHTML = `
            <div class="position-relative">
                <img src="${image.url}" class="rounded" style="width: 100px; height: 100px; object-fit: cover;">
                <span class="badge bg-primary position-absolute top-0 start-0" style="transform: translate(-50%, -50%);">
                    ${index + 1}
                </span>
                ${image.isPrimary ? '<span class="badge bg-success position-absolute bottom-0 start-0">Primary</span>' : ''}
                <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" 
                        onclick="removeExistingImage(this, '${image.url}')" style="transform: translate(50%, -50%);">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        preview.appendChild(imgContainer);
    });
}

async function saveProduct() {
    const productId = document.getElementById('productId').value;
    
    try {
        // Handle multiple image URLs
        let productImages = [];
        
        // Get all image URL inputs
        const imageInputs = document.querySelectorAll('#imageUrlContainer input[type="url"]');
        const imageUrls = Array.from(imageInputs)
            .map(input => input.value.trim())
            .filter(url => url !== '');
        
        if (imageUrls.length > 0) {
            // Validate all URLs (handle both absolute and relative URLs)
            for (let i = 0; i < imageUrls.length; i++) {
                const url = imageUrls[i];
                // Check if it's a valid absolute URL or a valid relative URL
                let isValid = false;
                
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    // Absolute URL - validate with URL constructor
                    try {
                        new URL(url);
                        isValid = true;
                    } catch (error) {
                        isValid = false;
                    }
                } else if (url.startsWith('/') || url.startsWith('./')) {
                    // Relative URL - valid
                    isValid = true;
                } else {
                    // Invalid format
                    isValid = false;
                }
                
                if (isValid) {
                    productImages.push({
                        url: url,
                        isPrimary: i === 0 // First image is primary
                    });
                } else {
                    throw new Error(`Please enter a valid image URL for image ${i + 1}`);
                }
            }
        } else {
            // Use placeholder image if no URLs provided
            productImages = [{
                url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop&crop=center',
                isPrimary: true
            }];
        }

        // Parse specifications JSON
        let specifications = {};
        try {
            const specsText = document.getElementById('productSpecifications').value.trim();
            if (specsText) {
                specifications = JSON.parse(specsText);
            }
        } catch (error) {
            showAlert('Invalid JSON format in specifications. Please check your input.', 'danger');
            return;
        }

        const productData = {
            name: document.getElementById('productName').value,
            brand: document.getElementById('productBrand').value,
            price: parseFloat(document.getElementById('productPrice').value),
            originalPrice: document.getElementById('productOriginalPrice').value ? parseFloat(document.getElementById('productOriginalPrice').value) : null,
            stock: parseInt(document.getElementById('productStock').value),
            category: document.getElementById('productCategory').value,
            isActive: document.getElementById('productStatus').value === 'true',
            description: document.getElementById('productDescription').value,
            specifications: specifications,
            isFeatured: document.getElementById('productFeatured').checked,
            images: productImages
        };

        const url = productId ? `${API_BASE}/products/${productId}` : `${API_BASE}/products`;
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(productData)
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
            loadProducts();
            resetProductForm();
        } else {
            showAlert(data.message, 'danger');
        }
    } catch (error) {
        console.error('Save product error:', error);
        showAlert('Failed to save product', 'danger');
    }
}

function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = 'Add Product';
    const preview = document.getElementById('imagePreview');
    if (preview) {
        preview.innerHTML = '<p class="text-muted">No images selected.</p>';
    }
    const urlContainer = document.getElementById('imageUrlContainer');
    if (urlContainer) {
        urlContainer.innerHTML = '';
        addImageUrl('');
        updateRemoveButtons();
    }
    document.getElementById('productOriginalPrice').value = '';
    document.getElementById('productSpecifications').value = '';
}

// Simple file validation
function validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    // Check file size
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
        };
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        };
    }
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
        return {
            valid: false,
            error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`
        };
    }
    
    return { valid: true };
}

function toggleFeatured(productId, isFeatured) {
    fetch(`${API_BASE}/admin/products/${productId}/featured`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ isFeatured })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            loadProducts();
        } else {
            showAlert(data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Toggle featured error:', error);
        showAlert('Failed to update product', 'danger');
    });
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        fetch(`${API_BASE}/products/${productId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Product deleted successfully', 'success');
                loadProducts();
            } else {
                showAlert(data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Delete product error:', error);
            showAlert('Failed to delete product', 'danger');
        });
    }
}

// Order management functions
function updateOrderStatus(orderId, status) {
    fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Order status updated successfully', 'success');
        } else {
            showAlert(data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Update order status error:', error);
        showAlert('Failed to update order status', 'danger');
    });
}

// User management functions
function updateUserRole(userId, role) {
    fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ role })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('User role updated successfully', 'success');
        } else {
            showAlert(data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Update user role error:', error);
        showAlert('Failed to update user role', 'danger');
    });
}

// Utility functions
function generatePagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) return '';

    const pages = [];
    for (let i = 1; i <= pagination.totalPages; i++) {
        pages.push(`
            <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
            </li>
        `);
    }

    return `
        <nav>
            <ul class="pagination">
                ${pages.join('')}
            </ul>
        </nav>
    `;
}

function changePage(page) {
    currentPage = page;
    switch(currentSection) {
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}-modern alert-modern alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    // Remove existing alerts
    document.querySelectorAll('.alert-modern').forEach(alert => alert.remove());

    // Add new alert
    document.querySelector('.main-content').insertBefore(alertDiv, document.querySelector('.main-content').firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS for status badges
const style = document.createElement('style');
style.textContent = `
    .status-active { background: #d1fae5; color: #065f46; }
    .status-inactive { background: #fee2e2; color: #991b1b; }
`;
document.head.appendChild(style);

// Multiple image URL functions
function addImageUrl(url = '') {
    const container = document.getElementById('imageUrlContainer');
    if (!container) return;

    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group mb-2';
    inputGroup.innerHTML = `
        <input type="url" class="form-control" placeholder="https://example.com/image.jpg" value="${url}">
        <button type="button" class="btn btn-outline-danger" onclick="removeImageUrl(this)">
            <i class="fas fa-trash"></i>
        </button>
    `;

    container.appendChild(inputGroup);
    updateRemoveButtons();

    inputGroup.querySelector('input').addEventListener('input', updateImagePreview);
    updateImagePreview();
}

function removeImageUrl(button) {
    const container = document.getElementById('imageUrlContainer');
    if (!container) return;

    if (container.children.length <= 1) {
        container.querySelector('input').value = '';
        button.style.display = 'none';
        updateImagePreview();
        return;
    }

    button.parentElement.remove();
    updateRemoveButtons();
    updateImagePreview();
}

function updateRemoveButtons() {
    const container = document.getElementById('imageUrlContainer');
    if (!container) return;

    const inputs = container.querySelectorAll('input[type="url"]');
    const buttons = container.querySelectorAll('.btn-outline-danger');

    buttons.forEach((button) => {
        button.style.display = inputs.length > 1 ? 'block' : 'none';
    });
}

function updateImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (!preview) return;

    const inputs = document.querySelectorAll('#imageUrlContainer input[type="url"]');
    const urls = Array.from(inputs)
        .map((input) => input.value.trim())
        .filter(Boolean);

    if (urls.length === 0) {
        preview.innerHTML = '<p class="text-muted">No images selected.</p>';
        return;
    }

    preview.innerHTML = urls
        .map((url, index) => `
            <div class="d-inline-block me-2 mb-2 position-relative">
                <img src="${url}" class="rounded border" width="80" height="80" style="object-fit: cover;"
                     onerror="this.src='/images/default.jpg'">
                <span class="badge bg-${index === 0 ? 'primary' : 'secondary'} position-absolute top-0 start-0 mt-1 ms-1">
                    ${index === 0 ? 'Primary' : index + 1}
                </span>
            </div>
        `)
        .join('');
}

// Initial preview wiring
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#imageUrlContainer input[type="url"]').forEach((input) => {
        input.addEventListener('input', updateImagePreview);
    });
    updateRemoveButtons();
});

// File upload helpers
async function handleImageFileUpload(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const progressBar = document.getElementById('uploadProgressBar');
    const progressContainer = document.getElementById('uploadProgressContainer');

    const maxSize = 5 * 1024 * 1024;
    const maxFiles = 10;

    if (files.some((file) => file.size > maxSize)) {
        showAlert('Each file must be 5MB or less.', 'warning');
        return;
    }
    if (files.length > maxFiles) {
        showAlert(`Please upload up to ${maxFiles} files at a time.`, 'warning');
        return;
    }

    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const validation = validateImageFile(file);
            if (!validation.valid) {
                showAlert(`${file.name}: ${validation.error}`, 'warning');
                continue;
            }

            progressBar.style.width = `${Math.round((i / files.length) * 100)}%`;
            await uploadSingleImage(file);
        }
        progressBar.style.width = '100%';
        showAlert('Images uploaded successfully.', 'success');
    } catch (error) {
        console.error('Upload error:', error);
        showAlert(error.message || 'Image upload failed.', 'danger');
    } finally {
        event.target.value = '';
        setTimeout(() => {
            progressContainer.style.display = 'none';
            progressBar.style.width = '0%';
        }, 500);
    }
}

async function uploadSingleImage(file) {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(data?.message || `Failed to upload ${file.name}`);
    }

    const url = data?.data?.url;
    if (!url) {
        throw new Error(`Upload succeeded but no URL returned for ${file.name}`);
    }

    addImageUrl(url);
}
