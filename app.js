import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// 로딩 관리자
const loadingManager = new THREE.LoadingManager(
    // 로딩 완료
    () => {
        const loadingScreen = document.getElementById('loading');
        loadingScreen.style.display = 'none';
    },
    // 로딩 진행
    (url, itemsLoaded, itemsTotal) => {
        const progress = (itemsLoaded / itemsTotal * 100).toFixed(2);
        console.log(`로딩 중... ${progress}% (${url})`);
    },
    // 로딩 오류
    (url) => {
        console.error('로딩 오류:', url);
        const loadingScreen = document.getElementById('loading');
        loadingScreen.innerHTML = '로딩 오류가 발생했습니다. 페이지를 새로고침해 주세요.';
        // 5초 후 로딩 화면 숨기기
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 5000);
    }
);

// Three.js 기본 설정
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance"
});

// 렌더러 설정 개선
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

// WebXR 세션 설정
let currentSession = null;

// WebXR 지원 확인
if ('xr' in navigator) {
    // VR 지원 확인
    navigator.xr.isSessionSupported('immersive-vr')
        .then((supported) => {
            if (supported) {
                console.log('VR is supported');
                document.body.appendChild(VRButton.createButton(renderer));
            } else {
                console.log('VR is NOT supported');
                // VR이 지원되지 않을 때 메시지 표시
                const warning = document.createElement('div');
                warning.style.position = 'absolute';
                warning.style.top = '50%';
                warning.style.width = '100%';
                warning.style.textAlign = 'center';
                warning.style.color = 'white';
                warning.innerHTML = 'VR 기기가 감지되지 않았습니다.';
                document.body.appendChild(warning);
            }
        })
        .catch((error) => {
            console.error('Error checking VR support:', error);
        });
} else {
    console.log('WebXR API is not available');
}

document.body.appendChild(renderer.domElement);

// HDR 환경 맵 로드
const rgbeLoader = new RGBELoader(loadingManager);
rgbeLoader.load('https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    
    // 환경 맵 로드 후 모델 로드 시작
    loadModels();
});

// 텍스처 로더 생성
const textureLoader = new THREE.TextureLoader(loadingManager);

// 나무 텍스처 로드
const woodTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/wood/hardwood2_diffuse.jpg');
const woodNormalMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/wood/hardwood2_normal.jpg');
const woodRoughnessMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/wood/hardwood2_roughness.jpg');

// 조명 설정
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

// 보조 조명
const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// 바닥 추가
const floorSize = 100;
const floorTexture = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
floorTexture.repeat.set(floorSize/4, floorSize/4);

const floorNormalMap = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-normal.jpg');
floorNormalMap.wrapS = floorNormalMap.wrapT = THREE.RepeatWrapping;
floorNormalMap.repeat.set(floorSize/4, floorSize/4);

const floorRoughnessMap = textureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-rough.jpg');
floorRoughnessMap.wrapS = floorRoughnessMap.wrapT = THREE.RepeatWrapping;
floorRoughnessMap.repeat.set(floorSize/4, floorSize/4);

const groundGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    map: floorTexture,
    normalMap: floorNormalMap,
    roughnessMap: floorRoughnessMap,
    roughness: 1.0,
    metalness: 0.0,
    envMapIntensity: 0.0
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

