document.addEventListener('DOMContentLoaded', () => {
    // ===========================
    // 1. SYSTEM INIT
    // ===========================
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

    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        window.addEventListener('mousemove', (e) => {
            gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1, ease: 'power2.out' });
        });
    }

    // ===========================
    // 2. THREE.JS SCENE
    // ===========================
    const canvas = document.getElementById('webgl-canvas');
    const scene = new THREE.Scene();

    // Warm golden hour lighting
    scene.fog = new THREE.FogExp2(0xC4A882, 0.008);

    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
    camera.position.set(0, 45, 55);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Full native resolution — 4K on retina
    renderer.setClearColor(0xD4B896, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputEncoding = THREE.sRGBEncoding;

    // Lighting
    const sun = new THREE.DirectionalLight(0xFFDDB0, 2.0);
    sun.position.set(40, 60, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    scene.add(sun);

    scene.add(new THREE.AmbientLight(0xFFEED8, 0.45));
    const skyFill = new THREE.DirectionalLight(0x7799CC, 0.25);
    skyFill.position.set(-20, 30, -20);
    scene.add(skyFill);

    const laserLight = new THREE.PointLight(0xff5e00, 0, 50);
    laserLight.position.set(-20, -10, 5);
    scene.add(laserLight);

    // ===========================
    // MATERIALS PALETTE
    // ===========================
    const MATS = {
        earth: new THREE.MeshStandardMaterial({ color: 0xAA8844, roughness: 1.0, flatShading: true }),
        rock: new THREE.MeshStandardMaterial({ color: 0x7A7060, roughness: 0.95, flatShading: true }),
        mound: new THREE.MeshStandardMaterial({ color: 0x9B7940, roughness: 1.0, flatShading: true }),
        road: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 }),
        sidewalk: new THREE.MeshStandardMaterial({ color: 0xBBBBBB, roughness: 0.9 }),
        concrete: new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.7 }),
        wall1: new THREE.MeshStandardMaterial({ color: 0xDDCCAA, roughness: 0.6 }),
        wall2: new THREE.MeshStandardMaterial({ color: 0xBBA888, roughness: 0.6 }),
        wall3: new THREE.MeshStandardMaterial({ color: 0xCC9966, roughness: 0.5 }),
        wallOrange: new THREE.MeshStandardMaterial({ color: 0xFF6600, roughness: 0.4, metalness: 0.1 }),
        glass: new THREE.MeshStandardMaterial({ color: 0x88CCEE, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5 }),
        roof: new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.8 }),
        tree: new THREE.MeshStandardMaterial({ color: 0x336622, roughness: 0.9 }),
        treeDark: new THREE.MeshStandardMaterial({ color: 0x224411, roughness: 0.9 }),
        trunk: new THREE.MeshStandardMaterial({ color: 0x664422, roughness: 0.9 }),
        grass: new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.9, flatShading: true }),
        grassDark: new THREE.MeshStandardMaterial({ color: 0x388E3C, roughness: 0.9, flatShading: true }),
        sand: new THREE.MeshStandardMaterial({ color: 0xD2B48C, roughness: 1.0, flatShading: true }),
        sandDark: new THREE.MeshStandardMaterial({ color: 0xC4A060, roughness: 1.0, flatShading: true }),
        rubble: new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.95, flatShading: true }),
        steel: new THREE.MeshStandardMaterial({ color: 0xFF5E00, roughness: 0.3, metalness: 0.8 }),
        lamp: new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.6 }),
        fence: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.3 }),
        jcbYellow: new THREE.MeshStandardMaterial({ color: 0xE8A000, metalness: 0.3, roughness: 0.5 }),
        jcbDark: new THREE.MeshStandardMaterial({ color: 0x1A1A1A, metalness: 0.5, roughness: 0.4 }),
        sign: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.3 }),
        water: new THREE.MeshStandardMaterial({ color: 0x2288CC, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.7 }),
    };

    // ===========================
    // 3. ASSET MANAGER & GLTF LOADER
    // ===========================
    const mixers = [];
    const gltfLoader = new THREE.GLTFLoader();

    function loadAnimatedAsset(url, group, scale, yOffset, fallbackColor) {
        gltfLoader.load(
            url,
            (gltf) => {
                const model = gltf.scene;
                model.scale.setScalar(scale);
                model.position.y = yOffset;
                
                // Enable shadows for the loaded model
                model.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                    }
                });

                group.add(model);

                // Play embedded animations if they exist
                if (gltf.animations && gltf.animations.length > 0) {
                    const mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach((clip) => {
                        mixer.clipAction(clip).play();
                    });
                    mixers.push(mixer);
                }
            },
            undefined, // onProgress
            (error) => {
                console.warn(`Failed to load ${url}, generating fallback bounding box.`);
                // Fallback geometry if asset is missing (ensures the site doesn't break)
                const fallback = new THREE.Mesh(
                    new THREE.BoxGeometry(scale * 2, scale * 2, scale * 2),
                    new THREE.MeshStandardMaterial({ color: fallbackColor, wireframe: true })
                );
                fallback.position.y = scale + yOffset;
                group.add(fallback);
                
                // Add a text label above the fallback so the user knows what goes here
                console.log("Missing Asset: " + url);
            }
        );
    }

    // ===========================
    // 4. BARREN DESERT TERRAIN
    // ===========================
    const terrainGroup = new THREE.Group();
    scene.add(terrainGroup);

    const groundGeo = new THREE.PlaneGeometry(1000, 1000, 150, 150);
    groundGeo.rotateX(-Math.PI / 2);
    const verts = groundGeo.attributes.position.array;
    for (let i = 0; i < verts.length; i += 3) {
        const x = verts[i], z = verts[i + 2];
        verts[i + 1] =
            Math.sin(x * 0.06) * Math.cos(z * 0.08) * 2.0 +
            Math.sin(x * 0.2 + z * 0.15) * 0.7 +
            (Math.random() - 0.5) * 0.3;
    }
    groundGeo.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeo, MATS.earth);
    ground.receiveShadow = true;
    terrainGroup.add(ground);

    // Boulders
    for (let i = 0; i < 35; i++) {
        const s = 0.5 + Math.random() * 2.5;
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), MATS.rock);
        rock.position.set((Math.random() - 0.5) * 120, s * 0.2, (Math.random() - 0.5) * 120);
        rock.rotation.set(Math.random() * 2, Math.random() * 2, 0);
        rock.castShadow = true;
        terrainGroup.add(rock);
    }

    // Dirt mounds
    for (let i = 0; i < 15; i++) {
        const r = 1.5 + Math.random() * 3;
        const mound = new THREE.Mesh(
            new THREE.SphereGeometry(r, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
            MATS.mound
        );
        mound.position.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
        terrainGroup.add(mound);
    }

    // ===========================
    // 4. SOCIETY INFRASTRUCTURE (starts hidden underground)
    // ===========================
    const societyGroup = new THREE.Group();
    societyGroup.position.y = -25; // Buried deep below terrain
    scene.add(societyGroup);

    // --- ROADS ---
    function createRoad(x, z, w, d) {
        const road = new THREE.Mesh(new THREE.BoxGeometry(w, 0.15, d), MATS.road);
        road.position.set(x, 0.1, z);
        road.receiveShadow = true;
        societyGroup.add(road);
        // Road markings
        const lineCount = Math.floor(d / 6);
        for (let i = 0; i < lineCount; i++) {
            const mark = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.02, 2),
                new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
            );
            mark.position.set(x, 0.2, z - d / 2 + 3 + i * 6);
            societyGroup.add(mark);
        }
    }
    createRoad(0, 0, 6, 80);       // Main road N-S
    createRoad(0, -10, 50, 6);     // Cross road E-W

    // Sidewalks along main road
    for (const xOff of [-4.5, 4.5]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 80), MATS.sidewalk);
        sw.position.set(xOff, 0.15, 0);
        sw.receiveShadow = true;
        societyGroup.add(sw);
    }

    // --- BUILDINGS ---
    function createBuilding(x, z, w, h, d, wallMat, hasWindows = true) {
        const bldg = new THREE.Group();
        // Main structure
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        body.position.set(0, h / 2, 0);
        body.castShadow = true;
        body.receiveShadow = true;
        bldg.add(body);

        // Roof slab
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.3, d + 0.4), MATS.roof);
        roof.position.set(0, h + 0.15, 0);
        roof.castShadow = true;
        bldg.add(roof);

        // Windows
        if (hasWindows) {
            const floors = Math.floor(h / 3);
            const cols = Math.max(1, Math.floor(w / 3));
            for (let f = 0; f < floors; f++) {
                for (let c = 0; c < cols; c++) {
                    const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.1), MATS.glass);
                    const wx = -w / 2 + 1.5 + c * (w / cols);
                    win.position.set(wx, 2 + f * 3, d / 2 + 0.06);
                    bldg.add(win);
                    // Back windows
                    const winB = win.clone();
                    winB.position.z = -d / 2 - 0.06;
                    bldg.add(winB);
                }
            }
        }

        bldg.position.set(x, 0, z);
        societyGroup.add(bldg);
        return bldg;
    }

    // Row of buildings — left side of road
    createBuilding(-12, 8, 8, 12, 7, MATS.wall1);
    createBuilding(-13, -5, 10, 18, 8, MATS.wall2);
    createBuilding(-11, -18, 7, 9, 6, MATS.wallOrange);
    createBuilding(-14, -30, 9, 15, 7, MATS.wall3);

    // Right side of road
    createBuilding(12, 5, 7, 10, 6, MATS.wall2);
    createBuilding(14, -8, 10, 22, 8, MATS.wall1);
    createBuilding(11, -22, 8, 8, 7, MATS.wall3);
    createBuilding(13, -35, 9, 14, 6, MATS.wallOrange);

    // Background buildings (distant)
    createBuilding(-25, 15, 6, 8, 5, MATS.wall1, false);
    createBuilding(25, 18, 7, 11, 6, MATS.wall2, false);
    createBuilding(-28, -25, 8, 6, 5, MATS.wall3, false);
    createBuilding(28, -28, 6, 9, 5, MATS.wall1, false);

    // --- TREES ---
    function createTree(x, z, height) {
        const tree = new THREE.Group();
        const trunkH = height * 0.4;
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6),
            MATS.trunk
        );
        trunk.position.y = trunkH / 2;
        trunk.castShadow = true;
        tree.add(trunk);

        // Foliage layers
        for (let layer = 0; layer < 3; layer++) {
            const r = (height * 0.35) - layer * 0.3;
            const foliage = new THREE.Mesh(
                new THREE.ConeGeometry(r, height * 0.3, 6),
                layer % 2 === 0 ? MATS.tree : MATS.treeDark
            );
            foliage.position.y = trunkH + layer * (height * 0.18);
            foliage.castShadow = true;
            tree.add(foliage);
        }
        tree.position.set(x, 0, z);
        societyGroup.add(tree);
    }

    // Trees along sidewalks
    for (let i = -30; i <= 30; i += 10) {
        createTree(-7, i, 4 + Math.random() * 2);
        createTree(7, i + 5, 3.5 + Math.random() * 2);
    }
    // Park cluster
    for (let i = 0; i < 8; i++) {
        createTree(18 + Math.random() * 10, 20 + Math.random() * 15, 3 + Math.random() * 3);
    }

    // --- STREET LAMPS ---
    function createLamp(x, z) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), MATS.lamp);
        pole.position.set(x, 2.5, z);
        societyGroup.add(pole);

        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), MATS.lamp);
        arm.position.set(x + 0.75, 5, z);
        societyGroup.add(arm);

        const light = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.2, 0.3),
            new THREE.MeshStandardMaterial({ color: 0xFFDD88, emissive: 0xFFDD88, emissiveIntensity: 0.5 })
        );
        light.position.set(x + 1.5, 4.9, z);
        societyGroup.add(light);
    }

    for (let i = -30; i <= 30; i += 15) {
        createLamp(-5.5, i);
        createLamp(5.5, i + 7);
    }

    // --- KAVACH INFRACON HQ (The landmark orange building) ---
    const hqGroup = new THREE.Group();
    // Main tower
    const hqBody = new THREE.Mesh(new THREE.BoxGeometry(10, 28, 8), MATS.wallOrange);
    hqBody.position.set(0, 14, 0);
    hqBody.castShadow = true;
    hqGroup.add(hqBody);

    // Glass facade
    for (let f = 0; f < 8; f++) {
        for (let c = 0; c < 3; c++) {
            const win = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.1), MATS.glass);
            win.position.set(-3 + c * 3, 3 + f * 3.2, 4.06);
            hqGroup.add(win);
        }
    }

    // Roof antenna
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 4), MATS.lamp);
    antenna.position.set(0, 30, 0);
    hqGroup.add(antenna);

    hqGroup.position.set(0, 0, 20);
    societyGroup.add(hqGroup);

    // --- CONSTRUCTION CRANE ---
    const craneGroup = new THREE.Group();
    // Vertical mast
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.8, 30, 0.8), MATS.jcbYellow);
    mast.position.y = 15;
    mast.castShadow = true;
    craneGroup.add(mast);

    // Horizontal jib
    const jib = new THREE.Mesh(new THREE.BoxGeometry(25, 0.6, 0.6), MATS.jcbYellow);
    jib.position.set(5, 30, 0);
    craneGroup.add(jib);

    // Counter-jib
    const counterJib = new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 0.6), MATS.jcbYellow);
    counterJib.position.set(-8, 30, 0);
    craneGroup.add(counterJib);

    // Counterweight
    const cw = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), MATS.jcbDark);
    cw.position.set(-11, 29.5, 0);
    craneGroup.add(cw);

    // Cable
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 15, 4), MATS.lamp);
    cable.position.set(12, 22, 0);
    craneGroup.add(cable);

    // Hook
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), MATS.steel);
    hook.position.set(12, 14.5, 0);
    craneGroup.add(hook);

    craneGroup.position.set(-20, 0, -15);
    societyGroup.add(craneGroup);

    // --- JCB ON ROAD ---
    const jcbGroup = new THREE.Group();
    for (const z of [-1.2, 1.2]) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 0.6), MATS.jcbDark);
        track.position.set(0, 0.4, z);
        jcbGroup.add(track);
    }
    const jcbBody = new THREE.Mesh(new THREE.BoxGeometry(4, 1.8, 2.5), MATS.jcbYellow);
    jcbBody.position.y = 1.7;
    jcbBody.castShadow = true;
    jcbGroup.add(jcbBody);
    const jcbCab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 2.2), MATS.jcbYellow);
    jcbCab.position.set(-0.3, 3.3, 0);
    jcbGroup.add(jcbCab);
    const jcbBoom = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 0.5), MATS.jcbDark);
    jcbBoom.position.set(4, 2.5, 0);
    jcbGroup.add(jcbBoom);
    const jcbBucket = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1, 1.8), MATS.jcbDark);
    jcbBucket.position.set(7, 1.5, 0);
    jcbGroup.add(jcbBucket);

    jcbGroup.position.set(-50, 0, 2);
    jcbGroup.rotation.y = Math.PI / 12;
    societyGroup.add(jcbGroup);

    // --- FENCING / BOUNDARY WALLS ---
    function createFence(x1, z1, x2, z2) {
        const dx = x2 - x1, dz = z2 - z1;
        const len = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        const fence = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, len), MATS.fence);
        fence.position.set((x1 + x2) / 2, 0.75, (z1 + z2) / 2);
        fence.rotation.y = angle;
        societyGroup.add(fence);
        // Posts
        const posts = Math.floor(len / 4);
        for (let p = 0; p <= posts; p++) {
            const t = p / posts;
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2, 4), MATS.fence);
            post.position.set(x1 + dx * t, 1, z1 + dz * t);
            societyGroup.add(post);
        }
    }

    createFence(-30, -40, -30, 35);
    createFence(30, -40, 30, 35);

    // --- SERVICE ZONE 1: HEAVY EQUIPMENT YARD ---
    const equipZone = new THREE.Group();
    equipZone.position.set(-35, 0, -25);
    societyGroup.add(equipZone);
    
    // Load 3 realistic GLTF excavators
    for (let i = 0; i < 3; i++) {
        const excavatorNode = new THREE.Group();
        excavatorNode.position.set(i * 7, 0, 0);
        excavatorNode.rotation.y = -0.3;
        
        // This will attempt to load the actual 3D model. If missing, places an orange box.
        loadAnimatedAsset('assets/models/excavator_digging.glb', excavatorNode, 1.5, 0, 0xffa500);
        
        equipZone.add(excavatorNode);
    }
    
    // Warning cones
    for (let i = 0; i < 6; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 6), MATS.wallOrange);
        cone.position.set(i * 3 - 2, 0.4, 5);
        equipZone.add(cone);
    }

    // --- SERVICE ZONE 2: RIVER SAND SUPPLY DEPOT ---
    const sandZone = new THREE.Group();
    sandZone.position.set(35, 0, -20);
    societyGroup.add(sandZone);

    // Flowing River
    const river = new THREE.Mesh(new THREE.PlaneGeometry(15, 60), MATS.water);
    river.rotation.x = -Math.PI / 2;
    river.position.set(12, 0.1, 0);
    sandZone.add(river);

    // Sand piles
    for (let i = 0; i < 4; i++) {
        const pile = new THREE.Mesh(
            new THREE.ConeGeometry(3 + Math.random() * 2, 4 + Math.random() * 3, 8),
            i % 2 === 0 ? MATS.sand : MATS.sandDark
        );
        pile.position.set(i * 6 - 9, pile.geometry.parameters.height / 2, Math.random() * 6 - 3);
        pile.castShadow = true;
        sandZone.add(pile);
    }
    
    // Dump truck GLTF
    const dumpTruckNode = new THREE.Group();
    dumpTruckNode.position.set(2, 0, 8);
    dumpTruckNode.rotation.y = -0.6;
    loadAnimatedAsset('assets/models/dump_truck.glb', dumpTruckNode, 2.0, 0, 0x555555);
    sandZone.add(dumpTruckNode);

    // Sand Extractor GLTF
    const sandExtractorNode = new THREE.Group();
    sandExtractorNode.position.set(8, 0, 0);
    loadAnimatedAsset('assets/models/sand_dredger.glb', sandExtractorNode, 1.8, 0, 0xffd700);
    sandZone.add(sandExtractorNode);

    // --- SERVICE ZONE 3: DEMOLITION SITE ---
    const demoZone = new THREE.Group();
    demoZone.position.set(0, 0, -40);
    societyGroup.add(demoZone);

    // Destroyed walls
    for (let i = 0; i < 5; i++) {
        const h = 2 + Math.random() * 6;
        const w = 3 + Math.random() * 4;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), MATS.rubble);
        wall.position.set(i * 5 - 10, h / 2, Math.random() * 4);
        wall.rotation.set(0, Math.random() * 0.4 - 0.2, Math.random() * 0.15 - 0.075);
        wall.castShadow = true;
        demoZone.add(wall);
    }
    
    // Wrecking Crane GLTF
    const wreckingRigNode = new THREE.Group();
    wreckingRigNode.position.set(-8, 0, 0);
    loadAnimatedAsset('assets/models/demolition_rig.glb', wreckingRigNode, 2.5, 0, 0xff0000);
    demoZone.add(wreckingRigNode);

    // --- GRASS PATCHES ---HES (start hidden, appear during greening) ---
    const greeneryGroup = new THREE.Group();
    greeneryGroup.position.y = -5; // Hidden below surface
    societyGroup.add(greeneryGroup);
    // Grass carpet patches
    for (let i = 0; i < 30; i++) {
        const gw = 3 + Math.random() * 8;
        const gd = 3 + Math.random() * 8;
        const patch = new THREE.Mesh(
            new THREE.BoxGeometry(gw, 0.15, gd),
            i % 3 === 0 ? MATS.grassDark : MATS.grass
        );
        patch.position.set(
            (Math.random() - 0.5) * 60,
            0.08,
            (Math.random() - 0.5) * 70
        );
        patch.receiveShadow = true;
        greeneryGroup.add(patch);
    }
    // Small decorative bushes
    for (let i = 0; i < 20; i++) {
        const bush = new THREE.Mesh(
            new THREE.SphereGeometry(0.5 + Math.random() * 0.8, 6, 6),
            MATS.tree
        );
        bush.position.set(
            (Math.random() - 0.5) * 50,
            0.4,
            (Math.random() - 0.5) * 60
        );
        bush.castShadow = true;
        greeneryGroup.add(bush);
    }
    // Small pond/water feature
    const pond = new THREE.Mesh(
        new THREE.CircleGeometry(4, 16),
        MATS.water
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(22, 0.15, 25);
    greeneryGroup.add(pond);

    // ===========================
    // 5. KAVACH SHIELD (buried)
    // ===========================
    const AssemblyGroup = new THREE.Group();
    AssemblyGroup.position.set(0, -20, 0);
    scene.add(AssemblyGroup);

    const beamL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 10, 1.5), MATS.steel);
    beamL.position.set(-3.5, 5, 0);
    beamL.castShadow = true;
    AssemblyGroup.add(beamL);

    const beamR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 10, 1.5), MATS.steel);
    beamR.position.set(3.5, 5, 0);
    beamR.castShadow = true;
    AssemblyGroup.add(beamR);

    const beamC = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2, 1.5), MATS.steel);
    beamC.position.set(0, 11, 0);
    beamC.castShadow = true;
    AssemblyGroup.add(beamC);

    // ===========================
    // 6. RENDER LOOP
    // ===========================
    let timelineProgress = 0;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const t = Date.now() * 0.001;
        const delta = clock.getDelta();

        // Update all GLTF Animation Mixers
        mixers.forEach(mixer => mixer.update(delta));

        // Crane cable sway (static asset reference if present)
        if (typeof craneGroup !== 'undefined' && craneGroup.children[4]) {
            craneGroup.children[4].rotation.x = Math.sin(t) * 0.03;
            craneGroup.children[5].position.x = 12 + Math.sin(t) * 0.3;
        }

        // Water flow (gentle linear shifting)
        if (typeof river !== 'undefined') {
            river.position.z = Math.sin(t * 0.5) * 2;
        }

        // Camera always looks at center
        camera.lookAt(0, 0, 0);

        // Gentle parallax
        scene.rotation.y = (mouseX / window.innerWidth - 0.5) * 0.04;

        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // ===========================
    // 7. GSAP SCROLL TIMELINE
    // ===========================
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-pin-container",
            start: "top top",
            end: "+=8000",
            scrub: 1.5,
            pin: true,
            onUpdate: self => { timelineProgress = self.progress; }
        }
    });

    const clearColor = { r: 0.831, g: 0.722, b: 0.588 }; // #D4B896
    // Reference to earth material color for green transition
    const earthColor = MATS.earth.color;

    // --- PHASE 1: BARREN LAND (0% – 10%) ---
    tl.to('.massive-hero-text', { opacity: 1, duration: 0.05 }, 0.01);

    // --- PHASE 2: SOCIETY RISES (10% – 30%) ---
    tl.to('.massive-hero-text', { opacity: 0, scale: 0.9, duration: 0.05 }, 0.10);
    tl.to(camera.position, { y: 30, z: 50, duration: 0.12, ease: "power2.inOut" }, 0.10);

    // Society rises from the earth
    tl.to(societyGroup.position, { y: 0, duration: 0.20, ease: "power3.out" }, 0.12);
    // JCB drives in
    tl.to(jcbGroup.position, { x: -5, duration: 0.12, ease: "power2.out" }, 0.18);

    // --- PHASE 3: KAVACH (30% – 45%) ---
    // Grass and bushes rise into view early as construction begins
    tl.to(greeneryGroup.position, { y: 0, duration: 0.12, ease: "power2.out" }, 0.30);
    
    // Shield rises
    tl.to(AssemblyGroup.position, { y: 5, duration: 0.10, ease: "power2.out" }, 0.35);
    tl.to('.kavach-shield-title', { opacity: 1, scale: 1, duration: 0.06 }, 0.42);

    // --- PHASE 4: SERVICE SHOWCASE (45% – 75%) ---
    tl.to('.kavach-shield-title', { opacity: 0, duration: 0.04 }, 0.45);
    tl.to(AssemblyGroup.position, { y: 20, duration: 0.08 }, 0.45);

    // SERVICE 1: HEAVY EQUIPMENT — camera orbits to equipment yard
    tl.to(camera.position, { x: -30, y: 18, z: 20, duration: 0.10, ease: "power1.inOut" }, 0.46);
    tl.to('.phase-4-services', { opacity: 1, duration: 0.01 }, 0.46);
    tl.to('.service-item:nth-child(1)', { x: 0, opacity: 1, duration: 0.06 }, 0.47);

    // SERVICE 2: RIVER SAND — camera pans to sand depot
    tl.to(camera.position, { x: 30, y: 20, z: 15, duration: 0.10, ease: "power1.inOut" }, 0.55);
    tl.to('.service-item:nth-child(1)', { opacity: 0.3, duration: 0.04 }, 0.55);
    tl.to('.service-item:nth-child(2)', { x: 0, opacity: 1, duration: 0.06 }, 0.56);

    // SERVICE 3: DEMOLITION — camera swings to demolition site
    tl.to(camera.position, { x: 0, y: 22, z: -25, duration: 0.10, ease: "power1.inOut" }, 0.63);
    tl.to('.service-item:nth-child(2)', { opacity: 0.3, duration: 0.04 }, 0.63);
    tl.to('.service-item:nth-child(3)', { x: 0, opacity: 1, duration: 0.06 }, 0.64);

    // ZOOM OUT TO FULL CITY AERIAL — reveal the entire built city
    tl.to(camera.position, { x: 0, y: 80, z: 90, duration: 0.12, ease: "power2.inOut" }, 0.72);
    
    // ENTIRE LAND TURNS GREEN
    tl.to(earthColor, { r: 0.35, g: 0.55, b: 0.25, duration: 0.12 }, 0.72);
    tl.to(MATS.rock.color, { r: 0.30, g: 0.50, b: 0.20, duration: 0.12 }, 0.72);
    tl.to(MATS.mound.color, { r: 0.35, g: 0.55, b: 0.25, duration: 0.12 }, 0.72);
    // Sky shifts to cooler blue-green
    tl.to(clearColor, {
        r: 0.45, g: 0.55, b: 0.50,
        duration: 0.12,
        onUpdate: () => renderer.setClearColor(new THREE.Color(clearColor.r, clearColor.g, clearColor.b), 1)
    }, 0.72);
    tl.to('body', { backgroundColor: '#738E80', duration: 0.10 }, 0.72);
    // Fog transitions to blue-green as well to perfectly blend the horizon so there are no black borders
    tl.to(scene.fog.color, { r: 0.45, g: 0.55, b: 0.50, duration: 0.12 }, 0.72);
    
    // All services visible for the aerial shot
    tl.to('.service-item', { opacity: 1, duration: 0.04 }, 0.72);
    // Corporate intel
    tl.to('.corporate-intel', { y: 0, opacity: 0.9, duration: 0.06 }, 0.74);

    // --- PHASE 5: GRAND FINALE OVERLAY (78% – 100%) ---
    // Hide service text but keep the green city as the background
    tl.to('.service-item, .corporate-intel', { opacity: 0, duration: 0.03 }, 0.80);
    tl.to('.phase-4-services', { opacity: 0, duration: 0.01 }, 0.80);

    // Sanskrit laser etch (overlaid onto the full green city)
    tl.to('.sanskrit-engraved', { opacity: 1, duration: 0.01 }, 0.85);
    tl.to(laserLight, { intensity: 15, duration: 0.04 }, 0.85);
    tl.to(laserLight.position, { x: 20, ease: "none", duration: 0.12 }, 0.85);
    tl.to('.sanskrit-engraved', { clipPath: "inset(0 0% 0 0)", ease: "none", duration: 0.12 }, 0.85);
    tl.to(laserLight, { intensity: 0, duration: 0.04 }, 0.95);
    tl.to('.translation-fade', { opacity: 1, duration: 0.08 }, 0.90);
});
