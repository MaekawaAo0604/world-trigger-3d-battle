import * as THREE from 'three';
import { TriggerType } from '../triggers/TriggerDefinitions';

/**
 * 弾丸の種類
 */
export enum ProjectileType {
  BULLET = 'bullet',        // 通常弾
  EXPLOSIVE = 'explosive',  // 爆発弾
  HOMING = 'homing',       // 追尾弾
  PIERCING = 'piercing'    // 貫通弾
}

/**
 * 弾丸を管理するコンポーネント
 */
export class Projectile {
  public type: ProjectileType;
  public triggerType: TriggerType;     // どのトリガーから発射されたか
  public velocity: THREE.Vector3;      // 弾丸の速度
  public damage: number;               // ダメージ量
  public range: number;                // 最大射程
  public travelDistance: number = 0;   // 移動距離
  public owner: number;                // 発射者のエンティティID
  public team: number;                 // チーム（味方の弾に当たらないように）
  public pierceCount: number = 0;      // 貫通回数
  public maxPierce: number = 0;        // 最大貫通回数
  public explosionRadius: number = 0;  // 爆発半径
  public homingTarget: number | null = null; // 追尾対象のエンティティID
  public homingStrength: number = 0;   // 追尾の強さ
  public lifeTime: number = 5.0;       // 弾の寿命（秒）
  public age: number = 0;              // 弾の年齢（秒）

  constructor(
    type: ProjectileType,
    triggerType: TriggerType,
    velocity: THREE.Vector3,
    damage: number,
    range: number,
    owner: number,
    team: number
  ) {
    this.type = type;
    this.triggerType = triggerType;
    this.velocity = velocity.clone();
    this.damage = damage;
    this.range = range;
    this.owner = owner;
    this.team = team;

    // タイプ別の追加設定
    switch (type) {
      case ProjectileType.EXPLOSIVE:
        this.explosionRadius = 3;
        break;
      case ProjectileType.HOMING:
        // ハウンドの追跡強度をトリガータイプで調整
        if (triggerType === TriggerType.HOUND) {
          this.homingStrength = 2.5; // 適度なホーミング（確実に当たりすぎないよう調整）
        } else {
          this.homingStrength = 1.5; // その他の追跡弾
        }
        break;
      case ProjectileType.PIERCING:
        this.maxPierce = 3;
        break;
    }
  }

  /**
   * 移動距離を更新
   */
  updateTravelDistance(distance: number): boolean {
    this.travelDistance += distance;
    // 最大射程を超えたらtrue
    return this.travelDistance >= this.range;
  }

  /**
   * 貫通処理
   */
  pierce(): boolean {
    if (this.type === ProjectileType.PIERCING && this.pierceCount < this.maxPierce) {
      this.pierceCount++;
      // ダメージを少し減少
      this.damage *= 0.8;
      return true; // まだ貫通可能
    }
    return false; // これ以上貫通できない
  }

  /**
   * 爆発ダメージの計算
   */
  getExplosionDamage(distance: number): number {
    if (this.type !== ProjectileType.EXPLOSIVE) return this.damage;
    
    // 距離に応じてダメージを減衰
    const falloff = 1 - (distance / this.explosionRadius);
    return this.damage * Math.max(0, falloff);
  }

  /**
   * 追尾対象を設定
   */
  setHomingTarget(targetId: number | null): void {
    this.homingTarget = targetId;
  }

}