// 모델 로드 함수 - 책상 크기만 변경
function loadModels() {
    try {
        // FBX 모델 로드 시도
        const fbxLoader = new FBXLoader(loadingManager);
        fbxLoader.load(
            './Desk.fbx',
            function (object) {
                // 성공 시 처리
                // 크기 조절 (작은 크기로 변경)
                object.scale.set(0.008, 0.008, 0.008);
                
                // 위치 조정 (바닥에 맞춤)
                object.position.set(0, -0.96, 0);
                
                object.traverse((child) => {
                    if (child.isMesh) {
                        const woodMaterial = new THREE.MeshStandardMaterial({
                            map: woodTexture,
                            normalMap: woodNormalMap,
                            roughnessMap: woodRoughnessMap,
                            roughness: 0.6,
                            metalness: 0.1,
                            envMapIntensity: 1.0
                        });

                        woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping;
                        woodTexture.repeat.set(1, 1);
                        woodNormalMap.wrapS = woodNormalMap.wrapT = THREE.RepeatWrapping;
                        woodNormalMap.repeat.set(1, 1);
                        woodRoughnessMap.wrapS = woodRoughnessMap.wrapT = THREE.RepeatWrapping;
                        woodRoughnessMap.repeat.set(1, 1);

                        child.material = woodMaterial;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                scene.add(object);
                console.log('FBX 모델 로드 완료');
            },
            function (xhr) {
                console.log((xhr.loaded / xhr.total * 100) + '% 로드됨');
            },
            function (error) {
                console.error('FBX 로드 중 오류 발생:', error);
                
                // 오류 시 작은 박스로 대체
                const boxGeometry = new THREE.BoxGeometry(0.8, 0.2, 0.4);
                const boxMaterial = new THREE.MeshStandardMaterial({
                    map: woodTexture,
                    normalMap: woodNormalMap,
                    roughnessMap: woodRoughnessMap
                });
                const box = new THREE.Mesh(boxGeometry, boxMaterial);
                box.position.set(0, -0.9, 0);
                box.castShadow = true;
                box.receiveShadow = true;
                scene.add(box);
            }
        );
    } catch (e) {
        console.error('모델 로드 중 예외 발생:', e);
        // 로딩 화면 숨기기
        const loadingScreen = document.getElementById('loading');
        loadingScreen.style.display = 'none';
    }
}

// 카메라 설정
camera.position.set(0, 1.6, 5);

// FirstPersonControls 대신 PointerLockControls 사용
const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

// 시점 이동 방식 수정 및 십자선 추가
function updateControls() {
    // 십자선 생성 및 추가
    const crosshair = document.createElement('div');
    crosshair.id = 'crosshair';
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.width = '20px';
    crosshair.style.height = '20px';
    crosshair.style.pointerEvents = 'none'; // 마우스 이벤트 무시
    crosshair.style.zIndex = '1002'; // 모든 요소보다 위에 표시
    crosshair.style.display = 'none'; // 처음에는 숨김 상태
    
    // 십자선 스타일 (초록색)
    crosshair.innerHTML = `
        <style>
            #crosshair::before, #crosshair::after {
                content: '';
                position: absolute;
                background-color: #00FF00;
            }
            #crosshair::before {
                top: 50%;
                left: 0;
                width: 100%;
                height: 2px;
                transform: translateY(-50%);
            }
            #crosshair::after {
                top: 0;
                left: 50%;
                width: 2px;
                height: 100%;
                transform: translateX(-50%);
            }
            #crosshair-dot {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 4px;
                height: 4px;
                background-color: #00FF00;
                border-radius: 50%;
                transform: translate(-50%, -50%);
            }
        </style>
        <div id="crosshair-dot"></div>
    `;
    
    document.body.appendChild(crosshair);
    
    // 포인터 잠금 상태 변경 이벤트 리스너
    controls.addEventListener('lock', function() {
        crosshair.style.display = 'block';
        document.body.style.cursor = 'none';
    });
    
    controls.addEventListener('unlock', function() {
        crosshair.style.display = 'none';
        document.body.style.cursor = 'default';
    });
}

// 키보드 컨트롤 변수 추가
const keyState = {};
const moveSpeed = 0.15; // 기본 이동 속도
const runSpeed = 0.3; // 달리기 속도
const jumpForce = 0.2; // 점프 힘
let canMove = true; // VR 모드가 아닐 때만 키보드 이동 허용
let isJumping = false; // 점프 상태
let verticalVelocity = 0; // 수직 속도
const gravity = 0.01; // 중력
let inputFocused = false; // 입력 필드 포커스 상태

// 키보드 컨트롤 수정 - 화살표 키 지원 추가
document.addEventListener('keydown', (event) => {
    // 화살표 키 매핑 추가
    if (event.key === 'ArrowUp') {
        keyState['ArrowUp'] = true;
    } else if (event.key === 'ArrowDown') {
        keyState['ArrowDown'] = true;
    } else if (event.key === 'ArrowLeft') {
        keyState['ArrowLeft'] = true;
    } else if (event.key === 'ArrowRight') {
        keyState['ArrowRight'] = true;
    } else if (event.key === ' ') {
        keyState['Space'] = true;
    } else {
        keyState[event.code] = true;
    }
});

document.addEventListener('keyup', (event) => {
    // 화살표 키 매핑 추가
    if (event.key === 'ArrowUp') {
        keyState['ArrowUp'] = false;
    } else if (event.key === 'ArrowDown') {
        keyState['ArrowDown'] = false;
    } else if (event.key === 'ArrowLeft') {
        keyState['ArrowLeft'] = false;
    } else if (event.key === 'ArrowRight') {
        keyState['ArrowRight'] = false;
    } else if (event.key === ' ') {
        keyState['Space'] = false;
    } else {
        keyState[event.code] = false;
    }
});

// 사용자 더미와 오른손 모델 추가
function createPlayerModel() {
    // 사용자 더미 (간단한 캡슐 형태)
    const playerGeometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
    const playerMaterial = new THREE.MeshStandardMaterial({
        color: 0x3366ff,
        roughness: 0.7,
        metalness: 0.1
    });
    const playerBody = new THREE.Mesh(playerGeometry, playerMaterial);
    playerBody.position.set(0, 0, 0);
    playerBody.castShadow = true;
    
    // 플레이어 모델을 카메라에 연결하지 않고 별도로 관리
    scene.add(playerBody);
    
    // 총 모델 생성 및 추가
    const gun = createGunModel();
    camera.add(gun);
    
    // 카메라가 씬에 추가되어 있는지 확인
    if (!scene.children.includes(camera)) {
        scene.add(camera);
    }
    
    return { playerBody, gun };
}

// 총 모델 생성
function createGunModel() {
    // 간단한 총 모델 생성
    const gunGroup = new THREE.Group();
    
    // 총의 몸통
    const gunBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.08, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.7 })
    );
    
    // 총의 손잡이
    const gunHandle = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.12, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.2 })
    );
    gunHandle.position.set(0, -0.08, -0.1);
    
    // 총의 총구
    const gunBarrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.8 })
    );
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0, 0.2);
    
    // 총 부품 조립
    gunGroup.add(gunBody);
    gunGroup.add(gunHandle);
    gunGroup.add(gunBarrel);
    
    // 총 위치 조정
    gunGroup.position.set(0.3, -0.2, -0.5);
    gunGroup.rotation.set(0, 0, 0);
    
    return gunGroup;
}

