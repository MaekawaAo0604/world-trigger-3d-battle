import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Input } from '../components/Input';
import { Trigger } from '../components/Trigger';
import { TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';

/**
 * AIの行動状態
 */
enum AIState {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  EVADE = 'evade'
}

/**
 * AI制御システム
 */
export class AISystem extends System {
  private aiStates: Map<number, AIState> = new Map();
  private aiTargets: Map<number, Entity | null> = new Map();
  private patrolTargets: Map<number, THREE.Vector3> = new Map();
  private actionCooldowns: Map<number, number> = new Map();
  private weaponGeneratedFlags: Map<number, boolean> = new Map();

  requiredComponents() {
    return [Transform, Character, Input];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      // プレイヤーはスキップ
      if (entity.hasTag('player')) continue;
      
      // 無効なエンティティや戦闘不能なキャラクターはスキップ
      if (!entity.active) continue;

      const transform = entity.getComponent(Transform)!;
      const character = entity.getComponent(Character)!;
      const input = entity.getComponent(Input)!;
      const trigger = entity.getComponent(Trigger);
      
      // キャラクターが戦闘不能の場合はスキップ
      if (character.isDefeated()) continue;

      // AIの状態を更新
      this.updateAIState(entity, transform, character);

      // AIの行動を実行
      this.executeAIBehavior(entity, transform, character, input, trigger, deltaTime);

      // クールダウンを更新
      const cooldown = this.actionCooldowns.get(entity.id) || 0;
      if (cooldown > 0) {
        this.actionCooldowns.set(entity.id, cooldown - deltaTime);
      }
    }
  }

  /**
   * AIの状態を更新
   */
  private updateAIState(entity: Entity, transform: Transform, character: Character): void {
    const currentState = this.aiStates.get(entity.id) || AIState.IDLE;
    let newState = currentState;

    // 敵を探す
    const nearestEnemy = this.findNearestEnemy(transform.position, character.team);
    this.aiTargets.set(entity.id, nearestEnemy);

    if (nearestEnemy) {
      const enemyTransform = nearestEnemy.getComponent(Transform)!;
      const distance = transform.position.distanceTo(enemyTransform.position);

      if (distance < 8) {
        // 近距離：攻撃
        newState = AIState.ATTACK;
      } else if (distance < 25) {
        // 中距離：追跡
        newState = AIState.CHASE;
      } else {
        // 遠距離：パトロール
        newState = AIState.PATROL;
      }

      // 体力が低い場合は回避
      if (character.stats.currentTrion < character.stats.trionCapacity * 0.3) {
        newState = AIState.EVADE;
      }

      // 状態変化をログ出力
      if (currentState !== newState) {
        console.log(`🤖 AI ${entity.id}: ${currentState} → ${newState} (距離: ${distance.toFixed(1)}, トリオン: ${character.stats.currentTrion}/${character.stats.trionCapacity})`);
      }
    } else {
      // 敵がいない場合はパトロール
      newState = AIState.PATROL;
    }

    this.aiStates.set(entity.id, newState);
  }

  /**
   * AIの行動を実行
   */
  private executeAIBehavior(
    entity: Entity,
    transform: Transform,
    character: Character,
    input: Input,
    trigger: Trigger | undefined,
    deltaTime: number
  ): void {
    const state = this.aiStates.get(entity.id) || AIState.IDLE;
    const target = this.aiTargets.get(entity.id);

    // 入力をリセット
    input.moveDirection.set(0, 0);
    input.jump = false;
    input.mainRightAction = false;
    input.mainLeftAction = false;
    input.generateWeapon = false;
    input.triggerSlot = 0;

    switch (state) {
      case AIState.PATROL:
        this.executePatrol(entity, transform, input);
        break;

      case AIState.CHASE:
        if (target) {
          this.executeChase(entity, transform, target, input);
        }
        break;

      case AIState.ATTACK:
        if (target && trigger) {
          this.executeAttack(entity, transform, character, target, input, trigger);
        }
        break;

      case AIState.EVADE:
        if (target) {
          this.executeEvade(entity, transform, target, input);
        }
        break;
    }

    // ランダムなジャンプ
    if (Math.random() < 0.01) {
      input.jump = true;
    }
  }

  /**
   * パトロール行動
   */
  private executePatrol(entity: Entity, transform: Transform, input: Input): void {
    let patrolTarget = this.patrolTargets.get(entity.id);

    // パトロール目標がないか、近づいたら新しい目標を設定
    if (!patrolTarget || transform.position.distanceTo(patrolTarget) < 2) {
      patrolTarget = new THREE.Vector3(
        (Math.random() - 0.5) * 40,
        0,
        (Math.random() - 0.5) * 40
      );
      this.patrolTargets.set(entity.id, patrolTarget);
    }

    // パトロール目標に向かって移動
    const direction = patrolTarget.clone().sub(transform.position).normalize();
    input.moveDirection.x = direction.x * 0.5; // ゆっくり移動
    input.moveDirection.y = direction.z * 0.5;
  }

  /**
   * 追跡行動
   */
  private executeChase(entity: Entity, transform: Transform, target: Entity, input: Input): void {
    const targetTransform = target.getComponent(Transform)!;
    const direction = targetTransform.position.clone().sub(transform.position).normalize();

    // 基本的な追跡移動
    input.moveDirection.x = direction.x * 0.8;
    input.moveDirection.y = direction.z * 0.8;

    // ランダムな回避行動を追加
    const time = Date.now() / 1000;
    input.moveDirection.x += Math.sin(time * 2 + entity.id) * 0.3;
    input.moveDirection.y += Math.cos(time * 1.5 + entity.id) * 0.3;

    // 戦術的ジャンプ
    if (Math.random() < 0.03) {
      input.jump = true;
    }
  }

  /**
   * 攻撃行動
   */
  private executeAttack(
    entity: Entity,
    transform: Transform,
    character: Character,
    target: Entity,
    input: Input,
    trigger: Trigger
  ): void {
    const targetTransform = target.getComponent(Transform)!;
    const direction = targetTransform.position.clone().sub(transform.position);
    const distance = direction.length();
    direction.normalize();

    // ターゲットの方を向く
    input.lookDirection.x = Math.atan2(direction.x, direction.z);
    input.lookDirection.y = -Math.atan2(direction.y, Math.sqrt(direction.x * direction.x + direction.z * direction.z));

    // 武器を生成していない場合は生成
    if (!this.weaponGeneratedFlags.get(entity.id) && !trigger.weaponGenerated) {
      // ランダムなトリガーを選択
      const slots = [1, 2, 3, 4];
      const randomSlot = slots[Math.floor(Math.random() * slots.length)];
      console.log(`🔧 AI ${entity.id}: 武器生成開始 - スロット${randomSlot}選択`);
      input.triggerSlot = randomSlot;
      input.generateWeapon = true;
      this.weaponGeneratedFlags.set(entity.id, true);
      return;
    }

    // クールダウン中は何もしない
    const cooldown = this.actionCooldowns.get(entity.id) || 0;
    if (cooldown > 0) return;

    // 現在のトリガーの種類を確認
    if (trigger.currentTrigger) {
      const definition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
      const category = definition.category;

      if (category === 'attacker' && distance < 5) {
        // 近接攻撃
        console.log(`⚔️ AI ${entity.id}: 近接攻撃実行 (${trigger.currentTrigger})`);
        input.mainRightAction = true;
        this.actionCooldowns.set(entity.id, 0.8);
      } else if ((category === 'shooter' || category === 'gunner' || category === 'sniper') && distance < 25) {
        // 射撃攻撃
        console.log(`🏹 AI ${entity.id}: 射撃攻撃実行 (${trigger.currentTrigger})`);
        input.mainRightAction = true;
        this.actionCooldowns.set(entity.id, definition.cooldown + 0.3);
      }
    }

    // 適切な距離を保つ & 戦術的移動
    if (distance < 3) {
      // 近すぎる場合は少し離れる
      input.moveDirection.x = -direction.x * 0.7;
      input.moveDirection.y = -direction.z * 0.7;
    } else if (distance > 6) {
      // 遠い場合は近づく
      input.moveDirection.x = direction.x * 0.6;
      input.moveDirection.y = direction.z * 0.6;
    } else {
      // 理想的な距離では左右に移動（ストラフィング）
      const time = Date.now() / 1000;
      const strafe = Math.sin(time * 3 + entity.id) * 0.8;
      input.moveDirection.x = direction.z * strafe; // 垂直方向に移動
      input.moveDirection.y = -direction.x * strafe;
    }

    // 攻撃中のランダム回避
    if (Math.random() < 0.02) {
      input.jump = true;
    }
  }

  /**
   * 回避行動
   */
  private executeEvade(entity: Entity, transform: Transform, target: Entity, input: Input): void {
    const targetTransform = target.getComponent(Transform)!;
    const direction = transform.position.clone().sub(targetTransform.position).normalize();

    // ターゲットから離れる
    input.moveDirection.x = direction.x;
    input.moveDirection.y = direction.z;

    // ジグザグ移動
    const time = Date.now() / 1000;
    input.moveDirection.x += Math.sin(time * 5) * 0.5;

    // 頻繁にジャンプ
    if (Math.random() < 0.1) {
      input.jump = true;
    }
  }

  /**
   * 最も近い敵を探す
   */
  private findNearestEnemy(position: THREE.Vector3, team: number): Entity | null {
    const entities = this.world?.getEntities() || [];
    let nearestEnemy: Entity | null = null;
    let nearestDistance = Infinity;

    for (const entity of entities) {
      const character = entity.getComponent(Character);
      const transform = entity.getComponent(Transform);

      if (character && transform && character.team !== team) {
        const distance = position.distanceTo(transform.position);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestEnemy = entity;
        }
      }
    }

    return nearestEnemy;
  }

  /**
   * システム破棄時の処理
   */
  destroy(): void {
    this.aiStates.clear();
    this.aiTargets.clear();
    this.patrolTargets.clear();
    this.actionCooldowns.clear();
    this.weaponGeneratedFlags.clear();
    super.destroy();
  }
}