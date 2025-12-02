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
                    // Normalize and validate cart items
                    const normalizedCart = parsed.map((item, index) => {
                        // Normalize product ID to number
                        let normalizedId = item.id;
                        if (typeof item.id === 'string') {
                            normalizedId = parseInt(item.id, 10);
                        }
                        
                        // Validate ID
                        if (!normalizedId || isNaN(normalizedId) || normalizedId <= 0) {
                            console.error(`❌ Invalid product ID in cart item ${index}:`, item);
                            return null; // Mark for removal
                        }
                        
                        return {
                            ...item,
                            id: normalizedId
                        };
                    }).filter(item => item !== null); // Remove invalid items
                    
                    // Check for suspicious ID values (like 1 when products have higher IDs)
                    const hasSuspiciousIds = normalizedCart.some(item => {
                        const id = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
                        return id === 1; // ID 1 is often a placeholder or old data
                    });
                    
                    if (hasSuspiciousIds) {
                        console.warn('⚠️ WARNING: Cart contains items with ID=1. This might be old/invalid data.');
                        console.warn('⚠️ Please clear your cart and re-add products to ensure correct IDs.');
                        console.warn('⚠️ Cart items:', normalizedCart);
                    }
                    
                    // If items were removed, save the cleaned cart
                    if (normalizedCart.length !== parsed.length) {
                        console.warn('⚠️ Removed invalid items from cart. Original:', parsed.length, 'Cleaned:', normalizedCart.length);
                        this.cart = normalizedCart;
                        this.saveCart();
                    }
                    
                    return normalizedCart;
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
        // Ensure productId is valid and convert to number if string (Supabase uses integer IDs)
        let normalizedId = productId;
        if (typeof productId === 'string') {
            normalizedId = parseInt(productId, 10);
            if (isNaN(normalizedId)) {
                console.error('❌ Invalid product ID (cannot convert to number):', productId);
                this.showNotification('Error: Invalid product ID. Please try again.', 'error');
                return;
            }
        }
        
        if (!normalizedId || normalizedId <= 0) {
            console.error('❌ Invalid product ID:', productId, 'Normalized:', normalizedId);
            this.showNotification('Error: Invalid product ID. Please try again.', 'error');
            return;
        }
        
        console.log('🛒 Adding to cart:', { 
            originalId: productId, 
            normalizedId: normalizedId,
            productName, 
            price, 
            quantity 
        });
        
        const existingItem = this.cart.find(item => {
            const itemId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id;
            return itemId === normalizedId;
        });
        
        if (existingItem) {
            existingItem.quantity += quantity;
            this.showNotification(`${productName} quantity updated!`, 'success');
            this.trackEvent('cart:quantityIncrement', { productId: normalizedId, quantity: existingItem.quantity });
        } else {
            const newItem = {
                id: normalizedId, // Store as number for consistency
                name: productName,
                price: parseFloat(price),
                image: image,
                quantity: quantity,
                addedAt: new Date().toISOString()
            };
            this.cart.push(newItem);
            console.log('✅ Added new item to cart:', newItem);
            this.showNotification(`${productName} added to cart!`, 'success');
            this.trackEvent('cart:add', { productId: normalizedId, name: productName, quantity });
        }
        
        this.saveCart();
        this.updateCartDisplay();
        this.updateCartBadge();
        
        // Animate cart badge
        this.animateCartBadge();
    }

    // Remove item from cart
    removeFromCart(productId) {
        // Handle both string and number IDs
        const productIdStr = String(productId);
        const productIdNum = Number(productId);
        
        // Try to find item by string ID first, then number ID
        const item = this.cart.find(item => String(item.id) === productIdStr || Number(item.id) === productIdNum);
        
        if (item) {
            this.cart = this.cart.filter(item => String(item.id) !== productIdStr && Number(item.id) !== productIdNum);
            this.saveCart();
            this.updateCartDisplay();
            this.showNotification(`${item.name} removed from cart`, 'info');
            this.trackEvent('cart:remove', { productId });
        } else {
            console.warn('⚠️ Item not found in cart for removal:', productId, 'Cart items:', this.cart);
        }
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        // Handle both string and number IDs
        const productIdStr = String(productId);
        const productIdNum = Number(productId);
        
        // Try to find item by string ID first, then number ID
        let item = this.cart.find(item => String(item.id) === productIdStr || Number(item.id) === productIdNum);
        
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartDisplay();
                this.trackEvent('cart:updateQuantity', { productId, quantity });
            }
        } else {
            console.warn('⚠️ Item not found in cart:', productId, 'Cart items:', this.cart);
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
    
    // Clear cart with confirmation (for fixing invalid data)
    clearCartWithConfirmation() {
        if (confirm('This will clear your cart. Are you sure? You can re-add items after clearing.')) {
            this.clearCart();
            this.showNotification('Cart cleared. Please re-add products to ensure correct IDs.', 'success');
        }
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
        // Get summary elements - prioritize mobile on mobile view, desktop on desktop
        let productAmount, deliveryFee, taxAmount, totalAmount, checkoutBtn;
        if (isMobileView) {
            productAmount = document.getElementById('productAmountMobile') || document.getElementById('productAmount');
            deliveryFee = document.getElementById('deliveryFeeMobile') || document.getElementById('deliveryFee');
            taxAmount = document.getElementById('taxAmountMobile') || document.getElementById('taxAmount');
            totalAmount = document.getElementById('totalAmountMobile') || document.getElementById('totalAmount');
            checkoutBtn = document.getElementById('checkoutBtnMobile') || document.getElementById('checkoutBtn');
        } else {
            productAmount = document.getElementById('productAmount') || document.getElementById('productAmountMobile');
            deliveryFee = document.getElementById('deliveryFee') || document.getElementById('deliveryFeeMobile');
            taxAmount = document.getElementById('taxAmount') || document.getElementById('taxAmountMobile');
            totalAmount = document.getElementById('totalAmount') || document.getElementById('totalAmountMobile');
            checkoutBtn = document.getElementById('checkoutBtn') || document.getElementById('checkoutBtnMobile');
        }
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
                    ? '<i class="fas fa-shopping-cart"></i>Cart is Empty'
                    : '<i class="fas fa-shopping-cart me-2"></i>Cart is Empty';
            }
            // Hide summary wrapper when cart is empty (mobile only)
            if (isMobileView) {
                const cartSummary = document.getElementById('mobileCartSummary');
                const cartSummaryWrapper = document.getElementById('mobileCartSummaryWrapper');
                if (cartSummary) {
                    cartSummary.style.display = 'none';
                }
                if (cartSummaryWrapper) {
                    cartSummaryWrapper.style.display = 'none';
                }
            }
            return;
        }

        if (emptyCart) emptyCart.style.display = 'none';
        
        // Show summary wrapper when cart has items (mobile only)
        if (isMobileView) {
            const cartSummary = document.getElementById('mobileCartSummary');
            const cartSummaryWrapper = document.getElementById('mobileCartSummaryWrapper');
            if (cartSummary) {
                cartSummary.style.display = 'block';
            }
            if (cartSummaryWrapper) {
                cartSummaryWrapper.style.display = 'flex';
            }
        }
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
            const isMobile = checkoutBtn.id === 'checkoutBtnMobile';
            checkoutBtn.innerHTML = isMobile 
                ? '<i class="fas fa-credit-card"></i>Proceed to Checkout'
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
                                    <button class="qty-btn-enhanced" onclick="window.cartManager.updateQuantity('${item.id}', ${item.quantity - 1})" type="button">
                                        <i class="fas fa-minus"></i>
                                    </button>
                                    <span class="qty-value-enhanced">${item.quantity}</span>
                                    <button class="qty-btn-enhanced" onclick="window.cartManager.updateQuantity('${item.id}', ${item.quantity + 1})" type="button">
                                        <i class="fas fa-plus"></i>
                                    </button>
                                </div>
                                <button class="remove-btn-enhanced" onclick="window.cartManager.removeFromCart('${item.id}')" title="Remove Item" type="button">
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
                            <button class="qty-btn-enhanced" onclick="window.cartManager.updateQuantity('${item.id}', ${item.quantity - 1})" type="button">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="qty-value-enhanced">${item.quantity}</span>
                            <button class="qty-btn-enhanced" onclick="window.cartManager.updateQuantity('${item.id}', ${item.quantity + 1})" type="button">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="item-total-enhanced">KSh ${(item.price * item.quantity).toLocaleString()}</div>
                        <button class="remove-btn-enhanced" onclick="window.cartManager.removeFromCart('${item.id}')" title="Remove Item" type="button">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }
        }).join('');
        
        console.log('🛒 Generated HTML length:', cartItemsHTML.length);
        console.log('🛒 Setting innerHTML to cartItems container');
        cartItems.innerHTML = cartItemsHTML;
        
        // Force visibility and padding via inline styles as fallback - Enhanced for cart page
        if (isMobile) {
            cartItems.style.paddingLeft = '1rem';
            cartItems.style.paddingRight = '1rem';
            cartItems.style.paddingTop = '1rem';
            cartItems.style.display = 'block';
            cartItems.style.visibility = 'visible';
            cartItems.style.opacity = '1';
            cartItems.style.height = 'auto';
            cartItems.style.maxHeight = 'none';
            cartItems.style.overflow = 'visible';
            cartItems.style.position = 'relative';
            cartItems.style.zIndex = '1';
            cartItems.style.marginBottom = '0'; // No extra margin needed - summary is in flow
            console.log('🛒 Applied inline styles to mobile cart container');
        }
        
        console.log('🛒 Cart items HTML set. Container now has', cartItems.children.length, 'children');
        
        // Force visibility on all cart items - Critical for cart page
        if (isMobile && cartItems.children.length > 0) {
            Array.from(cartItems.children).forEach((child, index) => {
                if (child.classList.contains('cart-item-enhanced')) {
                    child.style.display = 'flex';
                    child.style.visibility = 'visible';
                    child.style.opacity = '1';
                    child.style.position = 'relative';
                    child.style.zIndex = '1';
                    child.style.marginBottom = '1rem';
                    console.log(`🛒 Forced visibility on cart item ${index + 1}`);
                }
            });
        }
        
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
        const badges = document.querySelectorAll('#cartBadge, #mobileCartBadge, .cart-badge, .cart-count-badge');
        const count = this.getCartItemCount();
        
        badges.forEach(badge => {
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'block' : 'none';
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
                        flex-direction: column;
                        gap: 16px;
                    }
                    .checkout-modal .order-summary,
                    .checkout-modal .checkout-details {
                        background: #ffffff;
                        border-radius: 12px;
                        padding: 16px;
                        border: 1px solid #f1f1f5;
                        box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
                    }
                    .checkout-form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        margin-bottom: 16px;
                    }
                    .checkout-form-group label {
                        font-size: 0.875rem;
                        color: #475467;
                        font-weight: 600;
                    }
                    .checkout-form-group input,
                    .checkout-form-group textarea {
                        border: 1px solid #e4e7ec;
                        border-radius: 8px;
                        padding: 12px 14px;
                        font-size: 1rem;
                        transition: border 0.2s ease, box-shadow 0.2s ease;
                        width: 100%;
                        box-sizing: border-box;
                    }
                    .checkout-form-group input:focus,
                    .checkout-form-group textarea:focus {
                        border-color: #e90100;
                        box-shadow: 0 0 0 3px rgba(233, 1, 0, 0.12);
                        outline: none;
                    }
                    .checkout-form-row {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .checkout-modal .payment-methods {
                        margin-top: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }
                    .payment-note {
                        font-size: 0.8rem;
                        color: #6b7280;
                        text-align: center;
                        line-height: 1.4;
                    }
                    
                    /* Mobile optimizations */
                    @media (max-width: 768px) {
                        .checkout-modal .modal-content {
                            max-width: 100% !important;
                            width: 100% !important;
                            max-height: 100vh !important;
                            height: 100vh !important;
                            border-radius: 0 !important;
                            margin: 0 !important;
                        }
                        .checkout-modal .modal-header {
                            padding: 16px !important;
                            position: sticky;
                            top: 0;
                            background: white;
                            z-index: 10;
                            border-bottom: 1px solid #e5e7eb;
                        }
                        .checkout-modal .modal-header h3 {
                            font-size: 1.25rem !important;
                        }
                        .checkout-modal .modal-body {
                            padding: 16px !important;
                            padding-bottom: 100px !important;
                        }
                        .checkout-modal .order-summary,
                        .checkout-modal .checkout-details {
                            padding: 16px !important;
                            border-radius: 8px !important;
                        }
                        .checkout-form-group input,
                        .checkout-form-group textarea {
                            padding: 14px 16px !important;
                            font-size: 16px !important; /* Prevents zoom on iOS */
                        }
                        .checkout-form-row {
                            flex-direction: column !important;
                        }
                        .payment-btn {
                            padding: 14px 16px !important;
                            font-size: 1rem !important;
                            min-height: 48px !important; /* Better touch target */
                        }
                        .payment-btn.pay-now-btn {
                            padding: 16px !important;
                            font-size: 1.1rem !important;
                        }
                    }
                    
                    /* Desktop styles */
                    @media (min-width: 769px) {
                        .checkout-grid {
                            flex-direction: row;
                            gap: 24px;
                        }
                        .checkout-modal .order-summary,
                        .checkout-modal .checkout-details {
                            flex: 1 1 300px;
                            padding: 20px;
                        }
                        .checkout-form-row {
                            flex-direction: row;
                        }
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
                                <button class="payment-btn pay-now-btn" type="button" data-action="pesapal-payment" data-method="pesapal" style="background: #10b981; border: none; color: #ffffff; padding: 0.875rem 1.5rem; font-size: 1rem; font-weight: 600; border-radius: 6px; width: 100%; text-align: center; transition: all 0.2s; margin-bottom: 0.75rem; cursor: pointer;">
                                    <i class="fas fa-credit-card" style="margin-right: 0.5rem;"></i>
                                    Pay Now
                                </button>
                                <button class="payment-btn" type="button" data-action="confirm-order" style="background: #ffffff; border: 1px solid #e5e7eb; color: #374151; padding: 0.625rem 1rem; font-size: 0.875rem; border-radius: 6px; width: 100%; text-align: left; transition: all 0.2s;">
                                    <i class="fas fa-truck" style="margin-right: 0.5rem;"></i>
                                    Confirm Order and Pay on Delivery
                                </button>
                                <small class="payment-note" style="display: block; margin-top: 0.75rem; font-size: 0.75rem; color: #6b7280;">
                                    Secure payment via Pesapal (M-Pesa, Card, Bank) or contact our team for alternative payment methods.
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
            padding: 0;
            overflow-y: auto;
        `;
        
        document.body.appendChild(modal);
        
        // Add hover styles for payment buttons
        const style = document.createElement('style');
        style.textContent = `
            .payment-btn:hover {
                background: #f9fafb !important;
                border-color: #d1d5db !important;
                cursor: pointer;
            }
            .payment-btn.pay-now-btn:hover {
                background: #059669 !important;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
            .payment-btn:active {
                background: #f3f4f6 !important;
            }
            .payment-btn.pay-now-btn:active {
                background: #047857 !important;
                transform: translateY(0);
            }
            .payment-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
        
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
        const pesapalBtns = modal.querySelectorAll('[data-action="pesapal-payment"]');
        const confirmBtn = modal.querySelector('[data-action="confirm-order"]');
        const form = modal.querySelector('#checkoutForm');
        
        // Attach handlers to all payment method buttons
        pesapalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const method = btn.getAttribute('data-method') || 'pesapal';
                this.processPesapalPayment(form, orderData, method, btn);
            });
        });
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.processPayment('manual', form, orderData));
        }
    }
    
    // Process Pesapal payment
    async processPesapalPayment(form, orderData, paymentMethod = 'pesapal', clickedBtn = null) {
        const formData = this.collectCheckoutFormData(form);
        
        // Validate required fields
        if (!formData.fullName || !formData.email || !formData.phone) {
            this.showNotification('Please fill in your contact details (Name, Email, Phone) before proceeding.', 'warning');
            return;
        }

        // Split full name into first and last name
        const nameParts = formData.fullName.trim().split(' ');
        const firstName = nameParts[0] || formData.fullName;
        const lastName = nameParts.slice(1).join(' ') || formData.fullName;

        // Validate cart before proceeding
        if (!this.cart || this.cart.length === 0) {
            this.showNotification('Your cart is empty. Please add items before checkout.', 'warning');
            return;
        }
        
        // Log current cart state for debugging
        console.log('🛒 Current cart items before payment:', JSON.stringify(this.cart, null, 2));
        
        // Prepare order data for backend
        // Ensure product IDs are properly formatted (convert to number if string)
        const paymentData = {
            items: this.cart.map((item, index) => {
                // Ensure ID is a number (Supabase uses integer IDs)
                let productId = item.id;
                if (typeof item.id === 'string') {
                    productId = parseInt(item.id, 10);
                }
                
                // Validate ID
                if (!productId || isNaN(productId) || productId <= 0) {
                    console.error(`❌ Invalid product ID in cart item ${index}:`, item);
                    throw new Error(`Invalid product ID for item: ${item.name || 'Unknown'}. ID: ${item.id}`);
                }
                
                console.log(`✅ Cart item ${index}: Product ID ${productId}, Name: ${item.name}, Quantity: ${item.quantity}`);
                
                return {
                    id: productId,
                    quantity: item.quantity || 1
                };
            }),
            customer: {
                firstName: firstName,
                lastName: lastName,
                email: formData.email,
                phoneNumber: formData.phone
            },
            shippingAddress: {
                addressLine1: formData.line1 || '',
                addressLine2: formData.line2 || '',
                city: formData.city || 'Nairobi',
                state: formData.state || 'Nairobi County',
                postalCode: formData.postalCode || ''
            },
            billingAddress: {
                addressLine1: formData.line1 || '',
                addressLine2: formData.line2 || '',
                city: formData.city || 'Nairobi',
                state: formData.state || 'Nairobi County',
                postalCode: formData.postalCode || ''
            },
            notes: formData.notes || ''
        };

        // Store original button content for error recovery
        let originalButtonContent = null;
        if (clickedBtn) {
            originalButtonContent = clickedBtn.innerHTML;
        }

        try {
            // Show loading state on the clicked button
            if (clickedBtn) {
                clickedBtn.disabled = true;
                clickedBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            } else {
                // Fallback: disable all payment buttons
                const pesapalBtns = document.querySelectorAll('[data-action="pesapal-payment"]');
                pesapalBtns.forEach(btn => {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                });
            }

            // Log payment data for debugging
            console.log('💳 Sending payment request with items:', paymentData.items);
            console.log('💳 Full payment data:', JSON.stringify(paymentData, null, 2));

            // Send payment request to backend
            const response = await fetch('/api/payments/pesapal/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();

            if (result.success && result.data.redirectUrl) {
                // Store order info in localStorage for callback page
                localStorage.setItem('pendingOrder', JSON.stringify({
                    orderId: result.data.orderId,
                    orderNumber: result.data.orderNumber,
                    orderTrackingId: result.data.orderTrackingId
                }));

                // Clear cart
                this.clearCart();

                // Redirect to Pesapal payment page
                window.location.href = result.data.redirectUrl;
            } else {
                throw new Error(result.message || 'Failed to initiate payment');
            }
        } catch (error) {
            console.error('Pesapal payment error:', error);
            
            // Check if it's a product not found error
            if (error.message && error.message.includes('not found')) {
                this.showNotification('Product not found. Please clear your cart and re-add products from the product pages.', 'warning');
                // Optionally auto-clear cart after a delay
                setTimeout(() => {
                    if (confirm('Would you like to clear your cart and start fresh?')) {
                        this.clearCart();
                        window.location.href = '/';
                    }
                }, 2000);
            } else {
                this.showNotification(`Payment error: ${error.message}`, 'info');
            }
            
            // Reset the clicked button or all payment buttons
            if (clickedBtn && originalButtonContent) {
                clickedBtn.disabled = false;
                clickedBtn.innerHTML = originalButtonContent;
            } else {
                // Fallback: reset all payment buttons
                const pesapalBtns = document.querySelectorAll('[data-action="pesapal-payment"]');
                pesapalBtns.forEach(btn => {
                    btn.disabled = false;
                    const method = btn.getAttribute('data-method');
                    if (method === 'mpesa') {
                        btn.innerHTML = '<i class="fas fa-mobile-alt" style="margin-right: 0.5rem;"></i> Pay with M-Pesa';
                    } else if (method === 'card') {
                        btn.innerHTML = '<i class="fas fa-credit-card" style="margin-right: 0.5rem;"></i> Pay with Card';
                    } else if (method === 'bank') {
                        btn.innerHTML = '<i class="fas fa-university" style="margin-right: 0.5rem;"></i> Pay with Bank';
                    }
                });
            }
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

// Global cart manager instance (created once)
const cartManager = new CartManager();

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
        max-width: 900px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        margin: auto;
        position: relative;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .modal-header h3 {
        margin: 0;
        font-size: 1.5rem;
        color: #1f2937;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
        padding: 8px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
    }
    
    .close-btn:hover {
        background: #f3f4f6;
        color: #1f2937;
    }
    
    .modal-body {
        padding: 20px;
    }
    
    /* Mobile optimizations for checkout modal */
    @media (max-width: 768px) {
        .checkout-modal {
            padding: 0 !important;
            align-items: flex-start !important;
        }
        
        .checkout-modal .modal-content {
            max-width: 100% !important;
            width: 100% !important;
            max-height: 100vh !important;
            height: 100vh !important;
            border-radius: 0 !important;
            margin: 0 !important;
        }
        
        .modal-header {
            padding: 16px !important;
            position: sticky;
            top: 0;
            background: white;
            z-index: 10;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .modal-header h3 {
            font-size: 1.25rem !important;
        }
        
        .close-btn {
            width: 44px !important;
            height: 44px !important;
            font-size: 20px !important;
        }
        
        .modal-body {
            padding: 16px !important;
            padding-bottom: 120px !important; /* Space for buttons at bottom */
        }
        
        .checkout-grid {
            flex-direction: column !important;
            gap: 16px !important;
        }
        
        .checkout-modal .order-summary,
        .checkout-modal .checkout-details {
            padding: 16px !important;
            border-radius: 8px !important;
        }
        
        .checkout-form-group input,
        .checkout-form-group textarea {
            padding: 14px 16px !important;
            font-size: 16px !important; /* Prevents zoom on iOS */
        }
        
        .checkout-form-row {
            flex-direction: column !important;
        }
        
        .payment-btn {
            padding: 14px 16px !important;
            font-size: 1rem !important;
            min-height: 48px !important; /* Better touch target */
        }
        
        .payment-btn.pay-now-btn {
            padding: 16px !important;
            font-size: 1.1rem !important;
        }
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

// Event delegation for cart buttons (more reliable than inline onclick)
document.addEventListener('click', function(e) {
    // Handle quantity decrease button
    if (e.target.closest('.qty-btn-enhanced')) {
        const button = e.target.closest('.qty-btn-enhanced');
        const cartItem = button.closest('.cart-item-enhanced');
        if (cartItem && window.cartManager) {
            const productId = cartItem.getAttribute('data-product-id');
            if (productId) {
                // Check if it's plus or minus button
                const isPlus = button.querySelector('.fa-plus') || button.innerHTML.includes('fa-plus');
                const isMinus = button.querySelector('.fa-minus') || button.innerHTML.includes('fa-minus');
                
                if (isPlus) {
                    // Find current quantity
                    const qtySpan = cartItem.querySelector('.qty-value-enhanced');
                    const currentQty = qtySpan ? parseInt(qtySpan.textContent) || 1 : 1;
                    window.cartManager.updateQuantity(productId, currentQty + 1);
                } else if (isMinus) {
                    // Find current quantity
                    const qtySpan = cartItem.querySelector('.qty-value-enhanced');
                    const currentQty = qtySpan ? parseInt(qtySpan.textContent) || 1 : 1;
                    window.cartManager.updateQuantity(productId, currentQty - 1);
                }
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
    
    // Handle remove/delete button
    if (e.target.closest('.remove-btn-enhanced')) {
        const button = e.target.closest('.remove-btn-enhanced');
        const cartItem = button.closest('.cart-item-enhanced');
        if (cartItem && window.cartManager) {
            const productId = cartItem.getAttribute('data-product-id');
            if (productId) {
                window.cartManager.removeFromCart(productId);
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
});

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Cart system initialized');
    if (window.cartManager) {
        window.cartManager.updateCartBadge();
        // Also update cart display if on cart page
        const isCartPage = window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html');
        if (isCartPage) {
            console.log('🛒 Cart page detected, forcing cart display update');
            // Force update multiple times to ensure it works
            window.cartManager.updateCartDisplay();
            setTimeout(() => window.cartManager.updateCartDisplay(), 100);
            setTimeout(() => window.cartManager.updateCartDisplay(), 500);
        } else {
            window.cartManager.updateCartDisplay();
        }
    }
});

// Export for use in other files
window.cartManager = cartManager;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.proceedToCheckout = proceedToCheckout;

