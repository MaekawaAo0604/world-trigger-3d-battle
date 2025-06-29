/**
 * トリガーの種類
 */
export enum TriggerType {
  // アタッカー用
  RAYGUST = 'raygust',        // レイガスト（攻守バランス型）
  KOGETSU = 'kogetsu',        // 弧月（高威力）
  SENKU = 'senku',            // 旋空（弧月の刀身伸長）
  
  // シューター用
  ASTEROID = 'asteroid',       // アステロイド（通常弾）
  METEORA = 'meteora',        // メテオラ（爆発弾）
  HOUND = 'hound',            // ハウンド（追尾弾）
  VIPER = 'viper',            // バイパー（軌道変更弾）
  
  // スナイパー用
  IBIS = 'ibis',              // アイビス（高威力・低弾速）
  LIGHTNING = 'lightning',     // ライトニング（高弾速・低威力）
  EAGLET = 'eaglet',          // イーグレット（射程特化）
  
  // ガンナー用
  ASTEROID_GUN = 'asteroid_gun', // アステロイド（銃形態）
  SALAMANDER = 'salamander',   // サラマンダー（炸裂弾）
  
  // 防御・補助
  SHIELD = 'shield',          // シールド
  SPIDER = 'spider',          // スパイダー（ワイヤートラップ）
  BAGWORM = 'bagworm',        // バッグワーム（隠密）
  GRASSHOPPER = 'grasshopper' // グラスホッパー（移動補助）
}

/**
 * トリガーのカテゴリ
 */
export enum TriggerCategory {
  ATTACKER = 'attacker',
  SHOOTER = 'shooter',
  SNIPER = 'sniper',
  GUNNER = 'gunner',
  DEFENSE = 'defense',
  OPTIONAL = 'optional'
}

/**
 * トリガーの基本情報
 */
export interface TriggerInfo {
  name: string;
  type: TriggerType;
  category: TriggerCategory;
  trionCost: number;          // 使用時のトリオン消費量
  setCost: number;            // セット時のトリオン消費量
  cooldown: number;           // クールダウン（秒）
  range: number;              // 射程距離
  damage: number;             // 基本ダメージ
  description: string;
}

/**
 * トリガーセット（装備構成）
 */
export interface TriggerSet {
  slot1: TriggerType | null;    // スロット1
  slot2: TriggerType | null;    // スロット2
  slot3: TriggerType | null;    // スロット3
  slot4: TriggerType | null;    // スロット4
  c1: TriggerType | null;       // C1スロット
  c2: TriggerType | null;       // C2スロット
  c3: TriggerType | null;       // C3スロット
  c4: TriggerType | null;       // C4スロット
}

/**
 * トリガー定義
 */
