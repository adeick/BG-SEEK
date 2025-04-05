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

        // Donuts
        // const donutGeometry = new THREE.TorusGeometry(0.3, 0.2, 32, 64)

        // for (let i = 0; i < 100; i++) {
        //     const donut = new THREE.Mesh(donutGeometry, material)
        //     donut.position.x = (Math.random() - 0.5) * 10
        //     donut.position.y = (Math.random() - 0.5) * 10
        //     donut.position.z = (Math.random() - 0.5) * 10
        //     donut.rotation.x = Math.random() * Math.PI
        //     donut.rotation.y = Math.random() * Math.PI
        //     const scale = Math.random()
        //     donut.scale.set(scale, scale, scale)

        //     scene.add(donut)
        // }
    }
)

//Load USA Map
const loader = new GLTFLoader();
loader.load(USA_Map_URL, function (gltf) {

    // const light = new THREE.AmbientLight();
    // scene.add(light)
    scene.add(gltf.scene);

}, undefined, function (error) {

    console.error(error);

});

// scene.environmentIntensity = 2
// scene.backgroundIntensity = 2
// scene.backgroundBlurriness = 0.1

//Lights
// Directional light
// const directionalLight = new THREE.DirectionalLight(0x00fffc, 0.9)
// directionalLight.position.set(1, 0.25, 0)
// scene.add(directionalLight)

// Hemisphere light
const hemisphereLight = new THREE.HemisphereLight(0xbfd8ff, 0x000000, 4)
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

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()