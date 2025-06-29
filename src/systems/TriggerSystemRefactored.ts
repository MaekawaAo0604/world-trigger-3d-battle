import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Input } from '../components/Input';
import { Trigger } from '../components/Trigger';
import { TriggerType, TRIGGER_DEFINITIONS, TriggerCategory } from '../triggers/TriggerDefinitions';
import { CombatManager } from '../managers/CombatManager';
import { TriggerMenu } from '../ui/TriggerMenu';
import { AnimationSystem, AnimationState } from './AnimationSystem';
import { SwordActionSystem } from './SwordActionSystem';

/**
 * リファクタリング後のトリガーシステム
 * コア機能（トリガー切り替え、入力処理、基本ロジック）のみを担当
 * 専門機能は各専用システムに移譲
 */
export class TriggerSystemRefactored extends System {
  private combatManager: CombatManager;
  private triggerMenu: TriggerMenu | null = null;

  constructor() {
    super();
    // CombatManagerは後でinit時に設定
    this.combatManager = null as any;
  }

  /**
   * 初期化（Worldが設定された後に呼ばれる）
   */
  init(): void {
    this.combatManager = new CombatManager(this.world!);
  }

  requiredComponents() {
    return [Trigger, Character, Transform];
  }

  update(deltaTime: number): void {
    // CombatManagerの更新
    this.combatManager?.update(deltaTime);
    
    const entities = this.getEntities();

    for (const entity of entities) {
      const trigger = entity.getComponent(Trigger)!;
      const character = entity.getComponent(Character)!;
      const transform = entity.getComponent(Transform)!;
      const input = entity.getComponent(Input);

      // トリガーのクールダウンを更新
      trigger.updateCooldowns(deltaTime);

      if (input) {
        this.processInput(entity, trigger, character, transform, input);
      }
    }
  }

  /**
   * 入力処理を実行
   */
  private processInput(
    entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    input: Input
  ): void {
    // トリガー切り替え
    this.handleTriggerSwitching(entity, trigger, input);

    // 武器生成
    this.handleWeaponGeneration(entity, trigger, character, input);

    // 攻撃処理
    this.handleAttacks(entity, trigger, character, transform, input);

    // 分割トリガー処理
    this.handleSplittingTriggers(entity, trigger, character, input);

    // UI処理
    this.handleUI(entity, trigger, input);
  }

  /**
   * トリガー切り替えを処理
   */
  private handleTriggerSwitching(entity: Entity, trigger: Trigger, input: Input): void {
    // 右手トリガー切り替え
    if (input.triggerSlot > 0) {
      // 切り替え前の分割トリガーキューブを削除
      const previousTrigger = trigger.currentTrigger;
      if (previousTrigger && this.combatManager.getSplittingTriggerSystem().isSplittingTrigger(previousTrigger)) {
        this.combatManager.getSplittingTriggerSystem().clearSplittingTrigger(entity.id);
      }
      
      trigger.selectSlot(input.triggerSlot);
    }

    // 左手トリガー切り替え（C1-C4専用）
    if (input.leftTriggerSlot > 0) {
      // 切り替え前の左手分割トリガーキューブを削除
      const previousLeftTrigger = trigger.leftCurrentTrigger;
      if (previousLeftTrigger && this.combatManager.getSplittingTriggerSystem().isSplittingTrigger(previousLeftTrigger)) {
        this.combatManager.getSplittingTriggerSystem().clearSplittingTrigger(entity.id);
      }
      
      const success = trigger.selectLeftSlot(input.leftTriggerSlot);
      console.log(`TriggerSystem: Left trigger selection ${success ? 'succeeded' : 'failed'}`);
    }
  }

  /**
   * 武器生成を処理
   */
  private handleWeaponGeneration(entity: Entity, trigger: Trigger, character: Character, input: Input): void {
    // 右手武器生成（R, Space, マウス右クリック）
    if (input.weaponGeneration || input.secondaryAction || input.secondaryAttack) {
      this.generateWeapon(entity, trigger, character, false);
    }

    // 左手武器生成（T）
    if (input.leftWeaponGeneration) {
      this.generateWeapon(entity, trigger, character, true);
    }

    // 武器解除（Z）
    if (input.weaponDismiss) {
      this.dismissWeapons(entity, trigger);
    }
  }

