/**
 * US Map Interaction using THREE.js
 * Features: 
 * - Top-down 3D map loaded from GLB
 * - Hover highlighting on desktop
 * - Tap/click selection with zoom-in animation
 * - Tap again to deselect and zoom out
 * - Pan and zoom via MapControls
 */

import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import USA_Map_URL from '../static/BaseUSA.glb';
import gsap from 'gsap';

// Detect mobile platform
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
let colorMode = 'default'; // 'default' | 'region' | 'seek'


let universityData = [];

fetch('/schools.csv')
    .then(response => response.text())
    .then(csvText => {
        const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });

        universityData = result.data;

    })
    .catch(err => {
        console.error("Error loading university data:", err);
    });

//HTML objects (state labels and text)
const label = document.getElementById('state-label');
const labelText = label.querySelector('.label-text');
// const closeBtn = label.querySelector('.label-close');
let labelFadingOut = false;

// Canvas and scene setup
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0xc8cecf);
scene.background = new THREE.Color(0xB5D9F9);

// Lighting
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 25);
scene.add(hemisphereLight);

// Default Materials
const baseColor = 0x1A4D77;
const hoverColor = 0x335b83;
const selectedColor = 0x335b83;

// Camera setup
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};
const defaultCameraPos = new THREE.Vector3(0, 10, 3);
const defaultTarget = new THREE.Vector3(0, 0, 0);

const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 2000);
// camera.position.set(defaultCameraPos);
camera.position.set(0, 10, 3);

// camera.rotation.x = THREE.MathUtils.degToRad(-70);
camera.lookAt(defaultTarget)
scene.add(camera);

// Controls
const controls = new MapControls(camera, canvas);
controls.enableRotate = false;
controls.enablePan = true;
controls.enableZoom = true;
controls.screenSpacePanning = true;
controls.dampingFactor = 0.1;
controls.enableDamping = true;
controls.minDistance = 0;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2;

// Raycasting setup
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-999, 999);
let pointerDownPos = new THREE.Vector2();
const MAX_CLICK_DELTA = 5; // Max movement allowed to count as a click

// Renderer setup
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const colorToggles = {
    region: false,
    seek: false
};

function getColorMode() {
    if (colorToggles.region) return 'region';
    if (colorToggles.seek) return 'seek';
    return 'default';
}
//Regional Colors
const REGION_STYLES = {
    west: {
        base: new THREE.Color(0x1A4D77),
        hover: new THREE.Color(0x2F6B9A),      // lighter
        selected: new THREE.Color(0x123554)   // darker
    },
    north: {
        base: new THREE.Color(0x1A5E5A),
        hover: new THREE.Color(0x2F7F7A),
        selected: new THREE.Color(0x124541)
    },
    south: {
        base: new THREE.Color(0x3A4D7A),
        hover: new THREE.Color(0x5568A3),
        selected: new THREE.Color(0x2A3557)
    },
    east: {
        base: new THREE.Color(0x2A3F66),
        hover: new THREE.Color(0x3F5A8C),
        selected: new THREE.Color(0x1D2C47)
    }
};

//SEEK Colors
const SEEK_STYLES = {
    columbus: {
        base: new THREE.Color(0x9C5102),
        hover: new THREE.Color(0xA87A0F),
        selected: new THREE.Color('#80480d')
    },
    sanAntonio: {
        base: new THREE.Color('#10140F'),
        hover: new THREE.Color(0x252320),
        selected: new THREE.Color('#221B12') 
    },
    split: {
        base: new THREE.Color(0x1f77b4),
        hover: new THREE.Color(0x4fa3d1),
        selected: new THREE.Color(0x82cfff)
    }
};

