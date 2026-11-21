/* Elite Realty Group — Site Interactivity */

document.addEventListener('DOMContentLoaded', function() {

    // --- Header scroll behavior ---
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.scrollY;
        if (currentScroll > 60) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    });

    // --- Mobile nav toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.nav');

    if (navToggle) {
        navToggle.addEventListener('click', function() {
            nav.classList.toggle('open');
            this.classList.toggle('active');
            var expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', String(!expanded));
        });

        // Close nav when link clicked
        nav.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                nav.classList.remove('open');
                navToggle.classList.remove('active');
            });
        });
    }

    // --- FAQ accordion ---
    document.querySelectorAll('.faq-question').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const item = this.closest('.faq-item');
            const answer = item.querySelector('.faq-answer');
            const isActive = item.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq-item').forEach(function(i) {
                i.classList.remove('active');
                i.querySelector('.faq-answer').style.maxHeight = null;
                i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
            });

            // Open clicked (if wasn't active)
            if (!isActive) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // --- Scroll reveal ---
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(function(el) { revealObserver.observe(el); });

    // --- Stat counter animation ---
    const statNumbers = document.querySelectorAll('[data-count]');
    const statObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(function(el) { statObserver.observe(el); });

    function animateCount(el) {
        const target = parseInt(el.getAttribute('data-count'));
        const suffix = el.getAttribute('data-suffix') || '';
        const prefix = el.getAttribute('data-prefix') || '';
        const duration = 1500;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * eased);
            el.textContent = prefix + current + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
        link.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // --- Contact form submission ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = this.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = 'Sending...';
            btn.disabled = true;

            var formData = new FormData(this);
            var data = Object.fromEntries(formData);

            fetch('/.netlify/functions/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            .then(function(res) {
                if (!res.ok) throw new Error('Request failed');
                return res.json();
            })
            .then(function() {
                try {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({ event: 'generate_lead', form_name: contactForm.getAttribute('name') || 'contact', lead_interest: data.interest || '', lead_area: data.area || '' });
                } catch (err) {}
                btn.textContent = 'Sent!';
                btn.style.background = 'linear-gradient(135deg, #16A34A, #15803d)';
                contactForm.reset();
                setTimeout(function() {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            })
            .catch(function() {
                btn.textContent = 'Error — Try Again';
                btn.style.background = 'linear-gradient(135deg, #DC2626, #B91C1C)';
                setTimeout(function() {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            });
        });
    }

    // --- Property Search ---
    var searchForm = document.getElementById('property-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();

            var location = document.getElementById('search-location').value.trim();
            if (!location) return;

            var beds = document.getElementById('search-beds').value;
            var minPrice = document.getElementById('search-price-min').value;
            var maxPrice = document.getElementById('search-price-max').value;

            var bedsPart = beds ? beds + '-_beds/' : '';

            var pricePart = '';
            if (minPrice && maxPrice) {
                pricePart = minPrice + '-' + maxPrice + '_price/';
            } else if (minPrice) {
                pricePart = minPrice + '-_price/';
            } else if (maxPrice) {
                pricePart = '0-' + maxPrice + '_price/';
            }

            var locationPart;
            if (/^\d{5}$/.test(location)) {
                locationPart = location + '_rb/';
            } else {
                var slug = location.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                locationPart = slug + '-jacksonville-fl_rb/';
            }

            var url = 'https://www.zillow.com/homes/for_sale/' + bedsPart + pricePart + locationPart;
            window.open(url, '_blank', 'noopener');
        });
    }
});
