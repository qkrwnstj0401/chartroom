import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

// 1️⃣ 씬, 카메라, 렌더러 생성
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true; // WebXR 활성화
document.body.appendChild(renderer.domElement);

// 2️⃣ VR 버튼 추가 (사용자가 XR 모드로 진입 가능)
document.body.appendChild(VRButton.createButton(renderer));

// 3️⃣ 기본적인 3D 오브젝트 추가 (바닥 + 박스)
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 5;

// 4️⃣ 애니메이션 루프
function animate() {
    renderer.setAnimationLoop(() => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    });
}
animate();
