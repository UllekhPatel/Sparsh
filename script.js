document.addEventListener('DOMContentLoaded', () => {
    // 1. SYSTEM INITIALIZATIONS
    gsap.registerPlugin(ScrollTrigger, TextPlugin);

    // Init Lenis
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.5,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // 2. CUSTOM CURSOR & MAGNETIC HOVER
    const cursor = document.getElementById('custom-cursor');
    const interactives = document.querySelectorAll('.interactive, .interactive-trigger');

    window.addEventListener('mousemove', (e) => {
        gsap.to(cursor, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.1,
            ease: "power2.out"
        });
    });

    interactives.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });

    // 3. THREE.JS PROCEDURAL BACKGROUND
    const canvas = document.getElementById('webgl-canvas');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e8e9eb'); // Start color matches CSS
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Simple procedural architecture (Abstract)
    const group = new THREE.Group();
    scene.add(group);

    // Concrete Pillar
    const concreteGeo = new THREE.BoxGeometry(4, 15, 4);
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x999999, roughness: 0.9 });
    const pillar1 = new THREE.Mesh(concreteGeo, concreteMat);
    pillar1.position.set(-2, 0, -5);
    group.add(pillar1);

    // Steel Beam
    const steelGeo = new THREE.BoxGeometry(18, 1, 2);
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
    const beam1 = new THREE.Mesh(steelGeo, steelMat);
    beam1.rotation.z = Math.PI / 6;
    beam1.position.set(0, 2, 2);
    group.add(beam1);

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(10, 20, 10);
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Mouse tilt tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    window.addEventListener('mousemove', (e) => {
        targetRotationY = (e.clientX - window.innerWidth / 2) * 0.0005;
        targetRotationX = (e.clientY - window.innerHeight / 2) * 0.0005;
    });

    const clock = new THREE.Clock();
    function animateThree() {
        requestAnimationFrame(animateThree);
        // Idle continuous Y
        group.rotation.y += 0.002;
        // Mouse tilt interpolation
        scene.rotation.x += (targetRotationX - scene.rotation.x) * 0.05;
        scene.rotation.y += (targetRotationY - scene.rotation.y) * 0.05;
        renderer.render(scene, camera);
    }
    animateThree();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 4. GSAP SCROLL TIMELINES

    // Helper: Manual SVG blur interpolation
    const blurObj = { val: 0 };
    const blurFilter = document.querySelector('#blur-filter');
    const updateBlur = () => { blurFilter.setAttribute('stdDeviation', `${blurObj.val},0`); };

    // --- Scene 1->2 Scrubbed Split & Background Transition ---
    const tlSplit = gsap.timeline({
        scrollTrigger: {
            trigger: ".section-hero",
            start: "top top",
            endTrigger: ".section-kinetic-spacer",
            end: "bottom center",
            scrub: true,
            pin: ".section-hero",
            anticipatePin: 1
        }
    });

    // Color Transitions (DOM + WebGL)
    const slateHex = 0x2d3748;
    tlSplit.to(scene.background, {
        r: new THREE.Color(slateHex).r,
        g: new THREE.Color(slateHex).g,
        b: new THREE.Color(slateHex).b,
        duration: 1
    }, 0);
    tlSplit.to('.top-bar, .rest-of-name', { color: '#f7fafc', duration: 1 }, 0); // Interface flips to light text

    // Text Split Translations (Top 1.5x speed, Bottom 0.8x drop)
    tlSplit.to('.slice-top', { yPercent: -150, xPercent: 10, duration: 1 }, 0);
    tlSplit.to('.slice-bottom', { yPercent: 80, xPercent: -5, duration: 1 }, 0);
    
    // SVG Motion Blur Peak during mid-scroll
    tlSplit.to(blurObj, { val: 15, onUpdate: updateBlur, duration: 0.5 }, 0);
    tlSplit.to(blurObj, { val: 0, onUpdate: updateBlur, duration: 0.5 }, 0.5); // Fades back out

    // 3D Object manipulation
    tlSplit.to(group.position, { x: -8, y: 5, z: -10, duration: 1 }, 0);
    tlSplit.to(group.scale, { x: 0.4, y: 0.4, z: 0.4, duration: 1 }, 0);


    // --- Scene 3 Enter: Kavach Masking Reveal ---
    gsap.set('.kavach-title', { y: '110%' });
    const tlKavach = gsap.timeline({
        scrollTrigger: {
            trigger: ".section-kavach",
            start: "top center",
            toggleActions: "play none none reverse"
        }
    });
    
    // Slide up masking effect
    tlKavach.to('.kavach-title', {
        y: '0%',
        duration: 1,
        stagger: 0.15,
        ease: "power4.out"
    });

    // Custom Vanilla Typewriter/Decoder Effect
    const subtitleE = document.querySelector('.decoding-text');
    const subtitleFinal = "EQUIPMENT LEASING | MATERIAL SUPPLY | AHMEDABAD";
    const decodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ*&%$#@!<>";
    
    tlKavach.add(() => {
        let iteration = 0;
        let decodeInterval = setInterval(() => {
            subtitleE.innerText = subtitleFinal.split('').map((letter, index) => {
                if(index < iteration) { return subtitleFinal[index]; }
                return decodeChars[Math.floor(Math.random() * decodeChars.length)];
            }).join('');
            if(iteration >= subtitleFinal.length) clearInterval(decodeInterval);
            iteration += 1 / 2;
        }, 30);
    });

    // --- Scene 4: Blueprint Reveal ---
    const kawachSubtitle = document.querySelector('.kavach-subtitle');
    const blueprintOverlay = document.querySelector('.blueprint-overlay');
    kawachSubtitle.addEventListener('mouseenter', () => {
        blueprintOverlay.style.opacity = '1';
        // Simulating WebGL Distortion Peel by transitioning the background scene color heavily dark
        gsap.to(scene.background, { r: 0.05, g: 0.05, b: 0.1, duration: 0.5 });
    });
    kawachSubtitle.addEventListener('mouseleave', () => {
        blueprintOverlay.style.opacity = '0';
        gsap.to(scene.background, { r: new THREE.Color(slateHex).r, g: new THREE.Color(slateHex).g, b: new THREE.Color(slateHex).b, duration: 0.5 });
    });

    // Nodes Click
    document.querySelectorAll('.node').forEach(node => {
        node.addEventListener('click', () => {
            const card = document.querySelector('.data-card');
            const content = document.querySelector('.data-card .data-content');
            content.innerText = node.getAttribute('data-info');
            card.classList.add('active');
            setTimeout(() => card.classList.remove('active'), 3000);
        });
    });

    // --- Scene 5: Cultural Anchor ---
    gsap.to('.translation-fade', {
        opacity: 1,
        scrollTrigger: {
            trigger: ".cultural-anchor",
            start: "top 90%",
            end: "bottom bottom",
            scrub: true
        }
    });
});
