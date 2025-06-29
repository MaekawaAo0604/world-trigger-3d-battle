import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { MeshComponent } from '../components/Mesh';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * レンダリングを管理するシステム
 */
export class RenderSystem extends System {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private entityMeshMap: Map<number, THREE.Object3D> = new Map();
  private playerEntity: Entity | null = null;
  private cameraOffset: THREE.Vector3 = new THREE.Vector3(
    GAME_CONFIG.CAMERA.OFFSET.x,
    GAME_CONFIG.CAMERA.OFFSET.y,
    GAME_CONFIG.CAMERA.OFFSET.z
  );
  private cameraRotation: { x: number; y: number } = { x: 0.3, y: 0.5 }; // TPS標準の初期角度
  private isPointerLocked: boolean = false;
  private isScopeMode: boolean = false;
  private normalFOV: number = GAME_CONFIG.RENDER.CAMERA_FOV;
  private scopeFOV: number = GAME_CONFIG.RENDER.CAMERA_FOV * 0.25; // スコープ時は視野角を狭める
  private scopeOverlay: HTMLElement | null = null;
  private normalCameraOffset: THREE.Vector3;
  private scopeCameraOffset: THREE.Vector3 = new THREE.Vector3(0.05, 1.7, 0.15); // FPS位置
  private crosshairCallback: ((visible: boolean) => void) | null = null;
  private isAimingMode: boolean = false;

  constructor(container: HTMLElement) {
    super();
    this.priority = -100; // 他のシステムの後に実行

    // 通常のカメラオフセットを保存
    this.normalCameraOffset = this.cameraOffset.clone();

    // シーン作成
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(GAME_CONFIG.RENDER.BACKGROUND_COLOR);
    this.scene.fog = new THREE.Fog(
      GAME_CONFIG.RENDER.FOG_COLOR,
      GAME_CONFIG.RENDER.FOG_NEAR,
      GAME_CONFIG.RENDER.FOG_FAR
    );

    // カメラ作成
    this.camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.RENDER.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      GAME_CONFIG.RENDER.CAMERA_NEAR,
      GAME_CONFIG.RENDER.CAMERA_FAR
    );
    this.camera.position.set(
      GAME_CONFIG.CAMERA.INITIAL_POSITION.x,
      GAME_CONFIG.CAMERA.INITIAL_POSITION.y,
      GAME_CONFIG.CAMERA.INITIAL_POSITION.z
    );
    this.camera.lookAt(0, 0, 0);

    // レンダラー作成
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // ライティング設定
    this.setupLighting();

    // リサイズハンドラー
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // マウス視点制御のイベントリスナー
    this.setupCameraControls();

