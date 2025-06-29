import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Velocity } from '../components/Velocity';
import { Projectile, ProjectileType } from '../components/Projectile';
import { MeshComponent } from '../components/Mesh';
import { Character } from '../components/Character';
import { Collider } from '../components/Collider';
import { RenderSystem } from './RenderSystem';
import { TriggerType } from '../triggers/TriggerDefinitions';

/**
 * 弾丸の移動、特殊動作、寿命を管理するシステム
 */
export class ProjectileSystem extends System {
  private homingTargets: Map<number, Entity> = new Map(); // 追尾対象のキャッシュ
  requiredComponents() {
    return [Transform, Velocity, Projectile];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();
    const entitiesToRemove: Entity[] = [];

    for (const entity of entities) {
      const transform = entity.getComponent(Transform)!;
      const velocity = entity.getComponent(Velocity)!;
      const projectile = entity.getComponent(Projectile)!;

      // 特殊動作の処理
      this.handleSpecialBehavior(entity, projectile, transform, velocity, deltaTime);
      
      // 弾丸を移動
      const displacement = velocity.linear.clone().multiplyScalar(deltaTime);
      const moveDistance = displacement.length();
      
      transform.position.add(displacement);
      
      // 弾の年齢を更新
      projectile.age += deltaTime;
      
      // 毎フレームではなく、定期的にログ出力
      if (entity.id % 60 === 0) { // 約1秒おき
        console.log(`Projectile ${entity.id} flying at position:`, transform.position, 'age:', projectile.age.toFixed(1));
      }

      // 寿命を超えた場合は削除
      if (projectile.age >= projectile.lifeTime) {
        console.log(`Projectile ${entity.id} expired (age: ${projectile.age.toFixed(1)}s), removing`);
        entitiesToRemove.push(entity);
        continue;
      }

      // 移動距離を更新し、射程を超えた場合は削除
      if (projectile.updateTravelDistance(moveDistance)) {
        console.log(`Projectile ${entity.id} exceeded range, removing`);
        entitiesToRemove.push(entity);
        continue;
      }

      // 地面に衝突した場合は爆発処理または散弾処理
      if (transform.position.y <= 0) {
        console.log(`Projectile ${entity.id} hit ground`);
        this.handleProjectileImpact(entity, projectile, transform.position);
        entitiesToRemove.push(entity);
        continue;
      }

      // アリーナの境界を超えた場合は削除
      const bounds = 50;
      if (Math.abs(transform.position.x) > bounds || 
          Math.abs(transform.position.z) > bounds ||
          transform.position.y > 50) {
        console.log(`Projectile ${entity.id} out of bounds, removing`);
        entitiesToRemove.push(entity);
        continue;
      }
    }

    // 削除対象の弾丸を削除
    for (const entity of entitiesToRemove) {
      this.removeProjectile(entity);
    }
  }

  /**
   * 特殊動作の処理（追尾、散弾など）
   */
  private handleSpecialBehavior(
    entity: Entity, 
    projectile: Projectile, 
    transform: Transform, 
    velocity: Velocity, 
    deltaTime: number
  ): void {
    switch (projectile.type) {
      case ProjectileType.HOMING:
        this.handleHomingBehavior(entity, projectile, transform, velocity, deltaTime);
        break;
      // SCATTERタイプは削除（Spiderは補助トリガー）
    }
  }

