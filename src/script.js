import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import USA_Map_URL from '../static/BaseUSA.glb'
import GUI from 'lil-gui'

/**
 * Base
 */
// Debug
// const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color().setHex("0xc8cecf");

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const matcapTexture = textureLoader.load('textures/matcaps/8.png')
matcapTexture.colorSpace = THREE.SRGBColorSpace

const material = new THREE.MeshStandardMaterial()
material.roughness = 0.4

// const plane = new THREE.Mesh(
//     new THREE.SphereGeometry(30, 64, 32),
//     material
// )
// // plane.rotation.x = - Math.PI * 0.5
// plane.position.y = - 30
// scene.add(plane)

/**
 * Fonts
 */
const fontLoader = new FontLoader()

//Load "SEEK 2025" and //donuts
fontLoader.load(
    '/fonts/helvetiker_regular.typeface.json',
    (font) => {
        // Material
        const material = new THREE.MeshMatcapMaterial({ matcap: matcapTexture })

        // Text
        // const textGeometry = new TextGeometry(
        //     'SEEK 2025',
        //     {
        //         font: font,
        //         size: 0.5,
        //         depth: 0.2,
        //         curveSegments: 12,
        //         bevelEnabled: true,
        //         bevelThickness: 0.03,
        //         bevelSize: 0.02,
        //         bevelOffset: 0,
        //         bevelSegments: 5
        //     }
        // )
        // textGeometry.center()
        // 
        // const text = new THREE.Mesh(textGeometry, material)
        // text.position.z += -3;
        // text.position.y += 1;
        // text.rotateX(-Math.PI / 4)
        // scene.add(text)
    }
)

//Load USA Map
const loader = new GLTFLoader();
loader.load(USA_Map_URL, function (gltf) {

    scene.add(gltf.scene);

}, undefined, function (error) {

    console.error(error);

});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-999, 999); //stop autoselecting kansas when starting

let hoveredState = null;
let hoveredStateId = -1; // faster comparison (don't really know if faster but I assume it would be)

const normalMaterial = new THREE.MeshStandardMaterial();
const hoverMaterial = new THREE.MeshStandardMaterial();

function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - ((event.clientY - 60) / (window.innerHeight - 60)) * 2 + 1;

    // console.log(event.clientY)
}

function raycastRender() {

    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);

    let stateBeingHovered = false;
    for (let i = 0; i < intersects.length; i++) {

        if (hoveredState == null || hoveredStateId !== intersects[i].object.id) {
            if (hoveredState != null) {
                hoveredState.position.add(new THREE.Vector3(0, -0.1, 0));
                hoveredState.material = normalMaterial
            }
            else {
                //first state to be hovered
                // console.log(intersects[i].object.name)
                normalMaterial.copy(intersects[i].object.material);
                hoverMaterial.copy(intersects[i].object.material);
                hoverMaterial.color.set(0xcfe0fa)
            }
            // console.log(hoveredStateId + "  " + intersects[i].object.material.color.getHex()); //.material.color.set(0xff0000);
            hoveredState = intersects[i].object;
            // console.log(hoveredState.position)

            hoveredState.position.add(new THREE.Vector3(0, 0.1, 0));
            intersects[i].object.material = hoverMaterial

            // hoveredState.material.color.set(0x000000)

            // console.log(hoveredState.position)

            hoveredStateId = intersects[i].object.id;
            stateBeingHovered = true;
            // console.log("New Hover on " + intersects[i].object.name); //.material.color.set(0xff0000);
            return;
        }
        if (hoveredStateId == intersects[i].object.id) {
            stateBeingHovered = true;
            return;
        }

        // console.log(intersects[i].object.id); //.material.color.set(0xff0000);
    }
    if (!stateBeingHovered) {
        if (hoveredState != null) {
            hoveredState.position.add(new THREE.Vector3(0, -0.1, 0));
            hoveredState.material = normalMaterial
            hoveredState = null;
        }
        hoveredStateId = -1;
        // console.log("No hover"); //.material.color.set(0xff0000);
    }

    renderer.render(scene, camera);

}

window.addEventListener('pointermove', onPointerMove);

// Hemisphere light
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x000000, 4)
// const hemisphereLight = new THREE.HemisphereLight(0xbfd8ff, 0x000000, 4)
scene.add(hemisphereLight)

// Point light
// const pointLight = new THREE.PointLight(0xff9000, 1.5, 0, 2)
// pointLight.position.set(1, - 0.5, 1)
// scene.add(pointLight)

// React area light
// const rectAreaLight = new THREE.RectAreaLight(0x4e00ff, 6, 1, 1)
// rectAreaLight.position.set(- 1.5, 0, 1.5)
// rectAreaLight.lookAt(new THREE.Vector3())
// scene.add(rectAreaLight)

// Spot light
// const spotLight = new THREE.SpotLight(0xffffff, 6, 45, Math.PI * 0.01, 1, 1)
// spotLight.position.set(-2.5, 12, 0)
// spotLight.target.position.x = -2.5
// spotLight.target.position.z = -0.8
// scene.add(spotLight)
// scene.add(spotLight.target)

// Helpers
// const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 0.2)
// scene.add(hemisphereLightHelper)

// const directionalLightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.2)
// scene.add(directionalLightHelper)

// const pointLightHelper = new THREE.PointLightHelper(pointLight, 0.2)
// scene.add(pointLightHelper)

// const spotLightHelper = new THREE.SpotLightHelper(spotLight)
// scene.add(spotLightHelper)

// const rectAreaLightHelper = new RectAreaLightHelper(rectAreaLight)
// scene.add(rectAreaLightHelper)

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
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 8
camera.position.z = 4
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

controls.maxPolarAngle = Math.PI / 2 - Math.PI / 32
controls.minPolarAngle = 0
// controls.maxAzimuthAngle = Math.PI
// controls.minAzimuthAngle = -1* Math.PI

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)
    raycastRender()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()