const STATE_TO_REGION = {
    // WEST
    Washington: 'west',
    Oregon: 'west',
    California: 'west',
    Nevada: 'west',
    Idaho: 'west',
    Montana: 'west',
    Wyoming: 'west',
    Utah: 'west',
    Colorado: 'west',
    Arizona: 'west',
    New_Mexico: 'west',
    // Alaska: 'west',
    // Hawaii: 'west',

    // SOUTH
    Texas: 'south',
    Oklahoma: 'south',
    Arkansas: 'south',
    Louisiana: 'south',
    Mississippi: 'south',
    Alabama: 'south',
    Georgia: 'south',
    Florida: 'south',
    South_Carolina: 'south',
    North_Carolina: 'east',
    Tennessee: 'south',
    Kentucky: 'south',
    Virginia: 'east',
    West_Virginia: 'east',

    // NORTH
    North_Dakota: 'north',
    South_Dakota: 'north',
    Nebraska: 'west',
    Kansas: 'west',
    Minnesota: 'north',
    Iowa: 'north',
    Missouri: 'north',
    Wisconsin: 'north',
    Illinois: 'north',
    Michigan: 'north',
    Indiana: 'north',
    Ohio: 'north',

    // EAST
    Maine: 'east',
    New_Hampshire: 'east',
    Vermont: 'east',
    Massachusetts: 'east',
    Rhode_Island: 'east',
    Connecticut: 'east',
    New_York: 'east',
    New_Jersey: 'east',
    Pennsylvania: 'east',
    Delaware: 'east',
    Maryland: 'east',
    // District_of_Columbia: 'east'
};

const STATE_TO_SEEK = {
    // WEST
    Washington: 'sanAntonio',
    Oregon: 'sanAntonio',
    California: 'sanAntonio',
    Nevada: 'sanAntonio',
    Idaho: 'sanAntonio',
    Montana: 'sanAntonio',
    Wyoming: 'sanAntonio',
    Utah: 'sanAntonio',
    Colorado: 'sanAntonio',
    Arizona: 'sanAntonio',
    New_Mexico: 'sanAntonio',
    // Alaska: 'sanAntonio',
    // Hawaii: 'sanAntonio',

    // SOUTH
    Texas: 'sanAntonio',
    Oklahoma: 'sanAntonio',
    Arkansas: 'sanAntonio',
    Louisiana: 'sanAntonio',
    Mississippi: 'sanAntonio',
    Alabama: 'sanAntonio',
    Georgia: 'columbus',
    Florida: 'columbus',
    South_Carolina: 'columbus',
    North_Carolina: 'columbus',
    Tennessee: 'columbus',
    Kentucky: 'columbus',
    Virginia: 'columbus',
    West_Virginia: 'columbus',

    // NORTH
    North_Dakota: 'sanAntonio',
    South_Dakota: 'sanAntonio',
    Nebraska: 'sanAntonio',
    Kansas: 'sanAntonio',
    Minnesota: 'columbus',
    Iowa: 'columbus',
    Missouri: 'columbus',
    Wisconsin: 'columbus',
    Illinois: 'columbus',
    Michigan: 'columbus',
    Indiana: 'columbus',
    Ohio: 'columbus',

    // EAST
    Maine: 'columbus',
    New_Hampshire: 'columbus',
    Vermont: 'columbus',
    Massachusetts: 'columbus',
    Rhode_Island: 'columbus',
    Connecticut: 'columbus',
    New_York: 'columbus',
    New_Jersey: 'columbus',
    Pennsylvania: 'columbus',
    Delaware: 'columbus',
    Maryland: 'columbus',
    // District_of_Columbia: 'east'
};

// Track current interaction state
let hoveredState = null;
let selectedState = null;

// List of selectable meshes
const selectableStates = [];

// Load the GLB map and extract state meshes
const loader = new GLTFLoader();
loader.load(USA_Map_URL, (gltf) => {
    const map = gltf.scene;
    map.traverse((child) => {
        if (child.isMesh) {
            child.material = child.material.clone();
            selectableStates.push(child);

            const region = STATE_TO_REGION[child.name];
            const seek = STATE_TO_SEEK[child.name];

            child.userData.region = region;
            child.userData.seek = seek;
            child.userData.colors = {
                base: new THREE.Color(baseColor),
                hover: new THREE.Color(hoverColor),
                selected: new THREE.Color(selectedColor)
            };

            child.material.color.copy(child.userData.colors.base);

            // child.material.color.set(baseColor);
            // child.userData.baseColor = new THREE.Color(baseColor);
            // // child.userData.originalColor = child.material.color.clone(); //delete
        }
    });
    scene.add(map);
}, undefined, (error) => console.error(error));

// Responsive resizing
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

     if (window.innerWidth > 768) {
        setMobileMenu(false);    }
});

