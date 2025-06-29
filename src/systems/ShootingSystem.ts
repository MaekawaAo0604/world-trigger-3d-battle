import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Trigger } from '../components/Trigger';
import { MeshComponent } from '../components/Mesh';
import { Velocity } from '../components/Velocity';
import { Projectile, ProjectileType } from '../components/Projectile';
import { RenderSystem } from './RenderSystem';
import { TRIGGER_DEFINITIONS, TriggerType } from '../triggers/TriggerDefinitions';
import { Collider, ColliderType, CollisionLayer } from '../components/Collider';

/**
 * レイキャスト結果
 */
interface RaycastResult {
  hit: boolean;
  point: THREE.Vector3;
  distance: number;
  object?: THREE.Object3D;
  normal?: THREE.Vector3;
}

/**
 * 射撃計算結果
 */
interface ShootingCalculation {
  targetPoint: THREE.Vector3;
  direction: THREE.Vector3;
  canShoot: boolean;
  blockedByObstacle: boolean;
  actualDistance: number;
}

/**
 * デバッグ視覚化オプション
 */
interface DebugOptions {
  showCameraRay: boolean;
  showWeaponRay: boolean;
  showTargetPoint: boolean;
  showTrajectory: boolean;
}

/**
 * 高精度射撃システム
 * 3人称視点でのレティクルと着弾点のズレを解決
 */
export class ShootingSystem extends System {
  private debugOptions: DebugOptions = {
    showCameraRay: false,
    showWeaponRay: false,
    showTargetPoint: false,
    showTrajectory: false
  };

  private debugObjects: THREE.Object3D[] = [];
  private maxWeaponRange: number = 7.0; // 武器レイキャストの最大距離（TPS標準）
  private maxShootingRange: number = 200.0; // 最大射程距離
  
  // 武器種類別の設定
  private weaponSettings = {
    sniper: {
      weaponRange: 10.0, // スナイパーはより長い射程で障害物チェック
      aimOffset: new THREE.Vector3(0.1, 0.05, 0), // 右肩からのオフセット
      minDistance: 2.0 // 最小射撃距離
    },
    attacker: {
      weaponRange: 5.0,
      aimOffset: new THREE.Vector3(0.2, 0.0, 0.2),
      minDistance: 0.5
    },
    shooter: {
      weaponRange: 7.0,
      aimOffset: new THREE.Vector3(0.15, 0.1, 0.1),
      minDistance: 1.0
    },
    gunner: {
      weaponRange: 6.0,
      aimOffset: new THREE.Vector3(0.15, 0.05, 0.15),
      minDistance: 0.8
    }
  };

  requiredComponents() {
    return [Transform, Character, Trigger];
  }

  /**
   * システムの更新
   * ShootingSystemは主にオンデマンドで使用されるため、
   * 通常の更新処理は最小限
   */
  update(deltaTime: number): void {
    // デバッグオブジェクトの管理
    // 他のシステムが要求時に射撃処理を呼び出すため、
    // ここでは特別な処理は不要
  }

  /**
   * TPSカメラトレース（スクリーン中央からのレイキャスト）
   * クロスヘアが指す位置を特定
   */
  public performCameraRaycast(camera: THREE.Camera): RaycastResult {
    // 正確なクロスヘア位置へのレイキャスト
    const raycaster = new THREE.Raycaster();
    
    // 画面中央（クロスヘア位置）からレイキャストを正確に設定
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    // デバッグ：レイキャストの設定を確認
    console.log('Crosshair raycast debug:');
    console.log('  camera position:', camera.position.toArray());
    console.log('  ray origin:', raycaster.ray.origin.toArray());
    console.log('  ray direction:', raycaster.ray.direction.toArray());
    
    // レイキャスト対象を取得
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    
    if (!scene) {
      // フォールバック: レイキャストの方向を使用
      const point = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(this.maxShootingRange));
      
      return {
        hit: false,
        point: point,
        distance: this.maxShootingRange
      };
    }

    // レイキャストの範囲を設定
    raycaster.near = 0.5;  // カメラ近くの干渉を避ける
    raycaster.far = this.maxShootingRange;
    
    // シーン内のオブジェクトに対してレイキャスト実行
    const intersects = raycaster.intersectObjects(scene.children, true);
    console.log('Raycast intersects:', intersects.length, 'objects');
    
