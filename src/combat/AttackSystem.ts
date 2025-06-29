import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Trigger } from '../components/Trigger';
import { MeshComponent } from '../components/Mesh';
import { TriggerType, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';
import { AttackEffects } from '../effects/AttackEffects';
import { AttackAnimations } from '../animation/AttackAnimations';
import { RenderSystem } from '../systems/RenderSystem';
import { ShootingSystem } from '../systems/ShootingSystem';
import { ProjectileManager } from '../projectiles/ProjectileManager';
import { WeaponEffectSystem } from '../effects/WeaponEffectSystem';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * 攻撃処理を専門とするクラス
 * 近接攻撃、射撃、ダメージ計算を担当
 */
export class AttackSystem {
  private world: World;
  private projectileManager: ProjectileManager;
  private weaponEffectSystem: WeaponEffectSystem;
  private activeAttacks: Map<Entity, {
    type: 'horizontal' | 'vertical',
    range: number,
    damage: number,
    startTime: number,
    duration: number
  }> = new Map();
  private attackEffects: Map<Entity, Entity> = new Map(); // 攻撃エフェクト -> プレイヤーエンティティ

  constructor(world: World, projectileManager: ProjectileManager, weaponEffectSystem: WeaponEffectSystem) {
    this.world = world;
    this.projectileManager = projectileManager;
    this.weaponEffectSystem = weaponEffectSystem;
  }

  /**
   * 近接攻撃を実行（横斬り）
   */
  performMeleeAttack(
    triggerType: TriggerType,
    transform: Transform,
    character: Character,
    attackerEntity?: Entity
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // カメラの向きを取得
    const renderSys = this.world.getSystem(RenderSystem);
    const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
    
    // 扇形の横薙ぎエフェクトを作成
    // ダメージを計算（基本ダメージを使用）
    const damage = definition.damage;
    
    const slash = AttackEffects.createFanSlashEffect(
      this.world, 
      transform, 
      triggerType, 
      definition.range,
      attackerEntity,
      damage
    );
    const slashMesh = slash.getComponent(MeshComponent)!.mesh as THREE.Group;
    const slashTransform = slash.getComponent(Transform)!;
    
    // 右手用の位置調整（体の向きに対して相対的、前方に傾く）
    const rightHandOffset = new THREE.Vector3(0.6, 0, 0.3);
    const rotatedRightOffset = rightHandOffset.clone();
    rotatedRightOffset.applyEuler(new THREE.Euler(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z
    ));
    slashTransform.position.add(rotatedRightOffset);
    
    // 攻撃エフェクトとプレイヤーの関連付けを記録
    const playerEntity = this.findPlayerEntity(transform);
    if (playerEntity) {
      this.attackEffects.set(slash, playerEntity);
      
      // アクティブな攻撃として登録
      this.activeAttacks.set(slash, {
        type: 'horizontal',
        range: definition.range * 1.5,
        damage: damage,
        startTime: Date.now(),
        duration: GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION
      });
    }
    
    // エフェクトをカメラの向きに回転（Y軸とX軸）
    slashTransform.rotation.y = cameraRotation.y;
    slashTransform.rotation.x = cameraRotation.x;
    
    // 扇形薙ぎアニメーションを開始
    AttackAnimations.animateFanSlash(slash, slashMesh);
    
    // 指定時間後に削除
    setTimeout(() => {
      this.attackEffects.delete(slash);
      this.activeAttacks.delete(slash);
      this.world.removeEntity(slash);
    }, GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION);

    console.log('AttackSystem: Melee attack performed');
  }

  /**
   * 縦斬り攻撃を実行
   */
  performVerticalAttack(
    triggerType: TriggerType,
    transform: Transform,
    character: Character,
    attackerEntity?: Entity
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // カメラの向きを取得
    const renderSys = this.world.getSystem(RenderSystem);
    const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
    
    // 縦斬りエフェクトを作成
    // ダメージを計算（基本ダメージを使用）
    const damage = definition.damage;
    
    const slash = AttackEffects.createVerticalSlashEffect(
      this.world, 
      transform, 
      triggerType, 
      definition.range,
      attackerEntity,
      damage
    );
    const slashMesh = slash.getComponent(MeshComponent)!.mesh as THREE.Group;
    const slashTransform = slash.getComponent(Transform)!;
    
    // 右手用の位置調整（体の向きに対して相対的、前方に傾く）
    const rightHandOffset = new THREE.Vector3(0.6, 0.3, 0.4);
    const rotatedRightOffset = rightHandOffset.clone();
    rotatedRightOffset.applyEuler(new THREE.Euler(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z
    ));
    slashTransform.position.add(rotatedRightOffset);
    
    // 攻撃エフェクトとプレイヤーの関連付けを記録
    const playerEntity = this.findPlayerEntity(transform);
    if (playerEntity) {
      this.attackEffects.set(slash, playerEntity);
      
      // アクティブな攻撃として登録
      this.activeAttacks.set(slash, {
        type: 'vertical',
        range: definition.range,
        damage: damage,
        startTime: Date.now(),
        duration: GAME_CONFIG.ATTACK.VERTICAL_SLASH.ANIMATION_DURATION
      });
    }
    
    // エフェクトをカメラの向きに回転（Y軸とX軸）
    slashTransform.rotation.y = cameraRotation.y;
    slashTransform.rotation.x = cameraRotation.x;
    
    // 縦斬りアニメーションを開始
    AttackAnimations.animateVerticalSlash(slash, slashMesh);
    
    // 指定時間後に削除
    setTimeout(() => {
      this.attackEffects.delete(slash);
      this.activeAttacks.delete(slash);
      this.world.removeEntity(slash);
    }, GAME_CONFIG.ATTACK.VERTICAL_SLASH.ANIMATION_DURATION);

    console.log('AttackSystem: Vertical attack performed');
  }

  /**
   * 左手近接攻撃を実行
   */
  performLeftMeleeAttack(
    triggerType: TriggerType,
    transform: Transform,
    character: Character
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // カメラの向きを取得
    const renderSys = this.world.getSystem(RenderSystem);
    const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
    
    // 扇形の横薙ぎエフェクトを作成（左手用）
    const slash = AttackEffects.createFanSlashEffect(this.world, transform, triggerType, definition.range);
    const slashMesh = slash.getComponent(MeshComponent)!.mesh as THREE.Group;
    const slashTransform = slash.getComponent(Transform)!;
    
    // 左手用の位置調整（体の向きに対して相対的、前方に傾く）
    const leftHandOffset = new THREE.Vector3(-0.6, 0, 0.3);
    const rotatedLeftOffset = leftHandOffset.clone();
    rotatedLeftOffset.applyEuler(new THREE.Euler(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z
    ));
    slashTransform.position.add(rotatedLeftOffset);
    
    // 攻撃エフェクトとプレイヤーの関連付けを記録
    const playerEntity = this.findPlayerEntity(transform);
    if (playerEntity) {
      this.attackEffects.set(slash, playerEntity);
      
      // アクティブな攻撃として登録
      this.activeAttacks.set(slash, {
        type: 'horizontal',
        range: definition.range * 1.5,
        damage: damage,
        startTime: Date.now(),
        duration: GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION
      });
    }
    
    // エフェクトをカメラの向きに回転（Y軸とX軸）
    slashTransform.rotation.y = cameraRotation.y;
    slashTransform.rotation.x = cameraRotation.x;
    
    // 扇形薙ぎアニメーションを開始
    AttackAnimations.animateFanSlash(slash, slashMesh);
    
    // 指定時間後に削除
    setTimeout(() => {
      this.attackEffects.delete(slash);
      this.activeAttacks.delete(slash);
      this.world.removeEntity(slash);
    }, GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION);

    console.log('AttackSystem: Left melee attack performed');
  }

  /**
   * 左手縦斬り攻撃を実行
   */
  performLeftVerticalAttack(
    triggerType: TriggerType,
    transform: Transform,
    character: Character
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // カメラの向きを取得
    const renderSys = this.world.getSystem(RenderSystem);
    const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
    
    // 縦斬りエフェクトを作成（左手用）
    const slash = AttackEffects.createVerticalSlashEffect(this.world, transform, triggerType, definition.range);
    const slashMesh = slash.getComponent(MeshComponent)!.mesh as THREE.Group;
    const slashTransform = slash.getComponent(Transform)!;
    
    // 左手用の位置調整（体の向きに対して相対的、前方に傾く）
    const leftHandOffset = new THREE.Vector3(-0.6, 0.3, 0.4);
    const rotatedLeftOffset = leftHandOffset.clone();
    rotatedLeftOffset.applyEuler(new THREE.Euler(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z
    ));
    slashTransform.position.add(rotatedLeftOffset);
    
    // 攻撃エフェクトとプレイヤーの関連付けを記録
    const playerEntity = this.findPlayerEntity(transform);
    if (playerEntity) {
      this.attackEffects.set(slash, playerEntity);
      
      // アクティブな攻撃として登録
      this.activeAttacks.set(slash, {
        type: 'vertical',
        range: definition.range,
        damage: damage,
        startTime: Date.now(),
        duration: GAME_CONFIG.ATTACK.VERTICAL_SLASH.ANIMATION_DURATION
      });
    }
    
    // エフェクトをカメラの向きに回転（Y軸とX軸）
    slashTransform.rotation.y = cameraRotation.y;
    slashTransform.rotation.x = cameraRotation.x;
    
    // 縦斬りアニメーションを開始
    AttackAnimations.animateVerticalSlash(slash, slashMesh);
    
    // 指定時間後に削除
    setTimeout(() => {
      this.attackEffects.delete(slash);
      this.activeAttacks.delete(slash);
      this.world.removeEntity(slash);
    }, GAME_CONFIG.ATTACK.VERTICAL_SLASH.ANIMATION_DURATION);

    console.log('AttackSystem: Left vertical attack performed');
  }

  /**
   * 弾丸を発射
   */
  fireProjectile(
    entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    triggerType: TriggerType,
    isLeftHand: boolean
  ): void {
    console.log('AttackSystem: fireProjectile called for:', triggerType);
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // トリオンコストをチェック
    if (character.stats.currentTrion < definition.trionCost) {
      console.log('AttackSystem: Insufficient trion for projectile');
      return; // トリオン不足
    }
    
    // クールダウンをチェック
    const state = trigger.states.get(triggerType);
    console.log('AttackSystem: Trigger state:', state ? `cooldown: ${state.cooldownRemaining}` : 'not found');
    if (!state || state.cooldownRemaining > 0) {
      console.log('AttackSystem: Trigger on cooldown, remaining:', state?.cooldownRemaining);
      return; // クールダウン中
    }
    
    // ShootingSystemを使用して高精度射撃
    const shootingSystem = this.world.getSystem(ShootingSystem);
    if (shootingSystem) {
      console.log('AttackSystem: Using ShootingSystem for accurate shooting');
      const projectile = shootingSystem.fireProjectile(
        entity,
        transform,
        character,
        triggerType,
        isLeftHand
      );
      
      if (projectile) {
        // トリオンを消費
        character.takeDamage(definition.trionCost);
        
        // クールダウンを設定
        state.cooldownRemaining = definition.cooldown;
        
        // エフェクトを作成
        this.weaponEffectSystem.createMuzzleFlash(entity, transform, isLeftHand);
        
        console.log(`AttackSystem: Successfully fired ${triggerType} projectile with ShootingSystem!`);
        console.log(`AttackSystem: Projectile entity ID: ${projectile.id}`);
      } else {
        console.log('AttackSystem: ShootingSystem failed to create projectile');
      }
    } else {
      // フォールバック: ProjectileManagerを使用
      console.log('AttackSystem: ShootingSystem not available, using ProjectileManager fallback');
      this.fireProjectileFallback(entity, trigger, character, transform, triggerType, isLeftHand);
    }
  }

  /**
   * フォールバック射撃システム（ShootingSystemが利用できない場合）
   */
  private fireProjectileFallback(
    entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    triggerType: TriggerType,
    isLeftHand: boolean
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // トリオンを消費
    character.takeDamage(definition.trionCost);
    
    // クールダウンを設定
    const state = trigger.states.get(triggerType);
    if (state) {
      state.cooldownRemaining = definition.cooldown;
    }
    
    // ProjectileManagerで弾丸エンティティを作成
    const projectile = this.projectileManager.createProjectileEntity(
      entity,
      transform,
      triggerType,
      character,
      isLeftHand
    );
    
    // エフェクトを作成
    this.weaponEffectSystem.createMuzzleFlash(entity, transform, isLeftHand);
    
    console.log(`AttackSystem: Fallback: Successfully fired ${triggerType} projectile!`);
    console.log(`AttackSystem: Projectile entity ID: ${projectile.id}`);
  }

  /**
   * ダメージを適用
   */
  applyDamage(target: Entity, damage: number): void {
    const character = target.getComponent(Character);
    if (character) {
      character.takeDamage(damage);
      console.log(`AttackSystem: Applied ${damage} damage to target`);
      
      // ヒットエフェクトを作成
      const transform = target.getComponent(Transform);
      if (transform) {
        this.weaponEffectSystem.createHitEffect(transform.position);
      }
    }
  }

  /**
   * プレイヤーエンティティを検索
   */
  private findPlayerEntity(transform: Transform): Entity | null {
    const entities = this.world.getEntitiesWithTag('player');
    return entities.find(entity => {
      const entityTransform = entity.getComponent(Transform);
      return entityTransform && entityTransform.position.equals(transform.position);
    }) || null;
  }

  /**
   * アクティブな攻撃を更新
   */
  updateActiveAttacks(): void {
    const currentTime = Date.now();
    
    for (const [attackEntity, attackInfo] of this.activeAttacks) {
      // 攻撃が終了しているかチェック
      if (currentTime - attackInfo.startTime > attackInfo.duration) {
        this.activeAttacks.delete(attackEntity);
        this.attackEffects.delete(attackEntity);
        continue;
      }
      
      // プレイヤーエンティティが存在しない場合は削除
      const playerEntity = this.attackEffects.get(attackEntity);
      if (!playerEntity) {
        this.activeAttacks.delete(attackEntity);
        continue;
      }
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.activeAttacks.clear();
    this.attackEffects.clear();
    console.log('AttackSystem: Destroyed');
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): { activeAttacks: number; attackEffects: number } {
    return {
      activeAttacks: this.activeAttacks.size,
      attackEffects: this.attackEffects.size
    };
  }
}