document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenuBtn = document.getElementById('closeMenu');
    const overlay = document.getElementById('menuOverlay');
    const body = document.body;

    if (!menuToggle || !mobileMenu || !overlay) return;

    const openMenu = () => {
        mobileMenu.classList.add('open');
        overlay.classList.add('visible');
        body.classList.add('menu-open');
        menuToggle.setAttribute('aria-expanded', 'true');
        mobileMenu.setAttribute('aria-hidden', 'false');
        overlay.setAttribute('aria-hidden', 'false');
    };

    const closeMenu = () => {
        mobileMenu.classList.remove('open');
        overlay.classList.remove('visible');
        body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('aria-hidden', 'true');
    };

    menuToggle.addEventListener('click', () => {
        if (mobileMenu.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    closeMenuBtn?.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && mobileMenu.classList.contains('open')) {
            closeMenu();
        }
    });
});

