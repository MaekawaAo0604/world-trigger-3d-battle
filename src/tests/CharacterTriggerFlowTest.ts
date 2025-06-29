/**
 * キャラクター・トリガー選択フローのテスト
 */

import { Character, CharacterType, CHARACTER_PRESETS } from '../components/Character';
import { Trigger } from '../components/Trigger';
import { TriggerType, TriggerSet } from '../triggers/TriggerDefinitions';
import { CharacterTriggerMenu } from '../ui/CharacterTriggerMenu';

/**
 * キャラクター・トリガー選択フローのテストクラス
 */
export class CharacterTriggerFlowTest {
  static run(): boolean {
    console.log('🎮 CharacterTriggerFlow Test Starting...');
    
    try {
      // 1. キャラクター選択のテスト
      console.log('  📋 Testing character selection...');
      
      const characters = [
        CharacterType.AMATORI_CHIKA,
        CharacterType.KUGA_YUMA,
        CharacterType.JIN_YUICHI
      ];
      
      characters.forEach(charType => {
        const preset = CHARACTER_PRESETS[charType];
        console.log(`    ✓ ${preset.name}: Trion=${preset.stats.trionCapacity}, Class=${preset.class}`);
      });

      // 2. トリガーセットコスト計算のテスト
      console.log('  💰 Testing trigger set cost calculation...');
      
      const testTriggerSet: TriggerSet = {
        slot1: TriggerType.KOGETSU,      // 12
        slot2: TriggerType.ASTEROID_GUN, // 6
        slot3: TriggerType.LIGHTNING,    // 14
        slot4: null,
        c1: TriggerType.SHIELD,          // 5
        c2: TriggerType.BAGWORM,         // 4
        c3: null,
        c4: null
      };
      
      const expectedCost = 12 + 6 + 14 + 5 + 4; // = 41
      
      // 各キャラクターでの装備可能性をテスト
      characters.forEach(charType => {
        const preset = CHARACTER_PRESETS[charType];
        const canAfford = expectedCost <= preset.stats.trionCapacity;
        const remainingTrion = preset.stats.trionCapacity - expectedCost;
        
        console.log(`    ${preset.name}: コスト${expectedCost}, 装備${canAfford ? '可能' : '不可能'}, 残り${remainingTrion}`);
        
        if (charType === CharacterType.AMATORI_CHIKA) {
          if (!canAfford || remainingTrion !== 339) {
            throw new Error(`Amatori Chika calculation failed: expected 339, got ${remainingTrion}`);
          }
        }
        
        if (charType === CharacterType.KUGA_YUMA) {
          if (!canAfford || remainingTrion !== 29) {
            throw new Error(`Kuga Yuma calculation failed: expected 29, got ${remainingTrion}`);
          }
        }
      });

      // 3. 高コストセットのテスト
      console.log('  🔥 Testing high-cost trigger set...');
      
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
      
      const highCost = 20 + 14 + 18 + 14 + 15 + 10 + 7 + 8; // = 106
      
      characters.forEach(charType => {
        const preset = CHARACTER_PRESETS[charType];
        const canAfford = highCost <= preset.stats.trionCapacity;
        
        console.log(`    ${preset.name}: 高コストセット(${highCost}) ${canAfford ? '装備可能' : '装備不可能'}`);
        
        // 雨取千佳のみ装備可能であることを確認
        if (charType === CharacterType.AMATORI_CHIKA && !canAfford) {
          throw new Error('Amatori Chika should be able to afford high-cost set');
        }
        if (charType !== CharacterType.AMATORI_CHIKA && canAfford) {
          throw new Error(`${preset.name} should not be able to afford high-cost set`);
        }
      });

      // 4. キャラクター変更時のトリオン調整テスト
      console.log('  🔄 Testing character switching with trion adjustment...');
      
      // 低トリオンキャラクターから高トリオンキャラクターへの変更
      const character = new Character(
        'テストキャラクター',
        CharacterType.KUGA_YUMA,
        CHARACTER_PRESETS[CharacterType.KUGA_YUMA].class,
        CHARACTER_PRESETS[CharacterType.KUGA_YUMA].stats
      );
      
      const trigger = new Trigger(testTriggerSet, character);
      console.log(`    初期状態: ${character.name}, トリオン=${character.stats.trionCapacity}`);
      
      // 雨取千佳に変更
      const newPreset = CHARACTER_PRESETS[CharacterType.AMATORI_CHIKA];
      character.type = CharacterType.AMATORI_CHIKA;
      character.name = newPreset.name;
      character.stats = { ...newPreset.stats };
      
      // 新しいセットコストを適用
      trigger.refundPreviousSetCost(character, testTriggerSet);
      trigger.consumeSetCost(character);
      
      console.log(`    変更後: ${character.name}, トリオン=${character.stats.trionCapacity}`);
      
      const expectedTrionAfterChange = 380 - expectedCost; // 339
      if (character.stats.trionCapacity !== expectedTrionAfterChange) {
        throw new Error(`Character change calculation failed: expected ${expectedTrionAfterChange}, got ${character.stats.trionCapacity}`);
      }

      // 5. 戦略的装備選択のシミュレーション
      console.log('  🎯 Testing strategic equipment selection...');
      
      const strategies = [
        {
          name: '高トリオン・全装備戦略',
          character: CharacterType.AMATORI_CHIKA,
          triggerSet: highCostSet,
          expectedResult: 'success'
        },
        {
          name: '標準トリオン・バランス戦略',
          character: CharacterType.KUGA_YUMA,
          triggerSet: testTriggerSet,
          expectedResult: 'success'
        },
        {
          name: '標準トリオン・高コスト戦略（失敗）',
          character: CharacterType.KUGA_YUMA,
          triggerSet: highCostSet,
          expectedResult: 'failure'
        }
      ];
      
      strategies.forEach(strategy => {
        const preset = CHARACTER_PRESETS[strategy.character];
        const testChar = new Character('テスト', strategy.character, preset.class, preset.stats);
        const testTrigger = new Trigger({ slot1: null, slot2: null, slot3: null, slot4: null, c1: null, c2: null, c3: null, c4: null });
        
        const canAfford = testTrigger.canAffordTriggerSet(strategy.triggerSet, testChar.stats.trionCapacity);
        const shouldSucceed = strategy.expectedResult === 'success';
        
        console.log(`    ${strategy.name}: ${canAfford ? '成功' : '失敗'} (期待: ${strategy.expectedResult})`);
        
        if (canAfford !== shouldSucceed) {
          throw new Error(`Strategy test failed: ${strategy.name}`);
        }
      });

      console.log('✅ CharacterTriggerFlow Test Passed');
      return true;
      
    } catch (error) {
      console.error('❌ CharacterTriggerFlow Test Failed:', error);
      return false;
    }
  }
}