// 총알 발사 효과 생성
function createBulletEffect(origin, direction) {
    // 총알 광선 효과
    const bulletGeometry = new THREE.CylinderGeometry(0.01, 0.01, 50, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7
    });
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.copy(origin);
    
    // 총알 방향 설정
    bullet.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
    );
    
    // 총알 위치 조정 (총구에서 시작)
    bullet.position.add(direction.clone().multiplyScalar(0.5));
    
    scene.add(bullet);
    
    // 총알 효과 애니메이션
    const startTime = Date.now();
    
    function animateBullet() {
        const elapsedTime = Date.now() - startTime;
        
        // 0.1초 동안 총알 효과 표시
        if (elapsedTime < 100) {
            bullet.material.opacity = 0.7 * (1 - elapsedTime / 100);
            requestAnimationFrame(animateBullet);
        } else {
            scene.remove(bullet);
        }
    }
    
    animateBullet();
    
    // 레이캐스팅으로 충돌 감지
    const raycaster = new THREE.Raycaster(origin, direction.clone().normalize());
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // 충돌 효과
    if (intersects.length > 0 && intersects[0].distance < 50) {
        const hitPosition = intersects[0].point;
        
        // 충돌 지점에 스파크 효과
        const sparkGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const sparkMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 1
        });
        
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
        spark.position.copy(hitPosition);
        scene.add(spark);
        
        // 스파크 효과 애니메이션
        const sparkStartTime = Date.now();
        
        function animateSpark() {
            const sparkElapsedTime = Date.now() - sparkStartTime;
            
            // 0.2초 동안 스파크 효과 표시
            if (sparkElapsedTime < 200) {
                spark.scale.set(
                    1 + sparkElapsedTime / 100,
                    1 + sparkElapsedTime / 100,
                    1 + sparkElapsedTime / 100
                );
                spark.material.opacity = 1 - sparkElapsedTime / 200;
                requestAnimationFrame(animateSpark);
            } else {
                scene.remove(spark);
            }
        }
        
        animateSpark();
    }
}