  /**
   * 攻撃処理を処理
   */
  private handleAttacks(
    entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    input: Input
  ): void {
    // 右手攻撃
    if (trigger.currentTrigger) {
      const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
      
      if (definition.category === 'attacker') {
        // アタッカー武器の攻撃
        if (input.primaryAttack && trigger.weaponGenerated) {
          this.performMeleeAttack(entity, trigger, character, transform, 'horizontal', false);
        }
        if (input.verticalAttack && trigger.weaponGenerated) {
          this.performMeleeAttack(entity, trigger, character, transform, 'vertical', false);
        }
      } else if (definition.category === 'sniper' || definition.category === 'gunner') {
        // 射撃武器の攻撃
        if (input.primaryAttack && trigger.weaponGenerated) {
          this.combatManager.getAttackSystem().fireProjectile(
            entity, trigger, character, transform, trigger.currentTrigger, false
          );
        }
      }
    }

    // 左手攻撃
    if (trigger.leftCurrentTrigger) {
      const definition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
      
      if (definition.category === 'attacker') {
        // 左手アタッカー武器の攻撃
        if (input.mainLeftAction && trigger.leftWeaponGenerated) {
          this.performMeleeAttack(entity, trigger, character, transform, 'horizontal', true);
        }
      } else if (definition.category === 'shooter' || definition.category === 'gunner') {
        // 左手射撃武器の攻撃
        if (input.mainLeftAction) {
          this.combatManager.getAttackSystem().fireProjectile(
            entity, trigger, character, transform, trigger.leftCurrentTrigger, true
          );
        }
      }
    }

    // 旋空（サブアクション）処理
    if (input.subRightAction && trigger.currentTrigger === TriggerType.KOGETSU && trigger.weaponGenerated) {
      this.activateSenkuBladeExtension(entity);
    }
  }


  /**
   * 旋空による攻撃中刀身伸長を開始
   */
  private activateSenkuBladeExtension(entity: Entity): void {
    const swordActionSystem = this.world!.getSystem(SwordActionSystem);
    if (swordActionSystem) {
      swordActionSystem.activateSenkuBladeExtension(entity);
    }
  }

  /**
   * 分割トリガー処理を処理
   */
  private handleSplittingTriggers(entity: Entity, trigger: Trigger, character: Character, input: Input): void {
    const splittingSystem = this.combatManager.getSplittingTriggerSystem();

    // 右手分割トリガー
    if (trigger.currentTrigger && splittingSystem.isSplittingTrigger(trigger.currentTrigger)) {
      if (input.weaponGeneration || input.secondaryAction) {
        splittingSystem.generateSplittingCubes(entity, trigger, character, false);
      }
      if (input.splittingTriggerSplit) {
        splittingSystem.splitTriggerCubes(entity, false);
      }
      if (input.primaryAttack) {
        const transform = entity.getComponent(Transform)!;
        splittingSystem.fireSplittingTrigger(entity, trigger, character, transform, false);
      }
    }

    // 左手分割トリガー
    if (trigger.leftCurrentTrigger && splittingSystem.isSplittingTrigger(trigger.leftCurrentTrigger)) {
      if (input.leftWeaponGeneration) {
        splittingSystem.generateSplittingCubes(entity, trigger, character, true);
      }
      if (input.splittingTriggerSplit) {
        splittingSystem.splitTriggerCubes(entity, true);
      }
      if (input.mainLeftAction) {
        const transform = entity.getComponent(Transform)!;
        splittingSystem.fireSplittingTrigger(entity, trigger, character, transform, true);
      }
    }
  }

  /**
   * UI処理を処理
   */
  private handleUI(entity: Entity, trigger: Trigger, input: Input): void {
    // トリガーメニューの開閉
    if (input.triggerMenu) {
      this.toggleTriggerMenu(entity, trigger);
    }

    // スナイパースコープ
    if (input.sniperScope) {
      console.log('TriggerSystem: Sniper scope toggle (placeholder)');
    }

    // ガンナーADS
    if (input.gunnerADS) {
      console.log('TriggerSystem: Gunner ADS toggle (placeholder)');
    }
  }