/**
 * UI統合テストのシミュレーション
 */
export class CharacterTriggerUIIntegrationTest {
  static run(): void {
    console.log('\n🎨 CHARACTER-TRIGGER UI INTEGRATION DEMO');
    console.log('==========================================\n');

    console.log('📱 新機能の流れ:');
    console.log('  1. プレイヤーがトリガーメニューを開く（Mキー）');
    console.log('  2. キャラクター選択画面が表示される');
    console.log('  3. キャラクターカードにトリオン容量が大きく表示');
    console.log('  4. キャラクターを選択すると、トリガー選択画面に移行');
    console.log('  5. 画面上部にトリオンバーが表示され、残量を視覚的に確認');
    console.log('  6. トリガー選択時にリアルタイムでコスト計算・残量更新');
    console.log('  7. トリオン不足の場合は警告表示＆戦闘開始ボタン無効化');
    console.log('  8. 装備可能な場合のみ戦闘開始可能\n');

    console.log('🎯 戦略的な選択例:');

    const examples = [
      {
        character: '雨取千佳（トリオン380）',
        strategy: '全スロット高性能装備',
        cost: 106,
        remaining: 274,
        description: 'アイビス＋バイパー＋全補助装備で最大火力'
      },
      {
        character: '空閑遊真（トリオン70）',
        strategy: 'バランス型装備',
        cost: 41,
        remaining: 29,
        description: '弧月＋ライトニング＋基本補助でバランス重視'
      },
      {
        character: '一般隊員（トリオン50）',
        strategy: '最小限装備',
        cost: 21,
        remaining: 29,
        description: '弧月＋シールド＋バッグワームで必要最小限'
      }
    ];

    examples.forEach(example => {
      console.log(`  ${example.character}:`);
      console.log(`    戦略: ${example.strategy}`);
      console.log(`    セットコスト: ${example.cost}`);
      console.log(`    出撃時残りトリオン: ${example.remaining}`);
      console.log(`    説明: ${example.description}\n`);
    });

    console.log('💡 ユーザビリティの向上:');
    console.log('  • キャラクター選択が先になることで、戦略的思考が促進');
    console.log('  • トリオンバーによる視覚的フィードバック');
    console.log('  • リアルタイムコスト計算による即座の判断');
    console.log('  • 装備不可能時の明確な警告');
    console.log('  • 原作の戦略性を忠実に再現\n');
  }
}

// エクスポート用のメイン関数
export function runCharacterTriggerFlowValidation(): void {
  console.log('🔧 CHARACTER-TRIGGER FLOW SYSTEM VALIDATION');
  console.log('=============================================\n');
  
  // 基本機能テスト
  const testResult = CharacterTriggerFlowTest.run();
  
  // UI統合デモ
  CharacterTriggerUIIntegrationTest.run();
  
  // 最終判定
  if (testResult) {
    console.log('🎉 CHARACTER-TRIGGER FLOW SYSTEM VALIDATION PASSED');
    console.log('New character-first selection flow is functioning correctly.');
    console.log('Players can now select characters before triggers with visual trion feedback.');
  } else {
    console.log('⚠️  CHARACTER-TRIGGER FLOW SYSTEM VALIDATION FAILED');
    console.log('Some issues were detected. Please review and fix.');
  }
}