// 키보드 이동 함수
function processKeyboard(delta) {
    // 입력 박스가 포커스되어 있으면 이동 처리 중단
    if (!canMove || inputFocused) return;
    
    // 카메라 방향 벡터
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0; // 수평 이동만 허용
    direction.normalize();
    
    // 측면 방향 벡터 (카메라 방향의 수직)
    const sideways = new THREE.Vector3(-direction.z, 0, direction.x);
    
    // 현재 속도 결정 (Shift 키를 누르면 달리기)
    const currentSpeed = (keyState['ShiftLeft'] || keyState['ShiftRight']) ? runSpeed : moveSpeed;
    
    // WASD 이동
    if (keyState['KeyW'] || keyState['ArrowUp']) {
        camera.position.addScaledVector(direction, currentSpeed);
    }
    if (keyState['KeyS'] || keyState['ArrowDown']) {
        camera.position.addScaledVector(direction, -currentSpeed);
    }
    if (keyState['KeyA'] || keyState['ArrowLeft']) {
        camera.position.addScaledVector(sideways, -currentSpeed);
    }
    if (keyState['KeyD'] || keyState['ArrowRight']) {
        camera.position.addScaledVector(sideways, currentSpeed);
    }
    
    // 점프 (스페이스바)
    if ((keyState['Space']) && !isJumping && camera.position.y <= 0.5) {
        isJumping = true;
        verticalVelocity = jumpForce;
    }
    
    // 중력 및 점프 처리
    verticalVelocity -= gravity;
    camera.position.y += verticalVelocity;
    
    // 바닥 충돌 검사
    if (camera.position.y < 0.5) {
        camera.position.y = 0.5;
        verticalVelocity = 0;
        isJumping = false;
    }
    
    // 천장 충돌 검사 (선택 사항)
    if (camera.position.y > 10) {
        camera.position.y = 10;
        verticalVelocity = 0;
    }
}

// 플레이어 모델 생성
const player = createPlayerModel();

// 마우스 클릭 이벤트 리스너 수정 - 발사 기능 수정
document.addEventListener('click', (event) => {
    // 포인터 잠금 상태에서만 발사 처리
    if (controls.isLocked) {
        // 총알 발사
        const bulletOrigin = new THREE.Vector3();
        player.gun.getWorldPosition(bulletOrigin);
        
        const bulletDirection = new THREE.Vector3();
        camera.getWorldDirection(bulletDirection);
        
        createBulletEffect(bulletOrigin, bulletDirection);
        
        // 총 반동 효과
        player.gun.position.z += 0.05; // 뒤로 밀림
        
        // 0.1초 후 원래 위치로 복귀
        setTimeout(() => {
            player.gun.position.z -= 0.05;
        }, 100);
    }
});

