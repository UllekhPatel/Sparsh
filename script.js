document.addEventListener('DOMContentLoaded', () => {
    // 1. SYSTEM INIT
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
        duration: 1.5,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.0,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // 2. CURSOR MAGNETISM
    const cursor = document.getElementById('custom-cursor');
    window.addEventListener('mousemove', (e) => {
        gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power2.out' });
    });

    // 3. THREE.JS PROCEDURAL SCENE SETUP
    const canvas = document.getElementById('webgl-canvas');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e8e9eb'); // Phase 1 off-white concrete
    scene.fog = new THREE.Fog('#e8e9eb', 20, 100);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Phase 1 Camera starts structurally high aiming slightly down
    camera.position.set(0, 30, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Dynamic Etching Laser Light (Initially hidden/low intensity)
    const laserLight = new THREE.PointLight(0xff5e00, 0, 50); // safety orange
    laserLight.position.set(-20, -10, 5);
    scene.add(laserLight);

    // Generate Concrete Shards Array (The Wall that shatters)
    const shardsGroup = new THREE.Group();
    scene.add(shardsGroup);
    
    // Low-poly Dodecahedrons for geometric concrete aesthetic
    const shardGeo = new THREE.DodecahedronGeometry();
    const shardMat = new THREE.MeshLambertMaterial({ color: 0xcccccc, roughness: 1.0 });

    for (let i = 0; i < 80; i++) {
        const shard = new THREE.Mesh(shardGeo, shardMat);
        // Position them flat along the X/Z plane (mimicking a floor or wall we are looking down at)
        shard.position.set(
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 5, // Tight Y spread initially
            (Math.random() - 0.5) * 60
        );
        const scale = 0.5 + Math.random() * 2;
        shard.scale.set(scale, scale, scale);
        // Random base rotations
        shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        // Custom properties for Phase 2 explosion math
        shard.userData = {
            targetY: 20 + Math.random() * 80, // Shoot wildly up into vacuum
            rotSpeedX: (Math.random() - 0.5) * 0.1,
            rotSpeedY: (Math.random() - 0.5) * 0.1,
        };
        shardsGroup.add(shard);
    }

    // Generate The Shield I-Beams (Assembly Phase)
    const AssemblyGroup = new THREE.Group();
    scene.add(AssemblyGroup);
    
    const beamMat = new THREE.MeshStandardMaterial({ 
        color: 0xff5e00, // Safety orange
        roughness: 0.3, 
        metalness: 0.8 
    });

    // Create 3 geometric beam blocks off-screen that will lock together
    // Left Beam
    const beamL = new THREE.Mesh(new THREE.BoxGeometry(2, 15, 2), beamMat);
    beamL.position.set(-50, -20, -20); // Start deep offscreen
    beamL.rotation.z = Math.PI / 4;
    AssemblyGroup.add(beamL);
    
    // Right Beam
    const beamR = new THREE.Mesh(new THREE.BoxGeometry(2, 15, 2), beamMat);
    beamR.position.set(50, -20, -20);
    beamR.rotation.z = -Math.PI / 4;
    AssemblyGroup.add(beamR);

    // Center Core Block
    const beamC = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 2), beamMat);
    beamC.position.set(0, 40, 10); // Start top offscreen
    AssemblyGroup.add(beamC);


    // Render Loop
    let timelineProgress = 0;
    function animate() {
        requestAnimationFrame(animate);
        
        // Continuous idle rotation for shards *only* when they've exploded
        // We'll manage standard rotation below via GSAP updates or simple tick
        shardsGroup.children.forEach(shard => {
            shard.rotation.x += shard.userData.rotSpeedX * timelineProgress; // Spin faster the further along we are
            shard.rotation.y += shard.userData.rotSpeedY * timelineProgress;
        });

        // Hover tilt effect (The entire scene responds lightly to mouse)
        scene.rotation.y = (mouseX / window.innerWidth - 0.5) * 0.1;
        scene.rotation.x = (mouseY / window.innerHeight - 0.5) * 0.1;

        renderer.render(scene, camera);
    }
    
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 4. GSAP TIMELINES: The 4 Cinematic Phases

    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-pin-container",
            start: "top top",
            end: "+=4000",
            scrub: 1.5,
            pin: true,
            onUpdate: self => { timelineProgress = self.progress; }
        }
    });

    // === PHASE 1: The Descent (0% - 20%) ===
    // Bring in Hero text
    tl.to('.massive-hero-text', { opacity: 1, duration: 0.05 }, 0);
    
    // Camera literally pushes straight down Y axis, breaking through the theoretical concrete shell
    tl.to(camera.position, {
        y: 10,  // Drop low
        z: 30,  // Push slightly in
        ease: 'power2.inOut',
        duration: 0.2
    }, 0);
    
    // Focus lookAt slightly upwards now
    tl.to(camera.lookAt, { x:0, y:10, z:0, duration: 0.2 }, 0);


    // === PHASE 2: The Anti-Gravity Event (20% - 50%) ===
    // Erase hero text
    tl.to('.massive-hero-text', { opacity: 0, scale: 1.1, duration: 0.1 }, 0.2);
    
    // Background flashes to void
    const obsidianHex = 0x0d1217;
    tl.to(scene.background, {
        r: new THREE.Color(obsidianHex).r,
        g: new THREE.Color(obsidianHex).g,
        b: new THREE.Color(obsidianHex).b,
        duration: 0.1
    }, 0.2);
    tl.to(scene.fog, { color: obsidianHex, duration: 0.1 }, 0.2);

    // Fire all shards upwards violently into the vacuum
    shardsGroup.children.forEach(shard => {
        tl.to(shard.position, {
            y: shard.position.y + shard.userData.targetY, // Blast upwards
            x: shard.position.x * 1.5, // Spread out x
            z: shard.position.z * 1.5, // Spread out z
            ease: "power4.out",
            duration: 0.3
        }, 0.2);
    });


    // === PHASE 3: The Assembly (50% - 75%) ===
    // The Beams fly in and magnetically lock
    tl.to(beamL.position, { x: -4, y: 0, z: 0, duration: 0.25, ease: "back.out(1.5)" }, 0.5);
    tl.to(beamR.position, { x: 4, y: 0, z: 0, duration: 0.25, ease: "back.out(1.5)" }, 0.5);
    tl.to(beamL.rotation, { z: 0, duration: 0.25, ease: "power2.inOut" }, 0.5);
    tl.to(beamR.rotation, { z: 0, duration: 0.25, ease: "power2.inOut" }, 0.5);
    
    tl.to(beamC.position, { x: 0, y: 6, z: 0, duration: 0.25, ease: "bounce.out" }, 0.55);

    // KAVACH title fades in perfectly behind the assembled shield structure
    tl.to('.kavach-shield-title', {
        opacity: 1,
        scale: 1,
        duration: 0.2,
        ease: "power2.out"
    }, 0.6);


    // === PHASE 4: The Anchor Laser (75% - 100%) ===
    // Fade Kavach shield back slightly
    tl.to('.kavach-shield-title', { opacity: 0.2, duration: 0.1 }, 0.8);
    tl.to(AssemblyGroup.position, { y: 15, duration: 0.2, ease: "power2.inOut" }, 0.8);

    // Reveal Anchor text wrapper DOM
    tl.to('.sanskrit-engraved', { opacity: 1, duration: 0.01 }, 0.8);

    // Ignite the PointLight Laser
    tl.to(laserLight, { intensity: 15, duration: 0.05 }, 0.8);

    // Sweep laser light geometrically from Left to Right
    tl.to(laserLight.position, {
        x: 20, // Sweep past 0
        ease: "none",
        duration: 0.2
    }, 0.8);

    // Synchronize CSS clip-path to visually 'etch/reveal' the text as the laser passes it!
    tl.to('.sanskrit-engraved', {
        clipPath: "inset(0 0% 0 0)",
        ease: "none",
        duration: 0.2
    }, 0.8);

    // After laser scan, kill laser light, fade in translation text under it safely
    tl.to(laserLight, { intensity: 0, duration: 0.05 }, 1.0);
    tl.to('.translation-fade', { opacity: 1, duration: 0.1 }, 0.95);

});
