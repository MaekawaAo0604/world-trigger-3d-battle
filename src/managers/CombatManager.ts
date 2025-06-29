import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { WeaponManager } from '../weapons/WeaponManager';
import { ProjectileManager } from '../projectiles/ProjectileManager';
import { AttackSystem } from '../combat/AttackSystem';
import { SplittingTriggerSystem } from '../triggers/SplittingTriggerSystem';
import { WeaponEffectSystem } from '../effects/WeaponEffectSystem';

/**
 * 戦闘関連システムの統合管理クラス
 * 各専門システム間の協調を担当
 */
export class CombatManager {
  private world: World;
  private weaponManager: WeaponManager;
  private projectileManager: ProjectileManager;
  private attackSystem: AttackSystem;
  private splittingTriggerSystem: SplittingTriggerSystem;
  private weaponEffectSystem: WeaponEffectSystem;

  constructor(world: World) {
    this.world = world;
    
    // 各システムを初期化
    this.weaponEffectSystem = new WeaponEffectSystem(world);
    this.weaponManager = new WeaponManager(world);
    this.projectileManager = new ProjectileManager(world);
    this.attackSystem = new AttackSystem(world, this.projectileManager, this.weaponEffectSystem);
    this.splittingTriggerSystem = new SplittingTriggerSystem(world);
  }

  /**
   * 各システムを更新
   */
  update(deltaTime: number): void {
    // 発射物の更新
    this.projectileManager.updateProjectiles(deltaTime);
    
    // 武器位置の更新
    this.weaponManager.updateWeaponPositions();
    
    // アクティブ攻撃の更新
    this.attackSystem.updateActiveAttacks();
    
    // 分割トリガーキューブの更新
    this.splittingTriggerSystem.updateSplittingCubes();
  }

  /**
   * WeaponManagerを取得
   */
  getWeaponManager(): WeaponManager {
    return this.weaponManager;
  }

  /**
   * ProjectileManagerを取得
   */
  getProjectileManager(): ProjectileManager {
    return this.projectileManager;
  }

  /**
   * AttackSystemを取得
   */
  getAttackSystem(): AttackSystem {
    return this.attackSystem;
  }

  /**
   * SplittingTriggerSystemを取得
   */
  getSplittingTriggerSystem(): SplittingTriggerSystem {
    return this.splittingTriggerSystem;
  }

  /**
   * WeaponEffectSystemを取得
   */
  getWeaponEffectSystem(): WeaponEffectSystem {
    return this.weaponEffectSystem;
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.weaponManager.destroy();
    this.projectileManager.destroy();
    this.attackSystem.destroy();
    this.splittingTriggerSystem.destroy();
    this.weaponEffectSystem.destroy();
  }

  /**
   * 全システムのデバッグ情報を取得
   */
  getDebugInfo(): {
    weapons: { rightWeapons: number; leftWeapons: number };
    projectiles: { activeProjectiles: number; pooledProjectiles: number };
    attacks: { activeAttacks: number; attackEffects: number };
    splittingTriggers: { activeSplittingTriggers: number; totalCubes: number };
  } {
    return {
      weapons: this.weaponManager.getDebugInfo(),
      projectiles: this.projectileManager.getDebugInfo(),
      attacks: this.attackSystem.getDebugInfo(),
      splittingTriggers: this.splittingTriggerSystem.getDebugInfo()
    };
  }
}