// Animation loop
// const clock = new THREE.Clock();
function tick() {
    controls.update();
    renderer.render(scene, camera);
    raycastRender();

    if (selectedState && !labelFadingOut) {
        updateLabelPosition(selectedState);
    }

    requestAnimationFrame(tick);
}

tick();

// Event listeners
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerdown', (event) => {
    pointerDownPos.set(event.clientX, event.clientY);
});
canvas.addEventListener('pointerup', (event) => {
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    if (dx * dx + dy * dy < MAX_CLICK_DELTA * MAX_CLICK_DELTA) {
        handleTapOnState(event);
    }
});

function onPointerMove(event) {
    if (!isMobile) {
        updatePointerFromEvent(event);
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(selectableStates, true);
        calculateStateHover(intersects);
    }
}

function raycastRender() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(selectableStates, true);
    calculateStateHover(intersects);
}

// Hover behavior
function calculateStateHover(intersects) {
    //No hover on mobile, and no hovers if state already picked
    if (isMobile || selectedState) return;

    if (intersects.length > 0) {
        const state = intersects[0].object;
        if (hoveredState && hoveredState !== state) {
            //Switching States, reset previous hover
            resetStateAppearance(hoveredState);
        }
        if (hoveredState && hoveredState !== state) {
            setStateColor(hoveredState, 'base');
            hoveredState.position.y = 0;
        }

        if(!hoveredState || hoveredState !== state){
            hoveredState = state;
            setStateColor(hoveredState, 'hover');
            hoveredState.position.y = 0.2;
        }

       
    } 
    else {
        if (hoveredState) {
            resetStateAppearance(hoveredState);
            hoveredState = null;
        }
    }
}

function resetStateAppearance(state) {
    setStateColor(state, 'base');
    state.position.y = 0;
}

function deselectState() {
    if (selectedState) {
        resetStateAppearance(selectedState);
        selectedState = null;
        document.getElementById('state-label').style.display = 'none';

        hideUniversityList()
    }
}

// Tap/click to select state or zoom out
function handleTapOnState(event) {
    updatePointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(selectableStates, true);

    const clickedState = intersects.find(obj => obj.object.isMesh)?.object || null;

    //For example, clicked outside map
    if (!clickedState) {
        deselectState();
        return;
    }

    //Clicked on state already selected
    if (selectedState && clickedState === selectedState) {
        deselectState();
        flyToDefaultView();
        return;
    }

    //Switching states, fix old state
    if (selectedState) {
        labelFadingOut = true;
        resetStateAppearance(selectedState);
    }

    selectedState = clickedState;

    setStateColor(selectedState, 'selected');
    applyUniversityPanelColor(selectedState);

    selectedState.position.y = 0.2;

    flyToState(selectedState);

    const readableName = selectedState.name.replace(/_/g, ' ');
    // const infoArray = universityData
    //     .filter(row => row.State.trim().toLowerCase() === readableName.toLowerCase())
    //     .map(row => { row.University, row.URL });

    const filteredUniversities = universityData
        .filter(row => row.State.trim().toLowerCase() === readableName.toLowerCase())
        .map(row => ({
            university: row.University.trim(),
            url: row.URL?.trim() || '#'
        }));
    showUniversityList(filteredUniversities);
}

function setLabelTextForState(stateMesh) {
    if (!stateMesh || !label) return;

    if (!labelFadingOut) {
        let stateName = stateMesh.name || stateMesh.userData.name || 'Unknown State';
        stateName = stateName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        labelText.textContent = stateName;
    }

    // Make it visible and transparent initially
    label.style.display = 'block';
    label.style.opacity = '0';

}

function showLabelForState(stateMesh) {
    if (!stateMesh || !label) return;

    // Set label text
    labelFadingOut = false;
    setLabelTextForState(stateMesh)

    applyLabelColor(stateMesh);

    // Update position immediately before fade-in
    updateLabelPosition(stateMesh);

    // Fade in
    gsap.to(label.style, {
        duration: 0.5,
        opacity: 1,
        ease: 'power2.out'
    });

    // Attach close handler
    // closeBtn.onclick = () => {
    //     hideLabel();
    //     flyToDefaultView();
    //     deselectState();
    // };
}

