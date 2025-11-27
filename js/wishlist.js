// Wishlist functionality for Golden Source Technologies
class WishlistManager {
    constructor() {
        this.wishlist = this.loadWishlist();
        this.updateWishlistDisplay();
        this.updateWishlistBadge();
    }

    // Load wishlist from localStorage
    loadWishlist() {
        const savedWishlist = localStorage.getItem('goldenSourceWishlist');
        return savedWishlist ? JSON.parse(savedWishlist) : [];
    }

    // Save wishlist to localStorage
    saveWishlist() {
        localStorage.setItem('goldenSourceWishlist', JSON.stringify(this.wishlist));
        this.updateWishlistBadge();
    }

    // Add item to wishlist
    addToWishlist(productId, productName, price, image, description = '') {
        const existingItem = this.wishlist.find(item => item.id === productId);
        
        if (existingItem) {
            this.showSuccessMessage(`${productName} is already in your wishlist!`);
            return;
        }

        this.wishlist.push({
            id: productId,
            name: productName,
            price: price,
            image: image,
            description: description,
            addedAt: new Date().toISOString()
        });
        
        this.saveWishlist();
        this.updateWishlistDisplay();
        this.showSuccessMessage(`${productName} added to wishlist!`);
    }

    // Remove item from wishlist
    removeFromWishlist(productId) {
        const item = this.wishlist.find(item => item.id === productId);
        if (item) {
            this.wishlist = this.wishlist.filter(item => item.id !== productId);
            this.saveWishlist();
            this.updateWishlistDisplay();
            this.showSuccessMessage('Item removed from wishlist');
        }
    }

    // Check if item is in wishlist
    isInWishlist(productId) {
        return this.wishlist.some(item => item.id === productId);
    }

    // Toggle wishlist item (add if not present, remove if present)
    toggleWishlist(productId, productName, price, image, description = '') {
        if (this.isInWishlist(productId)) {
            this.removeFromWishlist(productId);
        } else {
            this.addToWishlist(productId, productName, price, image, description);
        }
    }

    // Get wishlist count
    getWishlistCount() {
        return this.wishlist.length;
    }

    // Update wishlist display
    updateWishlistDisplay() {
        const wishlistGrid = document.getElementById('wishlistGrid');
        const emptyWishlist = document.getElementById('emptyWishlist');

        // Check if we're on the wishlist page
        if (!wishlistGrid) {
            // Not on wishlist page, just update badge
            this.updateWishlistBadge();
            return;
        }

        if (this.wishlist.length === 0) {
            if (wishlistGrid) wishlistGrid.innerHTML = '';
            if (emptyWishlist) emptyWishlist.style.display = 'block';
            return;
        }

        if (emptyWishlist) emptyWishlist.style.display = 'none';

        // Render wishlist items
        wishlistGrid.innerHTML = this.wishlist.map((item, index) => `
            <div class="wishlist-item slide-in" data-product-id="${item.id}" style="animation-delay: ${index * 0.1}s">
                <img src="${item.image}" alt="${item.name}" class="item-image" 
                     onerror="this.onerror=null;this.src='/images/default.jpg';">
                <h3 class="item-name">${item.name}</h3>
                <p class="item-description">${item.description || 'High-quality product from Golden Source Technologies'}</p>
                <div class="item-price">KSh ${Number(item.price).toLocaleString()}</div>
                <div class="item-actions">
                    <button class="add-to-cart-btn" onclick="wishlistManager.addToCartFromWishlist('${item.id}')">
                        <i class="fas fa-shopping-cart me-2"></i>
                        Add to Cart
                    </button>
                    <button class="remove-from-wishlist-btn" onclick="wishlistManager.removeFromWishlist('${item.id}')">
                        <i class="fas fa-heart-broken"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }


    // Update wishlist badge
    updateWishlistBadge() {
        const badges = document.querySelectorAll('#wishlistBadge, .wishlist-badge');
        const count = this.getWishlistCount();
        
        badges.forEach(badge => {
            if (badge) {
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        });
    }

    // Show success message
    showSuccessMessage(message) {
        // Create or update success message
        let successDiv = document.getElementById('successMessage');
        if (!successDiv) {
            successDiv = document.createElement('div');
            successDiv.id = 'successMessage';
            successDiv.className = 'success-message';
            document.body.appendChild(successDiv);
        }

        successDiv.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${message}
        `;
        successDiv.classList.add('show');

        // Hide after 3 seconds
        setTimeout(() => {
            successDiv.classList.remove('show');
        }, 3000);
    }

    // Clear entire wishlist
    clearWishlist() {
        this.wishlist = [];
        this.saveWishlist();
        this.updateWishlistDisplay();
        this.showSuccessMessage('Wishlist cleared');
    }

    // Get wishlist items as array
    getWishlistItems() {
        return [...this.wishlist];
    }

    // Export wishlist data
    exportWishlist() {
        const dataStr = JSON.stringify(this.wishlist, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'wishlist.json';
        link.click();
        URL.revokeObjectURL(url);
    }
}

// Global wishlist manager instance
const wishlistManager = new WishlistManager();

// Global functions for HTML onclick calls
function addToWishlist(productId, productName, price, image, description = '') {
    console.log('Adding to wishlist:', productId, productName);
    if (window.wishlistManager) {
        window.wishlistManager.addToWishlist(productId, productName, price, image, description);
    } else {
        console.error('Wishlist manager not initialized');
    }
}

function removeFromWishlist(productId) {
    if (window.wishlistManager) {
        window.wishlistManager.removeFromWishlist(productId);
    }
}

function toggleWishlist(productId, productName, price, image, description = '') {
    console.log('Toggling wishlist:', productId, productName);
    if (window.wishlistManager) {
        window.wishlistManager.toggleWishlist(productId, productName, price, image, description);
    } else {
        console.error('Wishlist manager not initialized');
    }
}

function isInWishlist(productId) {
    if (window.wishlistManager) {
        return window.wishlistManager.isInWishlist(productId);
    }
    return false;
}

// Initialize wishlist when page loads
document.addEventListener('DOMContentLoaded', function() {
    wishlistManager.updateWishlistDisplay();
    wishlistManager.updateWishlistBadge();
});

// Export for use in other files
window.wishlistManager = wishlistManager;
window.addToWishlist = addToWishlist;
window.removeFromWishlist = removeFromWishlist;
window.toggleWishlist = toggleWishlist;
window.isInWishlist = isInWishlist;

