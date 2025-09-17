 // Smooth animations and interactions
        document.addEventListener('DOMContentLoaded', function() {
            // Navigation active state
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    navItems.forEach(nav => nav.classList.remove('active'));
                    this.classList.add('active');
                });
            });
            // Analytics toggle
            const toggleBtns = document.querySelectorAll('.toggle-btn');
            toggleBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    toggleBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            // Project filters
            const filterBtns = document.querySelectorAll('.filter-btn');
            filterBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    filterBtns.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            // Animate chart bars on load
            const chartBars = document.querySelectorAll('.chart-bar');
            chartBars.forEach((bar, index) => {
                setTimeout(() => {
                    bar.style.transform = 'scaleY(1)';
                }, index * 100);
            });

            // Animate stats on load
            const statNumbers = document.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const finalNumber = stat.textContent;
                const isPercentage = finalNumber.includes('%');
                const numericValue = parseInt(finalNumber);
                
                let current = 0;
                const increment = Math.ceil(numericValue / 50);
                
                const counter = setInterval(() => {
                    current += increment;
                    if (current >= numericValue) {
                        stat.textContent = finalNumber;
                        clearInterval(counter);
                    } else {
                        stat.textContent = isPercentage ? current + '%' : current;
                    }
                }, 30);
            });

            // Add hover effects to cards
            const cards = document.querySelectorAll('.dashboard-card, .stat-card');
            cards.forEach(card => {
                card.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px)';
                });
                
                card.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0)';
                });
            });

            // Search functionality
            const searchInput = document.querySelector('.search-input');
            searchInput.addEventListener('focus', function() {
                this.parentElement.classList.add('focused');
            });
            
            searchInput.addEventListener('blur', function() {
                this.parentElement.classList.remove('focused');
            });

            // Quick action buttons
            const quickBtns = document.querySelectorAll('.quick-btn, .action-btn');
            quickBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    this.classList.add('clicked');
                    setTimeout(() => {
                        this.classList.remove('clicked');
                    }, 200);
                });
            });

            // Run analysis button animation
            const runAnalysisBtn = document.querySelector('.run-analysis-btn');
            runAnalysisBtn.addEventListener('click', function() {
                this.textContent = 'Analyzing...';
                this.disabled = true;
                
                setTimeout(() => {
                    this.textContent = 'Analysis Complete!';
                    setTimeout(() => {
                        this.textContent = 'Run Analysis';
                        this.disabled = false;
                    }, 2000);
                }, 3000);
            });
        });