function updateLabelPosition(stateMesh) {
    if (!stateMesh || !label) return;

    // Get the center of the mesh in world space
    const box = new THREE.Box3().setFromObject(stateMesh);
    // const center = new THREE.Vector3();
    // box.getCenter(center);


    // Use the horizontal center (x and z) but max for y to put label above the state
    const labelPos = new THREE.Vector3(
        (box.min.x + box.max.x) / 2,
        0.2 + (box.max.z - box.min.z) / 8,
        box.min.z
    );

    // Project the position to screen space
    const projected = labelPos.clone();
    projected.project(camera);


    // const x = (projected.x + 1) / 2 * sizes.width;
    // const y = (-projected.z + 1) / 2 * sizes.height;
    const x = (projected.x * 0.5 + 0.5) * sizes.width;
    const y = (-projected.y * 0.5 + 0.5) * sizes.height;


    label.style.left = `${x - label.offsetWidth / 2}px`;
    label.style.top = `${y}px`;
}

function applyLabelColor(state) {
    const color = getStateUIColor(state).clone().convertLinearToSRGB();

    label.style.background = `rgb(
        ${Math.round(color.r * 255)},
        ${Math.round(color.g * 255)},
        ${Math.round(color.b * 255)}
    )`;
//gradient
    label.style.color = 'white';
}

function applyUniversityPanelColor(state) {
    const panel = document.getElementById('university-list');
    const color = getStateUIColor(state).clone().convertLinearToSRGB();;

    panel.style.background = `rgb(
        ${Math.round(color.r * 255)},
        ${Math.round(color.g * 255)},
        ${Math.round(color.b * 255)}
    )`;
}

function getStateUIColor(state) {
    if (colorMode === 'region') {
        return REGION_STYLES[state.userData.region].base;
    } 
    else if (colorMode === 'seek') {
        return SEEK_STYLES[state.userData.seek].base;
    } else {
        return new THREE.Color(0x0b3b61);
    } 
}

function flyToDefaultView() {
    gsap.to(camera.position, {
        duration: 1.2,
        x: defaultCameraPos.x,
        y: defaultCameraPos.y,
        z: defaultCameraPos.z,
        ease: 'power2.inOut',
        onUpdate: () => {
            controls.update()
            camera.lookAt(controls.target);
        }
    });

    gsap.to(controls.target, {
        duration: 1.2,
        x: defaultTarget.x,
        y: defaultTarget.y,
        z: defaultTarget.z,
        ease: 'power2.inOut'
    });
}

function flyToState(stateMesh) {
    // Get bounding box of the state mesh
    const box = new THREE.Box3().setFromObject(stateMesh);
    const boxCenter = new THREE.Vector3();
    box.getCenter(boxCenter);
    const boxSize = new THREE.Vector3();
    box.getSize(boxSize);

    // Camera parameters
    const fov = THREE.MathUtils.degToRad(camera.fov); // vertical FOV in radians
    const aspect = sizes.width / sizes.height;
    const isMobile = window.innerWidth / window.innerHeight < 1;

    // Calculate horizontal FOV
    // const horizontalFOV = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    const heightFOV = 2 * Math.tan(fov / 2);

    // Calculate distance needed to fit the box height and width in view
    let distanceForHeight = boxSize.z / heightFOV;
    let distanceForWidth = boxSize.x / (heightFOV * aspect);

    if (isMobile) {
        distanceForHeight *= 1.5;
    }
    else {
        distanceForWidth *= 1.5;
    }

    // Choose the larger distance to fit entire box
    const requiredDistance = Math.max(distanceForHeight, distanceForWidth);

    // Add some padding to zoom out a little extra
    const paddingFactor = 1.3;
    const zoomHeight = requiredDistance * paddingFactor;

    // Position the camera offset from the state center
    const offset = new THREE.Vector3(0, zoomHeight, zoomHeight * 0.3);

    // --- Determine screen-based framing offset ---
    const offsetAmount = isMobile ? 0.2 * zoomHeight : zoomHeight * 0.4;
    const screenOffset = isMobile
        ? new THREE.Vector3(0, 0, offsetAmount) // use z value not y (up on screen)
        : new THREE.Vector3(offsetAmount, 0, 0); // left on screen

    // Apply offset to both camera position and controls target
    const newTarget = boxCenter.clone().add(screenOffset);
    const newPos = boxCenter.clone().add(screenOffset).add(offset);
    // Animate camera position and controls target together
    const timeline = gsap.timeline();
    setLabelTextForState(stateMesh)
    showLabelForState(stateMesh);

    timeline.to(camera.position, {
        duration: 1.2,
        x: newPos.x,
        y: newPos.y,
        z: newPos.z,
        ease: 'power2.inOut',
        onUpdate: () => {
            controls.update()
            camera.lookAt(controls.target);
        }
    }, 0);

    timeline.to(controls.target, {
        duration: 1.2,
        x: newTarget.x,
        y: newTarget.y,
        z: newTarget.z,
        ease: 'power2.inOut'
    }, 0);

    timeline.call(() => {
        // showLabelForState(stateMesh);
    });
}


