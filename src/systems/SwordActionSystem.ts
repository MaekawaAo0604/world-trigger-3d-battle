import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Input } from '../components/Input';
import { Trigger } from '../components/Trigger';
import { MeshComponent } from '../components/Mesh';
import { TriggerType, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';
import { TriggerSystem } from './TriggerSystem';
import { AnimationSystem } from './AnimationSystem';

/**
 * 剣系トリガーの特殊アクションシステム
 * - コゲツ + 旋空: 刀身伸長
 * - レイガスト: シールドモード切り替え
 */
export class SwordActionSystem extends System {
  private extendedBlades: Map<Entity, ExtendedBladeState> = new Map();
  private shieldModes: Map<Entity, ShieldModeState> = new Map();
  private shieldMeshes: Map<Entity, Entity> = new Map(); // エンティティ -> シールドメッシュエンティティ
  private originalBladeScales: Map<Entity, THREE.Vector3> = new Map(); // 元の刀身スケール

  requiredComponents() {
    return [Trigger, Character, Transform];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const trigger = entity.getComponent(Trigger)!;
      const character = entity.getComponent(Character)!;
      const input = entity.getComponent(Input);

      if (!input) continue;
      
      // プレイヤーとAIエンティティの両方を処理
      console.log(`🎮 エンティティ処理中: ID=${entity.id}, tags=${Array.from(entity.tags).join(', ')}`);

      // 攻撃状態をチェックして、攻撃が終了したら刀身も元に戻す
      const isCurrentlyAttacking = this.isEntityAttacking(entity);
      const bladeState = this.extendedBlades.get(entity);
      if (bladeState && bladeState.isAttacking && !isCurrentlyAttacking) {
        // console.log('⚔️ 攻撃終了検出 - 刀身伸長も終了');
        this.deactivateBladeExtension(entity);
      }

      // サブアクション処理
      if (input.subRightAction && trigger.currentTrigger) {
        console.log(`🎮 SwordActionSystem: サブアクション検出 - ${trigger.currentTrigger} (トリオン: ${character.stats.currentTrion})`);
        this.handleSubAction(entity, trigger, character);
      }

      // 拡張刀身の更新
      this.updateExtendedBlade(entity, deltaTime);
      
      // シールドモードの更新
      this.updateShieldMode(entity, deltaTime);
    }
  }

  /**
   * サブアクション処理
   */
  private handleSubAction(entity: Entity, trigger: Trigger, character: Character): void {
    const currentTrigger = trigger.currentTrigger!;
    console.log(`🎮 サブアクション: ${currentTrigger}`);
    // console.log(`🔍 トリガーセット詳細:`, {
    //   slot1: trigger.triggerSet?.slot1,
    //   slot2: trigger.triggerSet?.slot2,
    //   slot3: trigger.triggerSet?.slot3,
    //   slot4: trigger.triggerSet?.slot4
    // });

    if (currentTrigger === TriggerType.KOGETSU) {
      // コゲツ: 刀身伸長（攻撃中でも手動で追加伸長可能）
      // console.log('🗡️ コゲツ検出、刀身伸長処理開始');
      const hasSenku = this.hasSenkuInSameHand(trigger, 'right');
      const isAttacking = this.isEntityAttacking(entity);
      
      
      if (isAttacking && hasSenku) {
        // 攻撃中かつ旋空ありの場合は旋空伸長を使用
        console.log('🌀 攻撃中旋空伸長: 専用の旋空伸長機能を使用');
        this.activateSenkuBladeExtension(entity);
      } else {
        // 攻撃中でも非攻撃中でも通常の手動伸長を使用
        console.log(hasSenku ? '✅ 旋空あり、効率的な刀身伸長' : '⚡ 旋空なし、通常の刀身伸長');
        this.activateBladeExtension(entity, character, hasSenku);
      }
    } else if (currentTrigger === TriggerType.RAYGUST) {
      // レイガスト: シールドモード
      // console.log('🛡️ レイガスト検出、シールドモード切り替え');
      this.toggleShieldMode(entity, character);
    } else {
      // console.log(`❓ 未対応のトリガー: ${currentTrigger}`);
    }
  }

  /**
   * 同じ手に旋空があるかチェック
   */
  private hasSenkuInSameHand(trigger: Trigger, hand: 'right' | 'left'): boolean {
    const triggerSet = trigger.triggerSet;
    if (!triggerSet) {
      console.log(`🎯 旋空チェック: トリガーセットなし`);
      return false;
    }

    // 右手の場合、slot1-4をチェック
    // 左手の場合、c1-4をチェック
    const slots = hand === 'right' 
      ? [triggerSet.slot1, triggerSet.slot2, triggerSet.slot3, triggerSet.slot4]
      : [triggerSet.c1, triggerSet.c2, triggerSet.c3, triggerSet.c4];

    const hasSenku = slots.includes(TriggerType.SENKU);
    return hasSenku;
  }

  /**
   * 刀身伸長を開始
   */
  private activateBladeExtension(entity: Entity, character: Character, hasSenku: boolean = false): void {
    console.log(`🔥 刀身伸長開始処理: エンティティID=${entity.id}, 旋空=${hasSenku}`);
    
    // 既に伸長中かチェック
    const existingState = this.extendedBlades.get(entity);
    if (existingState && existingState.isActive) {
      console.log('⚠️ 既に刀身伸長中です - 既存状態をリセットして新規開始');
      this.deactivateBladeExtension(entity);
    }
    
    // トリオン消費（旋空があれば効率的）
    const trionCost = hasSenku ? 5 : 8; // 旋空ありなら5、なしなら8
    console.log(`💧 トリオン消費チェック: 必要${trionCost}, 現在${character.stats.currentTrion}`);
    
    if (character.stats.currentTrion < trionCost) {
      console.log(`❌ トリオン不足: 必要${trionCost}, 現在${character.stats.currentTrion}`);
      return; // トリオン不足
    }

    character.takeDamage(trionCost);
    console.log(`✅ トリオン消費: ${trionCost} (残り: ${character.stats.currentTrion})`);

    // 刀身伸長状態を設定
    const state: ExtendedBladeState = {
      isActive: true,
      startTime: Date.now(),
      holdTime: 0,
      maxLength: hasSenku ? 40 : 25, // 旋空ありなら40m、なしなら25m
      currentLength: 2.5, // 通常の刀身長
      hasSenku: hasSenku,
      isAttacking: this.isEntityAttacking(entity) // 攻撃中かチェック
    };

    this.extendedBlades.set(entity, state);
    console.log(`🗡️ 刀身伸長開始成功: ${hasSenku ? '旋空あり' : '通常'} (最大${state.maxLength}m, 0.2秒持続)`);
    console.log(`📊 初期状態: holdTime=${state.holdTime}, currentLength=${state.currentLength}m`);
  }


  /**
   * 旋空による攻撃中刀身伸長を開始
   */
  public activateSenkuBladeExtension(entity: Entity): void {
    console.log(`🌀🌀🌀 SENKU START 🌀🌀🌀`);
    
    const character = entity.getComponent(Character);
    const trigger = entity.getComponent(Trigger);
    if (!character || !trigger) {
      console.log('❌❌❌ NO COMPONENTS ❌❌❌');
      return;
    }

    // 旋空トリガーがセットされているかチェック
    const hasSenku = this.hasSenkuInSameHand(trigger, 'right');
    if (!hasSenku) {
      console.log('❌❌❌ NO SENKU TRIGGER ❌❌❌');
      return;
    }

    // 攻撃中でない場合は実行しない
    if (!this.isEntityAttacking(entity)) {
      console.log('❌❌❌ NOT ATTACKING ❌❌❌');
      return;
    }

    // トリオン消費（旋空は効率的）
    const trionCost = 3;
    if (character.stats.currentTrion < trionCost) {
      console.log(`❌❌❌ NO TRION ❌❌❌`);
      return;
    }

    character.takeDamage(trionCost);
    console.log(`✅✅✅ SENKU ACTIVATED ✅✅✅`);

    // 既存の攻撃時伸長状態を旋空版に更新
    const existingState = this.extendedBlades.get(entity);
    if (existingState && existingState.isActive) {
      // 既存状態を旋空版に拡張
      existingState.maxLength = 15;
      existingState.autoExtensionDuration = 0.2;
      existingState.hasSenku = true;
      existingState.startTime = Date.now();
      existingState.holdTime = 0;
      console.log('🌀🌀🌀 SENKU EXTENDED 🌀🌀🌀');
    } else {
      // 新規で旋空攻撃時伸長開始
      const state: ExtendedBladeState = {
        isActive: true,
        startTime: Date.now(),
        holdTime: 0,
        maxLength: 15,
        currentLength: 2.5,
        isHolding: false,
        hasSenku: true,
        isAttacking: true,
        isAutoExtension: true,
        autoExtensionDuration: 0.2
      };
      
      this.extendedBlades.set(entity, state);
      console.log('🌀🌀🌀 SENKU NEW STATE 🌀🌀🌀');
    }
  }


  /**
   * エンティティが攻撃中かチェック
   */
  private isEntityAttacking(entity: Entity): boolean {
    // 現在の刀身伸長状態をチェック（攻撃中フラグがあるか）
    const currentState = this.extendedBlades.get(entity);
    if (currentState && currentState.isAttacking && currentState.isActive) {
      return true;
    }
    
    // TriggerSystemの攻撃状態を直接チェック
    const triggerSystem = this.world!.getSystem(TriggerSystem);
    if (triggerSystem && 'activeAttacks' in triggerSystem && 'attackEffects' in triggerSystem) {
      const activeAttacks = (triggerSystem as any).activeAttacks as Map<Entity, any>;
      const attackEffects = (triggerSystem as any).attackEffects as Map<Entity, Entity>;
      
      // activeAttacksで直接エンティティをキーとして検索
      if (activeAttacks.has(entity)) {
        return true;
      }
      
      // attackEffectsの値に含まれているかチェック
      for (const [effectEntity, attackingPlayer] of attackEffects) {
        if (attackingPlayer === entity) {
          return true;
        }
      }
    }
    
    // さらなるフォールバック: Inputの攻撃ボタン状態をチェック
    const input = entity.getComponent(Input);
    if (input) {
      if (input.primaryAttack || input.primaryAction || input.secondaryAction) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 攻撃中のエンティティの攻撃データを取得
   */
  private getActiveAttackData(entity: Entity): any | null {
    const triggerSystem = this.world!.getSystem(TriggerSystem);
    if (triggerSystem && 'activeAttacks' in triggerSystem) {
      const activeAttacks = (triggerSystem as any).activeAttacks as Map<Entity, any>;
      const attackEffects = (triggerSystem as any).attackEffects as Map<Entity, Entity>;
      
      for (const [attackEffect, attackData] of activeAttacks) {
        const attackingPlayer = attackEffects.get(attackEffect);
        if (attackingPlayer === entity) {
          return attackData;
        }
      }
    }
    return null;
  }

  /**
   * 拡張刀身の更新
   */
  private updateExtendedBlade(entity: Entity, deltaTime: number): void {
    const state = this.extendedBlades.get(entity);
    if (!state || !state.isActive) return;

    const input = entity.getComponent(Input);
    if (!input) return;

    // 旋空は一度発動したら自動的に0.2秒間継続
    state.holdTime += deltaTime;
    console.log(`⏱️ 旋空自動継続: holdTime=${state.holdTime.toFixed(3)}s`);

    // 刀身長の計算（cos関数）
    const length = this.calculateBladeLength(state.holdTime, state.maxLength);
    state.currentLength = length;

    // 最大時間（0.2秒）経過で自動終了
    if (state.holdTime >= 0.2) {
      console.log(`⏰ 旋空時間終了: ${state.holdTime.toFixed(3)}s経過`);
      this.deactivateBladeExtension(entity);
    }

    // 視覚効果の更新
    this.updateBladeVisual(entity, state);
    
    // 攻撃中なら当たり判定も更新
    if (state.isAttacking) {
      this.updateCombatAttackRange(entity);
    }
  }

  /**
   * cos関数による刀身長計算（旋空）
   * 押したタイミングを0として、0.2秒持続で0.1秒時点で最大長になるcos関数
   * 旋空あり: 0.1秒で40m最大, 0.2秒で収束
   * 旋空なし: 0.1秒で25m最大, 0.2秒で収束
   */
  private calculateBladeLength(holdTime: number, maxLength: number): number {
    const baseLength = 2.5; // 通常時の刀身長
    const duration = 0.2; // 持続時間を0.2秒に短縮
    
    if (holdTime >= duration) {
      // 0.2秒経過で通常長に戻る
      return baseLength;
    }
    
    // cos関数で滑らかな伸縮（0.1秒で最大、0.2秒で最小）
    // (maxLength/2) * (1 - cos(2π * t / duration))
    // t=0で0, t=duration/2で最大(maxLength), t=durationで0
    const normalizedTime = holdTime / duration;
    const extensionRatio = (1 - Math.cos(2 * Math.PI * normalizedTime)) / 2;
    const currentExtension = maxLength * extensionRatio;
    const result = baseLength + currentExtension;
    
    console.log(`🔢 刀身長計算: holdTime=${holdTime.toFixed(3)}s, maxLength=${maxLength}m, extensionRatio=${extensionRatio.toFixed(3)}, 結果=${result.toFixed(1)}m`);
    
    return result;
  }


  /**
   * 刀身伸長終了
   */
  private deactivateBladeExtension(entity: Entity): void {
    const state = this.extendedBlades.get(entity);
    if (!state) return;

    console.log(`🗡️ 手動伸長終了: 最終長${state.currentLength.toFixed(1)}m → 通常長2.5m`);

    // 刀身スケールを元に戻す
    const weaponEntity = this.getWeaponEntity(entity);
    if (weaponEntity) {
      const weaponMesh = weaponEntity.getComponent(MeshComponent);
      const originalScale = this.originalBladeScales.get(entity);
      
      if (weaponMesh?.mesh && originalScale) {
        // スケールを元の大きさに即座にリセット
        weaponMesh.mesh.scale.copy(originalScale);
        console.log(`🗡️ 刀身スケールリセット: (${originalScale.x}, ${originalScale.y}, ${originalScale.z})`);
        
        // 色も元に戻す
        if (weaponMesh.mesh instanceof THREE.Mesh && weaponMesh.mesh.material && 'color' in weaponMesh.mesh.material) {
          const material = weaponMesh.mesh.material as THREE.MeshBasicMaterial;
          material.color.setRGB(0.8, 0.8, 0.8); // 元の色
          console.log('🗡️ 刀身色リセット');
        }
      } else {
        console.log('❌ 武器メッシュまたは元スケールが見つからない - 強制リセット実行');
      }
    } else {
      console.log('❌ 武器エンティティが見つからない - 状態のみクリア');
    }

    // 状態を確実にクリア
    this.extendedBlades.delete(entity);
    this.originalBladeScales.delete(entity);
    console.log(`🗑️ 刀身伸長状態完全クリア: エンティティ${entity.id}`);
  }

  /**
   * シールドモード切り替え
   */
  private toggleShieldMode(entity: Entity, character: Character): void {
    const currentState = this.shieldModes.get(entity);
    
    if (currentState?.isActive) {
      // シールドモード解除
      this.deactivateShieldMode(entity);
    } else {
      // シールドモード開始
      this.activateShieldMode(entity, character);
    }
  }

  /**
   * シールドモード開始
   */
  private activateShieldMode(entity: Entity, character: Character): void {
    const definition = TRIGGER_DEFINITIONS[TriggerType.RAYGUST];
    
    const state: ShieldModeState = {
      isActive: true,
      durability: 500, // 固定耐久力
      maxDurability: 500,
      startTime: Date.now()
    };

    this.shieldModes.set(entity, state);
    
    // シールドメッシュを作成
    const shieldEntity = this.createShieldMesh(entity);
    this.shieldMeshes.set(entity, shieldEntity);
    
    // console.log('🛡️ レイガスト: シールドモード発動');
    
    // 視覚効果の更新
    this.updateShieldVisual(entity, state);
  }

  /**
   * シールドモード解除
   */
  private deactivateShieldMode(entity: Entity): void {
    // シールドメッシュを削除
    const shieldEntity = this.shieldMeshes.get(entity);
    if (shieldEntity) {
      this.world!.removeEntity(shieldEntity);
      this.shieldMeshes.delete(entity);
    }
    
    this.shieldModes.delete(entity);
    // console.log('🛡️ レイガスト: シールドモード解除');
  }

  /**
   * シールドモードの更新
   */
  private updateShieldMode(entity: Entity, deltaTime: number): void {
    const state = this.shieldModes.get(entity);
    if (!state || !state.isActive) return;

    // 耐久力が0になったら解除
    if (state.durability <= 0) {
      this.deactivateShieldMode(entity);
      return;
    }

    // 視覚効果の更新
    this.updateShieldVisual(entity, state);
  }

  /**
   * 武器メッシュエンティティを取得
   */
  private getWeaponEntity(playerEntity: Entity): Entity | null {
    // TriggerSystemを経由して武器エンティティを取得
    const triggerSystem = this.world!.getSystem(TriggerSystem);
    if (triggerSystem && 'getWeaponEntity' in triggerSystem) {
      const weaponEntity = triggerSystem.getWeaponEntity(playerEntity.id);
      if (weaponEntity) {
        return weaponEntity;
      }
    }

    // フォールバック: 全エンティティから武器エンティティを探す
    console.log(`🔍 フォールバック検索開始: プレイヤーID=${playerEntity.id}`);
    const allEntities = this.world!.getEntities();
    for (const entity of allEntities) {
      const tags = entity.tags || new Set();
      const tagArray = Array.isArray(tags) ? tags : Array.from(tags);
      console.log(`🔍 エンティティID=${entity.id}, タグ=[${tagArray.join(', ')}]`);
      
      if (entity.hasTag('weapon') || entity.hasTag('right_weapon')) {
        console.log(`🔍 武器エンティティ発見: ID=${entity.id}`);
        
        // 武器の位置がプレイヤーの近くにあるかチェック
        const weaponTransform = entity.getComponent(Transform);
        const playerTransform = playerEntity.getComponent(Transform);
        
        if (weaponTransform && playerTransform) {
          const distance = weaponTransform.position.distanceTo(playerTransform.position);
          console.log(`🔍 距離チェック: ${distance.toFixed(2)}m`);
          if (distance < 5) { // 5m以内
            console.log(`✅ 武器エンティティ見つかりました: ID=${entity.id}`);
            return entity;
          }
        }
      }
    }
    
    console.log(`❌ 武器エンティティが見つかりません`);
    return null;
  }

  /**
   * 刀身の視覚効果更新
   */
  private updateBladeVisual(entity: Entity, state: ExtendedBladeState): void {
    // プレイヤーエンティティの武器メッシュを取得
    const weaponEntity = this.getWeaponEntity(entity);
    if (!weaponEntity) {
      console.log('❌ NO WEAPON ENTITY');
      return;
    }

    const weaponMesh = weaponEntity.getComponent(MeshComponent);
    if (!weaponMesh || !weaponMesh.mesh) {
      console.log('❌ NO WEAPON MESH');
      return;
    }

    // 元のスケールを保存（初回のみ）
    if (!this.originalBladeScales.has(entity)) {
      this.originalBladeScales.set(entity, weaponMesh.mesh.scale.clone());
    }

    const originalScale = this.originalBladeScales.get(entity)!;
    
    // 刀身のスケールを変更（Y軸方向に伸長）
    const scaleMultiplier = state.currentLength / 2.5;
    weaponMesh.mesh.scale.set(
      originalScale.x,
      originalScale.y * scaleMultiplier,
      originalScale.z
    );
    
    console.log(`✅ 刀身スケール更新: ${scaleMultiplier.toFixed(2)}x (${state.currentLength.toFixed(1)}m)`);
    
    // 旋空の場合のみログ出力
    if (state.hasSenku) {
      console.log(`🌀🌀🌀 SENKU SCALE: ${scaleMultiplier.toFixed(2)}x (${state.currentLength.toFixed(1)}m) 🌀🌀🌀`);
    }
    
    // 色やエフェクトの変更
    if (weaponMesh.mesh instanceof THREE.Mesh && weaponMesh.mesh.material && 'color' in weaponMesh.mesh.material) {
      const material = weaponMesh.mesh.material as THREE.MeshBasicMaterial;
      const intensity = Math.min(state.currentLength / 20, 1);
      material.color.setRGB(0.5 + intensity * 0.5, 0.8, 1);
    }
  }

  /**
   * シールドメッシュを作成
   */
  private createShieldMesh(entity: Entity): Entity {
    const shieldEntity = this.world!.createEntity();
    shieldEntity.addTag('shield');

    // Transform（プレイヤーの前方に配置）
    const playerTransform = entity.getComponent(Transform)!;
    const shieldTransform = new Transform(
      playerTransform.position.clone().add(new THREE.Vector3(0, 0, -1)),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
    shieldEntity.addComponent(Transform, shieldTransform);

    // シールドメッシュ（半透明の円形）
    const geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const shieldMesh = new THREE.Mesh(geometry, material);
    shieldMesh.rotation.x = Math.PI / 2; // 縦向きに

    shieldEntity.addComponent(MeshComponent, new MeshComponent(shieldMesh));

    return shieldEntity;
  }

  /**
   * シールドの視覚効果更新
   */
  private updateShieldVisual(entity: Entity, state: ShieldModeState): void {
    const shieldEntity = this.shieldMeshes.get(entity);
    if (!shieldEntity) return;

    // プレイヤーの位置に追従
    const playerTransform = entity.getComponent(Transform)!;
    const shieldTransform = shieldEntity.getComponent(Transform)!;
    
    // プレイヤーの前方1mに配置
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(new THREE.Quaternion().setFromEuler(playerTransform.rotation));
    
    shieldTransform.position.copy(playerTransform.position);
    shieldTransform.position.add(forward);
    shieldTransform.position.y += 1.2; // 胸の高さ

    // 耐久力に応じて透明度を変更
    const shieldMesh = shieldEntity.getComponent(MeshComponent);
    if (shieldMesh?.mesh instanceof THREE.Mesh) {
      const material = shieldMesh.mesh.material as THREE.MeshBasicMaterial;
      const durabilityRatio = state.durability / state.maxDurability;
      material.opacity = 0.4 + (durabilityRatio * 0.4); // 0.4-0.8の範囲

      // 耐久力が低くなると赤く
      if (durabilityRatio < 0.3) {
        material.color.setRGB(1, durabilityRatio * 2, 0);
      } else {
        material.color.setRGB(0, 1, 1);
      }
    }

    // console.log(`🛡️ シールド耐久力: ${state.durability}/${state.maxDurability}`);
  }

  /**
   * シールドダメージ処理
   */
  public damageShield(entity: Entity, damage: number): boolean {
    const state = this.shieldModes.get(entity);
    if (!state || !state.isActive) return false;

    state.durability = Math.max(0, state.durability - damage);
    // console.log(`🛡️ シールドダメージ: ${damage} (残り: ${state.durability})`);

    if (state.durability <= 0) {
      this.deactivateShieldMode(entity);
    }

    return true; // ダメージを吸収
  }

  /**
   * 拡張刀身の現在の長さを取得
   */
  public getBladeLength(entity: Entity): number {
    const state = this.extendedBlades.get(entity);
    return state?.currentLength || 2.5; // デフォルト長
  }

  /**
   * シールドモード状態を取得
   */
  public isShieldModeActive(entity: Entity): boolean {
    const state = this.shieldModes.get(entity);
    return state?.isActive || false;
  }

  /**
   * 攻撃範囲を取得（刀身伸長による拡大を反映）
   */
  public getAttackRange(entity: Entity, baseRange: number): number {
    const state = this.extendedBlades.get(entity);
    if (!state || !state.isActive || state.currentLength <= 2.5) {
      // console.log(`⚔️ 攻撃範囲: 通常 ${baseRange}m`);
      return baseRange; // 通常の攻撃範囲
    }

    // 刀身の実際の伸び分を攻撃範囲に反映
    const extensionLength = state.currentLength - 2.5; // 実際の伸び
    const extendedRange = baseRange + extensionLength;
    
    const modeText = state.isAutoExtension ? '自動' : '手動';
    // console.log(`⚔️ 攻撃範囲拡大(${modeText}): 基本${baseRange}m + 伸び${extensionLength.toFixed(1)}m = ${extendedRange.toFixed(1)}m`);
    return extendedRange;
  }

  /**
   * 攻撃力を取得（刀身伸長による変化を反映）
   */
  public getAttackPower(entity: Entity, basePower: number): number {
    const state = this.extendedBlades.get(entity);
    if (!state || !state.isActive) {
      return basePower; // 通常の攻撃力
    }

    // 刀身が長いほど威力は下がる（物理法則）
    const lengthRatio = state.currentLength / 2.5;
    const powerMultiplier = Math.max(0.7, 1.2 / lengthRatio); // 最低70%、最大120%
    const adjustedPower = basePower * powerMultiplier;
    
    // console.log(`⚔️ 攻撃力調整: 基本${basePower} → 調整${adjustedPower.toFixed(1)} (倍率: ${powerMultiplier.toFixed(2)})`);
    return adjustedPower;
  }

  /**
   * 非攻撃時の刀身伸長を開始（TriggerSystemから呼び出し用）
   */
  public activateBladeExtensionExternal(entity: Entity, character: Character, hasSenku: boolean): void {
    this.activateBladeExtension(entity, character, hasSenku);
  }

  /**
   * 攻撃中の範囲を動的に更新
   */
  private updateCombatAttackRange(entity: Entity): void {
    const triggerSystem = this.world!.getSystem(TriggerSystem);
    if (!triggerSystem) return;

    const attackData = this.getActiveAttackData(entity);
    if (!attackData) return;

    // 現在の刀身長に基づいて攻撃範囲を再計算
    const trigger = entity.getComponent(Trigger);
    if (trigger && trigger.currentTrigger === TriggerType.KOGETSU) {
      const definition = TRIGGER_DEFINITIONS[TriggerType.KOGETSU];
      const newRange = this.getAttackRange(entity, definition.range);
      attackData.range = newRange * 1.5; // エフェクト用の1.5倍を適用
      
      // 攻撃エフェクトも更新
      this.updateAttackEffect(entity, newRange);
      
      // console.log(`⚔️ 攻撃中範囲更新: ${newRange.toFixed(1)}m → 判定${attackData.range.toFixed(1)}m`);
    }
  }

  /**
   * 攻撃エフェクトを動的に更新
   */
  private updateAttackEffect(entity: Entity, newRange: number): void {
    const triggerSystem = this.world!.getSystem(TriggerSystem);
    if (!triggerSystem || !('attackEffects' in triggerSystem)) {
      console.log(`🌀🌀🌀 NO TRIGGER SYSTEM OR ATTACK EFFECTS 🌀🌀🌀`);
      return;
    }

    const attackEffects = (triggerSystem as any).attackEffects as Map<Entity, Entity>;
    console.log(`🌀🌀🌀 SEARCHING EFFECTS: ${attackEffects.size} effects 🌀🌀🌀`);
    
    // このエンティティに関連する攻撃エフェクトを探す
    for (const [effectEntity, attackingPlayer] of attackEffects) {
      console.log(`🌀🌀🌀 CHECKING: effect=${effectEntity.id}, player=${attackingPlayer.id}, target=${entity.id} 🌀🌀🌀`);
      if (attackingPlayer === entity) {
        // エフェクトのジオメトリを再生成
        const meshComponent = effectEntity.getComponent(MeshComponent);
        if (meshComponent?.mesh && meshComponent.mesh instanceof THREE.Group) {
          console.log(`🌀🌀🌀 UPDATING EFFECT GEOMETRY: ${newRange.toFixed(1)}m 🌀🌀🌀`);
          
          // Group内の各子要素（セグメント）のジオメトリを更新
          meshComponent.mesh.children.forEach((child, index) => {
            if (child instanceof THREE.Mesh) {
              // 元のジオメトリのパラメータを取得
              const geometry = child.geometry as THREE.CircleGeometry;
              const parameters = geometry.parameters;
              
              // 新しい半径で同じジオメトリを再作成
              const newGeometry = new THREE.CircleGeometry(
                newRange * 0.8,           // 新しい半径
                parameters.segments,       // セグメント数
                parameters.thetaStart,     // 開始角度
                parameters.thetaLength     // 角度範囲
              );
              
              // 古いジオメトリを破棄して新しいものに置き換え
              geometry.dispose();
              child.geometry = newGeometry;
              
              console.log(`🌀🌀🌀 SEGMENT ${index} GEOMETRY UPDATED: radius=${(newRange * 0.8).toFixed(1)}m 🌀🌀🌀`);
            }
          });
          
          console.log(`🌀🌀🌀 EFFECT GEOMETRY UPDATED: ${meshComponent.mesh.children.length} segments 🌀🌀🌀`);
        } else {
          console.log(`🌀🌀🌀 NO MESH COMPONENT OR NOT GROUP 🌀🌀🌀`);
        }
        break;
      }
    }
  }
}

/**
 * 拡張刀身の状態
 */
interface ExtendedBladeState {
  isActive: boolean;
  startTime: number;
  holdTime: number;
  maxLength: number;
  currentLength: number;
  hasSenku: boolean;     // 旋空の有無
  isAttacking: boolean;  // 攻撃中フラグ
}

/**
 * シールドモードの状態
 */
interface ShieldModeState {
  isActive: boolean;
  durability: number;
  maxDurability: number;
  startTime: number;
}