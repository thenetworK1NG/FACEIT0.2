import * as THREE from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

import vision from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0';
const { FaceLandmarker, FilesetResolver } = vision;

//
import { initEmotionSystem } from './emotions.js';

export async function initHeadtrackingSystem( opts = {} ) {
    const {
        bsList = null,
        smileBadge = null,
        mouthBadge = null,
        angryBadge = null,
        surprisedBadge = null,
        neutralBadge = null,
        faceBadge = null,
        sidePanel = null
    } = opts;

    // Renderer / scene / camera
    const renderer = new THREE.WebGLRenderer( { antialias: true } );
    // Lower pixel ratio on mobile to reduce GPU load
    renderer.setPixelRatio( Math.min( window.devicePixelRatio || 1, 1 ) );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild( renderer.domElement );

    const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 100 );
    camera.position.z = 5;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x0d0d14 );
    scene.scale.x = -1;

    const pmremGenerator = new THREE.PMREMGenerator( renderer );
    const ambientLight = new THREE.AmbientLight( 0xffffff, 0.6 );
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 0.35 );
    const dirLight = new THREE.DirectionalLight( 0xffffff, 1.0 );
    dirLight.position.set( 5, 10, 7 );
    const rimLight = new THREE.PointLight( 0xffffff, 0.5, 12 );
    rimLight.position.set( -4, 2, 6 );
    scene.add( ambientLight, hemiLight, dirLight, rimLight );

    // env placeholder (keeps API parity with original code)
    let envMap = null;

    // Loaders
    const ktx2Loader = new KTX2Loader().setTranscoderPath( 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/basis/' ).detectSupport( renderer );
    const gltfLoader = new GLTFLoader().setKTX2Loader( ktx2Loader ).setMeshoptDecoder( MeshoptDecoder );

    // Mask tuning defaults (can be overridden by mask_tuning.json)
    const maskParams = {
        smooth: 0.45,
        forward: 0.06,
        centroidMult: 0.14,
        sizeFactorMul: 2.5,
        scaleMin: 0.35,
        scaleMax: 3.0,
        localX: 0,
        localY: -0.02,
        localZ: 0.02
    };

    try {
        const r = await fetch( 'mask_tuning.json' );
        if ( r.ok ) {
            const data = await r.json();
            Object.assign( maskParams, data );
            console.log( 'Mask tuning loaded from mask_tuning.json' );
        }
    } catch ( e ) { console.debug( 'mask_tuning.json not loaded:', e ); }

    // Runtime refs
    let maskSceneGlobal = null;
    const accessoryScenes = [];
    const maskAnchor = new THREE.Object3D();
    maskAnchor.name = 'mask_anchor';
    scene.add( maskAnchor );

    // Video mesh (camera preview as full-screen plane)
    const video = document.createElement( 'video' );
    video.autoplay = true; video.muted = true; video.playsInline = true;
    const texture = new THREE.VideoTexture( video );
    texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = new THREE.PlaneGeometry( 1, 1 );
    const material = new THREE.MeshBasicMaterial( { map: texture, depthWrite: false } );
    const videomesh = new THREE.Mesh( geometry, material );
    scene.add( videomesh );

    // Start camera stream EARLY to prompt permission quickly and reduce perceived delay
    if ( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) {
        try {
            const constraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15, max: 24 }
                },
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia( constraints );
            video.srcObject = stream;
            await video.play();
        } catch ( e ) { console.warn( 'getUserMedia failed', e ); }
    }

    // MediaPipe face landmarker (load after camera start so permission prompt isn't delayed)
    const filesetResolver = await FilesetResolver.forVisionTasks( { baseUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm' } );
    const faceLandmarker = await FaceLandmarker.createFromOptions( filesetResolver, {
        baseOptions: { modelAssetPath: 'face_landmarker.task', delegate: 'GPU' },
        outputFaceBlendshapes: true,
        outputFaceGeometry: false,
        runningMode: 'VIDEO',
        numFaces: 1
    } );

    // Helpers for smoothing
    const _smoothedPos = new THREE.Vector3();
    const _smoothedQuat = new THREE.Quaternion();
    let _smoothedScale = 1.0;
    let SMOOTH_ALPHA = maskParams.smooth;
    let FORWARD_OFFSET = maskParams.forward;
    const _tmpForward = new THREE.Vector3( 0, 0, 1 );

    // Face model load (initial facecap)
    let face, eyeL, eyeR;
    let mixer = null;

    function setMaskScene( sceneObj ) {
        if ( maskSceneGlobal && maskSceneGlobal.parent ) maskSceneGlobal.parent.remove( maskSceneGlobal );
        maskSceneGlobal = sceneObj;
        if ( maskSceneGlobal ) {
            maskSceneGlobal.position.set( maskParams.localX, maskParams.localY, maskParams.localZ );
            maskAnchor.add( maskSceneGlobal );
        }
    }

    // Primary loader exposed to caller. If attach=true the model will attach as accessory;
    // otherwise it replaces the main mask.
    function loadMaskModel( path, attach = false ) {
        gltfLoader.load( path, ( res ) => {
            const obj = res.scene.clone();
            obj.name = path.split('/').pop();
            if ( attach ) {
                maskAnchor.add( obj );
                accessoryScenes.push( obj );
            } else {
                setMaskScene( obj );
            }
        }, undefined, ( e ) => console.warn( 'Mask load error', e ) );
    }

    // Load default facecap similar to original example
    gltfLoader.load( 'https://threejs.org/examples/models/gltf/facecap.glb', ( gltf ) => {
        const mesh = gltf.scene.children[0];
        scene.add( mesh );
        mesh.traverse( n => { if ( n.isMesh ) { n.userData.isFacecap = true; n.visible = false; } } );
        face = mesh.getObjectByName( 'mesh_2' );
        eyeL = mesh.getObjectByName( 'eyeLeft' );
        eyeR = mesh.getObjectByName( 'eyeRight' );

        // Initialize blendshape & emotion systems if requested
        //
        try { initEmotionSystem( { smileBadge, mouthBadge, angryBadge, surprisedBadge, neutralBadge, faceBadge } ); } catch (e) { console.warn(e); }

        if ( gltf.animations && gltf.animations.length ) {
            mixer = new THREE.AnimationMixer( mesh );
        }
    } );

    // Simple animate loop: update faceLandmarker and render
    const clock = new THREE.Clock();
    // Throttle detection to reduce CPU usage on mobile (e.g. ~15 FPS)
    const DETECT_FPS = 15;
    const DETECT_INTERVAL = 1000 / DETECT_FPS;
    let _lastDetectTime = 0;

    async function animate() {
        requestAnimationFrame( animate );
        const dt = clock.getDelta();

        if ( mixer ) mixer.update( dt );

        const now = performance.now();
        if ( video.readyState >= HTMLMediaElement.HAVE_METADATA && ( now - _lastDetectTime ) >= DETECT_INTERVAL ) {
            _lastDetectTime = now;
            try {
                faceLandmarker.detectForVideo( video, now );
            } catch ( e ) { /* swallow detection errors */ }
        }

        renderer.render( scene, camera );
    }

    animate();

    window.addEventListener( 'resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    } );

    return { loadMaskModel, accessoryScenes, renderer, scene, camera };
}