// 애니메이션 루프 함수
function animate() {
    const clock = new THREE.Clock();
    
    renderer.setAnimationLoop(() => {
        const delta = clock.getDelta();
        processKeyboard(delta);
        
        // 플레이어 더미 위치 업데이트
        player.playerBody.position.x = camera.position.x;
        player.playerBody.position.z = camera.position.z;
        player.playerBody.position.y = camera.position.y - 1.3;
        
        // 플레이어 더미 회전
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        player.playerBody.rotation.y = Math.atan2(direction.x, direction.z);
        
        // 손 애니메이션
        if (keyState['KeyW'] || keyState['KeyA'] || keyState['KeyS'] || keyState['KeyD']) {
            const walkSpeed = 5;
            player.gun.position.y = -0.3 + Math.sin(Date.now() * 0.01) * 0.03;
            player.gun.position.x = 0.4 + Math.cos(Date.now() * 0.01) * 0.01;
        }
        
        renderer.render(scene, camera);
    });
}

// 초기화 시 컨트롤 업데이트 호출
updateControls();

// 애니메이션 시작
animate();

// 도움말 오버레이 추가
const helpOverlay = document.createElement('div');
let helpOverlayVisible = false;

helpOverlay.style.position = 'absolute';
helpOverlay.style.top = '0';
helpOverlay.style.left = '0';
helpOverlay.style.width = '100%';
helpOverlay.style.height = '100%';
helpOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
helpOverlay.style.color = 'white';
helpOverlay.style.padding = '20px';
helpOverlay.style.boxSizing = 'border-box';
helpOverlay.style.zIndex = '1000';
helpOverlay.style.display = 'none';
helpOverlay.style.overflow = 'auto';
helpOverlay.style.display = 'flex'; // 플렉스 컨테이너로 변경
helpOverlay.style.alignItems = 'center'; // 수직 중앙 정렬
helpOverlay.style.justifyContent = 'center'; // 수평 중앙 정렬

// 이전 스타일의 도움말 UI로 변경
helpOverlay.innerHTML = `
    <div style="max-width: 800px; width: 80%; background-color: rgba(50, 50, 50, 0.8); padding: 20px; border-radius: 10px; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);">
        <h2 style="text-align: center; color: #4CAF50; margin-top: 0;">WebXR 슈팅 게임 도움말</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h3 style="color: #4CAF50; border-bottom: 1px solid #4CAF50; padding-bottom: 5px;">기본 조작</h3>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">W, A, S, D</span> - 이동</li>
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">Shift</span> - 달리기</li>
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">Space</span> - 점프</li>
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">마우스</span> - 시점 이동</li>
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">마우스 클릭</span> - 발사</li>
                </ul>
            </div>
            <div>
                <h3 style="color: #4CAF50; border-bottom: 1px solid #4CAF50; padding-bottom: 5px;">게임 정보</h3>
                <ul style="list-style-type: none; padding-left: 10px;">
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">목표</span> - 자유롭게 탐험하고 슈팅을 즐기세요!</li>
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">VR 모드</span> - VR 버튼을 클릭하여 VR 모드로 전환할 수 있습니다.</li>
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">ESC 키</span> - 마우스 잠금을 해제합니다.</li>
                    <li style="margin-bottom: 10px;"><span style="color: #4CAF50; font-weight: bold;">Tab 키</span> - 이 도움말을 닫습니다.</li>
                </ul>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px;">
            <p style="color: #4CAF50;">Tab 키를 다시 누르면 도움말이 닫힙니다.</p>
        </div>
    </div>
`;

document.body.appendChild(helpOverlay);

// Tab 키 이벤트 리스너 수정 - 도움말 표시 시 시점 이동 비활성화
document.addEventListener('keydown', function(event) {
    if (event.key === 'Tab') {
        event.preventDefault(); // 기본 Tab 동작 방지
        
        if (helpOverlayVisible) {
            helpOverlay.style.display = 'none';
            helpOverlayVisible = false;
            
            // 도움말이 닫힐 때 시점 이동 다시 활성화
            if (!inputFocused) {
                controls.lock();
            }
        } else {
            helpOverlay.style.display = 'flex'; // 플렉스 디스플레이로 변경
            helpOverlayVisible = true;
            
            // 도움말이 표시될 때 포인터 잠금 해제
            controls.unlock();
        }
    }
});

