// Simple scroll spy for navigation
document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('.subnav-link');
    const sections = document.querySelectorAll('.section[id]');

    function updateActiveLink() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (window.pageYOffset >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();

    // Smooth scrolling for navigation links
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Optional: Add some interactive features
    addInteractiveFeatures();
});

function addInteractiveFeatures() {
    // Add click animation to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // Add loading state for analytics button
    const analyticsBtn = document.querySelector('.btn[style*="background: #667eea"]');
    if (analyticsBtn) {
        analyticsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const originalText = this.textContent;
            this.textContent = 'Loading...';
            this.style.opacity = '0.7';
            
            // Simulate loading
            setTimeout(() => {
                this.textContent = originalText;
                this.style.opacity = '1';
                alert('Analytics feature coming soon!');
            }, 1500);
        });
    }

    // Add hover effect sound simulation (visual feedback)
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    });
}