  /**
   * 追尾弾の動作処理
   */
  private handleHomingBehavior(
    entity: Entity, 
    projectile: Projectile, 
    transform: Transform, 
    velocity: Velocity, 
    deltaTime: number
  ): void {
    // 追尾対象を探す
    const target = this.findNearestTarget(transform.position, projectile.team);
    
    // デバッグ：ターゲット検出の確認
    if (entity.id % 60 === 0) { // 1秒おきにログ
      console.log(`Homing search for projectile ${entity.id}:`, {
        projectilePosition: transform.position.toArray(),
        targetFound: !!target,
        targetId: target?.id
      });
    }
    
    if (target) {
      const targetTransform = target.getComponent(Transform);
      if (targetTransform) {
        // 目標への方向を計算
        const targetDirection = targetTransform.position.clone().sub(transform.position).normalize();
        
        // 現在の速度方向と目標方向を線形補間
        const currentDirection = velocity.linear.clone().normalize();
        
        // ハウンドの追跡強度（適度な値に調整）
        let homingStrength = projectile.homingStrength * deltaTime;
        // 最小値を保証して、確実にホーミングが働くようにする
        homingStrength = Math.max(homingStrength, 0.02); // 最小2%の補間率
        homingStrength = Math.min(homingStrength, 0.1);  // 最大10%の補間率（急激な方向転換を防ぐ）
        
        const newDirection = currentDirection.lerp(targetDirection, homingStrength).normalize();
        
        // デバッグ：ホーミング動作を確認
        if (entity.id % 30 === 0) { // 0.5秒おきにログ
          console.log(`Homing projectile ${entity.id}:`, {
            currentDirection: currentDirection.toArray(),
            targetDirection: targetDirection.toArray(),
            homingStrength: homingStrength,
            newDirection: newDirection.toArray()
          });
        }
        
        // 新しい速度を設定（速度の大きさは保持）
        const speed = velocity.linear.length();
        velocity.linear.copy(newDirection.multiplyScalar(speed));
      }
    }
  }

  // 散弾関連のメソッドは削除（Spiderは補助トリガー）

  // 散弾作成メソッドは削除（Spiderは補助トリガー）

  // 散弾メッシュ作成メソッドは削除（Spiderは補助トリガー）

  /**
   * 最も近い敵を探す（追尾弾用）
   */
  private findNearestTarget(position: THREE.Vector3, projectileTeam: number): Entity | null {
    // 全エンティティを取得してCharacterコンポーネントを持つものをフィルタ
    const allEntities = this.world?.getEntities() || [];
    let nearestTarget: Entity | null = null;
    let nearestDistance = Infinity;
    const maxHomingRange = 20; // ハウンド用に追尾可能な最大距離を拡大
    
    for (const entity of allEntities) {
      const character = entity.getComponent(Character);
      const transform = entity.getComponent(Transform);
      
      // Characterコンポーネントを持ち、異なるチームの場合のみ対象
      if (character && transform && character.team !== projectileTeam) {
        const distance = position.distanceTo(transform.position);
        
        // 基本的な距離チェック（視界チェックは緩めにする）
        if (distance < nearestDistance && distance <= maxHomingRange) {
          nearestDistance = distance;
          nearestTarget = entity;
        }
      }
    }
    
    return nearestTarget;
  }

  /**
   * 弾丸の着弾処理（爆発、散弾など）
   */
  private handleProjectileImpact(entity: Entity, projectile: Projectile, impactPosition: THREE.Vector3): void {
    switch (projectile.type) {
      case ProjectileType.EXPLOSIVE:
        this.createExplosionEffect(impactPosition, projectile.explosionRadius);
        break;
      // SCATTER処理は削除（Spiderは補助トリガー）
    }
  }

  /**
   * 爆発エフェクトを作成
   */
  private createExplosionEffect(position: THREE.Vector3, radius: number): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    
    if (!scene) return;
    
    // 簡単な爆発エフェクト（赤い球体）
    const explosionGeometry = new THREE.SphereGeometry(radius, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.6
    });
    const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionMesh.position.copy(position);
    
    scene.add(explosionMesh);
    
    // 0.5秒後に爆発エフェクトを削除
    setTimeout(() => {
      scene.remove(explosionMesh);
      explosionGeometry.dispose();
      explosionMaterial.dispose();
    }, 500);
    
    console.log(`Explosion effect created at position:`, position, `radius: ${radius}`);
  }

  private removeProjectile(entity: Entity): void {
    const meshComponent = entity.getComponent(MeshComponent);
    if (meshComponent) {
      console.log(`✓ Removing projectile mesh for entity ${entity.id}`);
    }
    
    console.log(`✓ Removing projectile entity ${entity.id}`);
    this.world?.removeEntity(entity);
  }
}