// 포인터 잠금 초기화 - 페이지 로드 후 클릭 시 시작
document.addEventListener('DOMContentLoaded', function() {
    // 시작 안내 메시지 표시
    const startMessage = document.createElement('div');
    startMessage.id = 'start-message';
    startMessage.style.position = 'absolute';
    startMessage.style.top = '50%';
    startMessage.style.left = '50%';
    startMessage.style.transform = 'translate(-50%, -50%)';
    startMessage.style.color = 'white';
    startMessage.style.fontSize = '24px';
    startMessage.style.textAlign = 'center';
    startMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    startMessage.style.padding = '20px';
    startMessage.style.borderRadius = '10px';
    startMessage.style.zIndex = '1000';
    startMessage.innerHTML = '화면을 클릭하여 게임을 시작하세요<br><small>(ESC 키를 누르면 마우스가 해제됩니다)<br>Tab 키를 눌러 도움말을 볼 수 있습니다</small>';
    document.body.appendChild(startMessage);
    
    // 화면 클릭 시 포인터 잠금 및 메시지 제거
    const startGameHandler = function() {
        if (!controls.isLocked) {
            controls.lock();
            if (document.getElementById('start-message')) {
                document.body.removeChild(startMessage);
            }
            document.removeEventListener('click', startGameHandler);
        }
    };
    
    document.addEventListener('click', startGameHandler);
});

// 말풍선 시스템 추가 - 입력 필드 없이 직접 호출 방식으로 변경
function setupEmotionBubbles() {
    // 말풍선 생성 함수
    function createBubble(text) {
        if (!text.trim()) return;
        
        // 말풍선 요소 생성
        const bubble = document.createElement('div');
        bubble.className = 'screen-bubble';
        bubble.style.position = 'absolute';
        bubble.style.top = '20px';
        bubble.style.right = '20px';
        bubble.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        bubble.style.padding = '10px 15px';
        bubble.style.borderRadius = '20px';
        bubble.style.maxWidth = '250px';
        bubble.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        bubble.style.zIndex = '1001';
        bubble.style.transition = 'opacity 0.5s';
        bubble.style.opacity = '0';
        
        // 말풍선 텍스트
        bubble.textContent = text;
        
        // 말풍선 추가
        document.body.appendChild(bubble);
        
        // 애니메이션 효과
        setTimeout(() => {
            bubble.style.opacity = '1';
        }, 10);
        
        // 5초 후 사라짐
        setTimeout(() => {
            bubble.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(bubble);
            }, 500);
        }, 5000);
    }
    
    return { createBubble };
}

// 감정 표현 시스템 초기화 - 입력 필드 없이 함수만 반환
const { createBubble } = setupEmotionBubbles();

// 예시: 키보드 단축키로 감정 표현 (선택 사항)
document.addEventListener('keydown', function(event) {
    // 숫자 키 1-5로 미리 정의된 감정 표현
    if (!inputFocused && event.key >= '1' && event.key <= '5') {
        const emotions = [
            '안녕하세요!',
            '좋아요!',
            '도와주세요!',
            '감사합니다!',
            '잘했어요!'
        ];
        
        const index = parseInt(event.key) - 1;
        createBubble(emotions[index]);
    }
});

