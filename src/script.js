/**
 * Import Statements
 */
import * as THREE from 'three'
import { PanZoomControls } from './PanZoomControls';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import USA_Map_URL from '../static/BaseUSA.glb'
import gsap from 'gsap'

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color().setHex("0xc8cecf");

/**
 * Load USA Map 
 */
const loader = new GLTFLoader();
loader.load(USA_Map_URL, function (gltf) {

    scene.add(gltf.scene);

}, undefined, function (error) {

    console.error(error);
});

const material = new THREE.MeshStandardMaterial()
material.roughness = 0.4
const normalMaterial = new THREE.MeshStandardMaterial();
const hoverMaterial = new THREE.MeshStandardMaterial();


// Hemisphere light
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 4)
scene.add(hemisphereLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: (window.innerHeight - 60)
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 2000)

camera.position.set(0, 10, 3);
// camera.lookAt(0, 0, 0);
camera.rotation.x = THREE.MathUtils.degToRad(-70); // Tilt by 10 degrees


scene.add(camera)

// Controls
const controls = new PanZoomControls(camera, canvas)

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-999, 999); //stop autoselecting kansas when starting

let selectionSituation = 0; // 0 is null, 1 is hovering, 2 is selected
let relevantState = null;
let relevantStateId = null;

function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - ((event.clientY - 60) / (window.innerHeight - 60)) * 2 + 1;

    // console.log(event.clientY)
}

function onPointerDown(event) {
    if (selectionSituation == 0) {
        return; // Cannot select unhovered State (? maybe unnecessary on phone)
    }

    //Code below should only really execute in selectionSituation == 1 (so maybe add blocking code for selectionSituation == 2)

    let gotoCameraPosition = new THREE.Vector3();
    let validState = false;

    validState = true;
    flyToState(relevantState)

    switch (relevantStateId) {
        case 31:
            //Ohio
            console.log("Ohio clicked " + camera)


    }

    if (!validState) return;

    // gsap.to(camera.position, {
    //     duration: 1,
    //     x: gotoCameraPosition.x,
    //     y: gotoCameraPosition.y,
    //     z: gotoCameraPosition.z,
    //     onUpdate: function () {

    //         controls.update();

    //     },
    //     onComplete: function () {

    //         // controls.enabled = true;
    //         // controls.target = unitedStatesTarget
    //     }
    // });
}

function calculateStateHover(intersects) {
    if (selectionSituation == 2)
        return; //If a state is already selected, we aren't hovering


    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.id == relevantStateId) {
            //Same State selected
            return;
        }

        if (selectionSituation == 0) {
            //Definitely a more efficient way to do this
            normalMaterial.copy(intersects[i].object.material);
            hoverMaterial.copy(intersects[i].object.material);
            hoverMaterial.color.set(0xcfe0fa)
        }
        if (selectionSituation == 1) {
            //Unselect previous relevantState
            relevantState.position.add(new THREE.Vector3(0, -0.1, 0));
            relevantState.material = normalMaterial
        }

        relevantState = intersects[i].object;
        relevantState.position.add(new THREE.Vector3(0, 0.1, 0));
        relevantState.material = hoverMaterial
        relevantStateId = intersects[i].object.id;
        // isAStateBeingHovered = true;
        selectionSituation = 1;
        return;
    }

    if (selectionSituation == 1) {
        //Unselect previous relevantState
        relevantState.position.add(new THREE.Vector3(0, -0.1, 0));
        relevantState.material = normalMaterial
        relevantState = null;
    }

    selectionSituation = 0;
    relevantStateId = -1

    return;

}

function flyToState(stateMesh) {
    const targetPos = stateMesh.position.clone();
    const zoomHeight = getZoomHeight();

    // Animate camera to hover above the state's position
    gsap.to(camera.position, {
        x: targetPos.x,
        y: zoomHeight,
        z: targetPos.z + zoomHeight * 0.3,
        duration: 1.5,
        ease: "power2.inOut"
    });
}


function getZoomHeight() {
    const minZoom = 2;
    const maxZoom = 5;
    const minWidth = 400;
    const maxWidth = 1400;

    // Clamp width within the range
    const width = Math.min(Math.max(sizes.width, minWidth), maxWidth);

    // Normalize screen width (0 = wide desktop, 1 = small mobile)
    const t = (maxWidth - width) / (maxWidth - minWidth);

    // Interpolate between minZoom and maxZoom
    return minZoom + t * (maxZoom - minZoom);
}




function raycastRender() {
    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);

    calculateStateHover(intersects);
    renderer.render(scene, camera);
}



window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerdown', onPointerDown);


/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // if (selectionSituation < 2) {
    // Update controls
    // console.log("updateControls")
    controls.update()
    // }
    // Render
    renderer.render(scene, camera)
    raycastRender()
    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()


// Old Algorithms

function onPointerDownX(event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components


    // if (selectionSituation == 0) {
    //     return; // Cannot select unhovered State (? maybe unnecessary on phone)
    // }
    if (selectionSituation == 2) {
        selectionSituation = 0;
        console.log(" pos " + camera.position.x + " " + camera.position.y + " " + camera.position.z)

        return; // Toggle
    }

    //Unselect previous relevantState
    relevantState.position.add(new THREE.Vector3(0, -0.1, 0));
    relevantState.material = normalMaterial
    selectionSituation = 2;


    // controls.enabled = false;
    // camera.rotation.set(-Math.PI / 2, 0, 0);
    // let gotoCameraPosition = new THREE.Vector3();
    // let validState = false;

    // switch (relevantStateId) {
    //     case 31:
    //         //Ohio
    //         validState = true;
    //         gotoCameraPosition.set(2.414840103769524, 0.7005265324972118, -0.36776443756869115);
    //     // camera.rotation.set(-Math.PI / 2, 0, 0);
    //     // camera.lookAt(hoveredState.position)
    // }

    // if (!validState) return;

    // controls.enabled = false;
    // controls.target = relevantState.position
    // gsap.to(camera.position, {
    //     duration: 1,
    //     x: gotoCameraPosition.x,
    //     y: gotoCameraPosition.y,
    //     z: gotoCameraPosition.z,
    //     onUpdate: function () {

    //         controls.update();

    //     },
    //     onComplete: function () {

    //         controls.enabled = true;

    //     }
    // });

}