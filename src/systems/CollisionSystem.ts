import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Collider, ColliderType, CollisionLayer } from '../components/Collider';
import { Projectile } from '../components/Projectile';
import { Character } from '../components/Character';
import { Shield } from '../components/Shield';
import { MeshComponent } from '../components/Mesh';
import { RenderSystem } from './RenderSystem';

/**
 * 衝突情報
 */
interface CollisionInfo {
  entityA: Entity;
  entityB: Entity;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
}

/**
 * 衝突判定とダメージ処理を管理するシステム
 */
export class CollisionSystem extends System {
  private collisionPairs: Set<string> = new Set();
  private hitEffects: Map<string, THREE.Object3D> = new Map();

  requiredComponents() {
    return [Transform, Collider];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();
    this.collisionPairs.clear();

    // 総当たりで衝突判定
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entityA = entities[i];
        const entityB = entities[j];

        // 衝突可能かチェック
        if (this.canCollide(entityA, entityB)) {
          const collision = this.checkCollision(entityA, entityB);
          if (collision) {
            this.handleCollision(collision);
          }
        }
      }
    }

    // ヒットエフェクトの更新
    this.updateHitEffects(deltaTime);
  }

  /**
   * 衝突可能かチェック
   */
  private canCollide(entityA: Entity, entityB: Entity): boolean {
    const colliderA = entityA.getComponent(Collider)!;
    const colliderB = entityB.getComponent(Collider)!;

    // レイヤーマスクでフィルタリング
    if ((colliderA.layer & colliderB.mask) === 0 &&
        (colliderB.layer & colliderA.mask) === 0) {
      return false;
    }

    // 同じチームの弾と味方は衝突しない
    const projectileA = entityA.getComponent(Projectile);
    const projectileB = entityB.getComponent(Projectile);
    const characterA = entityA.getComponent(Character);
    const characterB = entityB.getComponent(Character);

    if (projectileA && characterB) {
      if (projectileA.team === characterB.team) return false;
      if (projectileA.owner === entityB.id) return false; // 自分の弾は当たらない
    }

    if (projectileB && characterA) {
      if (projectileB.team === characterA.team) return false;
      if (projectileB.owner === entityA.id) return false;
    }

    return true;
  }

  /**
   * 衝突判定
   */
  private checkCollision(entityA: Entity, entityB: Entity): CollisionInfo | null {
    const transformA = entityA.getComponent(Transform)!;
    const transformB = entityB.getComponent(Transform)!;
    const colliderA = entityA.getComponent(Collider)!;
    const colliderB = entityB.getComponent(Collider)!;

    // 扇形攻撃の特別な判定
    if ((entityA as any).fanAttackInfo) {
      return this.checkFanAttackCollision(entityA, entityB);
    }
    if ((entityB as any).fanAttackInfo) {
      return this.checkFanAttackCollision(entityB, entityA);
    }

    // 通常の球体同士の衝突判定
    const distance = transformA.position.distanceTo(transformB.position);
    const radiusSum = this.getColliderRadius(colliderA, transformA) + 
                     this.getColliderRadius(colliderB, transformB);

    if (distance <= radiusSum) {
      const normal = transformB.position.clone()
        .sub(transformA.position)
        .normalize();
      
      const point = transformA.position.clone()
        .add(normal.multiplyScalar(this.getColliderRadius(colliderA, transformA)));

      return {
        entityA,
        entityB,
        point,
        normal,
        distance
      };
    }

    return null;
  }

  /**
   * 扇形攻撃の衝突判定（5度セグメント単位）
   */
  private checkFanAttackCollision(attackEntity: Entity, targetEntity: Entity): CollisionInfo | null {
    const attackTransform = attackEntity.getComponent(Transform)!;
    const targetTransform = targetEntity.getComponent(Transform)!;
    const fanInfo = (attackEntity as any).fanAttackInfo;

    if (!fanInfo) return null;

    // 攻撃者の位置（基準点）
    const attackerPos = attackTransform.position.clone();
    const targetPos = targetTransform.position.clone();
    
    // 攻撃者からターゲットへのベクトル
    const toTarget = targetPos.clone().sub(attackerPos);
    const distance = toTarget.length();
    
    // 射程チェック
    if (distance > fanInfo.range * 0.8) { // エフェクトの有効範囲
      return null;
    }
    
    // Y軸の高さチェック（上下方向の許容範囲）
    if (Math.abs(toTarget.y) > 2.0) { // 2m以上の高低差は対象外
      return null;
    }
    
    // XZ平面での角度計算（Y軸回転を考慮）
    const targetAngleXZ = Math.atan2(toTarget.x, -toTarget.z); // -Z軸が前方向
    const attackerRotationY = attackTransform.rotation.y;
    
    // 攻撃者の向きに対する相対角度
    let relativeAngle = targetAngleXZ - attackerRotationY;
    
    // 角度を -π から π の範囲に正規化
    while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
    while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
    
    // 現在表示されている5度セグメントのうち、どれかに当たっているかチェック
    const currentTime = Date.now();
    const animationStartTime = (attackEntity as any).animationStartTime || currentTime;
    const timeSinceStart = currentTime - animationStartTime;
    
    // 現在アクティブなセグメントを直接メッシュのフラグで確認（残影除外）
    const meshComponent = attackEntity.getComponent(MeshComponent);
    if (!meshComponent || !meshComponent.mesh) return null;
    
    const attackMesh = meshComponent.mesh as THREE.Group;
    let activeSegmentIndex = -1;
    let activeSegmentMesh: THREE.Mesh | null = null;
    
    // 全セグメントをチェックして、isActiveフラグがtrueのものを探す
    for (let i = 0; i < attackMesh.children.length; i++) {
      const segment = attackMesh.children[i] as THREE.Mesh;
      if (segment.visible && (segment as any).isActive === true) {
        activeSegmentIndex = i;
        activeSegmentMesh = segment;
        break; // 最初のアクティブセグメントのみ使用
      }
    }
    
    // アクティブなセグメントが見つからない場合は判定なし
    if (activeSegmentIndex === -1 || !activeSegmentMesh) {
      return null;
    }
    
    const i = activeSegmentIndex;
    // 各セグメントの角度範囲を計算
    const segmentStartAngle = fanInfo.startAngle + (i * fanInfo.visualSegmentAngle) - attackerRotationY;
    const segmentEndAngle = segmentStartAngle + fanInfo.visualSegmentAngle;
    
    // セグメント角度も正規化
    let normalizedSegmentStart = segmentStartAngle;
    let normalizedSegmentEnd = segmentEndAngle;
    
    while (normalizedSegmentStart > Math.PI) normalizedSegmentStart -= 2 * Math.PI;
    while (normalizedSegmentStart < -Math.PI) normalizedSegmentStart += 2 * Math.PI;
    while (normalizedSegmentEnd > Math.PI) normalizedSegmentEnd -= 2 * Math.PI;
    while (normalizedSegmentEnd < -Math.PI) normalizedSegmentEnd += 2 * Math.PI;
    
    // ターゲットがこの1度セグメント内にいるかチェック
    let isInSegment = false;
    if (normalizedSegmentStart <= normalizedSegmentEnd) {
      // 通常のケース
      isInSegment = relativeAngle >= normalizedSegmentStart && relativeAngle <= normalizedSegmentEnd;
    } else {
      // -π/π境界をまたぐケース
      isInSegment = relativeAngle >= normalizedSegmentStart || relativeAngle <= normalizedSegmentEnd;
    }
    
    if (isInSegment) {
      // 衝突点を計算
      const hitPoint = targetPos.clone();
      const normal = toTarget.clone().normalize();
      
      console.log(`🗡️ 扇形攻撃ヒット! アクティブセグメント${i}/120, 距離=${distance.toFixed(2)}, 角度=${(relativeAngle * 180 / Math.PI).toFixed(1)}度, セグメント範囲=${(normalizedSegmentStart * 180 / Math.PI).toFixed(1)}-${(normalizedSegmentEnd * 180 / Math.PI).toFixed(1)}度`);
      
      return {
        entityA: attackEntity,
        entityB: targetEntity,
        point: hitPoint,
        normal: normal,
        distance: distance
      };
    }
    
    return null;
  }

  /**
   * コライダーの半径を取得
   */
  private getColliderRadius(collider: Collider, transform: Transform): number {
    switch (collider.type) {
      case ColliderType.SPHERE:
        return collider.size.x * Math.max(
          transform.scale.x,
          transform.scale.y,
          transform.scale.z
        );
      case ColliderType.BOX:
        // ボックスの場合は対角線の半分を概算
        const size = collider.size.clone().multiply(transform.scale);
        return size.length() * 0.5;
      default:
        return 1.0;
    }
  }

  /**
   * 衝突処理
   */
  private handleCollision(collision: CollisionInfo): void {
    const { entityA, entityB, point } = collision;

    // 弾丸とキャラクターの衝突
    this.handleProjectileCharacterCollision(entityA, entityB, point);
    this.handleProjectileCharacterCollision(entityB, entityA, point);

    // 攻撃エフェクトとキャラクターの衝突
    this.handleAttackEffectCharacterCollision(entityA, entityB, point);
    this.handleAttackEffectCharacterCollision(entityB, entityA, point);

    // 弾丸とシールドの衝突
    this.handleProjectileShieldCollision(entityA, entityB, point);
    this.handleProjectileShieldCollision(entityB, entityA, point);

    // 弾丸同士の衝突
    this.handleProjectileProjectileCollision(entityA, entityB, point);
  }

  /**
   * 攻撃エフェクトとキャラクターの衝突処理
   */
  private handleAttackEffectCharacterCollision(
    attackEntity: Entity,
    characterEntity: Entity,
    hitPoint: THREE.Vector3
  ): void {
    // 攻撃エフェクトの情報を確認
    const attackInfo = (attackEntity as any).attackInfo;
    const character = characterEntity.getComponent(Character);

    console.log(`🔍 衝突チェック: attackEntity=${attackEntity.id}, characterEntity=${characterEntity.id}, attackInfo=${!!attackInfo}, character=${!!character}`);
    
    if (!attackInfo || !character) {
      console.log(`❌ 衝突処理スキップ - attackInfo: ${!!attackInfo}, character: ${!!character}`);
      return;
    }

    // 攻撃者と被攻撃者が同じチームの場合はダメージなし
    if (attackInfo.attackerTeam === character.team) return;

    // 既にダメージを与えたかチェック（同じ攻撃で複数回ダメージを防ぐ）
    const hitKey = `${attackEntity.id}-${characterEntity.id}`;
    if (this.collisionPairs.has(hitKey)) return;
    this.collisionPairs.add(hitKey);

    // ダメージ値をバリデーション
    const finalDamage = isNaN(attackInfo.damage) ? 0 : Math.max(0, attackInfo.damage);
    
    // ダメージを与える
    const beforeTrion = character.stats.currentTrion;
    console.log(`🗡️ 近接攻撃ヒット! ${character.name} が ${finalDamage} ダメージを受けた (元値: ${attackInfo.damage})`);
    character.takeDamage(finalDamage);
    const afterTrion = character.stats.currentTrion;
    console.log(`💉 ${character.name}: トリオン ${beforeTrion} → ${afterTrion} (isDefeated: ${character.isDefeated()})`);

    // ヒットエフェクトを生成
    this.createHitEffect(hitPoint, attackInfo.damage);

    // キャラクターが戦闘不能になった場合
    if (character.isDefeated()) {
      console.log(`💀 ${character.name} が倒された!`);
      this.handleCharacterDeath(characterEntity);
    }
  }

  /**
   * 弾丸とキャラクターの衝突処理
   */
  private handleProjectileCharacterCollision(
    projectileEntity: Entity,
    characterEntity: Entity,
    hitPoint: THREE.Vector3
  ): void {
    const projectile = projectileEntity.getComponent(Projectile);
    const character = characterEntity.getComponent(Character);

    if (!projectile || !character) return;

    // ダメージを与える
    console.log(`Hit! ${character.name} takes ${projectile.damage} damage`);
    character.takeDamage(projectile.damage);

    // ヒットエフェクトを生成
    this.createHitEffect(hitPoint, projectile.damage);

    // 貫通弾でない場合は弾を削除
    if (!projectile.pierce()) {
      this.world?.removeEntity(projectileEntity);
    }

    // キャラクターが戦闘不能になった場合
    if (character.isDefeated()) {
      console.log(`${character.name} has been eliminated!`);
      this.handleCharacterDeath(characterEntity);
    }
  }

  /**
   * 弾丸とシールドの衝突処理
   */
  private handleProjectileShieldCollision(
    projectileEntity: Entity,
    shieldEntity: Entity,
    hitPoint: THREE.Vector3
  ): void {
    const projectile = projectileEntity.getComponent(Projectile);
    const shield = shieldEntity.getComponent(Shield);

    if (!projectile || !shield || !shield.isActive) return;

    // シールドにダメージ
    shield.takeDamage(projectile.damage);
    console.log(`Shield hit! Durability: ${shield.currentDurability}/${shield.baseDurability}`);

    // シールドヒットエフェクト
    this.createShieldHitEffect(hitPoint);

    // 弾を削除（シールドは貫通しない）
    this.world?.removeEntity(projectileEntity);

    // シールドが破壊された場合
    if (shield.currentDurability <= 0) {
      console.log('Shield destroyed!');
      shield.isActive = false;
      // シールドメッシュを削除または非表示に
      const meshComponent = shieldEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = false;
      }
    }
  }

  /**
   * 弾丸同士の衝突処理
   */
  private handleProjectileProjectileCollision(
    entityA: Entity,
    entityB: Entity,
    hitPoint: THREE.Vector3
  ): void {
    const projectileA = entityA.getComponent(Projectile);
    const projectileB = entityB.getComponent(Projectile);

    if (!projectileA || !projectileB) return;

    // 両方の弾を削除
    console.log('Projectiles collided!');
    this.createProjectileCollisionEffect(hitPoint);
    
    this.world?.removeEntity(entityA);
    this.world?.removeEntity(entityB);
  }

  /**
   * ヒットエフェクトを生成
   */
  private createHitEffect(position: THREE.Vector3, damage: number): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // ダメージ量に応じたエフェクトサイズ
    const effectSize = Math.min(damage / 20, 3);

    // パーティクルエフェクト（簡易版）
    const geometry = new THREE.SphereGeometry(effectSize, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });

    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(position);
    scene.add(effect);

    // エフェクトを登録
    const effectId = `hit_${Date.now()}_${Math.random()}`;
    this.hitEffects.set(effectId, effect);

    // 一定時間後に削除
    setTimeout(() => {
      scene.remove(effect);
      this.hitEffects.delete(effectId);
      effect.geometry.dispose();
      (effect.material as THREE.Material).dispose();
    }, 500);
  }

  /**
   * シールドヒットエフェクトを生成
   */
  private createShieldHitEffect(position: THREE.Vector3): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // 青い波紋エフェクト
    const geometry = new THREE.RingGeometry(0.1, 1, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(position);
    scene.add(effect);

    const effectId = `shield_${Date.now()}_${Math.random()}`;
    this.hitEffects.set(effectId, effect);

    // アニメーション
    let scale = 1;
    const animate = () => {
      scale += 0.1;
      effect.scale.set(scale, scale, scale);
      material.opacity -= 0.02;

      if (material.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(effect);
        this.hitEffects.delete(effectId);
        effect.geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  /**
   * 弾丸衝突エフェクトを生成
   */
  private createProjectileCollisionEffect(position: THREE.Vector3): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // 黄色い爆発エフェクト
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1.0
    });

    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(position);
    scene.add(effect);

    const effectId = `collision_${Date.now()}_${Math.random()}`;
    this.hitEffects.set(effectId, effect);

    // アニメーション
    let scale = 1;
    const animate = () => {
      scale += 0.15;
      effect.scale.set(scale, scale, scale);
      material.opacity -= 0.05;

      if (material.opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        scene.remove(effect);
        this.hitEffects.delete(effectId);
        effect.geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  /**
   * キャラクター死亡処理
   */
  private handleCharacterDeath(entity: Entity): void {
    const character = entity.getComponent(Character);
    const transform = entity.getComponent(Transform);
    
    if (!character || !transform) return;

    // 死亡エフェクト
    this.createDeathEffect(transform.position);

    // キャラクターを非表示に
    const meshComponent = entity.getComponent(MeshComponent);
    if (meshComponent) {
      meshComponent.mesh.visible = false;
    }

    console.log(`🗑️ エンティティ ${entity.id} (${character.name}) を削除中...`);
    
    // 短い遅延後にエンティティを完全に削除
    setTimeout(() => {
      if (this.world) {
        this.world.removeEntity(entity);
        console.log(`✅ エンティティ ${entity.id} (${character.name}) を削除完了`);
      }
    }, 100); // 死亡エフェクトが始まってから削除
  }

  /**
   * 死亡エフェクトを生成
   */
  private createDeathEffect(position: THREE.Vector3): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // 白い光のエフェクト
    const geometry = new THREE.SphereGeometry(2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0
    });

    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(position);
    effect.position.y += 1;
    scene.add(effect);

    const effectId = `death_${Date.now()}_${Math.random()}`;
    this.hitEffects.set(effectId, effect);

    // フェードアウトアニメーション
    const fadeOut = () => {
      material.opacity -= 0.02;
      effect.position.y += 0.05;

      if (material.opacity > 0) {
        requestAnimationFrame(fadeOut);
      } else {
        scene.remove(effect);
        this.hitEffects.delete(effectId);
        effect.geometry.dispose();
        material.dispose();
      }
    };
    fadeOut();
  }

  /**
   * ヒットエフェクトの更新
   */
  private updateHitEffects(deltaTime: number): void {
    // 必要に応じてエフェクトのアニメーション更新
  }

  destroy(): void {
    // 全てのエフェクトをクリーンアップ
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    
    if (scene) {
      this.hitEffects.forEach(effect => {
        scene.remove(effect);
        if (effect.geometry) effect.geometry.dispose();
        if (effect.material) {
          if (Array.isArray(effect.material)) {
            effect.material.forEach(mat => mat.dispose());
          } else {
            effect.material.dispose();
          }
        }
      });
    }
    
    this.hitEffects.clear();
    super.destroy();
  }
}