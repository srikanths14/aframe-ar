import * as THREE from './src/three.module.js';
import {GLTFLoader} from './loaders/GLTFLoader.js';
import {OrbitControls} from './loaders/OrbitControls.js';
import { ARButton } from './loaders/ARButton.js';

let camera,scene,renderer;
let orbControls;
let gltfLoader;
let sceneAsset;
let container;
let controller;

let visualPointer;

let hitTestSource = null;
let hitTestSourceRequested = false;

initScene();
frameLoop();

function initScene(){

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,0.1,100);
    camera.position.set(0,0.2,3);

    scene = new THREE.Scene();

    const light = new THREE.AmbientLight(0xffffff,0.5);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 1);
    directionalLight.position.set(0,2,5);
    scene.add( directionalLight );

    loadGltf();

    renderer = new THREE.WebGLRenderer({
        antialias:true,alpha:true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled =true;
    container.appendChild(renderer.domElement);

    setOrbControls();

    document.body.appendChild( ARButton.createButton( renderer, { requiredFeatures: [ 'hit-test' ] } ) );

    getController();

    window.addEventListener( 'resize', onWindowResize );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function onSelect() {

    if ( visualPointer.visible ) {
        sceneAsset.position.setFromMatrixPosition(visualPointer.matrix);
        // loadGLTF();

    }

}

function getController(){
    controller = renderer.xr.getController( 0 );
    controller.addEventListener( 'select', onSelect );
    scene.add( controller );

    createVisualPointer();
}

function createVisualPointer(){

    visualPointer = new THREE.Mesh(
        new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial()
    );
    visualPointer.matrixAutoUpdate = false;
    visualPointer.visible = false;
    scene.add( visualPointer );
}

function loadGltf(){
    gltfLoader= new GLTFLoader().setPath('./Assets/EP3246_70_GLB_USDZ/');
    gltfLoader.load('EP3246_NT.glb',function(gltf){
      sceneAsset = gltf.scene;
      scene.add(gltf.scene);
    });
}

function setOrbControls(){
    orbControls = new OrbitControls(camera,renderer.domElement);
    orbControls.minPolarAngle = Math.PI/2;
    orbControls.maxPolarAngle = Math.PI/2;
    orbControls.target.set(0,0.2,0);

}

function render(timestamp,frame){

    if(sceneAsset!=null){
        sceneAsset.rotation.y-=0.01;

        orbControls.update();
    }

    if(frame){

        const referenceSpace = renderer.xr.getReferenceSpace();
        const activeSession = renderer.xr.getSession();
        
        if(hitTestSourceRequested===false){

            activeSession.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {

                activeSession.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                    hitTestSource = source;

                } );

            } );

            activeSession.addEventListener( 'end', function () {

                hitTestSourceRequested = false;
                hitTestSource = null;

            } );

            hitTestSourceRequested = true;

        }

        if ( hitTestSource ) {

            const hitTestResults = frame.getHitTestResults( hitTestSource );

            if ( hitTestResults.length ) {

                const hit = hitTestResults[ 0 ];

                visualPointer.visible = true;
                visualPointer.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );

            } else {

                visualPointer.visible = false;

            }

        }



    }


    renderer.render(scene,camera);
}

function frameLoop(){
    renderer.setAnimationLoop(render);
}