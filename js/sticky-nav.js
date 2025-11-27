// Sticky Navigation System
// Makes navigation bars float/stick when scrolling

class StickyNavigation {
    constructor() {
        this.navbar = null;
        this.isSticky = false;
        this.scrollThreshold = 100; // Pixels to scroll before making nav sticky
        this.init();
    }

    init() {
        // Find the main navigation element
        this.navbar = document.querySelector('.top-header') || 
                     document.querySelector('.navbar') || 
                     document.querySelector('nav');
        
        if (!this.navbar) {
            console.warn('⚠️ No navigation element found for sticky nav');
            return;
        }

        console.log('🔧 Initializing sticky navigation');
        this.setupScrollListener();
        this.setupResizeListener();
    }

    setupScrollListener() {
        let ticking = false;

        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    this.updateStickyState();
                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            this.updateStickyState();
        });
    }

    updateStickyState() {
        const scrollY = window.scrollY;
        const shouldBeSticky = scrollY > this.scrollThreshold;

        if (shouldBeSticky && !this.isSticky) {
            this.makeSticky();
        } else if (!shouldBeSticky && this.isSticky) {
            this.removeSticky();
        }
    }

    makeSticky() {
        if (this.isSticky) return;

        console.log('📌 Making navigation sticky');
        
        // Add sticky class
        this.navbar.classList.add('sticky-nav');
        document.body.classList.add('sticky-nav-active');
        
        // Store original styles
        this.originalStyles = {
            position: this.navbar.style.position,
            top: this.navbar.style.top,
            left: this.navbar.style.left,
            right: this.navbar.style.right,
            zIndex: this.navbar.style.zIndex,
            background: this.navbar.style.background,
            boxShadow: this.navbar.style.boxShadow
        };

        this.isSticky = true;
        
        // Add smooth transition
        this.navbar.style.transition = 'all 0.3s ease';
    }

    removeSticky() {
        if (!this.isSticky) return;

        console.log('📌 Removing sticky navigation');
        
        // Remove sticky class
        this.navbar.classList.remove('sticky-nav');
        document.body.classList.remove('sticky-nav-active');
        
        // Restore original styles
        if (this.originalStyles) {
            Object.assign(this.navbar.style, this.originalStyles);
        }

        this.isSticky = false;
    }

    // Method to manually toggle sticky state
    toggleSticky() {
        if (this.isSticky) {
            this.removeSticky();
        } else {
            this.makeSticky();
        }
    }

    // Method to update scroll threshold
    setScrollThreshold(threshold) {
        this.scrollThreshold = threshold;
        this.updateStickyState();
    }

    // Method to destroy the sticky navigation
    destroy() {
        this.removeSticky();
        window.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleResize);
    }
}

// Auto-initialize sticky navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Auto-initializing sticky navigation');
    window.stickyNav = new StickyNavigation();
});

// Make StickyNavigation globally accessible
window.StickyNavigation = StickyNavigation;