export const TRIGGER_DEFINITIONS: Record<TriggerType, TriggerInfo> = {
  // アタッカートリガー
  [TriggerType.RAYGUST]: {
    name: 'レイガスト',
    type: TriggerType.RAYGUST,
    category: TriggerCategory.ATTACKER,
    trionCost: 8,
    setCost: 10,  // 統一コスト
    cooldown: 0.4,  // 攻撃アニメーション時間を短縮
    range: 3,
    damage: 40,
    description: '攻守バランス型の近接武器。シールドモード可能'
  },
  [TriggerType.KOGETSU]: {
    name: '弧月',
    type: TriggerType.KOGETSU,
    category: TriggerCategory.ATTACKER,
    trionCost: 6,
    setCost: 10,  // 統一コスト
    cooldown: 0.4,  // 攻撃アニメーション時間を短縮
    range: 2.5,
    damage: 500, // テスト用に大幅増加
    description: '高威力の日本刀型トリガー'
  },
  [TriggerType.SENKU]: {
    name: '旋空',
    type: TriggerType.SENKU,
    category: TriggerCategory.OPTIONAL,
    trionCost: 5,
    setCost: 10,  // 統一コスト
    cooldown: 0.5,
    range: 40,  // 最大射程（0.2秒時）
    damage: 0,  // 単体では攻撃力なし
    description: '弧月の刀身を伸長させる特殊トリガー'
  },

  // シュータートリガー
  [TriggerType.ASTEROID]: {
    name: 'アステロイド',
    type: TriggerType.ASTEROID,
    category: TriggerCategory.SHOOTER,
    trionCost: 4,
    setCost: 10,  // 統一コスト
    cooldown: 0.2,
    range: 30,
    damage: 20,
    description: '標準的な射撃弾。弾速と威力のバランスが良い'
  },
  [TriggerType.METEORA]: {
    name: 'メテオラ',
    type: TriggerType.METEORA,
    category: TriggerCategory.SHOOTER,
    trionCost: 7,
    setCost: 10,  // 統一コスト
    cooldown: 1.0,
    range: 25,
    damage: 35,
    description: '爆発する射撃弾。範囲ダメージあり'
  },
  [TriggerType.VIPER]: {
    name: 'バイパー',
    type: TriggerType.VIPER,
    category: TriggerCategory.SHOOTER,
    trionCost: 6,
    setCost: 10,  // 統一コスト
    cooldown: 0.8,
    range: 30,
    damage: 22,
    description: '自在に軌道を変更できる射撃弾。分割発射可能'
  },

  // スナイパートリガー
  [TriggerType.IBIS]: {
    name: 'アイビス',
    type: TriggerType.IBIS,
    category: TriggerCategory.SNIPER,
    trionCost: 8,  // 重い狙撃銃のため高コスト
    setCost: 10,  // 統一コスト
    cooldown: 3.5, // 超高威力のため長いクールダウン
    range: 50,     // 長射程
    damage: 80,
    description: '超高威力の狙撃銃。弾速は遅い'
  },
  [TriggerType.LIGHTNING]: {
    name: 'ライトニング',
    type: TriggerType.LIGHTNING,
    category: TriggerCategory.SNIPER,
    trionCost: 4,  // 高速射撃のためそれなりのコスト
    setCost: 10,  // 統一コスト
    cooldown: 1.5, // 高速射撃タイプのため中程度のクールダウン
    range: 35,     // 中射程
    damage: 45,
    description: '高速弾の狙撃銃。命中率重視'
  },
  [TriggerType.EAGLET]: {
    name: 'イーグレット',
    type: TriggerType.EAGLET,
    category: TriggerCategory.SNIPER,
    trionCost: 6,
    setCost: 10,  // 統一コスト
    cooldown: 2.2, // バランス型のクールダウン
    range: 40,     // 基本射程は長め
    damage: 60,
    description: '射程特化の狙撃銃。トリオン量に応じて射程が延びる'
  },

  // ガンナートリガー
  [TriggerType.ASTEROID_GUN]: {
    name: 'アステロイド（銃）',
    type: TriggerType.ASTEROID_GUN,
    category: TriggerCategory.GUNNER,
    trionCost: 2,
    setCost: 10,  // 統一コスト
    cooldown: 0.1,
    range: 20,
    damage: 15,
    description: '連射可能な銃形態のアステロイド'
  },
  [TriggerType.HOUND]: {
    name: 'ハウンド',
    type: TriggerType.HOUND,
    category: TriggerCategory.SHOOTER,
    trionCost: 6,
    setCost: 10,  // 統一コスト
    cooldown: 1.2,
    range: 35,
    damage: 25,
    description: '目標を追尾する弾丸。高いトリオン効率'
  },
  [TriggerType.SALAMANDER]: {
    name: 'サラマンダー',
    type: TriggerType.SALAMANDER,
    category: TriggerCategory.GUNNER,
    trionCost: 3,
    setCost: 10,  // 統一コスト
    cooldown: 0.3,
    range: 18,
    damage: 20,
    description: '着弾時に炸裂する連射可能な爆発弾'
  },
  [TriggerType.SPIDER]: {
    name: 'スパイダー',
    type: TriggerType.SPIDER,
    category: TriggerCategory.OPTIONAL,
    trionCost: 4,
    setCost: 10,  // 統一コスト
    cooldown: 1.0,
    range: 0,
    damage: 0,
    description: 'ワイヤートラップを設置する補助トリガー'
  },

  // 防御・補助トリガー
  [TriggerType.SHIELD]: {
    name: 'シールド',
    type: TriggerType.SHIELD,
    category: TriggerCategory.DEFENSE,
    trionCost: 3,
    setCost: 10,  // 統一コスト
    cooldown: 0.5,
    range: 0,
    damage: 0,
    description: '防御用バリア。持続的にトリオンを消費'
  },
  [TriggerType.BAGWORM]: {
    name: 'バッグワーム',
    type: TriggerType.BAGWORM,
    category: TriggerCategory.OPTIONAL,
    trionCost: 2,
    setCost: 10,  // 統一コスト
    cooldown: 1.0,
    range: 0,
    damage: 0,
    description: 'レーダーから姿を隠すマント'
  },
  [TriggerType.GRASSHOPPER]: {
    name: 'グラスホッパー',
    type: TriggerType.GRASSHOPPER,
    category: TriggerCategory.OPTIONAL,
    trionCost: 5,
    setCost: 10,  // 統一コスト
    cooldown: 0.5,
    range: 10,
    damage: 0,
    description: '空中に足場を作る移動補助トリガー'
  }
};

