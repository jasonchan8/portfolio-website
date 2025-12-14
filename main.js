import * as THREE from 'three';

// Three.js Background Setup
let scene, camera, renderer, particles, particleSystem;

function initThreeBackground() {
    const container = document.getElementById('three-background');
    
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Create particle system
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    const color1 = new THREE.Color(0x6366f1); // Indigo
    const color2 = new THREE.Color(0x8b5cf6); // Purple
    const color3 = new THREE.Color(0xec4899); // Pink
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 2000;
        positions[i + 1] = (Math.random() - 0.5) * 2000;
        positions[i + 2] = (Math.random() - 0.5) * 2000;
        
        const rand = Math.random();
        let color;
        if (rand < 0.33) color = color1;
        else if (rand < 0.66) color = color2;
        else color = color3;
        
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
    });
    
    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
    
    // Camera position
    camera.position.z = 1000;
    
    // Animate
    function animate() {
        requestAnimationFrame(animate);
        
        particleSystem.rotation.x += 0.0005;
        particleSystem.rotation.y += 0.001;
        
        // Mouse interaction
        const mouseX = (event?.clientX / window.innerWidth) * 2 - 1 || 0;
        const mouseY = -(event?.clientY / window.innerHeight) * 2 + 1 || 0;
        
        camera.position.x += (mouseX * 50 - camera.position.x) * 0.05;
        camera.position.y += (mouseY * 50 - camera.position.y) * 0.05;
        camera.lookAt(scene.position);
        
        renderer.render(scene, camera);
    }
    
    // Mouse move event
    let event = null;
    document.addEventListener('mousemove', (e) => {
        event = e;
    });
    
    animate();
    
    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Resume Data - will be loaded from JSON file
let resumeData = {
    name: "Jason Chan",
    title: "Developer & Creator",
    about: {
        description: "I'm a passionate developer who loves turning complex problems into simple, elegant solutions through code.",
        details: [
            "With a strong foundation in modern web technologies and a keen eye for design, I create applications that are both beautiful and functional.",
            "I thrive in collaborative environments and am always eager to learn new technologies and tackle challenging problems.",
            "When I'm not coding, you can find me exploring new frameworks, contributing to open source projects, or sharing knowledge with the developer community."
        ]
    },
    experience: [],
    projects: [],
    skills: [
        {
            category: "Frontend",
            items: ["React", "Vue.js", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS"]
        },
        {
            category: "Backend",
            items: ["Node.js", "Python", "Express.js", "REST APIs", "GraphQL"]
        },
        {
            category: "Tools & Others",
            items: ["Git", "Docker", "AWS", "MongoDB", "PostgreSQL", "Webpack", "Three.js"]
        }
    ],
    contact: {
        email: "jason@example.com",
        github: "https://github.com/jasonchan",
        linkedin: "https://linkedin.com/in/jasonchan",
        twitter: "https://twitter.com/jasonchan"
    }
};

// Load resume data from JSON file
async function loadResumeData() {
    try {
        const response = await fetch('resume_data.json');
        if (response.ok) {
            const data = await response.json();
            resumeData = { ...resumeData, ...data };
            // Update page title and hero if name/title changed
            if (data.name) {
                document.querySelector('.name').textContent = data.name;
            }
            if (data.title) {
                document.querySelector('.title').textContent = data.title;
            }
        }
    } catch (error) {
        console.log('Could not load resume_data.json, using default data');
    }
}

// Populate Experience Section
function populateExperience() {
    const timeline = document.getElementById('experience-timeline');
    
    if (resumeData.experience.length === 0) {
        timeline.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Experience information will be loaded from resume.</p>';
        return;
    }
    
    resumeData.experience.forEach(exp => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        const bullets = exp.description.map(bullet => `<li>${bullet}</li>`).join('');
        
        item.innerHTML = `
            <div class="timeline-header">
                <h3 class="timeline-title">${exp.title}</h3>
                <div class="timeline-company">${exp.company}</div>
                <div class="timeline-date">${exp.period}</div>
            </div>
            <div class="timeline-description">
                ${exp.summary ? `<p>${exp.summary}</p>` : ''}
                <ul>${bullets}</ul>
            </div>
        `;
        
        timeline.appendChild(item);
    });
}

// Populate Projects Section
function populateProjects() {
    const grid = document.getElementById('projects-grid');
    
    if (resumeData.projects.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Project information will be loaded from resume.</p>';
        return;
    }
    
    resumeData.projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        
        const techTags = project.technologies.map(tech => 
            `<span class="tech-tag">${tech}</span>`
        ).join('');
        
        const links = [];
        if (project.github) {
            links.push(`<a href="${project.github}" target="_blank" class="project-link">GitHub</a>`);
        }
        if (project.demo) {
            links.push(`<a href="${project.demo}" target="_blank" class="project-link">Live Demo</a>`);
        }
        
        card.innerHTML = `
            <h3 class="project-title">${project.name}</h3>
            <p class="project-description">${project.description}</p>
            <div class="project-tech">${techTags}</div>
            <div class="project-links">${links.join('')}</div>
        `;
        
        grid.appendChild(card);
    });
}

