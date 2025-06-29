import { 
  OriginalStats, 
  TrionCalculator, 
  ORIGINAL_CHARACTER_STATS,
  CharacterType,
  CharacterClass
} from '../config/OriginalStats';

/**
 * キャラクターの基本情報を管理するコンポーネント
 * 実際にゲームで使用するのは機動力とトリオンのみ
 */
export interface CharacterStats {
  trionCapacity: number;      // トリオン量（最大値）計算済み
  currentTrion: number;        // 現在のトリオン
  mobility: number;           // 機動力（0-100）
  
  // 原作準拠のステータス（0-12スケール）
  originalStats?: OriginalStats;
}

// CharacterTypeとCharacterClassはOriginalStats.tsから再エクスポート
export { CharacterType, CharacterClass };

export class Character {
  public name: string;
  public type: CharacterType;
  public class: CharacterClass;
  public stats: CharacterStats;
  public team: number;  // 0: プレイヤーチーム, 1: 敵チーム

  constructor(
    name: string,
    type: CharacterType,
    characterClass: CharacterClass,
    stats: CharacterStats,
    team: number = 0
  ) {
    this.name = name;
    this.type = type;
    this.class = characterClass;
    this.stats = { ...stats };
    this.team = team;
  }

  /**
   * ダメージを受ける
   */
  takeDamage(damage: number): void {
    // ダメージ値をバリデーション
    if (isNaN(damage) || damage < 0) {
      console.warn(`無効なダメージ値: ${damage}. ダメージを0に設定します。`);
      damage = 0;
    }
    
    this.stats.currentTrion = Math.max(0, this.stats.currentTrion - damage);
  }

  /**
   * トリオンを回復
   */
  healTrion(amount: number): void {
    this.stats.currentTrion = Math.min(
      this.stats.trionCapacity,
      this.stats.currentTrion + amount
    );
  }

  /**
   * 戦闘不能かチェック
   */
  isDefeated(): boolean {
    return this.stats.currentTrion <= 0;
  }

  /**
   * トリオン残量の割合を取得
   */
  getTrionPercentage(): number {
    return (this.stats.currentTrion / this.stats.trionCapacity) * 100;
  }

  /**
   * 移動速度を計算
   */
  getMoveSpeed(): number {
    return 5 + (this.stats.mobility / 100) * 10; // 5-15 units/s
  }

  /**
   * ダッシュ速度を計算
   */
  getDashSpeed(): number {
    return this.getMoveSpeed() * 1.5;
  }
}

/**
 * 原作ステータスから実際のゲームステータスを生成
 * 機動力とトリオンのみを変換
 */
function createCharacterStats(charType: CharacterType): CharacterStats {
  const originalStats = ORIGINAL_CHARACTER_STATS[charType];
  const trionCapacity = TrionCalculator.calculateTrionCapacity(originalStats.trion);
  
  return {
    trionCapacity,
    currentTrion: trionCapacity,
    mobility: Math.round(originalStats.mobility * 8.33),      // 0-12 → 0-100変換
    originalStats                                             // 原作ステータスも保持
  };
}

/**
 * プリセットキャラクターのステータス（原作準拠）
 */
export const CHARACTER_PRESETS: Record<CharacterType, {
  name: string;
  class: CharacterClass;
  stats: CharacterStats;
}> = {
  [CharacterType.AMATORI_CHIKA]: {
    name: '雨取千佳',
    class: CharacterClass.SNIPER,
    stats: createCharacterStats(CharacterType.AMATORI_CHIKA)
  },
  [CharacterType.KUGA_YUMA]: {
    name: '空閑遊真',
    class: CharacterClass.ATTACKER,
    stats: createCharacterStats(CharacterType.KUGA_YUMA)
  },
  [CharacterType.JIN_YUICHI]: {
    name: '迅悠一',
    class: CharacterClass.ALL_ROUNDER,
    stats: createCharacterStats(CharacterType.JIN_YUICHI)
  },
  [CharacterType.MIKUMO_OSAMU]: {
    name: '三雲修',
    class: CharacterClass.SHOOTER,
    stats: createCharacterStats(CharacterType.MIKUMO_OSAMU)
  },
  [CharacterType.AI_ENEMY]: {
    name: 'AIエネミー',
    class: CharacterClass.ALL_ROUNDER,
    stats: createCharacterStats(CharacterType.AI_ENEMY)
  }
};