  /**
   * 武器を生成
   */
  private generateWeapon(entity: Entity, trigger: Trigger, character: Character, isLeftHand: boolean): void {
    const currentTrigger = isLeftHand ? trigger.leftCurrentTrigger : trigger.currentTrigger;
    if (!currentTrigger) return;

    const definition = TRIGGER_DEFINITIONS[currentTrigger];
    
    // 武器生成可能なカテゴリかチェック
    if (definition.category !== 'attacker' && definition.category !== 'sniper' && definition.category !== 'gunner') {
      return;
    }

    // 既に生成済みかチェック
    const weaponGenerated = isLeftHand ? trigger.leftWeaponGenerated : trigger.weaponGenerated;
    if (weaponGenerated) return;

    // トリオンコストをチェック
    const trionCost = isLeftHand ? trigger.getLeftWeaponGenerationCost() : trigger.getWeaponGenerationCost();
    if (character.stats.currentTrion < trionCost) {
      console.log('TriggerSystem: Insufficient trion for weapon generation');
      return;
    }

    // 武器生成を実行
    const success = isLeftHand ? trigger.generateLeftWeapon() : trigger.generateWeapon();
    if (!success) return;

    // トリオンを消費
    character.takeDamage(trionCost);

    // 視覚的な武器を作成
    if (isLeftHand) {
      this.combatManager.getWeaponManager().createLeftWeapon(entity, currentTrigger);
    } else {
      this.combatManager.getWeaponManager().createRightWeapon(entity, currentTrigger);
    }

    // 生成された武器を記録
    if (!isLeftHand) {
      trigger.lastGeneratedTrigger = currentTrigger;
    }

    // スナイパー武器生成後は即座に射撃可能にする
    if (definition.category === 'sniper') {
      const state = trigger.states.get(currentTrigger);
      if (state) {
        state.cooldownRemaining = 0;
      }
    }

    console.log(`TriggerSystem: ${isLeftHand ? 'Left' : 'Right'} weapon generated: ${currentTrigger}`);
  }

  /**
   * 武器を解除
   */
  private dismissWeapons(entity: Entity, trigger: Trigger): void {
    // 右手武器解除
    if (trigger.weaponGenerated) {
      trigger.dismissWeapon();
      this.combatManager.getWeaponManager().removeRightWeapon(entity);
    }

    // 左手武器解除
    if (trigger.leftWeaponGenerated) {
      trigger.dismissLeftWeapon();
      this.combatManager.getWeaponManager().removeLeftWeapon(entity);
    }

    console.log('TriggerSystem: Weapons dismissed');
  }

  /**
   * 近接攻撃を実行
   */
  private performMeleeAttack(
    entity: Entity,
    trigger: Trigger,
    character: Character,
    transform: Transform,
    attackType: 'horizontal' | 'vertical',
    isLeftHand: boolean
  ): void {
    const currentTrigger = isLeftHand ? trigger.leftCurrentTrigger : trigger.currentTrigger;
    if (!currentTrigger) return;

    const definition = TRIGGER_DEFINITIONS[currentTrigger];
    if (definition.category !== 'attacker') return;

    // 武器が生成されているかチェック
    const weaponGenerated = isLeftHand ? trigger.leftWeaponGenerated : trigger.weaponGenerated;
    if (!weaponGenerated) {
      console.log('TriggerSystem: Weapon not generated for melee attack');
      return;
    }

    // 攻撃実行のチェック
    const success = isLeftHand ? trigger.useLeftWeaponAttack() : trigger.useWeaponAttack();
    if (!success) return;

    // 攻撃中は装備武器を非表示
    if (isLeftHand) {
      this.combatManager.getWeaponManager().hideLeftWeapon(entity);
    } else {
      this.combatManager.getWeaponManager().hideRightWeapon(entity);
    }

    // 攻撃実行
    const attackSystem = this.combatManager.getAttackSystem();
    if (attackType === 'vertical') {
      if (isLeftHand) {
        attackSystem.performLeftVerticalAttack(currentTrigger, transform, character);
      } else {
        attackSystem.performVerticalAttack(currentTrigger, transform, character);
      }
    } else {
      if (isLeftHand) {
        attackSystem.performLeftMeleeAttack(currentTrigger, transform, character);
      } else {
        attackSystem.performMeleeAttack(currentTrigger, transform, character);
      }
    }

    // アニメーション終了後に武器を再表示
    const duration = attackType === 'vertical' ? 250 : 350; // ミリ秒（短縮）
    setTimeout(() => {
      if (isLeftHand) {
        this.combatManager.getWeaponManager().showLeftWeapon(entity);
      } else {
        this.combatManager.getWeaponManager().showRightWeapon(entity);
      }
    }, duration);

    console.log(`TriggerSystem: ${isLeftHand ? 'Left' : 'Right'} ${attackType} attack performed`);
  }