function showUniversityList(universities) {
    const panel = document.getElementById('university-list');
    panel.innerHTML = ''; // Clear previous list

    universities.forEach(({ university, url }) => {
        const card = document.createElement('div');
        card.className = 'university-item';
        // card.textContent = university;
        const link = document.createElement('a');
        link.href = url || '#';
        link.target = '_blank'; // open in new tab
        link.rel = 'noopener noreferrer';
        link.textContent = university;

        // Style link to inherit card styles and remove default underline
        link.style.color = 'inherit';
        link.style.textDecoration = 'none';
        link.style.display = 'block';
        link.style.width = '100%';

        card.appendChild(link);
        panel.appendChild(card);
    });

    panel.classList.add('visible');
}

function hideUniversityList() {
    const panel = document.getElementById('university-list');
    panel.classList.remove('visible');
}

//Color Functions
function setStateColor(state, type) {
    if (!state) return;

    if (colorMode === 'region') {
        if (type === 'base') {
            tweenMaterial(state.material, REGION_STYLES[state.userData.region].base);
        } else if (type === 'hover') {
            tweenMaterial(state.material, REGION_STYLES[state.userData.region].hover);
        } else if (type === 'selected') {
            tweenMaterial(state.material, REGION_STYLES[state.userData.region].selected);
        }
    }
    else if (colorMode === 'seek') {
        if (type === 'base') {
            tweenMaterial(state.material, SEEK_STYLES[state.userData.seek].base);
        } else if (type === 'hover') {
            tweenMaterial(state.material, SEEK_STYLES[state.userData.seek].hover);
        } else if (type === 'selected') {
            tweenMaterial(state.material, SEEK_STYLES[state.userData.seek].selected);
        }
    }
    else {
        // default
        if (type === 'base') {
            tweenMaterial(state.material, state.userData.colors.base);
        } else if (type === 'hover') {
            tweenMaterial(state.material, state.userData.colors.hover);
        } else if (type === 'selected') {
            tweenMaterial(state.material, state.userData.colors.selected);
        }
    }
}

function tweenMaterial(material, targetColor) {

    gsap.to(material.color, {
        r: targetColor.r,
        g: targetColor.g,
        b: targetColor.b,
        duration: 0.3
    });
}

const modeButtons = document.querySelectorAll('.mode-btn');

modeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const mode = button.dataset.mode;

        // toggle clicked mode
        colorToggles[mode] = !colorToggles[mode];

        // enforce mutual exclusivity
        if (colorToggles[mode]) {
            Object.keys(colorToggles).forEach(key => {
                if (key !== mode) colorToggles[key] = false;
            });
        }

        updateColorModeUI();
        applyColorMode();

        setMobileMenu(false);
    });
});

function updateColorModeUI() {
    modeButtons.forEach(button => {
        const mode = button.dataset.mode;
        button.classList.toggle('active', colorToggles[mode]);
    });
}

function applyColorMode() {
    colorMode = getColorMode();

    selectableStates.forEach(state => {
        setStateColor(state, 'base');
        state.position.y = 0;
    });

    if (selectedState) {
        setStateColor(selectedState, 'selected');
        selectedState.position.y = 0.2;
    } else if (hoveredState) {
        setStateColor(hoveredState, 'hover');
        hoveredState.position.y = 0.2;
    }
}

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');

if (isMobile) {
    document.getElementById('controls').style.display = 'none';
}

hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('active');
    setMobileMenu(!isOpen);
});

function setMobileMenu(open) {
    mobileMenu.classList.toggle('active', open);
    hamburger.classList.toggle('open', open);
}

// Pointer utilities
function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