    // スコープオーバーレイUI作成
    this.createScopeOverlay(container);
  }

  /**
   * スコープオーバーレイUIを作成
   */
  private createScopeOverlay(container: HTMLElement): void {
    this.scopeOverlay = document.createElement('div');
    this.scopeOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      display: none;
      background: radial-gradient(circle at center, transparent 200px, rgba(0,0,0,0.9) 220px);
    `;

    // 十字線を作成
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
    `;

    // 縦線
    const verticalLine = document.createElement('div');
    verticalLine.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 1px;
      height: 20px;
      background: rgba(255, 255, 255, 0.8);
    `;

    // 横線
    const horizontalLine = document.createElement('div');
    horizontalLine.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      transform: translateY(-50%);
      width: 20px;
      height: 1px;
      background: rgba(255, 255, 255, 0.8);
    `;

    // 中央の点
    const centerDot = document.createElement('div');
    centerDot.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 2px;
      height: 2px;
      background: rgba(255, 0, 0, 0.9);
      border-radius: 50%;
    `;

    // スコープのリング
    const scopeRing = document.createElement('div');
    scopeRing.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      height: 400px;
      border: 2px solid rgba(255, 255, 255, 0.6);
      border-radius: 50%;
    `;

    // スコープ内の精密クロスヘア（細い線のみ）
    crosshair.appendChild(verticalLine);
    crosshair.appendChild(horizontalLine);
    crosshair.appendChild(centerDot);
    
    this.scopeOverlay.appendChild(scopeRing);
    this.scopeOverlay.appendChild(crosshair);
    
    container.appendChild(this.scopeOverlay);
  }

  requiredComponents() {
    return [Transform, MeshComponent];
  }

  initialize(): void {
    // 基本的な環境を設定
    this.createEnvironment();
  }

  private setupLighting(): void {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // 太陽光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // ポイントライト（補助）
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
    pointLight.position.set(0, 10, 0);
    this.scene.add(pointLight);
  }

  private createEnvironment(): void {
    // グリッドヘルパー
    const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x888888);
    this.scene.add(gridHelper);

    // 地面
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x808080,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // アリーナの境界（見えない壁）
    const wallGeometry = new THREE.BoxGeometry(1, 10, 50);
    const wallMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0000ff,
      transparent: true,
      opacity: 0.1,
      visible: false  // 本番では非表示
    });

    // 四方の壁
    const walls = [
      { x: 25, z: 0, ry: 0 },
      { x: -25, z: 0, ry: 0 },
      { x: 0, z: 25, ry: Math.PI / 2 },
      { x: 0, z: -25, ry: Math.PI / 2 }
    ];

    walls.forEach(({ x, z, ry }) => {
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.position.set(x, 5, z);
      wall.rotation.y = ry;
      this.scene.add(wall);
    });
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();

    // プレイヤーエンティティを特定
    if (!this.playerEntity) {
      this.playerEntity = this.world?.getEntitiesWithTag('player')[0] || null;
    }

    // エンティティのメッシュを更新
    for (const entity of entities) {
      const transform = entity.getComponent(Transform)!;
      const meshComponent = entity.getComponent(MeshComponent)!;

      // メッシュがシーンに追加されていない場合は追加
      if (!this.entityMeshMap.has(entity.id)) {
        this.scene.add(meshComponent.mesh);
        this.entityMeshMap.set(entity.id, meshComponent.mesh);
      }

      // Transformをメッシュに適用
      meshComponent.mesh.position.copy(transform.position);
      meshComponent.mesh.rotation.copy(transform.rotation);
      meshComponent.mesh.scale.copy(transform.scale);
    }

    // カメラをプレイヤーに追従させる
    this.updateCameraFollow();

    // 削除されたエンティティのメッシュを削除
    const activeEntityIds = new Set(entities.map(e => e.id));
    for (const [entityId, mesh] of this.entityMeshMap) {
      if (!activeEntityIds.has(entityId)) {
        this.scene.remove(mesh);
        this.entityMeshMap.delete(entityId);
      }
    }

    // レンダリング
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * カメラを取得
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * カメラの回転情報を取得
   */
  getCameraRotation(): { x: number; y: number } {
    return this.cameraRotation;
  }

  /**
   * シーンを取得
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * スコープモードを設定
   */
  setScopeMode(enabled: boolean): void {
    this.isScopeMode = enabled;
    
    // FOVを切り替え
    const targetFOV = enabled ? this.scopeFOV : this.normalFOV;
    this.camera.fov = targetFOV;
    this.camera.updateProjectionMatrix();
    
    // カメラオフセットを切り替え（FPSモード）
    if (enabled) {
      this.cameraOffset.copy(this.scopeCameraOffset);
    } else {
      this.cameraOffset.copy(this.normalCameraOffset);
    }
    
    // スコープUIを表示/非表示
    if (this.scopeOverlay) {
      this.scopeOverlay.style.display = enabled ? 'block' : 'none';
    }

    // プレイヤーメッシュを表示/非表示
    this.setPlayerMeshVisibility(!enabled);

    // エイミングモードをリセット
    if (enabled) {
      this.isAimingMode = false;
    }

    // クロスヘアの表示制御（通常時は非表示、スコープ時は表示）
    if (this.crosshairCallback) {
      this.crosshairCallback(enabled || this.isAimingMode); // スコープ時またはエイミング時に表示
    }
    
    console.log(`Scope mode ${enabled ? 'enabled' : 'disabled'}, FOV: ${targetFOV}, Camera mode: ${enabled ? 'FPS' : 'TPS'}`);
  }

  /**
   * スコープモード状態を取得
   */
  isScopeModeActive(): boolean {
    return this.isScopeMode;
  }

  /**
   * プレイヤーメッシュの表示/非表示を切り替え
   */
  private setPlayerMeshVisibility(visible: boolean): void {
    if (this.playerEntity) {
      const meshComponent = this.playerEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = visible;
      }
    }
  }

  /**
   * クロスヘア制御コールバックを設定
   */
  setCrosshairCallback(callback: (visible: boolean) => void): void {
    this.crosshairCallback = callback;
  }

  /**
   * エイミングモードを設定
   */
  setAimingMode(enabled: boolean): void {
    this.isAimingMode = enabled;
    
    // クロスヘアの表示制御
    if (this.crosshairCallback) {
      this.crosshairCallback(enabled);
    }
    
    console.log(`Aiming mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * エイミングモード状態を取得
   */
  isAimingModeActive(): boolean {
    return this.isAimingMode;
  }

  /**
   * カメラ位置を設定
   */
  setCameraPosition(position: THREE.Vector3, lookAt?: THREE.Vector3): void {
    this.camera.position.copy(position);
    if (lookAt) {
      this.camera.lookAt(lookAt);
    }
  }

  private setupCameraControls(): void {
    const canvas = this.renderer.domElement;
    
    // Pointer Lock APIのサポートを確認
    if ('pointerLockElement' in document) {
      // キャンバスクリックでPointer Lockをリクエスト
      canvas.addEventListener('click', () => {
        if (!this.isPointerLocked && document.pointerLockElement !== canvas) {
          canvas.requestPointerLock().catch(() => {
            // リクエストが失敗した場合は何もしない（ログも出さない）
          });
        }
      });
      
      // Pointer Lockの状態変更を監視
      document.addEventListener('pointerlockchange', () => {
        this.isPointerLocked = document.pointerLockElement === canvas;
        if (this.isPointerLocked) {
          canvas.style.cursor = 'none';
        } else {
          canvas.style.cursor = 'default';
        }
      });
      
      // Pointer Lockエラーをハンドリング（サイレント）
      document.addEventListener('pointerlockerror', () => {
        // エラーは無視（ユーザー操作による正常な動作）
      });
      
      // マウス移動イベント
      canvas.addEventListener('mousemove', (e) => {
        if (this.isPointerLocked) {
          // Pointer Lock中はmovementX/Yを使用
          const deltaX = e.movementX || 0;
          const deltaY = e.movementY || 0;
          
          // 感度調整（スコープモード時は感度を大幅に下げる）
          const baseSensitivity = GAME_CONFIG.CAMERA.MOUSE_SENSITIVITY;
          const sensitivity = this.isScopeMode ? baseSensitivity * 0.2 : baseSensitivity;
          this.cameraRotation.y -= deltaX * sensitivity; // 左右（正常）
          this.cameraRotation.x -= deltaY * sensitivity; // 上下を修正（-に変更）
          
          // 回転制限（標準的な三人称ゲームの制限）
          // Y軸回転は無制限（360度回転可能）
          // 特に制限なし
          
          // X軸回転を制限（上下の角度制限）
          this.cameraRotation.x = Math.max(
            -GAME_CONFIG.CAMERA.MAX_UP_ANGLE,    // 上向きの制限（負の値）
            Math.min(GAME_CONFIG.CAMERA.MAX_DOWN_ANGLE, this.cameraRotation.x)  // 下向きの制限（正の値）
          );
        }
      });
      
      // ESCキーでPointer Lockを解除
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isPointerLocked) {
          document.exitPointerLock();
        }
      });
    } else {
      console.warn('Pointer Lock APIがサポートされていません');
    }
  }

  private updateCameraFollow(): void {
    if (this.playerEntity) {
      const playerTransform = this.playerEntity.getComponent(Transform);
      if (playerTransform) {
        if (this.isScopeMode) {
          // FPSスコープモード
          this.updateFPSCamera(playerTransform);
        } else {
          // 通常のTPSモード
          this.updateTPSCamera(playerTransform);
        }
      }
    }
  }

  /**
   * FPSカメラの更新（スコープモード）
   */
  private updateFPSCamera(playerTransform: Transform): void {
    // プレイヤーの頭の位置
    const headPosition = playerTransform.position.clone().add(this.cameraOffset);
    
    // カメラの回転を適用
    const cameraDirection = new THREE.Vector3(0, 0, -1);
    const cameraQuaternion = new THREE.Quaternion();
    cameraQuaternion.setFromEuler(new THREE.Euler(this.cameraRotation.x, this.cameraRotation.y, 0, 'YXZ'));
    cameraDirection.applyQuaternion(cameraQuaternion);
    
    // カメラ位置を設定
    this.camera.position.copy(headPosition);
    this.camera.quaternion.copy(cameraQuaternion);
  }

  /**
   * TPSカメラの更新（通常モード）
   */
  private updateTPSCamera(playerTransform: Transform): void {
    // TPS標準の球座標系カメラシステム
    const distance = this.cameraOffset.length();
    
    // カメラの角度（極座標系）
    const azimuth = this.cameraRotation.y;    // 水平角度（方位角）
    const zenith = this.cameraRotation.x;     // 垂直角度（天頂角）
    
    // ピボットポイント（キャラクターの頭上少し）
    const pivotPoint = playerTransform.position.clone().add(
      new THREE.Vector3(
        GAME_CONFIG.CAMERA.SHOULDER_OFFSET.x,
        GAME_CONFIG.CAMERA.SHOULDER_OFFSET.y,
        GAME_CONFIG.CAMERA.SHOULDER_OFFSET.z
      )
    );
    
    // 極座標系でカメラ位置を計算
    const sphericalOffset = new THREE.Vector3(
      distance * Math.sin(zenith + Math.PI/2) * Math.sin(azimuth),
      distance * Math.cos(zenith + Math.PI/2),
      distance * Math.sin(zenith + Math.PI/2) * Math.cos(azimuth)
    );
    
    // 最終カメラ位置
    let finalPosition = pivotPoint.clone().add(sphericalOffset);
    
    // 地面衝突防止
    const minHeight = playerTransform.position.y + 0.5;
    if (finalPosition.y < minHeight) {
      finalPosition.y = minHeight;
    }
    
    // 壁衝突検出と補正
    finalPosition = this.performCameraCollisionCheck(pivotPoint, finalPosition);
    
    // カメラ位置を更新
    this.camera.position.lerp(finalPosition, GAME_CONFIG.CAMERA.FOLLOW_SPEED);
    
    // カメラの向きを設定（ピボットポイントを中心に）
    this.camera.lookAt(pivotPoint);
  }

  /**
   * カメラの壁衝突検出と補正
   */
  private performCameraCollisionCheck(pivotPoint: THREE.Vector3, desiredPosition: THREE.Vector3): THREE.Vector3 {
    // ピボットポイントからカメラ位置へのレイキャスト
    const direction = desiredPosition.clone().sub(pivotPoint).normalize();
    const distance = pivotPoint.distanceTo(desiredPosition);
    
    const raycaster = new THREE.Raycaster(pivotPoint, direction, 0.1, distance);
    
    // シーン内のオブジェクトに対してレイキャスト
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    // 有効な衝突を探す
    for (const intersection of intersects) {
      // プレイヤー自身やグリッドを除外
      const objName = intersection.object.name?.toLowerCase() || '';
      if (objName.includes('grid') || intersection.object.userData?.isPlayer) {
        continue;
      }
      
      // 衝突があった場合、カメラを衝突点の手前に移動
      const collisionPoint = intersection.point.clone();
      const offset = 0.3; // 壁からのオフセット
      const adjustedPosition = collisionPoint.sub(direction.multiplyScalar(offset));
      
      console.log('Camera collision detected, adjusting position');
      return adjustedPosition;
    }
    
    // 衝突がない場合は元の位置を返す
    return desiredPosition;
  }

  destroy(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // スコープオーバーレイを削除
    if (this.scopeOverlay && this.scopeOverlay.parentNode) {
      this.scopeOverlay.parentNode.removeChild(this.scopeOverlay);
    }
    
    this.renderer.dispose();
    super.destroy();
  }
}