// 말풍선 생성 함수를 먼저 정의
function createProfileBubble(text) {
    // 프로필 정보 가져오기 (페이지에서 찾기)
    let username = 'User';
    let profileImg = null;
    
    // 프로필 요소 찾기 시도 - 더 구체적인 선택자 사용
    const userElement = document.querySelector('.user-profile') || document.querySelector('.profile-box');
    
    if (userElement) {
        // 사용자 이름 찾기 - 더 구체적인 선택자 사용
        const nameElement = userElement.querySelector('.user-name') || userElement.querySelector('h1, h2, h3');
        if (nameElement && nameElement.textContent) {
            username = nameElement.textContent.trim();
        }
        
        // 프로필 이미지 찾기
        const imgElement = userElement.querySelector('img');
        if (imgElement && imgElement.src) {
            profileImg = imgElement.src;
        }
    }
    
    // 말풍선 요소 생성
    const bubble = document.createElement('div');
    bubble.className = 'profile-bubble';
    bubble.style.position = 'absolute';
    bubble.style.top = '20px'; // 상단으로 변경
    bubble.style.left = '20px'; // 좌측으로 변경
    bubble.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    bubble.style.color = 'white';
    bubble.style.padding = '10px 15px';
    bubble.style.borderRadius = '10px';
    bubble.style.maxWidth = '300px';
    bubble.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
    bubble.style.zIndex = '1001';
    bubble.style.transition = 'opacity 0.5s';
    bubble.style.opacity = '0';
    
    // 말풍선 내용 구성
    let bubbleContent = '';
    
    // 프로필 이미지가 있으면 추가
    if (profileImg) {
        bubbleContent += `<img src="${profileImg}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; vertical-align: middle;">`;
    }
    
    // 사용자 이름과 메시지 추가
    bubbleContent += `<span style="font-weight: bold;">${username}</span><br>`;
    bubbleContent += `<span style="word-break: break-word;">${text}</span>`;
    
    bubble.innerHTML = bubbleContent;
    
    // 말풍선 추가
    document.body.appendChild(bubble);
    
    // 애니메이션 효과
    setTimeout(() => {
        bubble.style.opacity = '1';
    }, 10);
    
    // 5초 후 사라짐
    setTimeout(() => {
        bubble.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(bubble);
        }, 500);
    }, 5000);
}

// 중앙 하단 인풋 필드 제거 및 기존 입력창에 말풍선 기능 추가
function setupChatInputField() {
    // 버튼 직접 선택
    const chatSendButton = document.getElementById('chat-send');
    
    if (!chatSendButton) {
        console.error('chat-send 버튼을 찾을 수 없습니다.');
        // 버튼이 아직 로드되지 않았을 수 있으므로 잠시 후 다시 시도
        setTimeout(setupChatInputField, 500);
        return;
    }
    
    // 이미 이벤트가 설정되어 있는지 확인
    if (chatSendButton.hasAttribute('data-chat-setup')) {
        return;
    }
    
    // 이벤트 설정 표시
    chatSendButton.setAttribute('data-chat-setup', 'true');
    
    // 입력창 찾기 (버튼 근처의 입력창)
    const chatInput = document.querySelector('input[type="text"]');
    
    if (!chatInput) {
        console.error('입력창을 찾을 수 없습니다.');
        return;
    }
    
    // 입력 필드 포커스 이벤트
    chatInput.addEventListener('focus', function() {
        inputFocused = true;
        if (controls && controls.isLocked) {
            controls.unlock();
        }
    });
    
    chatInput.addEventListener('blur', function() {
        inputFocused = false;
    });
    
    // 메시지 전송 함수
    function sendMessage() {
        const message = chatInput.value.trim();
        if (message) {
            console.log('메시지 전송:', message);
            // 프로필 박스 위에 말풍선 생성
            createProfileBubble(message);
            chatInput.value = '';
        }
    }
    
    // 전송 버튼 클릭 이벤트 - 직접 버튼에 이벤트 연결
    chatSendButton.addEventListener('click', function() {
        console.log('버튼 클릭됨');
        sendMessage();
    });
    
    // 엔터 키 이벤트
    chatInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
}

// 페이지 로드 후 설정 실행
document.addEventListener('DOMContentLoaded', setupChatInputField);
// 또는 즉시 실행
setupChatInputField();

