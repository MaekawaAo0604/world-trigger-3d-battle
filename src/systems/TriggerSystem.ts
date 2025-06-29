import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Input } from '../components/Input';
import { Trigger } from '../components/Trigger';
import { MeshComponent } from '../components/Mesh';
import { Collider } from '../components/Collider';
import { TriggerType, TRIGGER_DEFINITIONS, TriggerCategory } from '../triggers/TriggerDefinitions';
import { Projectile, ProjectileType } from '../components/Projectile';
import { Velocity } from '../components/Velocity';
import { ColliderType, CollisionLayer } from '../components/Collider';
import { RenderSystem } from './RenderSystem';
import { AttackEffects } from '../effects/AttackEffects';
import { AttackAnimations } from '../animation/AttackAnimations';
import { GAME_CONFIG } from '../config/GameConfig';
import { ShootingSystem } from './ShootingSystem';
import { TriggerMenu } from '../ui/TriggerMenu';
import { SplittingTrigger } from '../components/SplittingTrigger';
import { AnimationSystem, AnimationState } from './AnimationSystem';
import { SwordActionSystem } from './SwordActionSystem';

/**
 * トリガーの使用と切り替えを管理するシステム
 */
export class TriggerSystem extends System {
  private projectilePool: Entity[] = [];
  private weaponEntities: Map<number, Entity> = new Map(); // エンティティID -> 右手武器エンティティ
  private leftWeaponEntities: Map<number, Entity> = new Map(); // エンティティID -> 左手武器エンティティ
  private attackEffects: Map<Entity, Entity> = new Map(); // 攻撃エフェクト -> プレイヤーエンティティ
  private splittingTriggers: Map<number, SplittingTrigger> = new Map(); // エンティティID -> 分割トリガー
  private cubeEntities: Map<number, Entity[]> = new Map(); // エンティティID -> キューブエンティティ配列
  private activeAttacks: Map<Entity, {
    type: 'horizontal',
    range: number,
    damage: number,
    startTime: number,
    duration: number
  }> = new Map(); // アクティブな攻撃の情報
  
  private triggerMenu: TriggerMenu | null = null;

  requiredComponents() {
    return [Trigger, Character, Transform];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      // 無効なエンティティはスキップ
      if (!entity.active) continue;
      
      const trigger = entity.getComponent(Trigger)!;
      const character = entity.getComponent(Character)!;
      const transform = entity.getComponent(Transform)!;
      const input = entity.getComponent(Input);
      
      // 戦闘不能なキャラクターはスキップ
      if (character.isDefeated()) continue;

      // クールダウンを更新
      trigger.updateCooldowns(deltaTime);

      if (input) {
        // トリガー切り替え
        if (input.triggerSlot > 0) {
          // 切り替え前の分割トリガーキューブを削除
          const previousTrigger = trigger.currentTrigger;
          if (previousTrigger && this.isSplittingTrigger(previousTrigger)) {
            const cubes = this.cubeEntities.get(entity.id);
            if (cubes) {
              cubes.forEach(cube => this.world!.removeEntity(cube));
              this.cubeEntities.delete(entity.id);
            }
            const splittingTrigger = this.splittingTriggers.get(entity.id);
            if (splittingTrigger) {
              splittingTrigger.resetSplit();
              splittingTrigger.isGenerated = false;
            }
          }
          
          trigger.selectSlot(input.triggerSlot);
        }

        // 左手トリガー切り替え（C1-C4専用）
        if (input.leftTriggerSlot > 0) {
          // 切り替え前の左手分割トリガーキューブを削除
          const previousLeftTrigger = trigger.leftCurrentTrigger;
          if (previousLeftTrigger && this.isSplittingTrigger(previousLeftTrigger)) {
            const cubes = this.cubeEntities.get(entity.id);
            if (cubes) {
              cubes.forEach(cube => this.world!.removeEntity(cube));
              this.cubeEntities.delete(entity.id);
            }
            const splittingTrigger = this.splittingTriggers.get(entity.id);
            if (splittingTrigger) {
              splittingTrigger.resetSplit();
              splittingTrigger.isGenerated = false;
            }
          }
          
          console.log(`TriggerSystem: Attempting left trigger C-slot change to C${input.leftTriggerSlot}`);
          const success = trigger.selectLeftSlot(input.leftTriggerSlot);
          console.log(`TriggerSystem: Left trigger selection ${success ? 'succeeded' : 'failed'}`);
        }

        // 武器生成（Rキー）
        if (input.generateWeapon && trigger.currentTrigger) {
          console.log('R key pressed - attempting weapon generation');
          console.log('Current trigger:', trigger.currentTrigger);
          
          const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
          
          // 分割トリガーの場合はキューブのみを生成
          if (definition.category === 'shooter' && this.isSplittingTrigger(trigger.currentTrigger)) {
            // トリオンコストをチェック
            const trionCost = trigger.getWeaponGenerationCost();
            if (character.stats.currentTrion < trionCost) {
              console.log('Insufficient trion');
              return;
            }
            
            // トリオンを消費
            character.takeDamage(trionCost);
            
            // キューブを生成
            this.generateSplittingCubes(entity, trigger, character, false);
          } else {
            // 通常の武器生成
            this.generateWeapon(entity, trigger, character);
          }
        }

        // 左手武器生成（Tキー）
        if (input.generateLeftWeapon) {
          console.log('T key pressed - attempting to generate left weapon');
          console.log('Left current trigger:', trigger.leftCurrentTrigger);
          console.log('Left current slot:', trigger.leftCurrentSlot);
          console.log('Current triggerSet:', trigger.triggerSet);
          
          if (trigger.leftCurrentTrigger) {
            const leftDefinition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
            
            // 左手分割トリガーの場合はキューブのみを生成
            if (leftDefinition.category === 'shooter' && this.isSplittingTrigger(trigger.leftCurrentTrigger)) {
              // トリオンコストをチェック
              const trionCost = trigger.getWeaponGenerationCost();
              if (character.stats.currentTrion < trionCost) {
                console.log('Insufficient trion');
                return;
              }
              
              // トリオンを消費
              character.takeDamage(trionCost);
              
              // キューブを生成
              this.generateSplittingCubes(entity, trigger, character, true);
            } else {
              // 通常の左手武器生成
              this.generateLeftWeapon(entity, trigger, character);
            }
          }
        }

        // 戦闘中のトリガーメニューは無効化
        // if (input.openTriggerMenu) {
        //   this.toggleTriggerMenu(entity, trigger);
        // }

        // 右手メインアクション（右クリック）
        if (trigger.currentTrigger) {
          const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
          
          if (definition.category === 'attacker' && input.mainRightAction) {
            this.useWeaponAttack(entity, trigger, character, transform, 'horizontal');
          } else if (definition.category === 'gunner') {
            // ガンナートリガー：連射射撃（長押し対応）
            if (input.isMainActionHeld && trigger.weaponGenerated) {
              this.useGunnerTrigger(entity, trigger, character, transform);
            }
          } else if (input.mainRightAction && definition.category === 'shooter' && this.isSplittingTrigger(trigger.currentTrigger)) {
            // 分割トリガーの発射
            this.fireSplittingTrigger(entity, trigger, character, transform, false);
          } else if (input.mainRightAction && definition.category !== 'gunner') {
            // 通常のシューター・スナイパートリガーの使用（ガンナーは除外）
            this.useNonAttackerTrigger(trigger, character);
          }
        }

        // 右手サブアクション（右クリック）
        if (input.subRightAction && trigger.currentTrigger) {
          const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
          console.log(`🎮 右手サブアクション発動: ${trigger.currentTrigger} (カテゴリ: ${definition.category})`);
          if (definition.category === 'attacker') {
            // アタッカー系のサブアクション：SwordActionSystemで処理（刀身伸長、シールドモード等）
            const swordActionSystem = this.world?.getSystem(SwordActionSystem);
            if (swordActionSystem) {
              // SwordActionSystemの既存のサブアクション処理を呼び出す
              // 旋空による攻撃中刀身伸長も含む
              const isAttacking = this.isEntityAttacking(entity);
              if (isAttacking && trigger.currentTrigger === TriggerType.KOGETSU) {
                swordActionSystem.activateSenkuBladeExtension(entity);
              } else {
                // 非攻撃時のサブアクション処理（既存のhandleSubActionと同等の処理）
                this.handleSwordSubAction(entity, trigger, character);
              }
            }
          } else if (definition.category === 'sniper') {
            // スナイパーのサブアクション：スコープ切り替え
            this.toggleSniperScope(entity);
          } else if (definition.category === 'gunner') {
            // ガンナーのサブアクション：エイミングモード切り替え
            this.toggleGunnerAiming(entity);
          } else if (definition.category === 'shooter' && this.isSplittingTrigger(trigger.currentTrigger)) {
            // 分割トリガーのサブアクション：分割数増加
            this.splitTriggerCubes(entity, false);
          }
        }

        // 左手メインアクション（Qキー）
        if (input.mainLeftAction) {
          if (trigger.leftCurrentTrigger) {
            const leftDefinition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
            if (leftDefinition.category === 'shooter' && this.isSplittingTrigger(trigger.leftCurrentTrigger)) {
              // 左手分割トリガーの発射
              this.fireSplittingTrigger(entity, trigger, character, transform, true);
            } else {
              // 通常の左手攻撃
              this.useLeftWeaponAttack(entity, trigger, character, transform, 'horizontal');
            }
          }
        }

        // 左手サブアクション（Eキー）
        if (input.subLeftAction && trigger.leftCurrentTrigger) {
          const leftDefinition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
          console.log(`🎮 左手サブアクション発動: ${trigger.leftCurrentTrigger} (カテゴリ: ${leftDefinition.category})`);
          if (leftDefinition.category === 'attacker') {
            this.useLeftWeaponAttack(entity, trigger, character, transform, 'vertical');
          } else if (leftDefinition.category === 'sniper') {
            // 左手スナイパーのサブアクション：スコープ切り替え
            this.toggleSniperScope(entity);
          } else if (leftDefinition.category === 'gunner') {
            // 左手ガンナーのサブアクション：エイミングモード切り替え
            this.toggleGunnerAiming(entity);
          } else if (leftDefinition.category === 'shooter' && this.isSplittingTrigger(trigger.leftCurrentTrigger)) {
            // 左手分割トリガーのサブアクション：分割数増加
            this.splitTriggerCubes(entity, true);
          }
        }

        // 射撃系トリガーの処理（シューター・ガンナー・スナイパー）
        this.handleShootingTriggers(entity, input, trigger, character, transform);
      }
    }

    // 発射物の更新
    this.updateProjectiles(deltaTime);
    
    // 武器の位置更新
    this.updateWeaponPositions();
    this.updateLeftWeaponPositions();
    
    // 攻撃エフェクトの位置更新
    this.updateAttackEffectPositions();
    
    // アクティブな攻撃の当たり判定を更新
    this.updateActiveAttacks(deltaTime);
    
    // 分割トリガーキューブの位置更新
    this.updateSplittingCubes();
    