  /**
   * トリガーメニューの開閉を切り替え（戦闘中は簡易版のみ）
   */
  private toggleTriggerMenu(entity: Entity, trigger: Trigger): void {
    const character = entity.getComponent(Character);
    if (!character) {
      console.error('TriggerSystem: No character component found for trigger menu');
      return;
    }

    // 戦闘中は従来のTriggerMenuを使用（簡易版）
    if (!this.triggerMenu) {
      this.triggerMenu = new TriggerMenu(trigger.triggerSet);
      this.triggerMenu.setOnTriggerSetChange((newTriggerSet) => {
        this.updateTriggerSet(entity, trigger, newTriggerSet);
      });
    }

    if (this.triggerMenu.isMenuOpen()) {
      this.triggerMenu.close();
    } else {
      // 最大トリオンを設定（前のセットコストを返還した値）
      const previousTriggerSet = { ...trigger.triggerSet };
      trigger.refundPreviousSetCost(character, previousTriggerSet);
      
      this.triggerMenu.setMaxTrion(character.stats.trionCapacity);
      this.triggerMenu.updateTriggerSet(trigger.triggerSet);
      this.triggerMenu.open();
      
      // セットコストを元に戻す
      trigger.consumeSetCost(character);
    }
  }


  /**
   * トリガーセットを更新
   */
  private updateTriggerSet(entity: Entity, trigger: Trigger, newTriggerSet: any): void {
    const character = entity.getComponent(Character);
    if (!character) {
      console.error('TriggerSystem: No character component found for trigger set update');
      return;
    }

    // セットコストをチェック
    if (!trigger.canAffordTriggerSet(newTriggerSet, character.stats.trionCapacity)) {
      console.warn('TriggerSystem: Cannot afford new trigger set. Insufficient trion capacity.');
      // UIに警告表示（TODO: UI実装時に追加）
      return;
    }

    // 前のトリガーセットのコストを返還
    const previousTriggerSet = { ...trigger.triggerSet };
    trigger.refundPreviousSetCost(character, previousTriggerSet);

    // 既存の武器を削除
    this.combatManager.getWeaponManager().clearAllWeapons(entity);
    this.combatManager.getSplittingTriggerSystem().clearSplittingTrigger(entity.id);
    
    // 新しいトリガーセットを適用
    trigger.triggerSet = { ...newTriggerSet };
    
    // 新しいセットのコストを消費
    if (!trigger.consumeSetCost(character)) {
      console.error('TriggerSystem: Failed to consume set cost. This should not happen.');
      // 失敗した場合は前のセットに戻す
      trigger.triggerSet = previousTriggerSet;
      trigger.consumeSetCost(character);
      return;
    }
    
    // スロット選択をリセット
    trigger.currentSlot = 1;
    trigger.leftCurrentSlot = 2;
    trigger.updateCurrentTriggers();
    
    console.log('TriggerSystem: Trigger set updated:', newTriggerSet);
    console.log(`TriggerSystem: New max trion: ${character.stats.trionCapacity}, current: ${character.stats.currentTrion}`);
  }

  /**
   * システムを破棄
   */
  destroy(): void {
    this.combatManager?.destroy();
    this.triggerMenu?.destroy();
    this.triggerMenu = null;
  }

  /**
   * CombatManagerを取得（デバッグ用）
   */
  getCombatManager(): CombatManager {
    return this.combatManager;
  }
}