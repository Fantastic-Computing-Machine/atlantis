// Tab switching functionality
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(tabId).classList.add('active');
    });
});

// Copy to clipboard functionality
document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const codeId = btn.dataset.clipboard;
        const codeElement = document.getElementById(codeId);
        const text = codeElement.textContent;

        try {
            await navigator.clipboard.writeText(text);
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            btn.style.color = 'hsl(140, 70%, 50%)';

            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.style.color = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add scroll-based navbar background opacity
const navbar = document.querySelector('.navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        navbar.style.background = 'hsla(222, 47%, 7%, 0.95)';
    } else {
        navbar.style.background = 'hsla(222, 47%, 7%, 0.8)';
    }

    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Add initial styles and observe elements
document.querySelectorAll('.feature-card, .screenshot-item, .doc-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Stagger animation delays for feature cards
document.querySelectorAll('.feature-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
});

document.querySelectorAll('.screenshot-item').forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.1}s`;
});

document.querySelectorAll('.doc-card').forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
});