    // 武器の表示状態をチェック（デバッグ）
    // if (entities.length > 0) {
    //   console.log('Weapon entities count:', this.weaponEntities.size);
    // }
  }

  /**
   * 分割トリガーかどうかを判定
   */
  private isSplittingTrigger(triggerType: TriggerType): boolean {
    return triggerType === TriggerType.ASTEROID || 
           triggerType === TriggerType.METEORA || 
           triggerType === TriggerType.VIPER ||
           triggerType === TriggerType.HOUND;
  }

  /**
   * 分割トリガーのキューブを生成
   */
  private generateSplittingCubes(entity: Entity, trigger: Trigger, character: Character, isLeftHand: boolean): void {
    const triggerType = isLeftHand ? trigger.leftCurrentTrigger : trigger.currentTrigger;
    if (!triggerType) return;

    // 既存のキューブを削除
    const existingCubes = this.cubeEntities.get(entity.id);
    if (existingCubes) {
      existingCubes.forEach(cube => this.world!.removeEntity(cube));
      this.cubeEntities.delete(entity.id);
    }

    // 既存の武器を削除（分割トリガーの場合は武器は不要）
    if (isLeftHand) {
      this.removeLeftVisualWeapon(entity);
      trigger.leftWeaponGenerated = false;
    } else {
      this.removeVisualWeapon(entity);
      trigger.weaponGenerated = false;
    }

    // 分割トリガーコンポーネントを取得または作成
    let splittingTrigger = this.splittingTriggers.get(entity.id);
    if (!splittingTrigger) {
      splittingTrigger = new SplittingTrigger(triggerType);
      this.splittingTriggers.set(entity.id, splittingTrigger);
    }

    // トリオン量に基づいてキューブサイズを設定
    const trionRatio = character.stats.currentTrion / character.stats.trionCapacity;
    splittingTrigger.setTrionBasedSize(trionRatio);
    splittingTrigger.isGenerated = true;

    // キューブエンティティを作成
    const cubes: Entity[] = [];
    const splitCount = splittingTrigger.getSplitCount();
    const gridSize = Math.sqrt(splitCount);
    const spacing = 0.3;
    const baseSize = splittingTrigger.cubeSize * 0.2;

    for (let i = 0; i < splitCount; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      const cubeEntity = this.world!.createEntity();
      
      // キューブの位置を計算（持っている腕の前方に配置）
      const transform = entity.getComponent(Transform)!;
      
      // カメラの向きを取得
      const renderSys = this.world?.getSystem(RenderSystem);
      const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
      
      // プレイヤーの前方と右方向ベクトルを計算
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
      
      const right = new THREE.Vector3(1, 0, 0);
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
      
      // 腕の位置からのオフセット（左手は左側、右手は右側）
      const armOffset = isLeftHand ? -0.8 : 0.8;
      const forwardOffset = 2.0; // キャラクターから前方2mの位置
      
      // キューブグリッドの相対位置
      const gridOffsetRight = (col - gridSize / 2 + 0.5) * spacing;
      const gridOffsetUp = (row - gridSize / 2 + 0.5) * spacing;
      
      // 最終位置を計算
      const cubePosition = transform.position.clone();
      cubePosition.addScaledVector(right, armOffset + gridOffsetRight);
      cubePosition.y += 1.2 + gridOffsetUp; // 胸の高さ
      cubePosition.addScaledVector(forward, forwardOffset);
      
      // キューブメッシュを作成
      const geometry = new THREE.BoxGeometry(baseSize, baseSize, baseSize);
      let cubeColor = 0x00ff88; // デフォルト（アステロイド）
      
      if (triggerType === TriggerType.METEORA) {
        cubeColor = 0xff8800; // メテオラは橙色
      } else if (triggerType === TriggerType.VIPER) {
        cubeColor = 0x8800ff; // バイパーは紫色
      } else if (triggerType === TriggerType.HOUND) {
        cubeColor = 0x00ff44; // ハウンドは緑色
      }
      
      const material = new THREE.MeshBasicMaterial({
        color: cubeColor,
        transparent: true,
        opacity: 0.7
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      cubeEntity.addComponent(Transform, new Transform(
        cubePosition,
        new THREE.Euler(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      ));
      cubeEntity.addComponent(MeshComponent, new MeshComponent(mesh));
      cubeEntity.addTag('splitting-cube');
      
      cubes.push(cubeEntity);
    }

    this.cubeEntities.set(entity.id, cubes);
    console.log(`Generated ${splitCount} splitting cubes for ${triggerType}`);
  }

  /**
   * 分割トリガーのキューブを分割
   */
  private splitTriggerCubes(entity: Entity, isLeftHand: boolean): void {
    const splittingTrigger = this.splittingTriggers.get(entity.id);
    if (!splittingTrigger || !splittingTrigger.canSplit()) {
      console.log('Cannot split: trigger not found, not generated, or max split reached');
      return;
    }
    
    // キューブが実際に生成されているか再度確認
    if (!splittingTrigger.isGenerated) {
      console.log('Cannot split: cubes not generated yet. Press R to generate cubes first.');
      return;
    }

    // 分割レベルを上げる
    if (splittingTrigger.nextSplitLevel()) {
      console.log(`Split level increased to ${splittingTrigger.currentSplitLevel}`);
      
      // キューブを再生成
      const trigger = entity.getComponent(Trigger)!;
      const character = entity.getComponent(Character)!;
      this.generateSplittingCubes(entity, trigger, character, isLeftHand);
    }
  }

  /**
   * 分割トリガーを発射
   */
  private fireSplittingTrigger(entity: Entity, trigger: Trigger, character: Character, transform: Transform, isLeftHand: boolean): void {
    const splittingTrigger = this.splittingTriggers.get(entity.id);
    if (!splittingTrigger || !splittingTrigger.isGenerated) {
      console.log('No splitting trigger cubes to fire');
      return;
    }

    const triggerType = isLeftHand ? trigger.leftCurrentTrigger : trigger.currentTrigger;
    if (!triggerType) return;

    const definition = TRIGGER_DEFINITIONS[triggerType];
    const splitCount = splittingTrigger.getSplitCount();
    const damagePerProjectile = definition.damage * splittingTrigger.getDamageMultiplier();

    // 各キューブから弾丸を発射
    const shootingSystem = this.world?.getSystem(ShootingSystem);
    if (shootingSystem) {
      const gridSize = Math.sqrt(splitCount);
      const spacing = 0.3; // キューブ間の間隔と同じ
      
      // カメラの向きを取得
      const renderSys = this.world?.getSystem(RenderSystem);
      const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
      
      // プレイヤーの右方向と上方向ベクトルを計算
      const right = new THREE.Vector3(1, 0, 0);
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
      
      const up = new THREE.Vector3(0, 1, 0);
      
      // 各キューブの位置から平行に発射
      for (let i = 0; i < splitCount; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        
        // キューブの相対位置を計算（グリッド中心からのオフセット）
        const offsetRight = (col - gridSize / 2 + 0.5) * spacing;
        const offsetUp = (row - gridSize / 2 + 0.5) * spacing;
        
        // 腕の位置からのオフセット
        const armOffset = isLeftHand ? -0.8 : 0.8;
        const forwardOffset = 2.0; // キャラクターから前方2mの位置
        
        // 発射位置を計算（キューブと同じ位置から発射）
        const firePosition = transform.position.clone();
        firePosition.addScaledVector(right, armOffset + offsetRight);
        firePosition.y += 1.2 + offsetUp; // 胸の高さ
        
        // キャラクターとの干渉を避けるため、少し前方から発射
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        firePosition.addScaledVector(forward, forwardOffset);
        
        // 平行な弾道で発射（方向は同じ、位置だけ異なる）
        const tempTransform = new Transform(
          firePosition,
          transform.rotation.clone(),
          transform.scale.clone()
        );
        
        // 一時的にtransformを置き換えて発射
        const originalTransform = entity.getComponent(Transform);
        entity.removeComponent(Transform);
        entity.addComponent(Transform, tempTransform);
        
        shootingSystem.fireProjectile(entity, tempTransform, character, triggerType, isLeftHand);
        
        // 元のtransformに戻す
        entity.removeComponent(Transform);
        entity.addComponent(Transform, originalTransform);
      }
    }

    // キューブを削除
    const cubes = this.cubeEntities.get(entity.id);
    if (cubes) {
      cubes.forEach(cube => this.world!.removeEntity(cube));
      this.cubeEntities.delete(entity.id);
    }

    // 分割トリガーをリセット
    splittingTrigger.resetSplit();
    splittingTrigger.isGenerated = false;
    
    console.log(`Fired ${splitCount} projectiles from splitting trigger`);
  }

  /**
   * 武器エンティティを取得（SwordActionSystemから使用）
   */
  public getWeaponEntity(entityId: number): Entity | null {
    console.log(`🔍 TriggerSystem.getWeaponEntity: ID=${entityId}, マップサイズ=${this.weaponEntities.size}`);
    console.log(`🔍 weaponEntitiesマップ内容:`, Array.from(this.weaponEntities.keys()));
    const weaponEntity = this.weaponEntities.get(entityId) || null;
    console.log(`🔍 結果: ${weaponEntity ? `武器エンティティID=${weaponEntity.id}` : 'null'}`);
    return weaponEntity;
  }

  /**
   * Transformからプレイヤーエンティティを取得
   */
  private getEntityByTransform(transform: Transform): Entity | null {
    const entities = this.world?.getEntities() || [];
    for (const entity of entities) {
      const entityTransform = entity.getComponent(Transform);
      if (entityTransform === transform) {
        console.log(`🎯 攻撃者エンティティ発見: ID=${entity.id}, tags=${Array.from(entity.tags).join(', ')}`);
        return entity;
      }
    }
    console.log(`❌ Transform に対応するエンティティが見つかりません`);
    return null;
  }

  /**
   * 武器を生成
   */
  private generateWeapon(
    _entity: Entity,
    trigger: Trigger,
    character: Character
  ): void {
    if (!trigger.currentTrigger) {
      console.log('No current trigger selected');
      return;
    }

    const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
    console.log('Trigger definition:', definition);
    
    if (definition.category === 'sniper') {
      console.log('Processing sniper weapon generation');
      // スナイパーも武器生成式に変更
      // 既存の武器をチェックし、異なるトリガーの場合は削除
      const existingWeaponEntity = this.weaponEntities.get(_entity.id);
      console.log('Existing weapon entity:', existingWeaponEntity);
      console.log('Current trigger:', trigger.currentTrigger);
      console.log('Last generated trigger:', trigger.lastGeneratedTrigger);
      
      if (existingWeaponEntity) {
        // 異なるトリガーの武器が生成されている場合は削除
        if (trigger.lastGeneratedTrigger !== trigger.currentTrigger) {
          console.log('Removing existing different weapon');
          this.removeVisualWeapon(_entity);
          trigger.dismissWeapon();
        } else if (trigger.weaponGenerated) {
          // 同じトリガーの武器が既に生成されている場合は何もしない
          console.log('Same weapon already exists, returning');
          return;
        }
      }
      
      // 武器生成のトリオンコストをチェック
      const trionCost = trigger.getWeaponGenerationCost();
      console.log('Trion cost:', trionCost, 'Current trion:', character.stats.currentTrion);
      
      if (character.stats.currentTrion < trionCost) {
        console.log('Insufficient trion');
        return; // トリオン不足
      }

      console.log('Calling trigger.generateWeapon()');
      if (!trigger.generateWeapon()) {
        console.log('trigger.generateWeapon() returned false');
        return; // 生成エラー
      }
      
      console.log('Weapon generation successful, consuming trion');
      // トリオンを消費（生成時のみ）
      character.takeDamage(trionCost);
      
      console.log('Creating visual weapon');
      // 視覚的な武器を作成
      this.createVisualWeapon(_entity, trigger.currentTrigger);
      
      // 生成された武器を記録
      trigger.lastGeneratedTrigger = trigger.currentTrigger;
      
      // スナイパー武器生成後は即座に射撃可能にする
      const state = trigger.states.get(trigger.currentTrigger);
      if (state) {
        state.cooldownRemaining = 0;
        console.log('Force reset sniper cooldown after weapon generation');
      }
      
      console.log(`Sniper weapon generated: ${trigger.currentTrigger}`);
      console.log('Weapon entities map size:', this.weaponEntities.size);
      return;
    } else if (definition.category === 'gunner') {
      console.log('Processing gunner weapon generation');
      // ガンナーも武器生成式
      // 既存の武器をチェックし、異なるトリガーの場合は削除
      const existingWeaponEntity = this.weaponEntities.get(_entity.id);
      console.log('Existing weapon entity:', existingWeaponEntity);
      console.log('Current trigger:', trigger.currentTrigger);
      console.log('Last generated trigger:', trigger.lastGeneratedTrigger);
      
      if (existingWeaponEntity) {
        // 異なるトリガーの武器が生成されている場合は削除
        if (trigger.lastGeneratedTrigger !== trigger.currentTrigger) {
          console.log('Removing existing different weapon');
          this.removeVisualWeapon(_entity);
          trigger.dismissWeapon();
        } else if (trigger.weaponGenerated) {
          // 同じトリガーの武器が既に生成されている場合は何もしない
          console.log('Same weapon already exists, returning');
          return;
        }
      }
      
      // 武器生成のトリオンコストをチェック
      const trionCost = trigger.getWeaponGenerationCost();
      console.log('Trion cost:', trionCost, 'Current trion:', character.stats.currentTrion);
      
      if (character.stats.currentTrion < trionCost) {
        console.log('Insufficient trion');
        return; // トリオン不足
      }

      console.log('Calling trigger.generateWeapon()');
      if (!trigger.generateWeapon()) {
        console.log('trigger.generateWeapon() returned false');
        return; // 生成エラー
      }
      
      console.log('Weapon generation successful, consuming trion');
      // トリオンを消費（生成時のみ）
      character.takeDamage(trionCost);
      
      console.log('Creating visual weapon');
      // 視覚的な武器を作成
      this.createVisualWeapon(_entity, trigger.currentTrigger);
      
      // 生成された武器を記録
      trigger.lastGeneratedTrigger = trigger.currentTrigger;
      
      console.log(`Gunner weapon generated: ${trigger.currentTrigger}`);
      console.log('Weapon entities map size:', this.weaponEntities.size);
      return;
    } else if (definition.category !== 'attacker') {
      // アタッカーでもスナイパーでもガンナーでもない場合は従来通り
      this.useNonAttackerTrigger(trigger, character);
      return;
    }

    // 既存の武器を削除（異なるトリガーの場合のみ）
    const existingWeaponEntity = this.weaponEntities.get(_entity.id);
    if (existingWeaponEntity && trigger.weaponGenerated) {
      // 既に同じトリガーの武器が生成されている場合は何もしない
      return;
    } else if (existingWeaponEntity) {
      // 異なるトリガーの武器が生成されている場合は削除
      this.removeVisualWeapon(_entity);
      trigger.dismissWeapon();
    }

    // 武器生成のトリオンコストをチェック
    const trionCost = trigger.getWeaponGenerationCost();
    if (character.stats.currentTrion < trionCost) {
      return; // トリオン不足
    }

    if (!trigger.generateWeapon()) {
      return; // 生成エラー
    }

    // トリオンを消費（生成時のみ）
    character.takeDamage(trionCost);
    
    // 視覚的な武器を作成
    this.createVisualWeapon(_entity, trigger.currentTrigger);
    
    // 生成された武器を記録
    trigger.lastGeneratedTrigger = trigger.currentTrigger;
    
    console.log(`Weapon generated: ${trigger.currentTrigger}`);
    console.log('Weapon entities map size:', this.weaponEntities.size);
  }

  /**
   * 左手武器を生成
   */
  private generateLeftWeapon(
    _entity: Entity,
    trigger: Trigger,
    character: Character
  ): void {
    console.log('generateLeftWeapon called');
    if (!trigger.leftCurrentTrigger) {
      console.log('No left trigger selected');
      return;
    }

    const definition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
    // 左手でも様々なカテゴリのトリガーを生成可能
    if (definition.category !== 'attacker' && 
        definition.category !== 'sniper' && 
        definition.category !== 'gunner' && 
        definition.category !== 'shooter') {
      console.log('Left trigger category not supported for weapon generation:', definition.category);
      return;
    }

    // 既存の左手武器を削除（異なるトリガーの場合のみ）
    const existingLeftWeaponEntity = this.leftWeaponEntities.get(_entity.id);
    if (existingLeftWeaponEntity && trigger.leftWeaponGenerated) {
      // 既に同じトリガーの左手武器が生成されている場合は何もしない
      return;
    } else if (existingLeftWeaponEntity) {
      // 異なるトリガーの左手武器が生成されている場合は削除
      this.removeLeftVisualWeapon(_entity);
      trigger.dismissLeftWeapon();
    }

    // 武器生成のトリオンコストをチェック
    const trionCost = trigger.getLeftWeaponGenerationCost();
    if (character.stats.currentTrion < trionCost) {
      return; // トリオン不足
    }

    if (!trigger.generateLeftWeapon()) {
      return; // 生成エラー
    }

    // トリオンを消費（生成時のみ）
    character.takeDamage(trionCost);
    
    // 視覚的な左手武器を作成
    this.createLeftVisualWeapon(_entity, trigger.leftCurrentTrigger);
    
    console.log(`Left weapon generated: ${trigger.leftCurrentTrigger}`);
  }

  /**
   * 非アタッカートリガーの使用
   */
  private useNonAttackerTrigger(
    trigger: Trigger,
    character: Character
  ): void {
    if (!trigger.currentTrigger) return;

    const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
    
    // ガンナーカテゴリは武器生成式なのでここでは処理しない
    if (definition.category === 'gunner') {
      console.log('Gunner trigger requires weapon generation first');
      return;
    }

    const trionCost = trigger.getTrionCost();
    if (character.stats.currentTrion < trionCost) {
      return; // トリオン不足
    }

    if (!trigger.useTrigger()) {
      return; // クールダウン中または弾切れ
    }

    // トリオンを消費
    character.takeDamage(trionCost);

    // TODO: 射撃・狙撃系の処理を実装
  }

  /**
   * 武器攻撃を実行
   */
  private useWeaponAttack(
    _entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    attackType: 'horizontal'
  ): void {
    if (!trigger.currentTrigger) return;

    const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
    if (definition.category !== 'attacker') {
      // アタッカー以外は従来通り（トリオン消費して使用）
      this.useNonAttackerTrigger(trigger, character);
      return;
    }

    // 武器が生成されているかチェック
    if (!trigger.weaponGenerated) {
      console.log('Weapon not generated. Press R to generate weapon first.');
      return;
    }

    if (!trigger.useWeaponAttack()) {
      return; // クールダウン中
    }

    // 攻撃中は装備武器を非表示
    this.hideEquippedWeapon(_entity);

    // アニメーションシステムを取得して剣振りアニメーションを開始
    const animationSystem = this.world?.getSystem(AnimationSystem);
    if (animationSystem) {
      animationSystem.forceAnimation(_entity.id, AnimationState.SWORD_SWING);
    }

    // 攻撃実行（トリオン消費なし）- 横斬りのみ
    this.performMeleeAttack(trigger.currentTrigger, transform, character);
    // 横斬りアニメーション終了後に武器を再表示
    setTimeout(() => {
      this.showEquippedWeapon(_entity);
    }, GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION);
  }

  /**
   * 左手武器攻撃を実行
   */
  private useLeftWeaponAttack(
    _entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    attackType: 'horizontal' | 'vertical'
  ): void {
    if (!trigger.leftCurrentTrigger) return;

    const definition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
    if (definition.category !== 'attacker') {
      return;
    }

    // 左手武器が生成されているかチェック
    if (!trigger.leftWeaponGenerated) {
      console.log('Left weapon not generated. Press T to generate left weapon first.');
      return;
    }

    if (!trigger.useLeftWeaponAttack()) {
      return; // クールダウン中
    }

    // 攻撃中は左手装備武器を非表示
    this.hideLeftEquippedWeapon(_entity);

    // 左手攻撃実行（トリオン消費なし）
    if (attackType === 'vertical') {
      this.performLeftVerticalAttack(trigger.leftCurrentTrigger, transform, character);
      // 縦斬りアニメーション終了後に左手武器を再表示
      setTimeout(() => {
        this.showLeftEquippedWeapon(_entity);
      }, GAME_CONFIG.ATTACK.VERTICAL_SLASH.ANIMATION_DURATION);
    } else {
      this.performLeftMeleeAttack(trigger.leftCurrentTrigger, transform, character);
      // 横斬りアニメーション終了後に左手武器を再表示
      setTimeout(() => {
        this.showLeftEquippedWeapon(_entity);
      }, GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION);
    }
  }

  /**
   * 近接攻撃を実行
   */
  private performMeleeAttack(
    triggerType: TriggerType,
    transform: Transform,
    character: Character
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    const attackerEntity = this.getEntityByTransform(transform);
    
    if (!attackerEntity) {
      console.log('❌ 攻撃者エンティティが見つかりません');
      return;
    }

    // SwordActionSystemから拡張範囲を取得
    const swordActionSystem = this.world?.getSystem(SwordActionSystem);
    let attackRange = definition.range;
    
    if (swordActionSystem && triggerType === TriggerType.KOGETSU) {
      // 現在の刀身長に基づいて攻撃範囲を取得（自動伸長は行わない）
      attackRange = swordActionSystem.getAttackRange(attackerEntity, definition.range);
      console.log(`🗡️ コゲツ攻撃開始: 基本範囲${definition.range}m → 実際${attackRange.toFixed(1)}m`);
    }

    // 扇形攻撃エフェクトを生成
    const damage = definition.damage;
    const slashEntity = AttackEffects.createFanSlashEffect(
      this.world,
      transform,
      triggerType,
      attackRange,
      attackerEntity,
      damage
    );
    
    // カメラの向きを攻撃エフェクトに設定
    const renderSystem = this.world?.getSystem(RenderSystem);
    if (renderSystem) {
      const cameraRotation = renderSystem.getCameraRotation();
      const slashTransform = slashEntity.getComponent(Transform);
      if (slashTransform) {
        slashTransform.rotation.y = cameraRotation.y;
        slashTransform.rotation.x = cameraRotation.x;
      }
    }
    
    // 攻撃エフェクトとプレイヤーエンティティの関連付け
    this.attackEffects.set(slashEntity, attackerEntity);
    
    // アクティブな攻撃情報を記録
    this.activeAttacks.set(slashEntity, {
      type: 'horizontal',
      range: attackRange,
      damage: definition.damage,
      startTime: Date.now(),
      duration: GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION
    });
    
    // エフェクトを削除するタイマー
    setTimeout(() => {
      this.world!.removeEntity(slashEntity);
      this.attackEffects.delete(slashEntity);
      this.activeAttacks.delete(slashEntity);
      console.log('Horizontal attack effect removed');
    }, GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION);
    
  }





  /**
   * 発射物を更新
   */
  private updateProjectiles(_deltaTime: number): void {
    const projectiles = this.world!.getEntitiesWithTag('projectile');
    
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
   * 発射物を削除
   */
  private removeProjectile(projectile: Entity): void {
    // タグをクリア
    projectile.removeTag('projectile');
    projectile.removeTag('explosive');
    projectile.active = false;
    
    // プールに戻す
    this.projectilePool.push(projectile);
  }

  /**
   * 爆発を作成
   */
  private createExplosion(position: THREE.Vector3): void {
    // TODO: 爆発エフェクトの実装
    console.log('Explosion at', position);
  }

  /**
   * 近接攻撃の当たり判定
   */
  private checkMeleeHit(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    damage: number,
    attacker: Entity
  ): void {
    // 攻撃対象となるエンティティを検索
    const entities = this.world?.getEntities() || [];
    
    for (const entity of entities) {
      const transform = entity.getComponent(Transform);
      const collider = entity.getComponent(Collider);
      const character = entity.getComponent(Character);
      
      // 攻撃者本人、コライダーなし、キャラクターではない場合はスキップ
      if (!transform || !collider || !character) continue;
      
      // 自分自身への攻撃は除外
      if (entity.id === attacker.id) continue;
      
      // 同チーム攻撃は除外
      const attackerCharacter = attacker.getComponent(Character);
      if (attackerCharacter && attackerCharacter.team === character.team) continue;
      
      // 攻撃範囲内の判定
      const targetPosition = transform.position;
      const distance = origin.distanceTo(targetPosition);
      
      if (distance <= range) {
        // 方向チェック（攻撃方向の範囲内か）
        const toTarget = new THREE.Vector3().subVectors(targetPosition, origin).normalize();
        const angle = direction.angleTo(toTarget);
        
        // 150度の範囲内で攻撃ヒット
        if (angle <= (5 * Math.PI) / 12) { // 150度の半分 = 75度
          this.applyDamage(entity, damage);
          this.createHitEffect(targetPosition);
          console.log(`Melee hit! Damage: ${damage}, Target: ${entity.id}`);
        }
      }
    }
  }

  /**
   * 縦斬り攻撃の当たり判定
   */
  private checkVerticalHit(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    damage: number,
    attacker: Entity
  ): void {
    // 攻撃対象となるエンティティを検索
    const entities = this.world?.getEntities() || [];
    
    for (const entity of entities) {
      const transform = entity.getComponent(Transform);
      const collider = entity.getComponent(Collider);
      const character = entity.getComponent(Character);
      
      // 攻撃者本人、コライダーなし、キャラクターではない場合はスキップ
      if (!transform || !collider || !character) continue;
      
      // 自分自身への攻撃は除外
      if (entity.id === attacker.id) continue;
      
      // 同チーム攻撃は除外
      const attackerCharacter = attacker.getComponent(Character);
      if (attackerCharacter && attackerCharacter.team === character.team) continue;
      
      // 攻撃範囲内の判定
      const targetPosition = transform.position;
      const distance = origin.distanceTo(targetPosition);
      
      if (distance <= range) {
        // 前方向の判定（縦斬りは前方のみ）
        const toTarget = new THREE.Vector3().subVectors(targetPosition, origin).normalize();
        const angle = direction.angleTo(toTarget);
        
        // 72度の縦扇形範囲内で攻撃ヒット
        if (angle <= GAME_CONFIG.ATTACK.VERTICAL_SLASH.TOTAL_ANGLE / 2) {
          this.applyDamage(entity, damage);
          this.createHitEffect(targetPosition);
          console.log(`Vertical slash hit! Damage: ${damage}, Target: ${entity.id}`);
        }
      }
    }
  }
  
  /**
   * ダメージを適用
   */
  private applyDamage(target: Entity, damage: number): void {
    const character = target.getComponent(Character);
    if (character) {
      character.takeDamage(damage);
      const newTrion = character.stats.currentTrion;
      
      // デバッグ用ログ
      console.log(`Damage applied: ${damage}, Remaining trion: ${newTrion}/${character.stats.trionCapacity}`);
      
      // トリオンが0になった場合の処理
      if (character.isDefeated()) {
        console.log('Target defeated!');
        // TODO: 敗北時の処理（エンティティ削除、アニメーション等）
      }
    }
  }
  
  /**
   * 視覚的な武器を作成
   */
  private createVisualWeapon(playerEntity: Entity, triggerType: TriggerType): void {
    console.log('createVisualWeapon called for:', triggerType);
    const playerTransform = playerEntity.getComponent(Transform);
    if (!playerTransform) {
      console.log('No player transform found');
      return;
    }
    
    console.log('Creating weapon entity');
    // 武器エンティティを作成
    const weaponEntity = this.world!.createEntity();
    
    console.log('Creating weapon mesh for:', triggerType);
    // 武器の3Dモデルを作成
    const weaponMesh = this.createWeaponMesh(triggerType);
    
    console.log('Setting weapon position');
    // 武器の位置を設定（プレイヤーの右手に配置）
    const weaponTransform = new Transform(
      playerTransform.position.clone(),
      playerTransform.rotation.clone(),
      new THREE.Vector3(1, 1, 1)
    );
    
    console.log('Adding components to weapon entity');
    weaponEntity.addComponent(Transform, weaponTransform);
    weaponEntity.addComponent(MeshComponent, new MeshComponent(weaponMesh));
    weaponEntity.addTag('weapon');
    
    console.log('Storing weapon entity in map');
    // 武器エンティティを記録
    this.weaponEntities.set(playerEntity.id, weaponEntity);
    console.log(`✅ 武器エンティティ登録: プレイヤーID=${playerEntity.id} → 武器ID=${weaponEntity.id}`);
    console.log('Weapon created successfully. Map size:', this.weaponEntities.size);
    console.log('Current weapon entities map:', Array.from(this.weaponEntities.keys()));
  }

  /**
   * 武器の3Dメッシュを作成
   */
  private createWeaponMesh(triggerType: TriggerType, isLeftHand: boolean = false): THREE.Group {
    console.log('Creating weapon mesh for:', triggerType, 'isLeftHand:', isLeftHand);
    const weaponGroup = new THREE.Group();
    
    switch (triggerType) {
      case TriggerType.KOGETSU:
        console.log('Creating Kogetsu mesh');
        weaponGroup.add(this.createKogetsuMesh());
        break;
      case TriggerType.RAYGUST:
        console.log('Creating Raygust mesh');
        weaponGroup.add(this.createRaygustMesh());
        break;
      case TriggerType.IBIS:
        console.log('Creating Ibis mesh');
        weaponGroup.add(this.createIbisMesh());
        break;
      case TriggerType.LIGHTNING:
        console.log('Creating Lightning mesh');
        weaponGroup.add(this.createLightningMesh());
        break;
      case TriggerType.EAGLET:
        console.log('Creating Eaglet mesh');
        weaponGroup.add(this.createEagletMesh());
        break;
      case TriggerType.ASTEROID_GUN:
        console.log('Creating Asteroid Gun mesh');
        weaponGroup.add(this.createAsteroidGunMesh());
        break;
      default:
        console.log('Creating default sword mesh');
        weaponGroup.add(this.createDefaultSwordMesh());
        break;
    }
    
    console.log('Setting weapon position and rotation');
    // 武器の持ち方を調整
    weaponGroup.position.set(0, 0, 0); // ローカル原点
    
    // 武器タイプによる回転設定
    const definition = TRIGGER_DEFINITIONS[triggerType];
    const isGunType = (triggerType === TriggerType.ASTEROID_GUN || 
                      triggerType === TriggerType.IBIS || 
                      triggerType === TriggerType.LIGHTNING ||
                      definition.category === 'gunner' ||
                      definition.category === 'sniper');
    
    if (isGunType) {
      // 銃器類は水平に構える（傾けない）
      if (isLeftHand) {
        // 左手銃は左向きに調整
        weaponGroup.rotation.set(0, Math.PI * 0.8, Math.PI * 0.1);
        weaponGroup.position.set(0, 0, 0);
      } else {
        weaponGroup.rotation.set(0, 0, 0);
        weaponGroup.position.set(0, 0, 0);
      }
    } else {
      // 剣類は体の向きに対して相対的に正面方向に傾く角度
      if (isLeftHand) {
        // 左手で握っているような角度（体の向きに対して相対的に正面に傾く）
        weaponGroup.rotation.set(-Math.PI / 6, Math.PI / 12, 0);
      } else {
        // 右手で握っているような角度（体の向きに対して相対的に正面に傾く）
        weaponGroup.rotation.set(-Math.PI / 6, -Math.PI / 12, 0);
      }
    }
    
    console.log('Weapon mesh created successfully');
    return weaponGroup;
  }

  /**
   * 弧月のメッシュを作成
   */
  private createKogetsuMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    
    // 柄の中央を手の位置（原点）に配置するため、全体を上方向にシフト
    const handleOffset = 0.125; // 柄の半分の長さ
    
    // 刀身（日本刀風の細長い形状）
    const bladeGeometry = new THREE.BoxGeometry(0.03, 1.0, 0.005);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6f3ff, // より銀色に近い刀身
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0x001122,
      emissiveIntensity: 0.1
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.5 + handleOffset, 0); // 柄分上にシフト
    swordGroup.add(blade);
    
    // 刃文（刀身の模様）
    const hamon = new THREE.BoxGeometry(0.031, 0.8, 0.001);
    const hamonMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff, // トリオン色の刃文
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x004466,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.8
    });
    
    const hamonMesh = new THREE.Mesh(hamon, hamonMaterial);
    hamonMesh.position.set(0, 0.5 + handleOffset, 0.003); // 柄分上にシフト
    swordGroup.add(hamonMesh);
    
    // 鍔（つば）- 柄と刀身の境界
    const guardGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.4
    });
    
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, handleOffset, 0); // 柄の上端
    guard.rotation.z = Math.PI / 2;
    swordGroup.add(guard);
    
    // 柄（つか）- 手が握る部分、中央を原点に配置
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810, // 茶色の柄
      metalness: 0.1,
      roughness: 0.8
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0); // 原点に配置（手の位置）
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    // 柄巻き（つかまき）の装飾 - 柄の範囲内に配置
    for (let i = 0; i < 8; i++) {
      const wrapGeometry = new THREE.TorusGeometry(0.03, 0.003, 4, 8);
      const wrapMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        metalness: 0.2,
        roughness: 0.9
      });
      
      const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
      wrap.position.set(0, -0.125 + (i * 0.03), 0); // 柄の下端から上へ
      wrap.rotation.x = Math.PI / 2;
      swordGroup.add(wrap);
    }
    
    // 切っ先（きっさき）の強調
    const tipGeometry = new THREE.ConeGeometry(0.015, 0.05, 6);
    const tipMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ccee,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x003344,
      emissiveIntensity: 0.3
    });
    
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.set(0, 1.025 + handleOffset, 0); // 刀身の先端
    tip.rotation.z = Math.PI / 2;
    swordGroup.add(tip);
    
    // 柄頭（つかがしら） - 柄の下端装飾
    const pommelGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const pommelMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.3
    });
    
    const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
    pommel.position.set(0, -0.135, 0); // 柄の下端
    swordGroup.add(pommel);
    
    return swordGroup;
  }

  /**
   * レイガストのメッシュを作成
   */
  private createRaygustMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    
    // 柄の中央を手の位置（原点）に配置
    const handleOffset = 0.125;
    
    // より厚めの剣身
    const bladeGeometry = new THREE.BoxGeometry(0.08, 1.0, 0.03);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x004400,
      emissiveIntensity: 0.2
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.5 + handleOffset, 0); // 柄分上にシフト
    swordGroup.add(blade);
    
    // 柄（つか）
    const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.25, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0); // 原点に配置（手の位置）
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    return swordGroup;
  }

  /**
   * デフォルトの剣メッシュを作成
   */
  private createDefaultSwordMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    
    // 柄の中央を手の位置（原点）に配置
    const handleOffset = 0.125;
    
    const bladeGeometry = new THREE.BoxGeometry(0.06, 1.1, 0.025);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.55 + handleOffset, 0); // 柄分上にシフト
    swordGroup.add(blade);
    
    // 柄（つか）
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0); // 原点に配置（手の位置）
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    return swordGroup;
  }

  /**
   * アイビスのメッシュを作成
   */
  private createIbisMesh(): THREE.Group {
    const rifleGroup = new THREE.Group();
    
    // アイビス専用のマテリアル（オレンジの重火器）
    const ibisMainMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x441100,
      emissiveIntensity: 0.3
    });
    
    const ibisAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0xffaa22,
      emissiveIntensity: 0.5
    });
    
    const ibisHeavyMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.4
    });
    
    // 太いメインバレル（アイビスの特徴的な重量感）
    const barrelGeometry = new THREE.BoxGeometry(0.12, 0.12, 1.5);
    const barrel = new THREE.Mesh(barrelGeometry, ibisMainMaterial);
    barrel.position.set(0, 0, -0.4); // 前方に配置
    rifleGroup.add(barrel);
    
    // 巨大なマズルブレーキ（アイビス特有の重火器感）
    const muzzleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.12);
    const muzzle = new THREE.Mesh(muzzleGeometry, ibisAccentMaterial);
    muzzle.position.set(0, 0, -1.16); // バレル先端
    rifleGroup.add(muzzle);
    
    // マズルフラッシュハイダー
    const flashHiderGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.04);
    const flashHider = new THREE.Mesh(flashHiderGeometry, ibisAccentMaterial);
    flashHider.position.set(0, 0, -1.24);
    rifleGroup.add(flashHider);
    
    // 大型スコープ（アイビス用の高倍率スコープ）
    const scopeBodyGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.6);
    const scopeBody = new THREE.Mesh(scopeBodyGeometry, ibisMainMaterial);
    scopeBody.position.set(0, 0.12, -0.3);
    rifleGroup.add(scopeBody);
    
    // スコープレンズ（前・大型）
    const frontLensGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.03);
    const frontLensMaterial = new THREE.MeshStandardMaterial({
      color: 0x2244ff,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.9,
      emissive: 0x0044ff,
      emissiveIntensity: 0.4
    });
    const frontLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    frontLens.position.set(0, 0.12, -0.61);
    rifleGroup.add(frontLens);
    
    // スコープレンズ（後）
    const rearLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    rearLens.position.set(0, 0.12, 0.01);
    rifleGroup.add(rearLens);
    
    // 重厚なレシーバー（機関部）
    const receiverGeometry = new THREE.BoxGeometry(0.14, 0.1, 0.4);
    const receiver = new THREE.Mesh(receiverGeometry, ibisMainMaterial);
    receiver.position.set(0, 0, 0.1);
    rifleGroup.add(receiver);
    
    // 強化トリガーガード
    const triggerGuardGeometry = new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, ibisMainMaterial);
    triggerGuard.position.set(0, -0.03, 0.1);
    triggerGuard.rotation.x = Math.PI / 2;
    rifleGroup.add(triggerGuard);
    
    // 大型ピストルグリップ
    const gripGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.1);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.3,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.075, 0);
    rifleGroup.add(grip);
    
    // 頑丈なストック
    const stockGeometry = new THREE.BoxGeometry(0.1, 0.06, 0.35);
    const stock = new THREE.Mesh(stockGeometry, ibisHeavyMaterial);
    stock.position.set(0, 0, 0.3);
    rifleGroup.add(stock);
    
    // 大型バットプレート
    const buttGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.03);
    const butt = new THREE.Mesh(buttGeometry, ibisMainMaterial);
    butt.position.set(0, 0, 0.495);
    rifleGroup.add(butt);
    
    // バイポッド（二脚）- アイビスの特徴
    const bipodLegGeometry = new THREE.BoxGeometry(0.005, 0.25, 0.005);
    const bipodMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.3
    });
    
    // 左脚
    const leftLeg = new THREE.Mesh(bipodLegGeometry, bipodMaterial);
    leftLeg.position.set(-0.08, -0.125, -0.8);
    leftLeg.rotation.z = Math.PI / 12; // 少し外向き
    rifleGroup.add(leftLeg);
    
    // 右脚
    const rightLeg = new THREE.Mesh(bipodLegGeometry, bipodMaterial);
    rightLeg.position.set(0.08, -0.125, -0.8);
    rightLeg.rotation.z = -Math.PI / 12; // 少し外向き
    rifleGroup.add(rightLeg);
    
    // バイポッド取り付け部
    const bipodMountGeometry = new THREE.BoxGeometry(0.2, 0.02, 0.04);
    const bipodMount = new THREE.Mesh(bipodMountGeometry, ibisHeavyMaterial);
    bipodMount.position.set(0, -0.06, -0.8);
    rifleGroup.add(bipodMount);
    
    // 重火器らしいエネルギーチャンバー
    for (let i = 0; i < 4; i++) {
      const chamberGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.2);
      const chamberMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff6600,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8
      });
      const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * 0.08;
      const y = Math.sin(angle) * 0.08;
      chamber.position.set(x, y, -0.4);
      rifleGroup.add(chamber);
    }
    
    return rifleGroup;
  }

  /**
   * イーグレットのメッシュを作成
   */
  private createEagletMesh(): THREE.Group {
    const rifleGroup = new THREE.Group();
    
    // イーグレット専用のマテリアル（青緑色の中距離狙撃銃）
    const eagletMainMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aacc,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x002244,
      emissiveIntensity: 0.3
    });
    
    const eagletAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ddff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0088cc,
      emissiveIntensity: 0.5
    });
    
    // メインバレル（中距離狙撃銃らしい適度な長さ）
    const barrelGeometry = new THREE.BoxGeometry(0.08, 0.08, 1.0);
    const barrel = new THREE.Mesh(barrelGeometry, eagletMainMaterial);
    barrel.position.set(0, 0, -0.2); // 前方に配置
    rifleGroup.add(barrel);
    
    // マズルコンペンセーター（イーグレット特有の精密射撃用）
    const muzzleGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.08);
    const muzzle = new THREE.Mesh(muzzleGeometry, eagletAccentMaterial);
    muzzle.position.set(0, 0, -0.72); // バレル先端
    rifleGroup.add(muzzle);
    
    // 中倍率スコープ（イーグレット用の中距離スコープ）
    const scopeBodyGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.45);
    const scopeBody = new THREE.Mesh(scopeBodyGeometry, eagletMainMaterial);
    scopeBody.position.set(0, 0.09, -0.15);
    rifleGroup.add(scopeBody);
    
    // スコープレンズ（前）
    const frontLensGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.02);
    const frontLensMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0044bb,
      emissiveIntensity: 0.3
    });
    const frontLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    frontLens.position.set(0, 0.09, -0.385);
    rifleGroup.add(frontLens);
    
    // スコープレンズ（後）
    const rearLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    rearLens.position.set(0, 0.09, 0.075);
    rifleGroup.add(rearLens);
    
    // レシーバー（機関部）
    const receiverGeometry = new THREE.BoxGeometry(0.1, 0.07, 0.32);
    const receiver = new THREE.Mesh(receiverGeometry, eagletMainMaterial);
    receiver.position.set(0, 0, 0.08);
    rifleGroup.add(receiver);
    
    // トリガーガード
    const triggerGuardGeometry = new THREE.TorusGeometry(0.045, 0.006, 6, 12, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, eagletMainMaterial);
    triggerGuard.position.set(0, -0.025, 0.08);
    triggerGuard.rotation.x = Math.PI / 2;
    rifleGroup.add(triggerGuard);
    
    // ピストルグリップ
    const gripGeometry = new THREE.BoxGeometry(0.05, 0.13, 0.09);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.25,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.065, 0);
    rifleGroup.add(grip);
    
    // ストック（中距離用の安定したストック）
    const stockGeometry = new THREE.BoxGeometry(0.08, 0.05, 0.32);
    const stock = new THREE.Mesh(stockGeometry, gripMaterial);
    stock.position.set(0, 0, 0.26);
    rifleGroup.add(stock);
    
    // バットプレート
    const buttGeometry = new THREE.BoxGeometry(0.1, 0.07, 0.025);
    const butt = new THREE.Mesh(buttGeometry, eagletMainMaterial);
    butt.position.set(0, 0, 0.435);
    rifleGroup.add(butt);
    
    // フォアグリップ（イーグレットの特徴的な安定性向上パーツ）
    const foregripeGeometry = new THREE.BoxGeometry(0.03, 0.08, 0.06);
    const foregrip = new THREE.Mesh(foregripeGeometry, gripMaterial);
    foregrip.position.set(0, -0.05, -0.4);
    rifleGroup.add(foregrip);
    
    // サイドレール（アクセサリー取り付け用）
    const railGeometry = new THREE.BoxGeometry(0.12, 0.01, 0.6);
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.3
    });
    const topRail = new THREE.Mesh(railGeometry, railMaterial);
    topRail.position.set(0, 0.045, -0.15);
    rifleGroup.add(topRail);
    
    // エネルギーインジケーター（イーグレット特有の射程延長システム）
    for (let i = 0; i < 3; i++) {
      const indicatorGeometry = new THREE.BoxGeometry(0.008, 0.008, 0.15);
      const indicatorMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aacc,
        emissive: 0x00aacc,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.9
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      const angle = (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * 0.05;
      const y = Math.sin(angle) * 0.05;
      indicator.position.set(x, y, -0.2);
      rifleGroup.add(indicator);
    }
    
    // 可変チョーク（イーグレットの射程調整機構）
    const chokeGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.04);
    const choke = new THREE.Mesh(chokeGeometry, eagletAccentMaterial);
    choke.position.set(0, 0, -0.78);
    rifleGroup.add(choke);
    
    return rifleGroup;
  }

  /**
   * ライトニングのメッシュを作成
   */
  private createLightningMesh(): THREE.Group {
    const rifleGroup = new THREE.Group();
    
    // ライトニング専用のマテリアル（黄色の発光）
    const lightningMainMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x444400,
      emissiveIntensity: 0.4
    });
    
    const lightningAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xffff88,
      emissiveIntensity: 0.6
    });
    
    // メインバレル（細長い狙撃銃の銃身）- 負のZ軸方向（前方）に向ける
    const barrelGeometry = new THREE.BoxGeometry(0.06, 0.06, 1.2);
    const barrel = new THREE.Mesh(barrelGeometry, lightningMainMaterial);
    barrel.position.set(0, 0, -0.3); // 負のZ軸前方にシフト
    rifleGroup.add(barrel);
    
    // 銃口部分（マズルブレーキ）- 銃身の先端
    const muzzleGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.08);
    const muzzle = new THREE.Mesh(muzzleGeometry, lightningAccentMaterial);
    muzzle.position.set(0, 0, -0.94); // バレルの先端
    rifleGroup.add(muzzle);
    
    // スコープ（狙撃銃の特徴）- バレルの上
    const scopeBodyGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.4);
    const scopeBody = new THREE.Mesh(scopeBodyGeometry, lightningMainMaterial);
    scopeBody.position.set(0, 0.08, -0.2); // バレルの上
    rifleGroup.add(scopeBody);
    
    // スコープレンズ（前）- スコープの前端
    const frontLensGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.02);
    const frontLensMaterial = new THREE.MeshStandardMaterial({
      color: 0x4444ff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      emissive: 0x0022ff,
      emissiveIntensity: 0.3
    });
    const frontLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    frontLens.position.set(0, 0.08, -0.41); // スコープ前端
    rifleGroup.add(frontLens);
    
    // スコープレンズ（後）- スコープの後端
    const rearLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    rearLens.position.set(0, 0.08, 0.01); // スコープ後端
    rifleGroup.add(rearLens);
    
    // レシーバー部分（機関部）- グリップの前
    const receiverGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.3);
    const receiver = new THREE.Mesh(receiverGeometry, lightningMainMaterial);
    receiver.position.set(0, 0, 0.05); // グリップの前
    rifleGroup.add(receiver);
    
    // トリガーガード - グリップの前
    const triggerGuardGeometry = new THREE.TorusGeometry(0.04, 0.005, 6, 12, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, lightningMainMaterial);
    triggerGuard.position.set(0, -0.02, 0.08);
    triggerGuard.rotation.x = Math.PI / 2;
    rifleGroup.add(triggerGuard);
    
    // ピストルグリップ（手の位置）- 原点
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.08);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.2,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.06, 0); // 原点（手の位置）
    rifleGroup.add(grip);
    
    // ストック（銃床）- グリップの後ろ
    const stockGeometry = new THREE.BoxGeometry(0.06, 0.04, 0.3);
    const stock = new THREE.Mesh(stockGeometry, gripMaterial);
    stock.position.set(0, 0, 0.25); // 後方
    rifleGroup.add(stock);
    
    // バットプレート（銃床の端）- ストックの後端
    const buttGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const butt = new THREE.Mesh(buttGeometry, lightningMainMaterial);
    butt.position.set(0, 0, 0.41); // ストック後端
    rifleGroup.add(butt);
    
    // エネルギーライン（ライトニング特有の発光ライン）- バレル周囲
    for (let i = 0; i < 3; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.002, 0.002, 1.0);
      const lineMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
      });
      const line = new THREE.Mesh(lineGeometry, lineMaterial);
      const angle = (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * 0.035;
      const y = Math.sin(angle) * 0.035;
      line.position.set(x, y, -0.3); // バレルと同じ位置、負のZ軸方向
      rifleGroup.add(line);
    }
    
    return rifleGroup;
  }

  /**
   * アステロイドガンのメッシュを作成
   */
  private createAsteroidGunMesh(): THREE.Group {
    const gunGroup = new THREE.Group();

    // メインバレル（銃身）
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.3
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0, -0.4); // 後方に変更
    gunGroup.add(barrel);

    // グリップ（握り部分）
    const gripGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.05);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.5,
      roughness: 0.7
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.1, 0.05);
    gunGroup.add(grip);

    // レシーバー（機関部）
    const receiverGeometry = new THREE.BoxGeometry(0.06, 0.08, 0.25);
    const receiverMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x002244,
      emissiveIntensity: 0.2
    });
    const receiver = new THREE.Mesh(receiverGeometry, receiverMaterial);
    receiver.position.set(0, 0, -0.1);
    gunGroup.add(receiver);

    // マズル（銃口）
    const muzzleGeometry = new THREE.CylinderGeometry(0.04, 0.03, 0.05, 8);
    const muzzleMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.1
    });
    const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, 0, -0.82); // 後方に変更
    gunGroup.add(muzzle);

    return gunGroup;
  }

  /**
   * 視覚的な武器を削除
   */
  private removeVisualWeapon(playerEntity: Entity): void {
    console.log(`🗑️ 武器削除要求: プレイヤーID=${playerEntity.id}`);
    const weaponEntity = this.weaponEntities.get(playerEntity.id);
    if (weaponEntity) {
      console.log(`🗑️ 武器エンティティ削除: 武器ID=${weaponEntity.id}`);
      this.world!.removeEntity(weaponEntity);
      this.weaponEntities.delete(playerEntity.id);
      console.log(`🗑️ 武器マップから削除完了. 残りサイズ=${this.weaponEntities.size}`);
      
      // 記録された武器情報もクリア
      const trigger = playerEntity.getComponent(Trigger);
      if (trigger) {
        trigger.lastGeneratedTrigger = null;
      }
    } else {
      console.log(`🗑️ 削除対象の武器エンティティが見つかりません`);
    }

    // スコープモードとエイミングモードも解除
    const renderSystem = this.world?.getSystem(RenderSystem);
    if (renderSystem) {
      if (renderSystem.isScopeModeActive()) {
        renderSystem.setScopeMode(false);
      }
      if (renderSystem.isAimingModeActive()) {
        renderSystem.setAimingMode(false);
      }
    }
  }

  /**
   * 装備武器を非表示
   */
  public hideEquippedWeapon(playerEntity: Entity): void {
    const weaponEntity = this.weaponEntities.get(playerEntity.id);
    if (weaponEntity) {
      const meshComponent = weaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = false;
      }
    }
  }

  /**
   * 装備武器を再表示
   */
  public showEquippedWeapon(playerEntity: Entity): void {
    const weaponEntity = this.weaponEntities.get(playerEntity.id);
    if (weaponEntity) {
      const meshComponent = weaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = true;
      }
    }
  }

  /**
   * アクティブな攻撃の当たり判定を更新
   */
  private updateActiveAttacks(_deltaTime: number): void {
    const currentTime = Date.now();
    
    for (const [attackEntity, attackInfo] of this.activeAttacks) {
      // 攻撃の有効時間をチェック
      if (currentTime - attackInfo.startTime > attackInfo.duration) {
        this.activeAttacks.delete(attackEntity);
        continue;
      }
      
      const attackTransform = attackEntity.getComponent(Transform);
      const playerEntity = this.attackEffects.get(attackEntity);
      
      if (!attackTransform || !playerEntity) {
        this.activeAttacks.delete(attackEntity);
        continue;
      }
      
      // カメラの向きを取得して攻撃方向を計算
      const renderSys = this.world?.getSystem(RenderSystem);
      const attackDirection = this.getCameraDirection(renderSys);
      
      // 現在の攻撃位置から当たり判定を実行
      if (attackInfo.type === 'vertical') {
        this.checkVerticalHit(attackTransform.position, attackDirection, attackInfo.range, attackInfo.damage, playerEntity);
      } else {
        this.checkMeleeHit(attackTransform.position, attackDirection, attackInfo.range, attackInfo.damage, playerEntity);
      }
    }
  }

  /**
   * 攻撃エフェクトの位置を更新（プレイヤーに追従）
   */
  private updateAttackEffectPositions(): void {
    for (const [attackEntity, playerEntity] of this.attackEffects) {
      const playerTransform = playerEntity.getComponent(Transform);
      const attackTransform = attackEntity.getComponent(Transform);
      
      if (playerTransform && attackTransform) {
        // 攻撃エフェクトの位置をプレイヤーの腰の高さ+前方に更新
        const effectPosition = playerTransform.position.clone();
        effectPosition.y += 1.2; // 腰の高さ
        
        // カメラの向きを攻撃エフェクトに反映
        const renderSystem = this.world?.getSystem(RenderSystem);
        if (renderSystem) {
          const cameraRotation = renderSystem.getCameraRotation();
          
          // カメラの向きに基づいて前方向を計算
          const forward = new THREE.Vector3(0, 0, -1);
          forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
          
          // エフェクトを少し前方に配置
          effectPosition.addScaledVector(forward, 0.5);
          
          attackTransform.position.copy(effectPosition);
          attackTransform.rotation.y = cameraRotation.y;
          attackTransform.rotation.x = cameraRotation.x;
        }
      } else {
        // プレイヤーまたは攻撃エフェクトが存在しない場合は削除
        this.attackEffects.delete(attackEntity);
      }
    }
  }

  /**
   * 武器の位置を更新（プレイヤーに追従）
   */
  private updateWeaponPositions(): void {
    for (const [playerEntityId, weaponEntity] of this.weaponEntities) {
      const playerEntity = this.world!.getEntityById(playerEntityId);
      if (!playerEntity) {
        // プレイヤーエンティティが存在しない場合は武器を削除
        this.world!.removeEntity(weaponEntity);
        this.weaponEntities.delete(playerEntityId);
        continue;
      }

      const playerTransform = playerEntity.getComponent(Transform);
      const weaponTransform = weaponEntity.getComponent(Transform);
      
      if (playerTransform && weaponTransform) {
        // プレイヤーの回転を考慮した右手の位置を計算（実際の手の位置に合わせる）
        const rightHandOffset = new THREE.Vector3(0.35, 0.85, 0.05); // 右手のオフセット（手の位置に合わせた）
        
        // プレイヤーの回転行列を適用
        const rotatedOffset = rightHandOffset.clone();
        rotatedOffset.applyEuler(new THREE.Euler(
          playerTransform.rotation.x,
          playerTransform.rotation.y,
          playerTransform.rotation.z
        ));
        
        // 武器の位置を設定
        weaponTransform.position.copy(playerTransform.position).add(rotatedOffset);
        
        // 武器の回転をプレイヤーに合わせて、手に持たれているように調整
        weaponTransform.rotation.copy(playerTransform.rotation);
        
        // 武器の種類によって回転調整を分ける
        const weaponEntity = this.weaponEntities.get(playerEntity.id);
        if (weaponEntity) {
          const triggerComponent = playerEntity.getComponent(Trigger);
          const currentTrigger = triggerComponent?.currentTrigger;
          
          if (currentTrigger) {
            const definition = TRIGGER_DEFINITIONS[currentTrigger];
            const isGunType = (currentTrigger === TriggerType.ASTEROID_GUN || 
                              currentTrigger === TriggerType.IBIS || 
                              currentTrigger === TriggerType.LIGHTNING ||
                              definition.category === 'gunner' ||
                              definition.category === 'sniper');
            
            if (!isGunType) {
              // 剣類のみ前方に傾ける
              const rightHandRotationOffset = new THREE.Euler(-Math.PI * 0.2, -Math.PI * 0.05, 0);
              const rightHandQuaternion = new THREE.Quaternion();
              rightHandQuaternion.setFromEuler(rightHandRotationOffset);
              
              const playerQuaternion = new THREE.Quaternion();
              playerQuaternion.setFromEuler(playerTransform.rotation);
              
              const finalQuaternion = playerQuaternion.multiply(rightHandQuaternion);
              weaponTransform.rotation.setFromQuaternion(finalQuaternion);
            }
            // 銃器類は追加回転なし（水平維持）
          }
        }
      }
    }
  }

  /**
   * 左手武器の位置を更新（プレイヤーに追従）
   */
  private updateLeftWeaponPositions(): void {
    for (const [playerEntityId, leftWeaponEntity] of this.leftWeaponEntities) {
      const playerEntity = this.world!.getEntityById(playerEntityId);
      if (!playerEntity) {
        // プレイヤーエンティティが存在しない場合は左手武器を削除
        this.world!.removeEntity(leftWeaponEntity);
        this.leftWeaponEntities.delete(playerEntityId);
        continue;
      }

      const playerTransform = playerEntity.getComponent(Transform);
      const leftWeaponTransform = leftWeaponEntity.getComponent(Transform);
      
      if (playerTransform && leftWeaponTransform) {
        // プレイヤーの回転を考慮した左手の位置を計算（実際の手の位置に合わせる）
        const leftHandOffset = new THREE.Vector3(-0.35, 0.85, 0.05); // 左手のオフセット（手の位置に合わせた）（右手と完全に同じ高さに調整）
        
        // プレイヤーの回転行列を適用
        const rotatedOffset = leftHandOffset.clone();
        rotatedOffset.applyEuler(new THREE.Euler(
          playerTransform.rotation.x,
          playerTransform.rotation.y,
          playerTransform.rotation.z
        ));
        
        // 左手武器の位置を設定
        leftWeaponTransform.position.copy(playerTransform.position).add(rotatedOffset);
        
        // 左手武器の回転をプレイヤーに合わせて、手に持たれているように調整
        leftWeaponTransform.rotation.copy(playerTransform.rotation);
        
        // 武器の種類によって回転調整を分ける
        const leftWeaponEntity = this.leftWeaponEntities.get(playerEntity.id);
        if (leftWeaponEntity) {
          const triggerComponent = playerEntity.getComponent(Trigger);
          const currentLeftTrigger = triggerComponent?.leftCurrentTrigger;
          
          if (currentLeftTrigger) {
            const definition = TRIGGER_DEFINITIONS[currentLeftTrigger];
            const isGunType = (currentLeftTrigger === TriggerType.ASTEROID_GUN || 
                              currentLeftTrigger === TriggerType.IBIS || 
                              currentLeftTrigger === TriggerType.LIGHTNING ||
                              definition.category === 'gunner' ||
                              definition.category === 'sniper');
            
            if (!isGunType) {
              // 剣類のみ前方に傾ける
              const leftHandRotationOffset = new THREE.Euler(-Math.PI * 0.2, Math.PI * 0.05, 0);
              const leftHandQuaternion = new THREE.Quaternion();
              leftHandQuaternion.setFromEuler(leftHandRotationOffset);
              
              const playerQuaternion = new THREE.Quaternion();
              playerQuaternion.setFromEuler(playerTransform.rotation);
              
              const finalQuaternion = playerQuaternion.multiply(leftHandQuaternion);
              leftWeaponTransform.rotation.setFromQuaternion(finalQuaternion);
            }
            // 銃器類は追加回転なし（水平維持）
          }
        }
      }
    }
  }

  /**
   * カメラの向きを取得
   */
  private getCameraDirection(renderSystem: RenderSystem | undefined): THREE.Vector3 {
    if (!renderSystem) {
      return new THREE.Vector3(0, 0, -1); // デフォルトは前方向
    }
    
    const cameraRotation = renderSystem.getCameraRotation();
    
    // カメラの回転から前方向ベクトルを計算
    const direction = new THREE.Vector3(0, 0, -1);
    
    // Y軸回転（水平）を適用
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
    
    // X軸回転（垂直）も適用して上下方向にも攻撃
    direction.applyAxisAngle(new THREE.Vector3(1, 0, 0), cameraRotation.x);
    
    return direction.normalize();
  }

  /**
   * ヒットエフェクトを作成
   */
  private createHitEffect(position: THREE.Vector3): void {
    // ヒットエフェクトを作成
    const scene = this.world?.getSystem(RenderSystem)?.getScene();
    if (scene) {
      AttackEffects.createHitEffect(scene, position);
    }
  }

  /**
   * 左手近接攻撃を実行
   */
  private performLeftMeleeAttack(
    triggerType: TriggerType,
    transform: Transform,
    character: Character
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    const leftAttackerEntity = this.getEntityByTransform(transform);
    
    if (!leftAttackerEntity) {
      console.log('❌ 左手攻撃者エンティティが見つかりません');
      return;
    }

    // SwordActionSystemから拡張範囲を取得
    const swordActionSystem = this.world?.getSystem(SwordActionSystem);
    let attackRange = definition.range;
    
    if (swordActionSystem && triggerType === TriggerType.KOGETSU) {
      attackRange = swordActionSystem.getAttackRange(leftAttackerEntity, definition.range);
      console.log(`🗡️ 左手コゲツ攻撃開始: 基本範囲${definition.range}m → 実際${attackRange.toFixed(1)}m`);
    }

    // 扇形攻撃エフェクトを生成
    const damage = definition.damage;
    const slashEntity = AttackEffects.createFanSlashEffect(
      this.world,
      transform,
      triggerType,
      attackRange,
      attackerEntity,
      damage
    );
    
    // カメラの向きを攻撃エフェクトに設定
    const renderSystem = this.world?.getSystem(RenderSystem);
    if (renderSystem) {
      const cameraRotation = renderSystem.getCameraRotation();
      const slashTransform = slashEntity.getComponent(Transform);
      if (slashTransform) {
        slashTransform.rotation.y = cameraRotation.y;
        slashTransform.rotation.x = cameraRotation.x;
      }
    }
    
    // 攻撃エフェクトとプレイヤーエンティティの関連付け
    this.attackEffects.set(slashEntity, leftAttackerEntity);
    
    // アクティブな攻撃情報を記録
    this.activeAttacks.set(slashEntity, {
      type: 'horizontal',
      range: attackRange,
      damage: definition.damage,
      startTime: Date.now(),
      duration: GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION
    });
    
    // エフェクトを削除するタイマー
    setTimeout(() => {
      this.world!.removeEntity(slashEntity);
      this.attackEffects.delete(slashEntity);
      this.activeAttacks.delete(slashEntity);
      console.log('Left hand attack effect removed');
    }, GAME_CONFIG.ATTACK.FAN_SLASH.ANIMATION_DURATION);
    
  }

  /**
   * 左手縦斬り攻撃を実行
   */
  private performLeftVerticalAttack(
    triggerType: TriggerType,
    transform: Transform,
    character: Character
  ): void {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    const leftAttackerEntity = this.getEntityByTransform(transform);
    
    if (!leftAttackerEntity) {
      console.log('❌ 左手縦斬り攻撃者エンティティが見つかりません');
      return;
    }

    // SwordActionSystemから拡張範囲を取得
    const swordActionSystem = this.world?.getSystem(SwordActionSystem);
    let attackRange = definition.range;
    
    if (swordActionSystem && triggerType === TriggerType.KOGETSU) {
      attackRange = swordActionSystem.getAttackRange(leftAttackerEntity, definition.range);
      console.log(`🗡️ 左手コゲツ縦斬り開始: 基本範囲${definition.range}m → 実際${attackRange.toFixed(1)}m`);
    }

    // 縦斬り攻撃エフェクトを生成
    const damage = definition.damage;
    const slashEntity = AttackEffects.createVerticalSlashEffect(
      this.world,
      transform,
      triggerType,
      attackRange,
      attackerEntity,
      damage
    );
    
    // カメラの向きを攻撃エフェクトに設定
    const renderSystem = this.world?.getSystem(RenderSystem);
    if (renderSystem) {
      const cameraRotation = renderSystem.getCameraRotation();
      const slashTransform = slashEntity.getComponent(Transform);
      if (slashTransform) {
        slashTransform.rotation.y = cameraRotation.y;
        slashTransform.rotation.x = cameraRotation.x;
      }
    }
    
    // 攻撃エフェクトとプレイヤーエンティティの関連付け
    this.attackEffects.set(slashEntity, leftAttackerEntity);
    
    // アクティブな攻撃情報を記録
    this.activeAttacks.set(slashEntity, {
      type: 'vertical',
      range: attackRange,
      damage: definition.damage,
      startTime: Date.now(),
      duration: GAME_CONFIG.ATTACK.VERTICAL_SLASH.ANIMATION_DURATION
    });
    
    // エフェクトを削除するタイマー
    setTimeout(() => {
      this.world!.removeEntity(slashEntity);
      this.attackEffects.delete(slashEntity);
      this.activeAttacks.delete(slashEntity);
      console.log('Left hand vertical attack effect removed');
    }, GAME_CONFIG.ATTACK.VERTICAL_SLASH.ANIMATION_DURATION);
    
  }

  /**
   * 左手視覚的な武器を作成
   */
  private createLeftVisualWeapon(playerEntity: Entity, triggerType: TriggerType): void {
    const playerTransform = playerEntity.getComponent(Transform);
    if (!playerTransform) return;
    
    // 左手武器エンティティを作成
    const leftWeaponEntity = this.world!.createEntity();
    
    // 左手武器の3Dモデルを作成（左手用フラグを渡す）
    const leftWeaponMesh = this.createWeaponMesh(triggerType, true);
    
    // 左手武器の位置を設定（プレイヤーの左手に配置、体の向きに対して相対的、前方に傾く）
    const leftHandOffset = new THREE.Vector3(-0.6, 0.3, 0.4); // 左手の位置オフセット（右手と完全に同じ高さに調整）
    const rotatedLeftOffset = leftHandOffset.clone();
    rotatedLeftOffset.applyEuler(new THREE.Euler(
      playerTransform.rotation.x,
      playerTransform.rotation.y,
      playerTransform.rotation.z
    ));
    const leftWeaponPosition = playerTransform.position.clone().add(rotatedLeftOffset);
    
    const leftWeaponTransform = new Transform(
      leftWeaponPosition,
      playerTransform.rotation.clone(),
      new THREE.Vector3(1, 1, 1)
    );
    
    leftWeaponEntity.addComponent(Transform, leftWeaponTransform);
    leftWeaponEntity.addComponent(MeshComponent, new MeshComponent(leftWeaponMesh));
    leftWeaponEntity.addTag('leftWeapon');
    
    // 左手武器エンティティを記録
    this.leftWeaponEntities.set(playerEntity.id, leftWeaponEntity);
  }

  /**
   * 左手視覚的な武器を削除
   */
  private removeLeftVisualWeapon(playerEntity: Entity): void {
    const leftWeaponEntity = this.leftWeaponEntities.get(playerEntity.id);
    if (leftWeaponEntity) {
      this.world!.removeEntity(leftWeaponEntity);
      this.leftWeaponEntities.delete(playerEntity.id);
    }
  }

  /**
   * 左手装備武器を非表示
   */
  public hideLeftEquippedWeapon(playerEntity: Entity): void {
    const leftWeaponEntity = this.leftWeaponEntities.get(playerEntity.id);
    if (leftWeaponEntity) {
      const meshComponent = leftWeaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = false;
      }
    }
  }

  /**
   * 左手装備武器を再表示
   */
  public showLeftEquippedWeapon(playerEntity: Entity): void {
    const leftWeaponEntity = this.leftWeaponEntities.get(playerEntity.id);
    if (leftWeaponEntity) {
      const meshComponent = leftWeaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = true;
      }
    }
  }

  /**
   * 射撃系トリガーの処理
   */
  private handleShootingTriggers(
    entity: Entity,
    input: Input,
    trigger: Trigger,
    character: Character,
    transform: Transform
  ): void {
    // 右手の射撃処理
    if (trigger.currentTrigger) {
      const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
      if (definition.category === TriggerCategory.SHOOTER || 
          definition.category === TriggerCategory.GUNNER) {
        
        // メインアクション（左クリック）で射撃
        if (input.mainRightAction) {
          console.log('Right main action pressed - firing projectile');
          this.fireProjectile(entity, trigger, character, transform, trigger.currentTrigger, false);
        }
      } else if (definition.category === TriggerCategory.SNIPER) {
        // スナイパーは武器生成が必要
        if (input.mainRightAction) {
          console.log('Sniper main action pressed. Weapon generated:', trigger.weaponGenerated);
          if (trigger.weaponGenerated) {
            // スナイパー射撃前にクールダウンを強制リセット
            const state = trigger.states.get(trigger.currentTrigger);
            if (state && state.cooldownRemaining > 0) {
              console.log('Force resetting sniper cooldown before firing');
              state.cooldownRemaining = 0;
            }
            console.log('Firing sniper projectile');
            this.fireProjectile(entity, trigger, character, transform, trigger.currentTrigger, false);
          } else {
            console.log('Sniper weapon not generated yet. Press R first.');
          }
        }
      }
    }
    
    // 左手の射撃処理
    if (trigger.leftCurrentTrigger) {
      const definition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
      if (definition.category === TriggerCategory.SHOOTER || 
          definition.category === TriggerCategory.GUNNER) {
        
        // メインアクション（Qキー）で射撃
        if (input.mainLeftAction) {
          this.fireProjectile(entity, trigger, character, transform, trigger.leftCurrentTrigger, true);
        }
      }
    }
  }

  /**
   * 弾丸を発射
   */
  private fireProjectile(
    entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    triggerType: TriggerType,
    isLeftHand: boolean
  ): void {
    console.log('fireProjectile called for:', triggerType);
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // トリオンコストをチェック
    if (character.stats.currentTrion < definition.trionCost) {
      console.log('Insufficient trion for projectile');
      return; // トリオン不足
    }
    
    // クールダウンをチェック
    const state = trigger.states.get(triggerType);
    console.log('Trigger state:', state ? `cooldown: ${state.cooldownRemaining}` : 'not found');
    if (!state || state.cooldownRemaining > 0) {
      console.log('Trigger on cooldown, remaining:', state?.cooldownRemaining);
      return; // クールダウン中
    }
    
    // ShootingSystemを使用して高精度射撃
    const shootingSystem = this.world?.getSystem(ShootingSystem);
    if (shootingSystem) {
      console.log('Using ShootingSystem for accurate shooting');
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
        
        console.log(`✓ Successfully fired ${triggerType} projectile with ShootingSystem!`);
        console.log(`✓ Projectile entity ID: ${projectile.id}`);
      } else {
        console.log('ShootingSystem failed to create projectile');
      }
    } else {
      // フォールバック: 従来の射撃システム
      console.log('ShootingSystem not available, using fallback');
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
    
    // 従来の弾丸エンティティを作成
    const projectile = this.createProjectileEntity(
      entity,
      transform,
      triggerType,
      character,
      isLeftHand
    );
    
    const speed = this.getProjectileSpeed(triggerType);
    console.log(`✓ Fallback: Successfully fired ${triggerType} projectile!`);
    console.log(`✓ Projectile entity ID: ${projectile.id}, speed: ${speed}`);
  }

  /**
   * 弾丸エンティティを作成
   */
  private createProjectileEntity(
    shooter: Entity,
    shooterTransform: Transform,
    triggerType: TriggerType,
    character: Character,
    isLeftHand: boolean
  ): Entity {
    const projectileEntity = this.world!.createEntity();
    const definition = TRIGGER_DEFINITIONS[triggerType];
    
    // カメラからキャラクター位置への射撃方向を計算
    const renderSys = this.world?.getSystem(RenderSystem);
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
      new THREE.Vector3(0.5, 0.5, 0.5) // より自然なサイズ
    ));
    projectileEntity.addComponent(Velocity, new Velocity(velocity));
    
    // メッシュを作成
    const mesh = this.createProjectileMesh(triggerType);
    projectileEntity.addComponent(MeshComponent, new MeshComponent(mesh));
    
    // コライダー
    const collider = new Collider(
      ColliderType.SPHERE,
      new THREE.Vector3(0.1, 0.1, 0.1),
      CollisionLayer.PROJECTILE,
      CollisionLayer.PLAYER | CollisionLayer.ENEMY | CollisionLayer.ENVIRONMENT
    );
    projectileEntity.addComponent(Collider, collider);
    
    // タグ
    projectileEntity.addTag('projectile');
    if (projectileType === ProjectileType.EXPLOSIVE) {
      projectileEntity.addTag('explosive');
    }
    
    return projectileEntity;
  }

  /**
   * 弾丸のメッシュを作成
   */
  private createProjectileMesh(triggerType: TriggerType): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    
    switch (triggerType) {
      case TriggerType.METEORA:
        // 爆発弾は大きめの球（さらに大きく）
        geometry = new THREE.SphereGeometry(0.25, 10, 10);
        material = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          emissive: 0xff3300,
          emissiveIntensity: 1.0
        });
        break;
      case TriggerType.IBIS:
      case TriggerType.LIGHTNING:
        // 狙撃弾は細長い（より大きくして見やすく）
        geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
        material = new THREE.MeshBasicMaterial({
          color: 0xffff00,
          emissive: 0xffff00,
          emissiveIntensity: 1.0
        });
        break;
      default:
        // 通常弾は小さい球（より大きくして見やすく）
        geometry = new THREE.SphereGeometry(0.15, 8, 8);
        material = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          emissive: 0x0099ff,
          emissiveIntensity: 0.8
        });
        break;
    }
    
    return new THREE.Mesh(geometry, material);
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
      default:
        return ProjectileType.BULLET;
    }
  }

  /**
   * 弾速を取得（デバッグ用に遅く）
   */
  private getProjectileSpeed(triggerType: TriggerType): number {
    const definition = TRIGGER_DEFINITIONS[triggerType];
    switch (definition.category) {
      case TriggerCategory.SNIPER:
        return triggerType === TriggerType.LIGHTNING ? 15 : 10; // 非常に遅く
      case TriggerCategory.GUNNER:
        return 8;
      case TriggerCategory.SHOOTER:
        return 6;
      default:
        return 5;
    }
  }

  /**
   * スナイパースコープを切り替え
   */
  private toggleSniperScope(entity: Entity): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    if (!renderSystem) return;

    const trigger = entity.getComponent(Trigger);
    if (!trigger || !trigger.currentTrigger) return;

    const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
    if (definition.category !== 'sniper') return;

    // 武器が生成されている時のみスコープ可能
    if (!trigger.weaponGenerated) {
      console.log('Weapon must be generated to use scope');
      return;
    }

    // スコープモードを切り替え
    const currentScopeMode = renderSystem.isScopeModeActive();
    renderSystem.setScopeMode(!currentScopeMode);
    
    console.log(`Sniper scope ${!currentScopeMode ? 'activated' : 'deactivated'} for ${trigger.currentTrigger}`);
  }

  /**
   * ガンナーエイミングモードを切り替え
   */
  private toggleGunnerAiming(entity: Entity): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    if (!renderSystem) return;

    const trigger = entity.getComponent(Trigger);
    if (!trigger || !trigger.currentTrigger) return;

    const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
    if (definition.category !== 'gunner') return;

    // 武器が生成されている時のみエイミング可能
    if (!trigger.weaponGenerated) {
      console.log('Weapon must be generated to use aiming');
      return;
    }

    // エイミングモードを切り替え
    const currentAimingMode = renderSystem.isAimingModeActive();
    renderSystem.setAimingMode(!currentAimingMode);
    
    console.log(`Gunner aiming ${!currentAimingMode ? 'activated' : 'deactivated'} for ${trigger.currentTrigger}`);
  }

  /**
   * ガンナートリガーを使用（連射）
   */
  private useGunnerTrigger(
    entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform
  ): void {
    if (!trigger.currentTrigger || !trigger.weaponGenerated) return;

    const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
    if (definition.category !== 'gunner') return;

    const state = trigger.states.get(trigger.currentTrigger);
    if (!state || !state.active || state.cooldownRemaining > 0) return;

    // 弾数チェック
    if (state.ammo !== undefined && state.ammo <= 0) {
      console.log('Gunner weapon out of ammo');
      return;
    }

    // トリオンコストをチェック
    const trionCost = trigger.getTrionCost();
    if (character.stats.currentTrion < trionCost) {
      console.log('Insufficient trion for gunner shot');
      return;
    }

    console.log(`Gunner trigger fired: ${trigger.currentTrigger}`);

    // ShootingSystemを使って弾丸を発射
    const shootingSystem = this.world?.getSystem(ShootingSystem);
    if (shootingSystem) {
      const projectile = shootingSystem.fireProjectile(
        entity,
        transform,
        character,
        trigger.currentTrigger,
        false // 右手
      );

      if (projectile) {
        // トリオンを消費
        character.takeDamage(trionCost);

        // 弾数を減らす
        if (state.ammo !== undefined) {
          state.ammo--;
          console.log(`Ammo remaining: ${state.ammo}`);
        }

        // クールダウンを設定
        state.cooldownRemaining = definition.cooldown;

        // 射撃エフェクトを表示（軌跡は無効化）
        this.createMuzzleFlash(entity, transform, false);
        // this.createGunnerTrailEffect(entity, transform, projectile); // 誘導線を無効化

        console.log(`Gunner projectile fired successfully`);
      }
    }
  }

  /**
   * マズルフラッシュエフェクトを作成
   */
  private createMuzzleFlash(entity: Entity, transform: Transform, isLeftHand: boolean): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // マズル位置を計算
    const muzzleOffset = isLeftHand ? 
      new THREE.Vector3(-0.3, 1.5, 0.5) : 
      new THREE.Vector3(0.3, 1.5, 0.5);
    const muzzlePosition = transform.position.clone().add(muzzleOffset);

    // マズルフラッシュのジオメトリとマテリアル
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8
    });

    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(muzzlePosition);
    scene.add(flash);

    // 短時間後に削除
    setTimeout(() => {
      scene.remove(flash);
      flashGeometry.dispose();
      flashMaterial.dispose();
    }, 50); // 50ms後に削除
  }

  /**
   * ガンナー弾道軌跡エフェクトを作成
   */
  private createGunnerTrailEffect(entity: Entity, transform: Transform, projectile: Entity): void {
    const renderSystem = this.world?.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // 弾丸の軌跡エフェクト（薄い青い線）
    const projectileTransform = projectile.getComponent(Transform);
    const projectileVelocity = projectile.getComponent(Velocity);
    
    if (!projectileTransform || !projectileVelocity) return;

    const startPosition = transform.position.clone().add(new THREE.Vector3(0.3, 1.5, 0.5));
    const direction = projectileVelocity.linear.clone().normalize();
    const trailLength = 2.0; // 軌跡の長さ
    const endPosition = startPosition.clone().add(direction.multiplyScalar(trailLength));

    // 軌跡ライン
    const trailGeometry = new THREE.BufferGeometry().setFromPoints([startPosition, endPosition]);
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);

    // 軌跡を短時間表示後削除
    setTimeout(() => {
      scene.remove(trailLine);
      trailGeometry.dispose();
      trailMaterial.dispose();
    }, 100); // 100ms後に削除
  }

  /**
   * トリガーメニューの開閉を切り替え
   */
  private toggleTriggerMenu(entity: Entity, trigger: Trigger): void {
    if (!this.triggerMenu) {
      // 初回作成
      this.triggerMenu = new TriggerMenu(trigger.triggerSet);
      this.triggerMenu.setOnTriggerSetChange((newTriggerSet) => {
        this.updateTriggerSet(entity, trigger, newTriggerSet);
      });
    }

    if (this.triggerMenu.isMenuOpen()) {
      this.triggerMenu.close();
    } else {
      this.triggerMenu.updateTriggerSet(trigger.triggerSet);
      this.triggerMenu.open();
    }
  }

  /**
   * トリガーセットを更新
   */
  private updateTriggerSet(entity: Entity, trigger: Trigger, newTriggerSet: any): void {
    // 既存の武器を削除
    this.clearWeapons(entity);
    
    // 新しいトリガーセットを適用
    trigger.triggerSet = { ...newTriggerSet };
    
    // スロット選択をリセット
    trigger.currentSlot = 1;
    trigger.leftCurrentSlot = 2;
    trigger.updateCurrentTriggers();
    
    console.log('Trigger set updated:', newTriggerSet);
  }

  /**
   * 全ての武器を削除
   */
  private clearWeapons(entity: Entity): void {
    // 右手武器を削除
    const rightWeapon = this.weaponEntities.get(entity.id);
    if (rightWeapon) {
      this.world?.removeEntity(rightWeapon);
      this.weaponEntities.delete(entity.id);
    }
    
    // 左手武器を削除
    const leftWeapon = this.leftWeaponEntities.get(entity.id);
    if (leftWeapon) {
      this.world?.removeEntity(leftWeapon);
      this.leftWeaponEntities.delete(entity.id);
    }
    
    // トリガーの生成状態をリセット
    const trigger = entity.getComponent(Trigger);
    if (trigger) {
      trigger.weaponGenerated = false;
      trigger.leftWeaponGenerated = false;
      trigger.lastGeneratedTrigger = null;
    }
  }

  /**
   * 分割トリガーキューブの位置を更新
   */
  private updateSplittingCubes(): void {
    for (const [entityId, cubes] of this.cubeEntities) {
      const playerEntity = this.world!.getEntityById(entityId);
      if (!playerEntity) {
        // プレイヤーエンティティが存在しない場合はキューブを削除
        cubes.forEach(cube => this.world!.removeEntity(cube));
        this.cubeEntities.delete(entityId);
        continue;
      }

      const playerTransform = playerEntity.getComponent(Transform);
      const splittingTrigger = this.splittingTriggers.get(entityId);
      
      if (playerTransform && splittingTrigger) {
        const splitCount = splittingTrigger.getSplitCount();
        const gridSize = Math.sqrt(splitCount);
        const spacing = 0.3;
        
        // カメラの向きを取得
        const renderSys = this.world?.getSystem(RenderSystem);
        const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
        
        // プレイヤーの前方ベクトルを計算
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        
        // プレイヤーの右方向ベクトルを計算
        const right = new THREE.Vector3(1, 0, 0);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        
        cubes.forEach((cube, i) => {
          const cubeTransform = cube.getComponent(Transform);
          if (cubeTransform) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            // 左手か右手かを判定（分割トリガーコンポーネントから）
            const trigger = playerEntity.getComponent(Trigger);
            const isLeftHand = trigger?.leftCurrentTrigger && this.isSplittingTrigger(trigger.leftCurrentTrigger) &&
                              (!trigger.currentTrigger || !this.isSplittingTrigger(trigger.currentTrigger));
            
            // 腕の位置からのオフセット
            const armOffset = isLeftHand ? -0.8 : 0.8;
            const forwardOffset = 2.0; // キャラクターから前方2mの位置
            
            // キューブグリッドの相対位置
            const gridOffsetRight = (col - gridSize / 2 + 0.5) * spacing;
            const gridOffsetUp = (row - gridSize / 2 + 0.5) * spacing;
            
            // プレイヤーの位置を基準に配置
            cubeTransform.position.copy(playerTransform.position);
            cubeTransform.position.addScaledVector(right, armOffset + gridOffsetRight);
            cubeTransform.position.y += 1.2 + gridOffsetUp; // 胸の高さ
            cubeTransform.position.addScaledVector(forward, forwardOffset);
            
            // キューブの回転もプレイヤーに合わせる
            cubeTransform.rotation.y = cameraRotation.y;
          }
        });
      }
    }
  }

  /**
   * エンティティが攻撃中かチェック
   */
  private isEntityAttacking(entity: Entity): boolean {
    // activeAttacksで直接エンティティをキーとして検索
    if (this.activeAttacks.has(entity)) {
      return true;
    }
    
    // attackEffectsで攻撃エフェクトから攻撃者を逆引き
    for (const [attackEffect, attackData] of this.activeAttacks) {
      const attackingPlayer = this.attackEffects.get(attackEffect);
      if (attackingPlayer === entity) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 剣系サブアクション処理（非攻撃時）
   */
  private handleSwordSubAction(entity: Entity, trigger: Trigger, character: Character): void {
    const swordActionSystem = this.world?.getSystem(SwordActionSystem);
    if (!swordActionSystem) return;

    // SwordActionSystemの既存処理と同等の処理
    const currentTrigger = trigger.currentTrigger!;
    
    if (currentTrigger === TriggerType.KOGETSU) {
      // コゲツ: 刀身伸長（非攻撃時）
      const hasSenku = this.hasSenkuInSameHand(trigger, 'right');
      console.log(`🗡️ コゲツ非攻撃時刀身伸長: 旋空=${hasSenku}`);
      
      // SwordActionSystemの刀身伸長を呼び出し
      swordActionSystem.activateBladeExtensionExternal(entity, character, hasSenku);
    } else if (currentTrigger === TriggerType.RAYGUST) {
      // レイガスト: シールドモード（TriggerSystemでも処理可能）
      console.log('🛡️ レイガスト: シールドモード切り替え');
      // 必要に応じてシールドモード処理を追加
    }
  }

  /**
   * 同じ手に旋空があるかチェック
   */
  private hasSenkuInSameHand(trigger: Trigger, hand: 'right' | 'left'): boolean {
    const triggerSet = trigger.triggerSet;
    if (!triggerSet) return false;

    // 右手の場合、slot1-4をチェック
    // 左手の場合、c1-4をチェック
    const slots = hand === 'right' 
      ? [triggerSet.slot1, triggerSet.slot2, triggerSet.slot3, triggerSet.slot4]
      : [triggerSet.c1, triggerSet.c2, triggerSet.c3, triggerSet.c4];

    return slots.includes(TriggerType.SENKU);
  }

  /**
   * システム破棄時の処理
   */
  destroy(): void {
    if (this.triggerMenu) {
      this.triggerMenu.destroy();
      this.triggerMenu = null;
    }
    
    // 全てのキューブを削除
    for (const [_, cubes] of this.cubeEntities) {
      cubes.forEach(cube => this.world!.removeEntity(cube));
    }
    this.cubeEntities.clear();
    this.splittingTriggers.clear();
    
    super.destroy();
  }
}