// Populate Skills Section
function populateSkills() {
    const container = document.getElementById('skills-container');
    
    resumeData.skills.forEach(skillCategory => {
        const category = document.createElement('div');
        category.className = 'skill-category';
        
        const items = skillCategory.items.map(item => 
            `<span class="skill-badge">${item}</span>`
        ).join('');
        
        category.innerHTML = `
            <h3 class="skill-category-title">${skillCategory.category}</h3>
            <div class="skill-badges-container">${items}</div>
        `;
        
        container.appendChild(category);
    });
}

// Populate Contact Section
function populateContact() {
    const container = document.getElementById('contact-links');
    
    const contacts = [
        { name: 'Email', icon: '✉️', url: resumeData.contact.email ? `mailto:${resumeData.contact.email}` : null },
        { name: 'GitHub', icon: '💻', url: resumeData.contact.github },
        { name: 'LinkedIn', icon: '💼', url: resumeData.contact.linkedin },
        { name: 'Twitter', icon: '🐦', url: resumeData.contact.twitter }
    ];
    
    contacts.forEach(contact => {
        if (contact.url && contact.url !== 'null' && !contact.url.includes('example.com') && contact.url !== 'mailto:null') {
            const link = document.createElement('a');
            link.href = contact.url;
            link.className = 'contact-link';
            if (!contact.url.startsWith('mailto:')) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
            link.innerHTML = `<span>${contact.icon}</span><span>${contact.name}</span>`;
            container.appendChild(link);
        }
    });
    
    if (container.children.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Contact information will be loaded from resume data.</p>';
    }
}

// Smooth Scroll
function initSmoothScroll() {
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
}

// Mobile Menu Toggle
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking a link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

// Update Year in Footer
function updateYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Intersection Observer for Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.timeline-item, .project-card, .skill-category').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

// Populate About Section
function populateAbout() {
    if (resumeData.about) {
        const lead = document.getElementById('about-lead');
        const detail1 = document.getElementById('about-detail-1');
        const detail2 = document.getElementById('about-detail-2');
        
        if (lead && resumeData.about.description) {
            lead.textContent = resumeData.about.description;
        }
        if (detail1 && resumeData.about.details && resumeData.about.details[0]) {
            detail1.textContent = resumeData.about.details[0];
        }
        if (detail2 && resumeData.about.details && resumeData.about.details[1]) {
            detail2.textContent = resumeData.about.details[1];
        } else if (detail2 && resumeData.about.details && resumeData.about.details.length === 1) {
            // Hide second paragraph if there's only one detail
            detail2.style.display = 'none';
        }
        
        // Add education section if data exists (placed after about text)
        if (resumeData.education) {
            const eduSection = document.getElementById('education-section');
            if (eduSection && resumeData.education.degree) {
                const coursework = resumeData.education.coursework ? 
                    resumeData.education.coursework.join(', ') : '';
                eduSection.innerHTML = `
                    <div style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px;">
                        <h3 style="font-size: 1.3rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.75rem;">Education</h3>
                        <div style="color: var(--text-primary); font-weight: 500; margin-bottom: 0.5rem;">${resumeData.education.degree}</div>
                        <div style="color: var(--primary-color); margin-bottom: 0.5rem;">${resumeData.education.school}</div>
                        <div style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 0.5rem;">
                            ${resumeData.education.location} • GPA: ${resumeData.education.gpa} • ${resumeData.education.graduation}
                        </div>
                        ${coursework ? `<div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.75rem;">
                            <strong>Coursework:</strong> ${coursework}
                        </div>` : ''}
                    </div>
                `;
            }
        }
        
        // Add reference letter section
        const refSection = document.getElementById('reference-section');
        if (refSection) {
            refSection.innerHTML = `
                <div class="reference-card">
                    <div class="reference-text">
                        <h3>Professional Reference</h3>
                        <p>Reference letter from my Software Engineering Manager at Teledyne FLIR</p>
                        <a href="reference/JasonChan-Reference.pdf" target="_blank" rel="noopener noreferrer" class="reference-link">
                            View Reference Letter →
                        </a>
                    </div>
                </div>
            `;
        }
    }
}

// Typewriter effect for name
function initTypewriter() {
    const nameElement = document.getElementById('typed-name');
    if (!nameElement) return;
    
    const name = nameElement.textContent;
    nameElement.textContent = '';
    nameElement.classList.add('typing');
    let i = 0;
    
    function type() {
        if (i < name.length) {
            nameElement.textContent += name.charAt(i);
            i++;
            setTimeout(type, 100);
        } else {
            // Remove cursor after typing is complete
            nameElement.classList.remove('typing');
        }
    }
    
    // Start typing after a short delay
    setTimeout(type, 800);
}

// Animate stats counter
function initStatsCounter() {
    const stats = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                animateCounter(entry.target, target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    stats.forEach(stat => observer.observe(stat));
}

function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const duration = 2000;
    const stepTime = duration / 50;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + (target >= 1000 ? '+' : '');
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + (target >= 1000 ? '+' : '');
        }
    }, stepTime);
}

// Initialize Everything
document.addEventListener('DOMContentLoaded', async () => {
    initThreeBackground();
    await loadResumeData();
    populateAbout();
    populateExperience();
    populateProjects();
    populateSkills();
    populateContact();
    initSmoothScroll();
    initMobileMenu();
    updateYear();
    initScrollAnimations();
    initTypewriter();
});

