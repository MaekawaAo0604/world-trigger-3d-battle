/**
 * トリガーセットコスト機能のテスト
 */

import { Character, CharacterType, CharacterClass } from '../components/Character';
import { Trigger } from '../components/Trigger';
import { TriggerType, TriggerSet, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';

/**
 * トリガーセットコスト機能のテストクラス
 */
export class TriggerSetCostTest {
  static run(): boolean {
    console.log('🧪 TriggerSetCost Test Starting...');
    
    try {
      // テスト用キャラクターを作成
      const character = new Character(
        'テストキャラクター',
        CharacterType.AMATORI_CHIKA,
        CharacterClass.SNIPER,
        {
          trionCapacity: 100,
          currentTrion: 100,
          mobility: 50,
          attackPower: 80,
          defense: 60,
          technique: 70
        }
      );

      console.log(`  初期トリオン: ${character.stats.trionCapacity}`);

      // 低コストのトリガーセットをテスト
      const lowCostSet: TriggerSet = {
        slot1: TriggerType.KOGETSU,      // 12
        slot2: TriggerType.SHIELD,       // 5
        slot3: null,
        slot4: null,
        c1: TriggerType.BAGWORM,         // 4
        c2: null,
        c3: null,
        c4: null
      };

      const trigger = new Trigger(lowCostSet, character);
      const lowCostTotal = trigger.getTriggerSetCost();
      console.log(`  低コストセット総コスト: ${lowCostTotal}`);
      console.log(`  セット後の最大トリオン: ${character.stats.trionCapacity}`);

      if (character.stats.trionCapacity !== 100 - lowCostTotal) {
        throw new Error('Low cost set application failed');
      }

      // 高コストのトリガーセットをテスト
      const highCostSet: TriggerSet = {
        slot1: TriggerType.IBIS,         // 20
        slot2: TriggerType.LIGHTNING,    // 14
        slot3: TriggerType.VIPER,        // 18
        slot4: TriggerType.METEORA,      // 14
        c1: TriggerType.RAYGUST,         // 15
        c2: TriggerType.SALAMANDER,      // 10
        c3: TriggerType.GRASSHOPPER,     // 7
        c4: TriggerType.SPIDER           // 8
      };

      const highCostTotal = this.calculateSetCost(highCostSet);
      console.log(`  高コストセット総コスト: ${highCostTotal}`);

      // 装備可能性をテスト
      const canAfford = trigger.canAffordTriggerSet(highCostSet, character.stats.trionCapacity);
      console.log(`  高コストセットが装備可能: ${canAfford}`);

      // コスト超過のテスト
      if (highCostTotal > character.stats.trionCapacity && canAfford) {
        throw new Error('Cost validation failed');
      }

      console.log('✅ TriggerSetCost Test Passed');
      return true;
      
    } catch (error) {
      console.error('❌ TriggerSetCost Test Failed:', error);
      return false;
    }
  }

  /**
   * セットコストを手動計算（検証用）
   */
  private static calculateSetCost(triggerSet: TriggerSet): number {
    let total = 0;
    const slots = [
      triggerSet.slot1, triggerSet.slot2, triggerSet.slot3, triggerSet.slot4,
      triggerSet.c1, triggerSet.c2, triggerSet.c3, triggerSet.c4
    ];

    for (const triggerType of slots) {
      if (triggerType) {
        total += TRIGGER_DEFINITIONS[triggerType].setCost;
      }
    }

    return total;
  }
}

/**
 * 戦略的装備選択のデモンストレーション
 */
export class TriggerStrategyDemo {
  static run(): void {
    console.log('\n🎯 TRIGGER STRATEGY DEMONSTRATION');
    console.log('==================================\n');

    // 異なるキャラクタータイプでの戦略例
    const characters = [
      {
        name: '雨取千佳（高トリオン）',
        trion: 380,
        strategy: 'all_high_cost'
      },
      {
        name: '空閑遊真（標準トリオン）',
        trion: 70,
        strategy: 'balanced'
      },
      {
        name: '一般隊員（低トリオン）',
        trion: 50,
        strategy: 'minimal'
      }
    ];

    characters.forEach(char => {
      console.log(`📊 ${char.name} (最大トリオン: ${char.trion})`);
      
      switch (char.strategy) {
        case 'all_high_cost':
          console.log('  戦略: 全スロット高性能トリガーで埋める');
          console.log('  装備例: アイビス + ライトニング + バイパー + メテオラ');
          console.log('  　　　　レイガスト + サラマンダー + グラスホッパー + スパイダー');
          console.log('  総コスト: 106');
          break;
        case 'balanced':
          console.log('  戦略: 主力武器1つ + 補助武器でバランス');
          console.log('  装備例: 弧月 + アステロイド銃 + シールド + バッグワーム');
          console.log('  総コスト: 27');
          break;
        case 'minimal':
          console.log('  戦略: 必要最小限の装備で戦闘力確保');
          console.log('  装備例: 弧月 + シールド + バッグワーム');
          console.log('  総コスト: 21');
          break;
      }
      console.log('');
    });

    console.log('💡 戦略的な含意:');
    console.log('  • 高トリオンキャラは多彩な戦術が可能');
    console.log('  • 標準トリオンキャラは特化戦略が重要');
    console.log('  • 低トリオンキャラは選択と集中が必須');
    console.log('  • 全スロット埋めることが必ずしも最適ではない\n');
  }
}

// エクスポート用のメイン関数
export function runTriggerSetCostValidation(): void {
  console.log('🔧 TRIGGER SET COST SYSTEM VALIDATION');
  console.log('====================================\n');
  
  // 基本機能テスト
  const testResult = TriggerSetCostTest.run();
  
  // 戦略デモ
  TriggerStrategyDemo.run();
  
  // 最終判定
  if (testResult) {
    console.log('🎉 TRIGGER SET COST SYSTEM VALIDATION PASSED');
    console.log('All cost management features are functioning correctly.');
  } else {
    console.log('⚠️  TRIGGER SET COST SYSTEM VALIDATION FAILED');
    console.log('Some issues were detected. Please review and fix.');
  }
}