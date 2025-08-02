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

// Canvas and scene setup
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8cecf);

// Lighting
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 4);
scene.add(hemisphereLight);

// Materials
const normalMaterials = new Map();
const hoverColor = 0xcfe0fa;
const selectedColor = 0x99bbee;

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
    });
    scene.add(map);
}, undefined, (error) => console.error(error));

// Camera setup
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
};
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 2000);
camera.position.set(0, 10, 3);
camera.rotation.x = THREE.MathUtils.degToRad(-70);
scene.add(camera);
const defaultCameraPos = new THREE.Vector3(0, 10, 3);
const defaultTarget = new THREE.Vector3(0, 0, 0);

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
}

function flyToDefaultView() {
    gsap.to(camera.position, {
        duration: 1.2,
        x: defaultCameraPos.x,
        y: defaultCameraPos.y,
        z: defaultCameraPos.z,
        ease: 'power2.inOut',
        onUpdate: () => controls.update()
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

    // Calculate horizontal FOV
    const horizontalFOV = 2 * Math.atan(Math.tan(fov / 2) * aspect);

    // Calculate distance needed to fit the box height and width in view
    const distanceForHeight = boxSize.y / (2 * Math.tan(fov / 2));
    const distanceForWidth = boxSize.x / (2 * Math.tan(horizontalFOV / 2));

    // Choose the larger distance to fit entire box
    const requiredDistance = Math.max(distanceForHeight, distanceForWidth);

    // Add some padding to zoom out a little extra
    const paddingFactor = 1.3;
    const zoomHeight = requiredDistance * paddingFactor;

    // Position the camera above the box center with some offset
    const offset = new THREE.Vector3(0, zoomHeight, zoomHeight * 0.3);
    const newPos = boxCenter.clone().add(offset);

    // Animate camera position and controls target together
    const timeline = gsap.timeline();

    timeline.to(camera.position, {
        duration: 1.2,
        x: newPos.x,
        y: newPos.y,
        z: newPos.z,
        ease: 'power2.inOut',
        onUpdate: () => controls.update()
    }, 0);

    timeline.to(controls.target, {
        duration: 1.2,
        x: boxCenter.x,
        y: boxCenter.y,
        z: boxCenter.z,
        ease: 'power2.inOut'
    }, 0);
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
const clock = new THREE.Clock();
function tick() {
    controls.update();
    renderer.render(scene, camera);
    raycastRender();
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