    // 有効なヒットを探す
    let validHit: THREE.Intersection | null = null;
    let groundHit: THREE.Intersection | null = null;
    
    for (const intersection of intersects) {
      // プレイヤー自身を除外
      if (this.isPlayerMesh(intersection.object)) continue;
      
      // グリッドヘルパーを除外
      const objName = intersection.object.name?.toLowerCase() || '';
      if (objName.includes('grid')) continue;
      
      // 地面ヒットかどうかを判定（Y座標が低く、法線が上向き）
      const isGround = intersection.point.y < 1.0 && 
                      intersection.face?.normal && intersection.face.normal.y > 0.7;
      
      // カメラが障害物に近すぎる場合のチェック
      if (intersection.distance < 1.5) {
        // 地面のヒットの場合は記録しておく
        if (isGround && !groundHit) {
          groundHit = intersection;
        }
        continue;
      }
      
      // 有効なヒットとして採用
      validHit = intersection;
      break;
    }
    
    // 有効なヒットがない場合は地面ヒットを使用
    if (!validHit && groundHit) {
      validHit = groundHit;
    }
    
    if (validHit) {
      console.log('Valid hit at:', validHit.point.toArray());
      return {
        hit: true,
        point: validHit.point.clone(),
        distance: validHit.distance,
        object: validHit.object,
        normal: validHit.face?.normal.clone()
      };
    } else {
      // ヒットしない場合はレイキャストの方向を使用
      const point = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(this.maxShootingRange));
      console.log('No hit, using fallback point:', point.toArray());
      
