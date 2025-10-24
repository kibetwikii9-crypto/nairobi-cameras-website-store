// Enhanced Cart functionality for Golden Source Technologies
class CartManager {
    constructor() {
        console.log('🛒 Enhanced CartManager initialized');
        this.cart = this.loadCart();
        this.init();
    }

    init() {
        // Update cart badge on page load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.updateCartBadge();
            });
        } else {
            this.updateCartBadge();
        }
    }

    // Load cart from localStorage
    loadCart() {
        try {
            const savedCart = localStorage.getItem('goldenSourceCart');
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                console.log('🛒 Cart loaded:', parsed);
                return parsed;
            }
            return [];
        } catch (error) {
            console.error('🛒 Error loading cart:', error);
            return [];
        }
    }

    // Save cart to localStorage
    saveCart() {
        try {
            localStorage.setItem('goldenSourceCart', JSON.stringify(this.cart));
            this.updateCartBadge();
            console.log('✅ Cart saved');
        } catch (error) {
            console.error('🛒 Error saving cart:', error);
        }
    }

    // Add item to cart with enhanced features
    addToCart(productId, productName, price, image, quantity = 1) {
        console.log('🛒 Adding to cart:', { productId, productName, price, image, quantity });
        
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += quantity;
            this.showNotification(`${productName} quantity updated!`, 'success');
        } else {
            const newItem = {
                id: productId,
                name: productName,
                price: parseFloat(price),
                image: image,
                quantity: quantity,
                addedAt: new Date().toISOString()
            };
            this.cart.push(newItem);
            this.showNotification(`${productName} added to cart!`, 'success');
        }
        
        this.saveCart();
        this.updateCartDisplay();
        this.updateCartBadge();
        
        // Animate cart badge
        this.animateCartBadge();
    }

    // Remove item from cart
    removeFromCart(productId) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            this.cart = this.cart.filter(item => item.id !== productId);
            this.saveCart();
            this.updateCartDisplay();
            this.showNotification(`${item.name} removed from cart`, 'info');
        }
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartDisplay();
            }
        }
    }

    // Clear entire cart
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();
        this.showNotification('Cart cleared', 'info');
    }

    // Get cart total
    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Get cart item count
    getCartItemCount() {
        return this.cart.reduce((count, item) => count + item.quantity, 0);
    }

    // Update cart display
    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const emptyCart = document.getElementById('emptyCart');
        const productAmount = document.getElementById('productAmount');
        const deliveryFee = document.getElementById('deliveryFee');
        const taxAmount = document.getElementById('taxAmount');
        const totalAmount = document.getElementById('totalAmount');
        const checkoutBtn = document.getElementById('checkoutBtn');

        if (!cartItems) {
            this.updateCartBadge();
            return;
        }

        if (this.cart.length === 0) {
            if (cartItems) cartItems.innerHTML = '';
            if (emptyCart) emptyCart.style.display = 'block';
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                checkoutBtn.innerHTML = '<i class="fas fa-lock me-2"></i>Cart is Empty';
            }
            return;
        }

        if (emptyCart) emptyCart.style.display = 'none';
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fas fa-credit-card me-2"></i>Proceed to Checkout';
        }

        // Render cart items with enhanced design
        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item-enhanced" data-product-id="${item.id}">
                <div class="item-image-enhanced">
                    <img src="${item.image}" alt="${item.name}" 
                         onerror="this.onerror=null;this.src='images/placeholder.jpg';">
                </div>
                <div class="item-info-enhanced">
                    <h6 class="item-name-enhanced">${item.name}</h6>
                    <div class="item-price-enhanced">KSh ${item.price.toLocaleString()}</div>
                </div>
                <div class="quantity-enhanced">
                    <button class="qty-btn-enhanced" onclick="cartManager.updateQuantity('${item.id}', ${item.quantity - 1})">
                        <i class="fas fa-minus"></i>
                    </button>
                    <span class="qty-value-enhanced">${item.quantity}</span>
                    <button class="qty-btn-enhanced" onclick="cartManager.updateQuantity('${item.id}', ${item.quantity + 1})">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="item-total-enhanced">KSh ${(item.price * item.quantity).toLocaleString()}</div>
                <button class="remove-btn-enhanced" onclick="cartManager.removeFromCart('${item.id}')" title="Remove Item">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');

        // Update totals
        const productValue = this.getCartTotal();
        const deliveryCost = productValue > 50000 ? 0 : 500; // Free delivery over KSh 50,000
        const taxValue = Math.round(productValue * 0.16); // 16% VAT
        const totalValue = productValue + taxValue + deliveryCost;

        if (productAmount) productAmount.textContent = `KSh ${productValue.toLocaleString()}`;
        if (deliveryFee) deliveryFee.textContent = deliveryCost === 0 ? 'FREE' : `KSh ${deliveryCost.toLocaleString()}`;
        if (taxAmount) taxAmount.textContent = `KSh ${taxValue.toLocaleString()}`;
        if (totalAmount) totalAmount.innerHTML = `<strong>KSh ${totalValue.toLocaleString()}</strong>`;
    }

    // Update cart badge
    updateCartBadge() {
        const badges = document.querySelectorAll('#cartBadge, .cart-badge');
        const count = this.getCartItemCount();
        
        badges.forEach(badge => {
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'inline' : 'none';
            }
        });
    }

    // Animate cart badge
    animateCartBadge() {
        const badges = document.querySelectorAll('#cartBadge, .cart-badge');
        badges.forEach(badge => {
            if (badge) {
                badge.style.transform = 'scale(1.3)';
                badge.style.transition = 'transform 0.3s ease';
                setTimeout(() => {
                    badge.style.transform = 'scale(1)';
                }, 300);
            }
        });
    }

    // Show notification
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Proceed to checkout
    proceedToCheckout() {
        if (this.cart.length === 0) {
            this.showNotification('Your cart is empty!', 'info');
            return;
        }

        const productValue = this.getCartTotal();
        const deliveryCost = productValue > 50000 ? 0 : 500;
        const taxValue = Math.round(productValue * 0.16);
        const totalValue = productValue + taxValue + deliveryCost;

        // Create order summary
        const orderData = {
            items: this.cart,
            productAmount: productValue,
            deliveryFee: deliveryCost,
            tax: taxValue,
            total: totalValue,
            orderDate: new Date().toISOString()
        };

        // Save order
        localStorage.setItem('goldenSourceOrder', JSON.stringify(orderData));
        
        // Show checkout modal
        this.showCheckoutModal(orderData);
    }

    // Show checkout modal
    showCheckoutModal(orderData) {
        const modal = document.createElement('div');
        modal.className = 'checkout-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-credit-card me-2"></i>Checkout</h3>
                    <button class="close-btn" onclick="this.closest('.checkout-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="order-summary">
                        <h4>Order Summary</h4>
                        <div class="summary-item">
                            <span>Products:</span>
                            <span>KSh ${orderData.productAmount.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span>Delivery:</span>
                            <span>${orderData.deliveryFee === 0 ? 'FREE' : 'KSh ' + orderData.deliveryFee.toLocaleString()}</span>
                        </div>
                        <div class="summary-item">
                            <span>Tax (16% VAT):</span>
                            <span>KSh ${orderData.tax.toLocaleString()}</span>
                        </div>
                        <div class="summary-item total">
                            <span><strong>Total:</strong></span>
                            <span><strong>KSh ${orderData.total.toLocaleString()}</strong></span>
                        </div>
                    </div>
                    <div class="checkout-options">
                        <h4>Payment Options</h4>
                        <div class="payment-methods">
                            <button class="payment-btn" onclick="cartManager.processPayment('mpesa')">
                                <i class="fas fa-mobile-alt"></i> M-Pesa
                            </button>
                            <button class="payment-btn" onclick="cartManager.processPayment('card')">
                                <i class="fas fa-credit-card"></i> Card
                            </button>
                            <button class="payment-btn" onclick="cartManager.processPayment('bank')">
                                <i class="fas fa-university"></i> Bank Transfer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
        `;
        
        document.body.appendChild(modal);
    }

    // Process payment
    processPayment(method) {
        this.showNotification(`Payment via ${method.toUpperCase()} will be available soon!`, 'info');
        // Close modal
        document.querySelector('.checkout-modal')?.remove();
    }
}

// Global cart manager instance
const cartManager = new CartManager();
window.cartManager = cartManager;

// Global functions for HTML onclick calls
function addToCart(productId, productName, price, image) {
    if (window.cartManager) {
        window.cartManager.addToCart(productId, productName, price, image);
    }
}

function removeFromCart(productId) {
    if (window.cartManager) {
        window.cartManager.removeFromCart(productId);
    }
}

function updateQuantity(productId, quantity) {
    if (window.cartManager) {
        window.cartManager.updateQuantity(productId, quantity);
    }
}

function proceedToCheckout() {
    if (window.cartManager) {
        window.cartManager.proceedToCheckout();
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .cart-item-enhanced {
        display: flex;
        align-items: center;
        padding: 20px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: all 0.3s ease;
    }
    
    .cart-item-enhanced:hover {
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        transform: translateY(-2px);
    }
    
    .item-image-enhanced {
        width: 80px;
        height: 80px;
        margin-right: 16px;
        border-radius: 8px;
        overflow: hidden;
        background: #f8f9fa;
    }
    
    .item-image-enhanced img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .item-info-enhanced {
        flex: 1;
        min-width: 0;
    }
    
    .item-name-enhanced {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 8px 0;
        line-height: 1.4;
    }
    
    .item-price-enhanced {
        font-size: 14px;
        color: #6b7280;
        margin: 0;
    }
    
    .quantity-enhanced {
        display: flex;
        align-items: center;
        margin: 0 20px;
    }
    
    .qty-btn-enhanced {
        width: 32px;
        height: 32px;
        border: 1px solid #d1d5db;
        background: #ffffff;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
        color: #374151;
        transition: all 0.2s ease;
    }
    
    .qty-btn-enhanced:hover {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
    }
    
    .qty-value-enhanced {
        margin: 0 12px;
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        min-width: 24px;
        text-align: center;
    }
    
    .item-total-enhanced {
        font-size: 16px;
        font-weight: 700;
        color: #059669;
        margin: 0 20px;
        min-width: 100px;
        text-align: right;
    }
    
    .remove-btn-enhanced {
        width: 36px;
        height: 36px;
        border: none;
        background: #fee2e2;
        color: #dc2626;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    
    .remove-btn-enhanced:hover {
        background: #dc2626;
        color: white;
    }
    
    .checkout-modal .modal-content {
        background: white;
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #6b7280;
    }
    
    .modal-body {
        padding: 20px;
    }
    
    .summary-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;
    }
    
    .summary-item.total {
        border-top: 2px solid #e5e7eb;
        font-size: 18px;
        margin-top: 12px;
        padding-top: 12px;
    }
    
    .payment-methods {
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
        margin-top: 16px;
    }
    
    .payment-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: 2px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
    }
    
    .payment-btn:hover {
        border-color: #3b82f6;
        background: #f8fafc;
    }
`;
document.head.appendChild(style);

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Cart system initialized');
    if (window.cartManager) {
        window.cartManager.updateCartBadge();
    }
});

// Export for use in other files
window.cartManager = cartManager;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.proceedToCheckout = proceedToCheckout;