// 화면 상단에 조작 설명 추가
function setupControlsGuide() {
    // 컨트롤 가이드 컨테이너 생성
    const controlsGuide = document.createElement('div');
    controlsGuide.className = 'controls-guide';
    controlsGuide.style.position = 'absolute';
    controlsGuide.style.top = '20px';
    controlsGuide.style.left = '50%';
    controlsGuide.style.transform = 'translateX(-50%)';
    controlsGuide.style.display = 'flex';
    controlsGuide.style.gap = '20px';
    controlsGuide.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    controlsGuide.style.padding = '10px 20px';
    controlsGuide.style.borderRadius = '10px';
    controlsGuide.style.zIndex = '1002';
    
    // 이동 키 설명
    const movementGuide = createControlGuide('이동', ['W', 'A', 'S', 'D']);
    
    // 기타 조작 설명
    const otherGuide = createControlGuide('그 외', [
        { key: 'Tab', desc: '자세한 게임 설명' },
        { key: 'Esc', desc: '마우스 포인트 이동 해제' }
    ]);
    
    // 컨테이너에 가이드 추가
    controlsGuide.appendChild(movementGuide);
    controlsGuide.appendChild(otherGuide);
    
    // 문서에 컨테이너 추가
    document.body.appendChild(controlsGuide);
    
    return controlsGuide;
    
    // 컨트롤 가이드 생성 함수
    function createControlGuide(title, keys) {
        const guideContainer = document.createElement('div');
        guideContainer.style.display = 'flex';
        guideContainer.style.flexDirection = 'column';
        guideContainer.style.alignItems = 'center';
        
        // 제목
        const titleElement = document.createElement('div');
        titleElement.textContent = title;
        titleElement.style.color = 'white';
        titleElement.style.marginBottom = '10px';
        titleElement.style.fontWeight = 'bold';
        
        guideContainer.appendChild(titleElement);
        
        // 키 컨테이너
        const keysContainer = document.createElement('div');
        keysContainer.style.display = 'flex';
        keysContainer.style.gap = '5px';
        keysContainer.style.flexWrap = 'wrap';
        keysContainer.style.justifyContent = 'center';
        
        // 키 추가
        if (Array.isArray(keys) && typeof keys[0] === 'string') {
            // 단순 키 배열인 경우
            keys.forEach(key => {
                const keyElement = createKeyElement(key);
                keysContainer.appendChild(keyElement);
            });
        } else if (Array.isArray(keys) && typeof keys[0] === 'object') {
            // 키와 설명이 있는 객체 배열인 경우
            keys.forEach(item => {
                const keyWithDesc = document.createElement('div');
                keyWithDesc.style.display = 'flex';
                keyWithDesc.style.alignItems = 'center';
                keyWithDesc.style.marginBottom = '5px';
                
                const keyElement = createKeyElement(item.key);
                
                const descElement = document.createElement('span');
                descElement.textContent = item.desc;
                descElement.style.color = 'white';
                descElement.style.marginLeft = '5px';
                descElement.style.fontSize = '12px';
                
                keyWithDesc.appendChild(keyElement);
                keyWithDesc.appendChild(descElement);
                keysContainer.appendChild(keyWithDesc);
            });
        }
        
        guideContainer.appendChild(keysContainer);
        
        return guideContainer;
    }
    
    // 키 요소 생성 함수
    function createKeyElement(key) {
        const keyElement = document.createElement('div');
        keyElement.textContent = key;
        keyElement.style.width = '30px';
        keyElement.style.height = '30px';
        keyElement.style.backgroundColor = 'white';
        keyElement.style.color = 'black';
        keyElement.style.borderRadius = '5px';
        keyElement.style.display = 'flex';
        keyElement.style.alignItems = 'center';
        keyElement.style.justifyContent = 'center';
        keyElement.style.fontWeight = 'bold';
        keyElement.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
        
        return keyElement;
    }
}

// 페이지 로드 후 조작 설명 설정 실행
document.addEventListener('DOMContentLoaded', setupControlsGuide);
// 또는 즉시 실행
setupControlsGuide(); 