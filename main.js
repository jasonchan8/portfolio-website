(() => {
    'use strict';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initScrollReveal() {
        const elements = document.querySelectorAll('[data-reveal]');

        if (prefersReduced) {
            elements.forEach(el => el.classList.add('revealed'));
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });

        elements.forEach(el => observer.observe(el));

        requestAnimationFrame(() => {
            document.querySelectorAll('.hero [data-reveal]').forEach(el => {
                el.classList.add('revealed');
            });
        });
    }

    function initActiveNav() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link[data-section]');

        if (!sections.length || !navLinks.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    navLinks.forEach(link => {
                        link.classList.toggle('active', link.dataset.section === id);
                    });
                }
            });
        }, {
            threshold: 0,
            rootMargin: '-30% 0px -65% 0px'
        });

        sections.forEach(section => observer.observe(section));
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const target = document.querySelector(anchor.getAttribute('href'));
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
            });
        });
    }

    function initMobileNav() {
        const toggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');
        if (!toggle || !navLinks) return;

        toggle.addEventListener('click', () => {
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!expanded));
            navLinks.classList.toggle('open');
            document.body.classList.toggle('nav-open');
        });

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                toggle.setAttribute('aria-expanded', 'false');
                navLinks.classList.remove('open');
                document.body.classList.remove('nav-open');
            });
        });
    }

    function initCounters() {
        if (prefersReduced) return;

        const counters = document.querySelectorAll('.metric[data-count]');
        if (!counters.length) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(counter => observer.observe(counter));
    }

    function animateCounter(el) {
        const target = parseInt(el.dataset.count, 10);
        const duration = 1200;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            el.textContent = current.toLocaleString();
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    function initProjectParallax() {
        if (prefersReduced) return;
        if (window.matchMedia('(hover: none)').matches) return;

        document.querySelectorAll('.project-card').forEach(card => {
            const visual = card.querySelector('.project-visual');
            if (!visual) return;

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                visual.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
            });

            card.addEventListener('mouseleave', () => {
                visual.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                visual.style.transform = 'translate(0, 0)';
                setTimeout(() => { visual.style.transition = ''; }, 400);
            });
        });
    }

    function updateYear() {
        const el = document.getElementById('year');
        if (el) el.textContent = new Date().getFullYear();
    }

    document.addEventListener('DOMContentLoaded', () => {
        updateYear();
        initSmoothScroll();
        initMobileNav();
        initScrollReveal();
        initActiveNav();
        initCounters();
        initProjectParallax();
    });
})();
