/**
 * 原作準拠のキャラクターステータス
 * ワールドトリガー公式データブックのパラメータを基準
 */

// CharacterTypeとCharacterClassの定義を直接含める（循環参照回避）
export enum CharacterType {
  AMATORI_CHIKA = 'amatori_chika',
  KUGA_YUMA = 'kuga_yuma',
  JIN_YUICHI = 'jin_yuichi',
  MIKUMO_OSAMU = 'mikumo_osamu',
  AI_ENEMY = 'ai_enemy'
}

export enum CharacterClass {
  SNIPER = 'sniper',
  ATTACKER = 'attacker',
  ALL_ROUNDER = 'all_rounder',
  SHOOTER = 'shooter',
  GUNNER = 'gunner'
}

/**
 * 原作ステータス（0-12のスケール）
 * ゲームで使用する基本ステータス: 機動力、トリオンのみ
 */
export interface OriginalStats {
  // 基本能力（0-12）
  mobility: number;      // 機動力
  trion: number;         // トリオン（係数として使用）
  
  // 参考値（表示のみ）
  technique?: number;    // 技術
  range?: number;        // 射程
  command?: number;      // 指揮
  special?: number;      // 特殊戦術
}

/**
 * トリオン係数システム
 * 原作のトリオン値（0-12）を実際のトリオン量に変換
 */
export class TrionCalculator {
  // ベース係数（三雲修基準に調整）
  private static readonly BASE_COEFFICIENT = 30;
  
  /**
   * トリオン係数から実際のトリオン量を計算（3乗計算）
   * トリオン容量 = トリオン値^3 * 基本係数
   */
  static calculateTrionCapacity(trionCoefficient: number): number {
    // 0の場合は最小値を返す
    if (trionCoefficient <= 0) return 10;
    
    // トリオンの3乗 * 基本係数
    const capacity = Math.pow(trionCoefficient, 3) * this.BASE_COEFFICIENT;
    return Math.floor(capacity);
  }

  /**
   * 基本トリオン量を取得（固定値120）
   * ボーダーの基本的な生命維持・身体強化用
   */
  static calculateBasicTrion(totalCapacity: number): number {
    return 120; // 全キャラクター共通の固定値
  }

  /**
   * 装備用トリオン量を計算（総量の1/10）
   * トリガー装備に使用可能なトリオン
   */
  static calculateEquipmentTrion(totalCapacity: number): number {
    return Math.floor(totalCapacity / 10);
  }

  /**
   * 戦闘用トリオン量を計算（残り）
   * 実際の戦闘で使用可能なトリオン
   */
  static calculateCombatTrion(totalCapacity: number): number {
    const basic = 120; // 固定値
    const equipment = this.calculateEquipmentTrion(totalCapacity);
    return Math.max(0, totalCapacity - basic - equipment);
  }

  /**
   * トリオン量からランク文字列を取得
   */
  static getTrionRank(trionCoefficient: number): string {
    if (trionCoefficient >= 12) return 'SS+';
    if (trionCoefficient >= 11) return 'SS';
    if (trionCoefficient >= 10) return 'S+';
    if (trionCoefficient >= 9) return 'S';
    if (trionCoefficient >= 8) return 'A+';
    if (trionCoefficient >= 7) return 'A';
    if (trionCoefficient >= 6) return 'B+';
    if (trionCoefficient >= 5) return 'B';
    if (trionCoefficient >= 4) return 'C';
    if (trionCoefficient >= 3) return 'D';
    if (trionCoefficient >= 2) return 'E';
    return 'F';
  }

}

/**
 * 原作準拠のキャラクターステータス定義
 * ゲームで実際に使用するのは機動力とトリオンのみ
 */