      return {
        hit: false,
        point: point,
        distance: this.maxShootingRange
      };
    }
  }

  /**
   * 武器からのレイキャスト処理
   * 障害物チェックとカバー越し射撃の防止
   */
  public performWeaponRaycast(
    weaponPosition: THREE.Vector3, 
    targetPoint: THREE.Vector3, 
    triggerType?: TriggerType
  ): RaycastResult {
    const direction = targetPoint.clone().sub(weaponPosition).normalize();
    const distance = weaponPosition.distanceTo(targetPoint);
    
    // 武器種類に応じた最大射程を取得
    let weaponRange = this.maxWeaponRange;
    if (triggerType) {
      const definition = TRIGGER_DEFINITIONS[triggerType];
      const weaponSetting = this.weaponSettings[definition.category as keyof typeof this.weaponSettings];
      if (weaponSetting) {
        weaponRange = weaponSetting.weaponRange;
      }
    }
    
    // 武器からのレイキャスト距離を制限
    const actualDistance = Math.min(distance, weaponRange);
    
    const raycaster = new THREE.Raycaster(weaponPosition, direction, 0, actualDistance);
    
    // シーン内のオブジェクトに対してレイキャスト実行
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    
    if (!scene) {
      return {
        hit: false,
        point: weaponPosition.clone().add(direction.multiplyScalar(actualDistance)),
        distance: actualDistance
      };
    }

    // 自分自身（プレイヤー）を除外してレイキャスト
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // プレイヤーオブジェクトを除外
    const validIntersects = intersects.filter(intersection => {
      // プレイヤーのメッシュかどうかを判定（簡易的な実装）
      return !this.isPlayerMesh(intersection.object);
    });

    if (validIntersects.length > 0) {
      const intersection = validIntersects[0];
      return {
        hit: true,
        point: intersection.point.clone(),
        distance: intersection.distance,
        object: intersection.object,
        normal: intersection.face?.normal.clone()
      };
    } else {
      return {
        hit: false,
        point: weaponPosition.clone().add(direction.multiplyScalar(actualDistance)),
        distance: actualDistance
      };
    }
  }

  /**
   * TPSデュアルトレース弾道計算
   * カメラトレースとマズルトレースを組み合わせた高精度射撃
   */
  public calculateTrajectory(
    weaponPosition: THREE.Vector3,
    cameraResult: RaycastResult,
    triggerType: TriggerType,
    isLeftHand: boolean = false
  ): ShootingCalculation {
    let targetPoint = cameraResult.point.clone();
    let canShoot = true;
    let blockedByObstacle = false;
    let actualDistance = weaponPosition.distanceTo(targetPoint);

    // 武器設定を取得
    const definition = TRIGGER_DEFINITIONS[triggerType];
    const weaponSetting = this.weaponSettings[definition.category as keyof typeof this.weaponSettings];
    
    // クロスヘア指向点への正確な射撃
    // カメラレイキャストで取得した正確な位置を使用
    targetPoint = cameraResult.point.clone();
    
    // 3人称視点での視差補正
    // 近距離では武器とカメラの位置差が影響するため調整
    const renderSystem = this.world?.getSystem(RenderSystem);
    const camera = renderSystem?.getCamera();
    const cameraToWeaponOffset = weaponPosition.clone().sub(camera?.position || new THREE.Vector3());
    
    // 距離に応じた補正強度（近いほど強く補正）
    const distance = cameraResult.distance;
    const parallaxCorrection = Math.max(0, Math.min(1, (10 - distance) / 10));
    
    // Y軸方向の視差を重点的に補正（上下のずれ）
    const correctedTarget = targetPoint.clone();
    correctedTarget.y += cameraToWeaponOffset.y * parallaxCorrection * 0.5;
    
    // 武器位置から補正されたターゲット位置への方向を計算
    const direction = correctedTarget.clone().sub(weaponPosition).normalize();
    
    console.log('Parallax correction:');
    console.log('  distance:', distance);
    console.log('  correction strength:', parallaxCorrection);
    console.log('  camera-weapon offset:', cameraToWeaponOffset.toArray());
    console.log('  corrected target:', correctedTarget.toArray());
    actualDistance = weaponPosition.distanceTo(targetPoint);
    
    // デバッグ用ログ
    console.log('Shooting calculation:');
    console.log('  weaponPosition:', weaponPosition.toArray());
    console.log('  targetPoint:', targetPoint.toArray());
    console.log('  direction:', direction.toArray());
    console.log('  distance:', actualDistance);
    console.log('  cameraHit:', cameraResult.hit);
    
    // 方向ベクトルの基本的な妥当性チェック
    if (isNaN(direction.x) || isNaN(direction.y) || isNaN(direction.z)) {
      console.warn('Invalid direction vector detected, using fallback');
      direction.set(0, 0, -1); // 前方向へのフォールバック
    }
    
    // 方向ベクトルを正規化
    direction.normalize();
    
    return {
      targetPoint,
      direction,
      canShoot,
      blockedByObstacle,
      actualDistance
    };
  }

  /**
   * 弾丸を発射
   */
  public fireProjectile(
    shooter: Entity,
    shooterTransform: Transform,
    character: Character,
    triggerType: TriggerType,
    isLeftHand: boolean = false
  ): Entity | null {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const camera = renderSystem?.getCamera();
    
    if (!camera) {
      console.warn('Camera not available for shooting calculation');
      return null;
    }

    // 武器位置を計算
    const weaponPosition = this.calculateWeaponPosition(shooterTransform, triggerType, isLeftHand);
    console.log('Weapon position:', weaponPosition.toArray());
    
    // TPSデュアルトレースシステムのカメラトレース
    const cameraResult = this.performCameraRaycast(camera);
    console.log('Camera raycast result:', {
      hit: cameraResult.hit,
      point: cameraResult.point.toArray(),
      distance: cameraResult.distance
    });
    
    // 弾道計算
    const calculation = this.calculateTrajectory(weaponPosition, cameraResult, triggerType, isLeftHand);
    console.log('Final trajectory calculation:', {
      targetPoint: calculation.targetPoint.toArray(),
      direction: calculation.direction.toArray(),
      canShoot: calculation.canShoot
    });
    
    if (!calculation.canShoot) {
      console.log('Cannot shoot: trajectory blocked');
      return null;
    }

    // 精度制御：射撃方向に散布を適用
    const finalDirection = this.applyAccuracy(calculation.direction, triggerType, shooter);

    // デバッグ視覚化は無効化（誘導線を表示しない）
    // if (this.debugOptions.showCameraRay || this.debugOptions.showWeaponRay || this.debugOptions.showTargetPoint) {
    //   this.debugVisualization(weaponPosition, cameraResult, calculation, camera);
    // }

    // 弾丸エンティティを作成
    const projectileEntity = this.createProjectileEntity(
      shooter,
      weaponPosition,
      finalDirection,
      triggerType,
      character
    );

    return projectileEntity;
  }

  /**
   * 射撃精度を適用（散布角度を追加）
   */
  private applyAccuracy(direction: THREE.Vector3, triggerType: TriggerType, shooter: Entity): THREE.Vector3 {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // 基本散布角度（ラジアン）
    let baseSpread = 0;
    
    // 武器カテゴリ別の基本精度
    switch (definition.category) {
      case 'sniper':
        baseSpread = 0.01; // 0.57度 - 非常に高精度
        break;
      case 'gunner':
        baseSpread = 0.03; // 1.72度 - 中程度の精度
        break;
      case 'shooter':
        baseSpread = 0.02; // 1.15度 - 高精度
        break;
      case 'attacker':
        baseSpread = 0.05; // 2.87度 - 低精度
        break;
      default:
        baseSpread = 0.04; // 2.29度 - デフォルト
    }

    // エイミング状態による精度修正
    let accuracyMultiplier = 1.0;
    
    if (renderSystem?.isScopeModeActive()) {
      // スコープ時：散布を50%に削減（高精度）
      accuracyMultiplier = 0.5;
    } else if (renderSystem?.isAimingModeActive()) {
      // エイミング時：散布を70%に削減（精度向上）
      accuracyMultiplier = 0.7;
    } else {
      // 通常時：散布を150%に増加（低精度）
      accuracyMultiplier = 1.5;
    }

    // 最終散布角度
    const finalSpread = baseSpread * accuracyMultiplier;

    // 散布をランダムに適用
    if (finalSpread > 0) {
      // ランダム角度生成
      const randomAngle = (Math.random() - 0.5) * 2 * Math.PI;
      const randomDistance = Math.random() * finalSpread;

      // 射撃方向に垂直な平面でランダム散布
      const perpendicular1 = new THREE.Vector3();
      const perpendicular2 = new THREE.Vector3();
      
      // 射撃方向に垂直な2つのベクトルを生成
      if (Math.abs(direction.y) < 0.9) {
        perpendicular1.crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
      } else {
        perpendicular1.crossVectors(direction, new THREE.Vector3(1, 0, 0)).normalize();
      }
      perpendicular2.crossVectors(direction, perpendicular1).normalize();

      // 散布ベクトルを計算
      const spreadX = Math.cos(randomAngle) * randomDistance;
      const spreadY = Math.sin(randomAngle) * randomDistance;
      
      const spreadVector = new THREE.Vector3();
      spreadVector.addScaledVector(perpendicular1, spreadX);
      spreadVector.addScaledVector(perpendicular2, spreadY);

      // 最終方向を計算
      const finalDirection = direction.clone();
      finalDirection.add(spreadVector);
      finalDirection.normalize();

      return finalDirection;
    }

    return direction.clone();
  }

  /**
   * 武器位置を計算（プレイヤーの向きを考慮）
   */
  private calculateWeaponPosition(transform: Transform, triggerType: TriggerType, isLeftHand: boolean): THREE.Vector3 {
    const position = transform.position.clone();
    
    // カメラの向きを取得してプレイヤーの向きを決定
    const renderSystem = this.world?.getSystem(RenderSystem);
    const cameraRotation = renderSystem?.getCameraRotation() || { x: 0, y: 0 };
    
    // プレイヤーの右方向ベクトルを計算
    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
    
    // プレイヤーの前方ベクトルを計算
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
    
    // 手の位置オフセット（実際の手の位置に合わせて修正）
    const handDistance = 0.35; // 体の中心からの距離（実際の手の位置）
    const handHeight = 0.85;   // 高さオフセット（実際の手の位置）
    const handForward = 0.05;  // 前方オフセット
    
    // 左右の手の位置を計算
    const handSide = isLeftHand ? handDistance : -handDistance;
    
    // 最終的な武器位置
    position.addScaledVector(right, handSide);
    position.y += handHeight;
    position.addScaledVector(forward, handForward);
    
    return position;
  }

  /**
   * 弾丸エンティティを作成
   */
  private createProjectileEntity(
    shooter: Entity,
    position: THREE.Vector3,
    direction: THREE.Vector3,
    triggerType: TriggerType,
    character: Character
  ): Entity {
    const projectileEntity = this.world!.createEntity();
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // 弾速を設定（キャラクターのトリオン量を考慮）
    const speed = this.getProjectileSpeed(triggerType, character);
    const velocity = direction.clone().multiplyScalar(speed);
    
    // デバッグ用ログ
    console.log('Projectile velocity calculation:');
    console.log('  direction:', direction.toArray());
    console.log('  speed:', speed);
    console.log('  velocity:', velocity.toArray());
    
    // 弾丸の種類を決定
    const projectileType = this.getProjectileType(triggerType);
    
    // ダメージ計算（アイビスの特殊効果あり）
    let finalDamage = definition.damage;
    
    // アイビスの特殊効果：トリオン量によるダメージアップ
    if (triggerType === TriggerType.IBIS) {
      const trionRatio = character.stats.currentTrion / character.stats.trionCapacity;
      const damageMultiplier = 1 + (trionRatio * 1.2); // 最大2.2倍
      finalDamage *= damageMultiplier;
      console.log(`Ibis damage boost: ${damageMultiplier.toFixed(2)}x (Trion: ${character.stats.currentTrion}/${character.stats.trionCapacity})`);
    }
    
    // 射程距離計算（イーグレットの特殊効果あり）
    let finalRange = definition.range;
    
    // イーグレットの特殊効果：射程距離アップ
    if (triggerType === TriggerType.EAGLET) {
      const trionRatio = character.stats.currentTrion / character.stats.trionCapacity;
      const rangeMultiplier = 1 + (trionRatio * 0.6); // 最大1.6倍
      finalRange *= rangeMultiplier;
      console.log(`Eaglet range boost: ${rangeMultiplier.toFixed(2)}x (Trion: ${character.stats.currentTrion}/${character.stats.trionCapacity})`);
    }
    
    // 弾丸コンポーネント
    const projectile = new Projectile(
      projectileType,
      triggerType,
      velocity,
      finalDamage,
      finalRange,
      shooter.id,
      character.team
    );
    projectileEntity.addComponent(Projectile, projectile);
    
    // Transform
    // 方向ベクトルから回転を計算
    // CylinderGeometryの初期方向はY軸（0,1,0）なので、それを基準にする
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const rotation = new THREE.Euler();
    rotation.setFromQuaternion(quaternion);
    
    projectileEntity.addComponent(Transform, new Transform(
      position.clone(),
      rotation,
      new THREE.Vector3(0.5, 0.5, 0.5)
    ));
    
    // Velocity
    projectileEntity.addComponent(Velocity, new Velocity(velocity));
    
    // Collider（衝突判定）
    const colliderRadius = 0.2; // 弾の当たり判定サイズ
    const collider = new Collider(
      ColliderType.SPHERE,
      new THREE.Vector3(colliderRadius, colliderRadius, colliderRadius), // Sphereの場合、x成分をradiusとして使用
      CollisionLayer.PROJECTILE,
      CollisionLayer.CHARACTER | CollisionLayer.ENEMY | CollisionLayer.SHIELD
    );
    projectileEntity.addComponent(Collider, collider);
    
    // メッシュを作成
    const mesh = this.createProjectileMesh(triggerType);
    projectileEntity.addComponent(MeshComponent, new MeshComponent(mesh));
    
    return projectileEntity;
  }

  /**
   * 弾速を取得（トリオン量による補正あり）
   */
  private getProjectileSpeed(triggerType: TriggerType, character: Character): number {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    let baseSpeed: number;
    
    // 基本弾速を設定
    switch (definition.category) {
      case 'sniper':
        baseSpeed = 50; // スナイパーの基本弾速
        break;
      case 'gunner':
        baseSpeed = 40;
        break;
      case 'shooter':
        baseSpeed = 35;
        break;
      default:
        baseSpeed = 30;
    }
    
    // ライトニングの特殊効果：トリオン量による弾速アップ
    if (triggerType === TriggerType.LIGHTNING) {
      const trionRatio = character.stats.currentTrion / character.stats.trionCapacity;
      const speedMultiplier = 1 + (trionRatio * 0.8); // 最大1.8倍
      baseSpeed *= speedMultiplier;
      console.log(`Lightning speed boost: ${speedMultiplier.toFixed(2)}x (Trion: ${character.stats.currentTrion}/${character.stats.trionCapacity})`);
    }
    
    // ハウンドの弾速調整（追跡しやすいように少し遅め）
    if (triggerType === TriggerType.HOUND) {
      baseSpeed = 25; // 追跡性能を活かすため遅めの弾速
    }
    
    return baseSpeed;
  }

  /**
   * 弾丸の種類を取得
   */
  private getProjectileType(triggerType: TriggerType): ProjectileType {
    switch (triggerType) {
      case TriggerType.METEORA:
        return ProjectileType.EXPLOSIVE;
      case TriggerType.IBIS:
        return ProjectileType.PIERCING;
      case TriggerType.HOUND:
        return ProjectileType.HOMING;
      case TriggerType.VIPER:
        return ProjectileType.BULLET; // バイパーは通常弾（軌道変更はプレイヤーが操作）
      case TriggerType.SALAMANDER:
        return ProjectileType.EXPLOSIVE;
      // Spiderは補助トリガーなので弾丸は発射しない
      default:
        return ProjectileType.BULLET;
    }
  }

  /**
   * 弾丸メッシュを作成
   */
  private createProjectileMesh(triggerType: TriggerType): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshBasicMaterial;
    
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // 特定のトリガータイプに対する特別な視覚効果
    switch (triggerType) {
      case TriggerType.HOUND:
        // ハウンド：追尾弾は緑色の光弾（少し大きめ）
        geometry = new THREE.SphereGeometry(0.1, 8, 8);
        material = new THREE.MeshBasicMaterial({
          color: 0x00ff44,
          transparent: true,
          opacity: 0.9
        });
        
        // 光る軌跡エフェクトを追加
        const glowGeometry = new THREE.SphereGeometry(0.15, 6, 6);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff44,
          transparent: true,
          opacity: 0.3
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        
        const group = new THREE.Group();
        group.add(new THREE.Mesh(geometry, material));
        group.add(glowMesh);
        return group as any; // Groupを返すため、型アサーションを使用
      case TriggerType.VIPER:
        // バイパー：軌道変更弾は紫色の光弾
        geometry = new THREE.SphereGeometry(0.07, 8, 8);
        material = new THREE.MeshBasicMaterial({
          color: 0x8800ff,
          transparent: true,
          opacity: 0.9
        });
        break;
      case TriggerType.SALAMANDER:
        // サラマンダー：爆発弾は赤い光弾
        geometry = new THREE.SphereGeometry(0.09, 8, 8);
        material = new THREE.MeshBasicMaterial({
          color: 0xff2200,
          transparent: true,
          opacity: 0.9
        });
        break;
      // Spiderは補助トリガーなのでメッシュ作成は不要
      default:
        // カテゴリ別のデフォルト設定
        switch (definition.category) {
          case 'sniper':
            // スナイパー弾は長い円柱
            geometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
            material = new THREE.MeshBasicMaterial({
              color: 0xff4444
            });
            break;
          case 'shooter':
            // 爆発弾は大きめの球
            geometry = new THREE.SphereGeometry(0.1, 8, 8);
            material = new THREE.MeshBasicMaterial({
              color: 0xffff00
            });
            break;
          case 'gunner':
            // ガンナー弾は小さくて速い
            geometry = new THREE.SphereGeometry(0.06, 6, 6);
            material = new THREE.MeshBasicMaterial({
              color: 0x00aaff,
              transparent: true,
              opacity: 0.9
            });
            break;
          default:
            // 通常弾は小さい球
            geometry = new THREE.SphereGeometry(0.08, 8, 8);
            material = new THREE.MeshBasicMaterial({
              color: 0x00ffff
            });
            break;
        }
        break;
    }
    
    return new THREE.Mesh(geometry, material);
  }

  /**
   * プレイヤーメッシュかどうかを判定
   */
  private isPlayerMesh(object: THREE.Object3D): boolean {
    // プレイヤーのメッシュを判定する方法
    if (object.userData?.isPlayer === true) {
      return true;
    }
    
    // オブジェクト名による判定
    const objName = object.name?.toLowerCase() || '';
    if (objName.includes('player') || objName.includes('character') || objName.includes('weapon')) {
      return true;
    }
    
    // 親オブジェクトもチェック（プレイヤーの子オブジェクト対応）
    let parent = object.parent;
    while (parent) {
      if (parent.userData?.isPlayer === true) {
        return true;
      }
      const parentName = parent.name?.toLowerCase() || '';
      if (parentName.includes('player') || parentName.includes('character') || parentName.includes('weapon')) {
        return true;
      }
      parent = parent.parent;
    }
    
    return false;
  }

  /**
   * デバッグ視覚化
   */
  public debugVisualization(
    weaponPosition: THREE.Vector3,
    cameraResult: RaycastResult,
    calculation: ShootingCalculation,
    camera: THREE.Camera
  ): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    
    if (!scene) return;

    // 既存のデバッグオブジェクトを削除
    this.clearDebugObjects(scene);

    // カメラレイの表示
    if (this.debugOptions.showCameraRay) {
      const cameraLine = this.createDebugLine(
        camera.position,
        cameraResult.point,
        cameraResult.hit ? 0x00ff00 : 0xffff00
      );
      scene.add(cameraLine);
      this.debugObjects.push(cameraLine);
    }

    // 武器レイの表示
    if (this.debugOptions.showWeaponRay) {
      const weaponLine = this.createDebugLine(
        weaponPosition,
        calculation.targetPoint,
        calculation.blockedByObstacle ? 0xff0000 : 0x0000ff
      );
      scene.add(weaponLine);
      this.debugObjects.push(weaponLine);
    }

    // 目標地点の表示
    if (this.debugOptions.showTargetPoint) {
      const targetMarker = this.createDebugMarker(
        calculation.targetPoint,
        calculation.blockedByObstacle ? 0xff0000 : 0x00ff00
      );
      scene.add(targetMarker);
      this.debugObjects.push(targetMarker);
    }

    // 弾道の表示
    if (this.debugOptions.showTrajectory) {
      const trajectoryLine = this.createDebugLine(
        weaponPosition,
        calculation.targetPoint,
        0xff00ff
      );
      scene.add(trajectoryLine);
      this.debugObjects.push(trajectoryLine);
    }

    // デバッグオブジェクトを自動的に削除（1秒後）
    setTimeout(() => {
      this.clearDebugObjects(scene);
    }, 1000);
  }

  /**
   * デバッグライン作成
   */
  private createDebugLine(start: THREE.Vector3, end: THREE.Vector3, color: number): THREE.LineSegments {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: color, opacity: 0.8, transparent: true });
    return new THREE.LineSegments(geometry, material);
  }

  /**
   * デバッグマーカー作成
   */
  private createDebugMarker(position: THREE.Vector3, color: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: color, opacity: 0.7, transparent: true });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(position);
    return marker;
  }

  /**
   * デバッグオブジェクトをクリア
   */
  private clearDebugObjects(scene: THREE.Scene): void {
    this.debugObjects.forEach(obj => {
      scene.remove(obj);
      if ('geometry' in obj && obj.geometry) obj.geometry.dispose();
      if ('material' in obj && obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat: any) => mat.dispose());
        } else {
          (obj.material as any).dispose();
        }
      }
    });
    this.debugObjects = [];
  }

  /**
   * デバッグオプションを設定
   */
  public setDebugOptions(options: Partial<DebugOptions>): void {
    this.debugOptions = { ...this.debugOptions, ...options };
  }

  /**
   * デバッグモードの切り替え
   */
  public toggleDebugMode(): void {
    const allEnabled = Object.values(this.debugOptions).every(v => v);
    const newState = !allEnabled;
    
    this.debugOptions = {
      showCameraRay: newState,
      showWeaponRay: newState,
      showTargetPoint: newState,
      showTrajectory: newState
    };
    
    console.log(`Debug visualization: ${newState ? 'enabled' : 'disabled'}`);
  }

  /**
   * 最大武器射程を設定
   */
  public setMaxWeaponRange(range: number): void {
    this.maxWeaponRange = Math.max(0.5, Math.min(range, 20.0));
  }

  /**
   * 最大射撃射程を設定
   */
  public setMaxShootingRange(range: number): void {
    this.maxShootingRange = Math.max(10, Math.min(range, 1000));
  }

  destroy(): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (scene) {
      this.clearDebugObjects(scene);
    }
    super.destroy();
  }
}