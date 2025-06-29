import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { Velocity } from '../components/Velocity';
import { MeshComponent } from '../components/Mesh';
import { Projectile, ProjectileType } from '../components/Projectile';
import { Character } from '../components/Character';
import { TriggerType, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';
import { RenderSystem } from '../systems/RenderSystem';

/**
 * 発射物の管理を専門とするクラス
 * 発射物の作成、更新、削除、衝突処理を担当
 */
export class ProjectileManager {
  private world: World;
  private projectilePool: Entity[] = [];

  constructor(world: World) {
    this.world = world;
  }

  /**
   * 発射物を更新
   */
  updateProjectiles(deltaTime: number): void {
    const projectiles = this.world.getEntitiesWithTag('projectile');
    
    for (const projectile of projectiles) {
      const transform = projectile.getComponent(Transform);
      if (!transform) continue;
      
      // 範囲外チェック
      if (transform.position.length() > 100) {
        this.removeProjectile(projectile);
        continue;
      }
      
      // 地面との衝突
      if (transform.position.y < 0) {
        // メテオラの場合は爆発
        if (projectile.hasTag('explosive')) {
          this.createExplosion(transform.position);
        }
        this.removeProjectile(projectile);
      }
    }
  }

  /**
   * 弾丸エンティティを作成
   */
  createProjectileEntity(
    shooter: Entity,
    shooterTransform: Transform,
    triggerType: TriggerType,
    character: Character,
    isLeftHand: boolean
  ): Entity {
    const projectileEntity = this.world.createEntity();
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // カメラからキャラクター位置への射撃方向を計算
    const renderSys = this.world.getSystem(RenderSystem);
    const camera = renderSys?.getCamera();
    
    let direction = new THREE.Vector3(0, 0, -1);
    
    if (camera) {
      // レイキャスティングで画面中央の方向を取得
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      
      // レイキャスターの原点から非常に遠い点を計算（精度向上）
      const rayDirection = raycaster.ray.direction.clone();
      const rayOrigin = raycaster.ray.origin.clone();
      const farPoint = rayOrigin.clone().add(rayDirection.multiplyScalar(10000)); // 10kmに拡張
      
      // キャラクター位置から遠い点への方向を計算
      const characterPosition = shooterTransform.position.clone();
      characterPosition.y += 1.5; // 胸の高さ
      
      direction = farPoint.clone().sub(characterPosition).normalize();
    } else {
      // フォールバック: カメラの向きを使用
      const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
      direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraRotation.x);
    }
    
    // 弾速を設定
    const speed = this.getProjectileSpeed(triggerType);
    const velocity = direction.multiplyScalar(speed);
    
    // 弾丸の種類を決定
    const projectileType = this.getProjectileType(triggerType);
    
    // 弾丸コンポーネント
    const projectile = new Projectile(
      projectileType,
      triggerType,
      velocity,
      definition.damage * (character.stats.attackPower / 100),
      definition.range,
      shooter.id,
      character.team
    );
    projectileEntity.addComponent(Projectile, projectile);
    
    // 弾の発射位置をキャラクターの中心から計算
    const position = shooterTransform.position.clone();
    
    // キャラクターの中心から発射（手のオフセットは一時的に無効）
    position.y += 1.5; // 胸の高さから発射
    
    // 射撃方向に少し前方にオフセット（キャラクターの体から弾が出るように）
    position.add(direction.clone().multiplyScalar(0.5));
    
    // 弾の回転を射撃方向に合わせる
    const rotation = new THREE.Euler();
    if (camera) {
      // 射撃方向から回転を計算
      const lookDirection = direction.clone();
      rotation.setFromVector3(lookDirection);
    } else {
      const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
      rotation.set(cameraRotation.x, cameraRotation.y, 0);
    }
    
    projectileEntity.addComponent(Transform, new Transform(
      position,
      rotation,
      new THREE.Vector3(1, 1, 1)
    ));
    
    // 弾丸の速度
    projectileEntity.addComponent(Velocity, new Velocity(velocity));
    
    // 弾丸の見た目
    const projectileMesh = this.createProjectileMesh(triggerType);
    projectileEntity.addComponent(MeshComponent, new MeshComponent(projectileMesh));
    
    // 弾丸タグを追加
    projectileEntity.addTag('projectile');
    
    // 爆発性弾丸の場合は専用タグを追加
    if (projectileType === ProjectileType.EXPLOSIVE) {
      projectileEntity.addTag('explosive');
    }
    
    console.log(`ProjectileManager: Created projectile for ${triggerType}`);
    return projectileEntity;
  }

  /**
   * 発射物を削除
   */
  removeProjectile(projectile: Entity): void {
    // タグをクリア
    projectile.clearTags();
    
    // プールに戻す（再利用のため）
    if (this.projectilePool.length < 50) {
      this.projectilePool.push(projectile);
    } else {
      this.world.removeEntity(projectile);
    }
  }

  /**
   * 爆発エフェクトを作成
   */
  createExplosion(position: THREE.Vector3): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    console.log('ProjectileManager: Creating explosion at:', position);

    // 爆発エフェクトのジオメトリとマテリアル
    const explosionGeometry = new THREE.SphereGeometry(2, 8, 8);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8
    });

    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(position);
    scene.add(explosion);

    // アニメーション: 拡大しながらフェードアウト
    let scale = 0.1;
    let opacity = 0.8;
    
    const animateExplosion = () => {
      scale += 0.2;
      opacity -= 0.05;
      
      explosion.scale.setScalar(scale);
      explosionMaterial.opacity = opacity;
      
      if (opacity > 0) {
        requestAnimationFrame(animateExplosion);
      } else {
        scene.remove(explosion);
        explosionGeometry.dispose();
        explosionMaterial.dispose();
      }
    };
    
    animateExplosion();
  }

  /**
   * 発射物の3Dメッシュを作成
   */
  private createProjectileMesh(triggerType: TriggerType): THREE.Mesh {
    const projectileType = this.getProjectileType(triggerType);
    
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    
    switch (projectileType) {
      case ProjectileType.NORMAL:
        geometry = new THREE.SphereGeometry(0.02, 4, 4);
        material = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        break;
        
      case ProjectileType.PIERCING:
        geometry = new THREE.ConeGeometry(0.01, 0.1, 4);
        material = new THREE.MeshBasicMaterial({ color: 0xff0088 });
        break;
        
      case ProjectileType.EXPLOSIVE:
        geometry = new THREE.SphereGeometry(0.05, 6, 6);
        material = new THREE.MeshBasicMaterial({ 
          color: 0xff4400,
          transparent: true,
          opacity: 0.8 
        });
        break;
        
      case ProjectileType.SNIPER:
        geometry = new THREE.CylinderGeometry(0.005, 0.005, 0.2, 6);
        material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        break;
        
      default:
        geometry = new THREE.SphereGeometry(0.02, 4, 4);
        material = new THREE.MeshBasicMaterial({ color: 0x888888 });
        break;
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // 弾丸の向きを調整（進行方向に向ける）
    if (projectileType === ProjectileType.PIERCING || projectileType === ProjectileType.SNIPER) {
      mesh.rotation.x = Math.PI / 2; // Z軸方向に向ける
    }
    
    return mesh;
  }

  /**
   * 発射物の種類を取得
   */
  private getProjectileType(triggerType: TriggerType): ProjectileType {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    switch (definition.category) {
      case 'sniper':
        return ProjectileType.SNIPER;
      case 'gunner':
        return ProjectileType.EXPLOSIVE;
      case 'shooter':
        return ProjectileType.NORMAL;
      default:
        return ProjectileType.NORMAL;
    }
  }

  /**
   * 発射物の速度を取得
   */
  private getProjectileSpeed(triggerType: TriggerType): number {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    switch (definition.category) {
      case 'sniper':
        return 50; // 狙撃銃は高速
      case 'gunner':
        return 30; // ガンナーは中速
      case 'shooter':
        return 40; // シューターは高速
      default:
        return 25; // デフォルト
    }
  }

  /**
   * ダメージを適用
   */
  applyDamage(target: Entity, damage: number): void {
    const character = target.getComponent(Character);
    if (character) {
      character.takeDamage(damage);
      console.log(`ProjectileManager: Applied ${damage} damage to target`);
    }
  }

  /**
   * プールからプロジェクタイルを取得（パフォーマンス最適化）
   */
  getPooledProjectile(): Entity | null {
    return this.projectilePool.pop() || null;
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // プール内の全エンティティを削除
    for (const projectile of this.projectilePool) {
      this.world.removeEntity(projectile);
    }
    this.projectilePool.clear();
    
    // アクティブな発射物も削除
    const activeProjectiles = this.world.getEntitiesWithTag('projectile');
    for (const projectile of activeProjectiles) {
      this.world.removeEntity(projectile);
    }
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): { activeProjectiles: number; pooledProjectiles: number } {
    const activeProjectiles = this.world.getEntitiesWithTag('projectile');
    return {
      activeProjectiles: activeProjectiles.length,
      pooledProjectiles: this.projectilePool.length
    };
  }
}