export const ORIGINAL_CHARACTER_STATS: Record<CharacterType, OriginalStats> = {
  // 雨取千佳（公式データ）
  [CharacterType.AMATORI_CHIKA]: {
    mobility: 2,      // 機動力: 2（低い）
    trion: 12,        // トリオン: 12（規格外）
    // 参考値
    technique: 3,     // 技術: 3（やや低い）
    range: 11,        // 射程: 11（超高級）
    command: 2,       // 指揮: 2（低い）
    special: 2        // 特殊戦術: 2（低い）
  },

  // 空閑遊真（公式データ）
  [CharacterType.KUGA_YUMA]: {
    mobility: 9,      // 機動力: 9（異常に高い）
    trion: 4,         // トリオン: 4（標準）
    // 参考値
    technique: 11,    // 技術: 11（超規格外）
    range: 3,         // 射程: 3（やや低い）
    command: 6,       // 指揮: 6（高い）
    special: 10       // 特殊戦術: 10（規格外）
  },

  // 迅悠一（公式データ）
  [CharacterType.JIN_YUICHI]: {
    mobility: 8,      // 機動力: 8（極めて高い）
    trion: 6,         // トリオン: 6（高い）
    // 参考値
    technique: 10,    // 技術: 10（規格外）
    range: 7,         // 射程: 7（非常に高い）
    command: 9,       // 指揮: 9（異常に高い）
    special: 12       // 特殊戦術: 12（最高レベル・サイドエフェクト）
  },

  // 三雲修（公式データ）
  [CharacterType.MIKUMO_OSAMU]: {
    mobility: 3,      // 機動力: 3（やや低い）
    trion: 2,         // トリオン: 2（低い・基準値）
    // 参考値
    technique: 6,     // 技術: 6（高い）
    range: 7,         // 射程: 7（非常に高い）
    command: 8,       // 指揮: 8（極めて高い）
    special: 5        // 特殊戦術: 5（やや高い）
  },

  // AI敵（平均的なB級隊員）
  [CharacterType.AI_ENEMY]: {
    mobility: 5,      // 機動力: 5（やや高い）
    trion: 4,         // トリオン: 4（標準）
    // 参考値
    technique: 5,     // 技術: 5（やや高い）
    range: 4,         // 射程: 4（標準）
    command: 4,       // 指揮: 4（標準）
    special: 3        // 特殊戦術: 3（やや低い）
  }
};

/**
 * キャラクタークラス別の推奨ステータス傾向
 */
export const CLASS_STAT_TENDENCIES = {
  [CharacterClass.ATTACKER]: {
    focus: ['technique', 'mobility'],
    description: '近接戦闘に特化。技術と機動力が重要。'
  },
  [CharacterClass.SHOOTER]: {
    focus: ['technique', 'range'],
    description: '中距離射撃に特化。技術と射程が重要。'
  },
  [CharacterClass.SNIPER]: {
    focus: ['range', 'technique'],
    description: '長距離狙撃に特化。射程と技術が最重要。'
  },
  [CharacterClass.GUNNER]: {
    focus: ['range', 'mobility'],
    description: '連射による制圧が得意。射程と機動力が重要。'
  },
  [CharacterClass.ALL_ROUNDER]: {
    focus: ['technique', 'command'],
    description: 'バランス型。指揮能力と技術が重要。'
  }
};

/**
 * ステータス解説テキスト
 */
export const STAT_DESCRIPTIONS = {
  mobility: {
    name: '機動力',
    description: '移動速度を決定する唯一のステータス'
  },
  trion: {
    name: 'トリオン',
    description: 'トリオン総量、持続戦闘能力の基盤'
  },
  // 参考値
  technique: {
    name: '技術（参考）',
    description: '原作での戦闘技術（ゲームには影響しない）'
  },
  range: {
    name: '射程（参考）',
    description: '原作での射程能力（ゲームには影響しない）'
  },
  command: {
    name: '指揮（参考）',
    description: '原作での指揮能力（ゲームには影響しない）'
  },
  special: {
    name: '特殊戦術（参考）',
    description: '原作での特殊能力（ゲームには影響しない）'
  }
};

/**
 * ステータス表示用のユーティリティ
 */
export class StatDisplayUtils {
  /**
   * ステータス値をバーHTML要素として生成
   */
  static createStatBar(value: number, maxValue: number = 12): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 12px;
      background: rgba(40, 40, 50, 0.8);
      border-radius: 6px;
      overflow: hidden;
      position: relative;
      border: 1px solid #444;
    `;

    const fill = document.createElement('div');
    const percentage = (value / maxValue) * 100;
    fill.style.cssText = `
      width: ${percentage}%;
      height: 100%;
      background: ${this.getStatColor(value)};
      transition: width 0.3s ease;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.2);
    `;

    // 内側のグラデーション効果
    const gradient = document.createElement('div');
    gradient.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%);
      pointer-events: none;
    `;

    container.appendChild(fill);
    container.appendChild(gradient);
    return container;
  }

  /**
   * ステータス値をバー文字列表記に変換（コンソール用）
   */
  static getBarRating(value: number, maxValue: number = 12): string {
    const filled = Math.round((value / maxValue) * 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * ステータス値をランク文字に変換
   */
  static getStatRank(value: number): string {
    if (value >= 11) return 'SS';
    if (value >= 9) return 'S';
    if (value >= 7) return 'A';
    if (value >= 5) return 'B';
    if (value >= 3) return 'C';
    return 'D';
  }

  /**
   * ステータスの色を取得
   */
  static getStatColor(value: number): string {
    if (value >= 10) return '#FF1744'; // 赤（超高性能）
    if (value >= 8) return '#FF9800';  // オレンジ（高性能）
    if (value >= 6) return '#4CAF50';  // 緑（良好）
    if (value >= 4) return '#2196F3';  // 青（標準）
    if (value >= 2) return '#9E9E9E';  // グレー（低い）
    return '#757575';                  // ダークグレー（非常に低い）
  }
}