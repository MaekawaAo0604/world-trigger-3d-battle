import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Character } from '../components/Character';
import { Trigger } from '../components/Trigger';
import { Transform } from '../components/Transform';
import { Velocity } from '../components/Velocity';
import { HUD } from '../ui/HUD';

/**
 * HUDを管理するシステム
 */
export class HUDSystem extends System {
  private hud: HUD;
  private playerEntity: Entity | null = null;

  constructor(container: HTMLElement) {
    super();
    this.priority = -50; // レンダーシステムの前
    this.hud = new HUD(container);
  }

  requiredComponents() {
    return [Character]; // プレイヤーのみ追跡
  }

  update(deltaTime: number): void {
    // プレイヤーエンティティを取得
    if (!this.playerEntity) {
      const players = this.world!.getEntitiesWithTag('player');
      if (players.length > 0) {
        this.playerEntity = players[0];
      }
    }

    if (!this.playerEntity) return;

    const character = this.playerEntity.getComponent(Character);
    const trigger = this.playerEntity.getComponent(Trigger);
    const transform = this.playerEntity.getComponent(Transform);
    const velocity = this.playerEntity.getComponent(Velocity);

    if (!character) return;

    // キャラクター情報を更新
    this.hud.updateCharacter(character);

    // トリガー情報を更新
    if (trigger) {
      this.hud.updateTrigger(trigger);
    }

    // FPSを更新
    this.hud.updateFPS(deltaTime);

    // デバッグ情報を更新
    if (transform && velocity) {
      const activeTriggerInfo = trigger?.getActiveTriggerInfo();
      this.hud.updateDebug(
        transform.position,
        velocity.getSpeed(),
        activeTriggerInfo?.name || ''
      );
    }

    // 勝敗判定
    this.checkGameState();
  }

  /**
   * ゲーム状態をチェック
   */
  private checkGameState(): void {
    if (!this.playerEntity) return;

    const playerCharacter = this.playerEntity.getComponent(Character);
    if (!playerCharacter) return;

    // プレイヤーが倒された場合
    if (playerCharacter.isDefeated()) {
      this.hud.showDefeat();
      return;
    }

    // 敵が全て倒された場合
    const enemies = this.world!.getEntitiesWithTag('enemy');
    const aliveEnemies = enemies.filter(enemy => {
      const character = enemy.getComponent(Character);
      return character && !character.isDefeated();
    });

    if (aliveEnemies.length === 0) {
      this.hud.showVictory();
    }
  }

  destroy(): void {
    this.hud.destroy();
    super.destroy();
  }
}