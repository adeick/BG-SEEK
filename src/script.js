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


// Canvas and scene setup
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
// scene.background = new THREE.Color(0xc8cecf);
scene.background = new THREE.Color(0xB5D9F9);

// Lighting
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 25);
scene.add(hemisphereLight);

// Materials
const normalMaterials = new Map();
const baseColor = 0x1A4D77;
const hoverColor = 0x335b83;
const selectedColor = 0x335b83;

//Label HTML
const label = document.getElementById('state-label');
const labelText = label.querySelector('.label-text');
// const closeBtn = label.querySelector('.label-close');
let labelFadingOut = false;


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
            selectableStates.push(child);
        }
        if (child.isMesh && child.material?.color) {
            child.material.color.set(baseColor);
            child.userData.originalColor = child.material.color.clone();
        }
    });
    scene.add(map);
}, undefined, (error) => console.error(error));

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

// Responsive resizing
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Pointer utilities
function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// Hover behavior
function calculateStateHover(intersects) {
    if (isMobile || selectedState) return;

    if (intersects.length > 0) {
        const state = intersects[0].object;
        if (hoveredState && hoveredState !== state) {
            resetStateAppearance(hoveredState);
        }
        if (!normalMaterials.has(state.id)) {
            normalMaterials.set(state.id, state.material.clone());
        }
        hoveredState = state;
        hoveredState.material = hoveredState.material.clone();
        hoveredState.material.color.set(hoverColor);
        hoveredState.position.y = 0.2;
    } else {
        if (hoveredState) {
            resetStateAppearance(hoveredState);
            hoveredState = null;
        }
    }
}

function resetStateAppearance(state) {
    const originalMat = normalMaterials.get(state.id);
    if (originalMat) {
        state.material = originalMat.clone();
    }
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

    if (!clickedState) {
        deselectState();
        return;
    }

    if (selectedState && clickedState === selectedState) {
        deselectState();
        flyToDefaultView();
        return;
    }

    if (selectedState) {
        labelFadingOut = true;
        resetStateAppearance(selectedState);
    }

    selectedState = clickedState;

    if (!normalMaterials.has(selectedState.id)) {
        normalMaterials.set(selectedState.id, selectedState.material.clone());
    }

    selectedState.material = selectedState.material.clone();
    selectedState.material.color.set(selectedColor);
    selectedState.position.y = 0.2;

    flyToState(selectedState);

    const readableName = selectedState.name.replace(/_/g, ' ');
    const infoArray = universityData
        .filter(row => row.State.trim().toLowerCase() === readableName.toLowerCase())
        .map(row => row.University);
    showUniversityList(readableName, infoArray);
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

    // Optional: Offset slightly upward in screen space
    // const offsetY = -30; // pixels upward
    // label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y + offsetY}px)`;
}

function hideLabel() {
    labelFadingOut = true;
    gsap.to(label.style, {
        duration: 0.4,
        opacity: 0,
        ease: 'power2.in',
        onComplete: () => {
            label.style.display = 'none';
        }
    });
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


function getZoomHeight() {
    const minZoom = 2;
    const maxZoom = 5;
    const minWidth = 400;
    const maxWidth = 1400;
    const width = Math.min(Math.max(sizes.width, minWidth), maxWidth);
    const t = (maxWidth - width) / (maxWidth - minWidth);
    return minZoom + t * (maxZoom - minZoom);
}

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

function raycastRender() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(selectableStates, true);
    calculateStateHover(intersects);
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

function showUniversityList(stateName, infoArray) {
    const listContainer = document.getElementById('university-list'); // your container element
    listContainer.innerHTML = ''; // clear previous items

    infoArray.forEach(university => {
        // Create a div with the 'university-item' class
        const item = document.createElement('div');
        item.className = 'university-item';
        item.textContent = university; // or use university.name if objects

        listContainer.appendChild(item);
    });

    // Make sure the container is visible (you might already have this logic)
    listContainer.classList.add('visible');
}



function hideUniversityList() {
    console.log('hide universitylist')
    const panel = document.getElementById('university-list');
    panel.classList.remove('visible');
}

// Event listener for close button
document.querySelector('.close-info-button').addEventListener('click', hideUniversityList);