/**
 * クラス別の推奨トリガーセット
 */
export const CLASS_TRIGGER_SETS = {
  [CharacterClass.ATTACKER]: {
    slot1: TriggerType.KOGETSU,
    slot2: TriggerType.SENKU,      // 旋空を追加（弧月と同じ手に）
    slot3: TriggerType.RAYGUST,
    slot4: TriggerType.ASTEROID_GUN,
    c1: TriggerType.SHIELD,
    c2: TriggerType.GRASSHOPPER,
    c3: TriggerType.SPIDER,
    c4: TriggerType.BAGWORM
  },
  [CharacterClass.SNIPER]: {
    slot1: TriggerType.IBIS,
    slot2: TriggerType.LIGHTNING,
    slot3: TriggerType.EAGLET,
    slot4: TriggerType.ASTEROID_GUN,
    c1: TriggerType.SHIELD,
    c2: TriggerType.BAGWORM,
    c3: TriggerType.SPIDER,
    c4: TriggerType.GRASSHOPPER
  },
  [CharacterClass.ALL_ROUNDER]: {
    slot1: TriggerType.KOGETSU,
    slot2: TriggerType.ASTEROID_GUN,
    slot3: TriggerType.LIGHTNING,
    slot4: TriggerType.METEORA,
    c1: TriggerType.ASTEROID,
    c2: TriggerType.VIPER,
    c3: TriggerType.SHIELD,
    c4: TriggerType.GRASSHOPPER
  },
  [CharacterClass.SHOOTER]: {
    slot1: TriggerType.ASTEROID,
    slot2: TriggerType.METEORA,
    slot3: TriggerType.VIPER,
    slot4: TriggerType.HOUND,
    c1: TriggerType.SHIELD,
    c2: TriggerType.BAGWORM,
    c3: TriggerType.SPIDER,
    c4: TriggerType.GRASSHOPPER
  },
  [CharacterClass.GUNNER]: {
    slot1: TriggerType.ASTEROID_GUN,
    slot2: TriggerType.SALAMANDER,
    slot3: TriggerType.LIGHTNING,
    slot4: TriggerType.HOUND,
    c1: TriggerType.SHIELD,
    c2: TriggerType.GRASSHOPPER,
    c3: TriggerType.SPIDER,
    c4: TriggerType.BAGWORM
  }
};

// CharacterClassをインポート
import { CharacterClass } from '../components/Character';