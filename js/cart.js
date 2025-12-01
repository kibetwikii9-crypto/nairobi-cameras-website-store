class AnalyticsTracker {
    constructor() {
        this.storageKey = 'gst-analytics-events';
        this.queue = this.loadEvents();
    }

    loadEvents() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.warn('📊 Unable to load analytics events', error);
            return [];
        }
    }

    saveEvents() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
        } catch (error) {
            console.warn('📊 Unable to persist analytics events', error);
        }
    }

    record(eventName, payload = {}) {
        const entry = {
            name: eventName,
            payload,
            at: new Date().toISOString()
        };
        this.queue.push(entry);
        if (this.queue.length > 100) {
            this.queue.shift();
        }
        this.saveEvents();
        console.log(`📊 Event: ${eventName}`, payload);
    }
}

const analyticsTracker = new AnalyticsTracker();
window.analyticsTracker = analyticsTracker;

// Enhanced Cart functionality for Golden Source Technologies
class CartManager {
    constructor() {
        console.log('🛒 Enhanced CartManager initialized');
        this.cart = this.loadCart();
        this.trackEvent('cart:init');
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
            console.log('🛒 Loading cart from localStorage. Raw data:', savedCart);
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                console.log('🛒 Cart loaded successfully:', parsed);
                console.log('🛒 Cart items count:', parsed.length);
                if (Array.isArray(parsed)) {
                    return parsed;
                } else {
                    console.warn('⚠️ Cart data is not an array, returning empty array');
                    return [];
                }
            }
            console.log('🛒 No cart data in localStorage, returning empty array');
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
            this.trackEvent('cart:save');
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
            this.trackEvent('cart:quantityIncrement', { productId, quantity: existingItem.quantity });
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
            this.trackEvent('cart:add', { productId, name: productName, quantity });
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
            this.trackEvent('cart:remove', { productId });
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
                this.trackEvent('cart:updateQuantity', { productId, quantity });
            }
        }
    }

    // Clear entire cart
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartDisplay();
        this.showNotification('Cart cleared', 'info');
        this.trackEvent('cart:clear');
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
        console.log('🛒 updateCartDisplay called');
        console.log('🛒 Cart data:', this.cart);
        console.log('🛒 Cart length:', this.cart.length);
        
        // Check if we're on mobile viewport (max-width: 991px)
        const isMobileView = window.innerWidth <= 991;
        console.log('🛒 Is mobile view:', isMobileView, 'Window width:', window.innerWidth);
        
        // Prioritize mobile elements on mobile viewport, desktop on desktop
        let cartItems, emptyCart;
        if (isMobileView) {
            // On mobile, prioritize mobile elements
            cartItems = document.getElementById('cartItemsMobile');
            emptyCart = document.getElementById('emptyCartMobile');
            console.log('🛒 Mobile view: Looking for mobile elements first');
            console.log('🛒 Found cartItemsMobile:', !!cartItems);
            // If mobile element not found, fallback to desktop (only log if on cart page)
            if (!cartItems) {
                const isCartPage = window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html');
                if (isCartPage) {
                    console.warn('⚠️ cartItemsMobile not found, falling back to cartItems');
                }
                cartItems = document.getElementById('cartItems');
            }
            if (!emptyCart) {
                emptyCart = document.getElementById('emptyCart');
            }
        } else {
            // On desktop, prioritize desktop elements
            cartItems = document.getElementById('cartItems');
            emptyCart = document.getElementById('emptyCart');
            console.log('🛒 Desktop view: Looking for desktop elements first');
            console.log('🛒 Found cartItems:', !!cartItems);
            // If desktop element not found, fallback to mobile (shouldn't happen)
            if (!cartItems) {
                console.warn('⚠️ cartItems not found, falling back to cartItemsMobile');
                cartItems = document.getElementById('cartItemsMobile');
            }
            if (!emptyCart) {
                emptyCart = document.getElementById('emptyCartMobile');
            }
        }
        const productAmount = document.getElementById('productAmount') || document.getElementById('productAmountMobile');
        const deliveryFee = document.getElementById('deliveryFee') || document.getElementById('deliveryFeeMobile');
        const taxAmount = document.getElementById('taxAmount') || document.getElementById('taxAmountMobile');
        const totalAmount = document.getElementById('totalAmount') || document.getElementById('totalAmountMobile');
        const checkoutBtn = document.getElementById('checkoutBtn') || document.getElementById('checkoutBtnMobile');
        const freeDeliveryMessage = document.getElementById('freeDeliveryMessage');
        const freeDeliveryPercent = document.getElementById('freeDeliveryPercent');
        const freeDeliveryProgress = document.getElementById('freeDeliveryProgress');
        const deliveryEta = document.getElementById('deliveryEta');
        const pickupMessage = document.getElementById('pickupMessage');

        console.log('🛒 cartItems element:', cartItems);
        console.log('🛒 emptyCart element:', emptyCart);

        // If no cart container found, we're not on the cart page - just update badge and return silently
        if (!cartItems) {
            // Only log warning if we're actually on the cart page
            const isCartPage = window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html');
            if (isCartPage) {
                console.warn('⚠️ Cart items container not found on cart page!');
            }
            this.updateCartBadge();
            return;
        }

        if (this.cart.length === 0) {
            console.log('🛒 Cart is empty, showing empty state');
            if (cartItems) {
                cartItems.innerHTML = '';
                console.log('🛒 Cleared cartItems innerHTML');
            }
            if (emptyCart) {
                emptyCart.style.display = 'block';
                console.log('🛒 Showing empty cart message');
            }
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
                const isMobile = checkoutBtn.id === 'checkoutBtnMobile';
                checkoutBtn.innerHTML = isMobile 
                    ? '<i class="fas fa-lock"></i>Cart is Empty'
                    : '<i class="fas fa-lock me-2"></i>Cart is Empty';
            }
            // Hide summary wrapper when cart is empty
            const cartSummary = document.getElementById('mobileCartSummary');
            const cartSummaryWrapper = document.querySelector('.mobile-cart-summary-wrapper');
            if (cartSummary) {
                cartSummary.style.display = 'none';
            }
            if (cartSummaryWrapper) {
                cartSummaryWrapper.style.display = 'none';
            }
            return;
        }

        if (emptyCart) emptyCart.style.display = 'none';
        
        // Show summary wrapper when cart has items
        const cartSummary = document.getElementById('mobileCartSummary');
        const cartSummaryWrapper = document.querySelector('.mobile-cart-summary-wrapper');
        if (cartSummary) {
            cartSummary.style.display = 'flex';
        }
        if (cartSummaryWrapper) {
            cartSummaryWrapper.style.display = 'flex';
        }
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            const isMobile = checkoutBtn.id === 'checkoutBtnMobile';
            checkoutBtn.innerHTML = isMobile 
                ? '<i class="fas fa-lock"></i>Proceed to Checkout'
                : '<i class="fas fa-credit-card me-2"></i>Proceed to Checkout';
        }

        // Render cart items with enhanced design - optimized for mobile
        // Determine if mobile based on the actual element ID found
        const isMobile = cartItems && cartItems.id === 'cartItemsMobile';
        console.log('🛒 Rendering cart items. isMobile:', isMobile, 'cartItems.id:', cartItems ? cartItems.id : 'null', 'isMobileView:', isMobileView, 'Items count:', this.cart.length);
        
        if (!cartItems) {
            console.error('❌ cartItems element not found!');
            return;
        }
        
        const cartItemsHTML = this.cart.map((item, index) => {
            console.log(`🛒 Rendering item ${index + 1}:`, item);
            if (isMobile) {
                // Mobile-optimized layout
                return `
                    <div class="cart-item-enhanced" data-product-id="${item.id}">
                        <div class="item-image-enhanced">
                            <img src="${item.image}" alt="${item.name}" 
                                 onerror="this.onerror=null;this.src='images/placeholder.jpg';">
                        </div>
                        <div class="item-info-enhanced">
                            <h6 class="item-name-enhanced">${item.name}</h6>
                            <div class="item-price-row">
                                <span class="item-price-enhanced">KSh ${item.price.toLocaleString()}</span>
                                <span class="item-total-enhanced">KSh ${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                            <div class="item-actions-row">
                                <div class="quantity-enhanced">
                                    <button class="qty-btn-enhanced" onclick="cartManager.updateQuantity('${item.id}', ${item.quantity - 1})">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <span class="qty-value-enhanced">${item.quantity}</span>
                                    <button class="qty-btn-enhanced" onclick="cartManager.updateQuantity('${item.id}', ${item.quantity + 1})">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <button class="remove-btn-enhanced" onclick="cartManager.removeFromCart('${item.id}')" title="Remove Item">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Desktop layout (original)
                return `
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
                `;
            }
        }).join('');
        
        console.log('🛒 Generated HTML length:', cartItemsHTML.length);
        console.log('🛒 Setting innerHTML to cartItems container');
        cartItems.innerHTML = cartItemsHTML;
        
        // Force visibility and padding via inline styles as fallback
        if (isMobile) {
            cartItems.style.paddingLeft = '1rem';
            cartItems.style.paddingRight = '1rem';
            cartItems.style.display = 'block';
            cartItems.style.visibility = 'visible';
            cartItems.style.opacity = '1';
            console.log('🛒 Applied inline styles to mobile cart container');
        }
        
        console.log('🛒 Cart items HTML set. Container now has', cartItems.children.length, 'children');
        
        // Verify items are visible
        const firstItem = cartItems.querySelector('.cart-item-enhanced');
        if (firstItem) {
            const computed = window.getComputedStyle(firstItem);
            console.log('🛒 First cart item found:', firstItem);
            console.log('🛒 First item computed display:', computed.display);
            console.log('🛒 First item computed visibility:', computed.visibility);
            console.log('🛒 First item computed opacity:', computed.opacity);
            console.log('🛒 First item position:', computed.position);
            console.log('🛒 First item top:', computed.top);
            console.log('🛒 First item left:', computed.left);
            console.log('🛒 First item width:', computed.width);
            console.log('🛒 First item height:', computed.height);
            console.log('🛒 First item background:', computed.backgroundColor);
            console.log('🛒 First item z-index:', computed.zIndex);
            console.log('🛒 First item margin:', computed.margin);
            console.log('🛒 First item transform:', computed.transform);
            
            // Check parent container
            const parent = firstItem.parentElement;
            if (parent) {
                const parentComputed = window.getComputedStyle(parent);
                console.log('🛒 Parent container:', parent);
                console.log('🛒 Parent overflow:', parentComputed.overflow);
                console.log('🛒 Parent overflow-x:', parentComputed.overflowX);
                console.log('🛒 Parent overflow-y:', parentComputed.overflowY);
                console.log('🛒 Parent height:', parentComputed.height);
                console.log('🛒 Parent max-height:', parentComputed.maxHeight);
            }
            
            // Check if item is in viewport
            const rect = firstItem.getBoundingClientRect();
            console.log('🛒 First item bounding rect:', {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                bottom: rect.bottom,
                right: rect.right
            });
            console.log('🛒 First item is in viewport:', rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth);
        } else {
            console.warn('⚠️ No cart items found in container after rendering!');
        }

        // Update totals
        const productValue = this.getCartTotal();
        const deliveryCost = productValue > 50000 ? 0 : 500; // Free delivery over KSh 50,000
        const taxValue = 0.00; // Tax set to 0.00
        const totalValue = productValue + taxValue + deliveryCost;

        if (productAmount) productAmount.textContent = `KSh ${productValue.toLocaleString()}`;
        if (deliveryFee) deliveryFee.textContent = deliveryCost === 0 ? 'FREE' : `KSh ${deliveryCost.toLocaleString()}`;
        if (taxAmount) taxAmount.textContent = `KSh ${taxValue.toLocaleString()}`;
        if (totalAmount) {
            // Check if it's mobile (has class total-amount) or desktop
            if (totalAmount.classList && totalAmount.classList.contains('total-amount')) {
                totalAmount.textContent = `KSh ${totalValue.toLocaleString()}`;
            } else {
                totalAmount.innerHTML = `<strong>KSh ${totalValue.toLocaleString()}</strong>`;
            }
        }

        const milestone = 50000;
        const progress = Math.min(productValue / milestone, 1);
        if (freeDeliveryProgress) {
            freeDeliveryProgress.style.width = `${progress * 100}%`;
        }
        if (freeDeliveryPercent) {
            freeDeliveryPercent.textContent = `${Math.round(progress * 100)}%`;
        }
        if (freeDeliveryMessage) {
            freeDeliveryMessage.textContent = productValue >= milestone
                ? '🎉 You unlocked free nationwide delivery'
                : `Spend KSh ${(milestone - productValue).toLocaleString()} more to unlock free delivery`;
        }
        if (deliveryEta) {
            deliveryEta.textContent = productValue >= milestone
                ? 'Priority slot reserved: dispatch today, upcountry delivery within 24-48 hours.'
                : 'Checkout before 3:00 PM for same-day dispatch within Nairobi.';
        }
        if (pickupMessage) {
            pickupMessage.textContent = productValue >= milestone
                ? 'Reserve now and pick up instantly from the CBD experience center.'
                : 'Reserve online and collect within 2 hours from our CBD experience center.';
        }

        this.trackEvent('cart:view', { total: totalValue });
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
            background: ${type === 'success' ? '#10b981' : '#e21b1f'};
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
        const taxValue = 0.00; // Tax set to 0.00
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

        this.trackEvent('checkout:start', { total: totalValue });
        
        // Show checkout modal
        this.showCheckoutModal(orderData);
    }

    // Show checkout modal
    showCheckoutModal(orderData) {
        const modal = document.createElement('div');
        modal.className = 'checkout-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <style>
                    .checkout-grid {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 24px;
                    }
                    .checkout-modal .order-summary,
                    .checkout-modal .checkout-details {
                        flex: 1 1 280px;
                        background: #ffffff;
                        border-radius: 16px;
                        padding: 20px;
                        border: 1px solid #f1f1f5;
                        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
                    }
                    .checkout-form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        margin-bottom: 12px;
                    }
                    .checkout-form-group label {
                        font-size: 0.85rem;
                        color: #475467;
                        font-weight: 600;
                    }
                    .checkout-form-group input,
                    .checkout-form-group textarea {
                        border: 1px solid #e4e7ec;
                        border-radius: 10px;
                        padding: 10px 12px;
                        font-size: 0.95rem;
                        transition: border 0.2s ease, box-shadow 0.2s ease;
                    }
                    .checkout-form-group input:focus,
                    .checkout-form-group textarea:focus {
                        border-color: #e90100;
                        box-shadow: 0 0 0 3px rgba(233, 1, 0, 0.12);
                        outline: none;
                    }
                    .checkout-modal .payment-methods {
                        margin-top: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
                    .payment-note {
                        font-size: 0.85rem;
                        color: #475467;
                        text-align: center;
                    }
                </style>
                <div class="modal-header">
                    <h3><i class="fas fa-credit-card me-2"></i>Checkout</h3>
                    <button class="close-btn" onclick="this.closest('.checkout-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="checkout-grid">
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
                            <div class="summary-item" style="display: none;">
                                <span>Tax:</span>
                                <span>KSh ${orderData.tax.toLocaleString()}</span>
                            </div>
                            <div class="summary-item total">
                                <span><strong>Total:</strong></span>
                                <span><strong>KSh ${orderData.total.toLocaleString()}</strong></span>
                            </div>
                        </div>
                        <div class="checkout-details">
                            <h4>Contact & Delivery</h4>
                            <form id="checkoutForm">
                                <div class="checkout-form-group">
                                    <label for="fullName">Full Name</label>
                                    <input type="text" id="fullName" name="fullName" placeholder="e.g. Jane Mwangi" required>
                                </div>
                                <div class="checkout-form-row" style="display: flex; gap: 12px;">
                                    <div class="checkout-form-group" style="flex:1;">
                                        <label for="email">Email</label>
                                        <input type="email" id="email" name="email" placeholder="you@example.com" required>
                                    </div>
                                    <div class="checkout-form-group" style="flex:1;">
                                        <label for="phone">Phone Number</label>
                                        <input type="tel" id="phone" name="phone" placeholder="+254 7xx xxx xxx" required>
                                    </div>
                                </div>
                                <div class="checkout-form-group">
                                    <label for="addressLine1">Delivery Address</label>
                                    <input type="text" id="addressLine1" name="addressLine1" placeholder="Street, building or estate">
                                </div>
                                <div class="checkout-form-row" style="display: flex; gap: 12px;">
                                    <div class="checkout-form-group" style="flex:1;">
                                        <label for="city">Town / City</label>
                                        <input type="text" id="city" name="city" placeholder="Nairobi">
                                    </div>
                                    <div class="checkout-form-group" style="flex:1;">
                                        <label for="state">County</label>
                                        <input type="text" id="state" name="state" placeholder="Nairobi County">
                                    </div>
                                </div>
                                <div class="checkout-form-row" style="display: flex; gap: 12px;">
                                    <div class="checkout-form-group" style="flex:1;">
                                        <label for="addressLine2">Apartment / Landmark</label>
                                        <input type="text" id="addressLine2" name="addressLine2" placeholder="House / Floor (optional)">
                                    </div>
                                    <div class="checkout-form-group" style="flex:1;">
                                        <label for="postalCode">Postal Code</label>
                                        <input type="text" id="postalCode" name="postalCode" placeholder="00100">
                                    </div>
                                </div>
                                <div class="checkout-form-group">
                                    <label for="notes">Delivery Notes</label>
                                    <textarea id="notes" name="notes" rows="2" placeholder="Anything the rider should know?"></textarea>
                                </div>
                            </form>
                            <div class="payment-methods">
                                <button class="payment-btn" type="button" data-action="confirm-order">
                                    <i class="fas fa-headset"></i>
                                    Confirm order & choose payment with an agent
                                </button>
                                <small class="payment-note">
                                    Our customer care team will call to arrange M-Pesa, bank transfer, or pay-on-delivery.
                                </small>
                            </div>
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
        this.attachCheckoutHandlers(modal, orderData);
    }

    // Process payment
    processPayment(method, form, orderData) {
        const formData = this.collectCheckoutFormData(form);
        if (!formData || !formData.fullName || !formData.email || !formData.phone) {
            this.showNotification('Please fill in your contact details before confirming.', 'warning');
            return;
        }

        this.trackEvent('checkout:paymentSelected', { method });
        this.trackEvent('checkout:manualConfirm', { method, total: orderData?.total || 0 });

        this.showNotification('Order received! Our support team will reach out shortly to finalize payment.', 'success');
        document.querySelector('.checkout-modal')?.remove();
    }

    attachCheckoutHandlers(modal, orderData) {
        const confirmBtn = modal.querySelector('[data-action="confirm-order"]');
        const form = modal.querySelector('#checkoutForm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.processPayment('manual', form, orderData));
        }
    }

    collectCheckoutFormData(form) {
        if (!form) return null;
        const data = new FormData(form);
        return {
            fullName: (data.get('fullName') || '').trim(),
            email: (data.get('email') || '').trim(),
            phone: (data.get('phone') || '').trim(),
            line1: (data.get('addressLine1') || '').trim(),
            line2: (data.get('addressLine2') || '').trim(),
            city: (data.get('city') || '').trim(),
            state: (data.get('state') || '').trim(),
            postalCode: (data.get('postalCode') || '').trim(),
            notes: (data.get('notes') || '').trim()
        };
    }

    trackEvent(eventName, extra = {}) {
        if (window.analyticsTracker) {
            window.analyticsTracker.record(eventName, {
                items: this.getCartItemCount(),
                total: this.getCartTotal(),
                ...extra
            });
        }
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
        background: #e21b1f;
        color: white;
        border-color: #e21b1f;
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
        border-color: #e21b1f;
        background: #f8fafc;
    }
`;
document.head.appendChild(style);

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Cart system initialized');
    if (window.cartManager) {
        window.cartManager.updateCartBadge();
        // Also update cart display if on cart page
        window.cartManager.updateCartDisplay();
    }
});

// Export for use in other files
window.cartManager = cartManager;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.proceedToCheckout = proceedToCheckout;

