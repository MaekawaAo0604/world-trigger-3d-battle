/**
 * トリオン3乗計算システムのテスト
 */

import { TrionCalculator } from '../config/OriginalStats';
import { CharacterType, CHARACTER_PRESETS } from '../components/Character';

/**
 * トリオン3乗計算のテストクラス
 */
export class TrionCubeCalculationTest {
  static run(): boolean {
    console.log('🔢 Trion Cube Calculation Test Starting...');
    
    try {
      // 1. 3乗計算のテスト
      console.log('  📐 Testing cubic calculation formula...');
      console.log('  Formula: Trion Capacity = Trion^3 × 30 (三雲修基準)');
      console.log('');
      
      const testValues = [
        { trion: 0, expected: 10 },     // 特殊ケース（最小値）
        { trion: 1, expected: 30 },     // 1^3 × 30 = 30
        { trion: 2, expected: 240 },    // 2^3 × 30 = 240（三雲修基準）
        { trion: 3, expected: 810 },    // 3^3 × 30 = 810
        { trion: 4, expected: 1920 },   // 4^3 × 30 = 1920
        { trion: 5, expected: 3750 },   // 5^3 × 30 = 3750
        { trion: 6, expected: 6480 },   // 6^3 × 30 = 6480
        { trion: 7, expected: 10290 },  // 7^3 × 30 = 10290
        { trion: 8, expected: 15360 },  // 8^3 × 30 = 15360
        { trion: 9, expected: 21870 },  // 9^3 × 30 = 21870
        { trion: 10, expected: 30000 }, // 10^3 × 30 = 30000
        { trion: 11, expected: 39930 }, // 11^3 × 30 = 39930
        { trion: 12, expected: 51840 }  // 12^3 × 30 = 51840
      ];
      
      console.log('  トリオン値 → トリオン容量（計算結果）');
      console.log('  ────────────────────────────────');
      
      testValues.forEach(test => {
        const calculated = TrionCalculator.calculateTrionCapacity(test.trion);
        const success = calculated === test.expected;
        const mark = success ? '✓' : '✗';
        
        console.log(`    ${mark} ${test.trion.toString().padStart(2)} → ${calculated.toString().padStart(4)} (期待値: ${test.expected})`);
        
        if (!success) {
          throw new Error(`Calculation failed for trion ${test.trion}: expected ${test.expected}, got ${calculated}`);
        }
      });

      // 2. キャラクター別の新しいトリオン容量
      console.log('\n  🎭 Testing character trion capacities...');
      console.log('');
      
      const characters = [
        { type: CharacterType.MIKUMO_OSAMU, name: '三雲修', trion: 2 },
        { type: CharacterType.KUGA_YUMA, name: '空閑遊真', trion: 4 },
        { type: CharacterType.JIN_YUICHI, name: '迅悠一', trion: 6 },
        { type: CharacterType.AMATORI_CHIKA, name: '雨取千佳', trion: 12 },
        { type: CharacterType.AI_ENEMY, name: 'AI敵', trion: 4 }
      ];
      
      characters.forEach(char => {
        const preset = CHARACTER_PRESETS[char.type];
        const calculatedCapacity = TrionCalculator.calculateTrionCapacity(char.trion);
        const basicTrion = TrionCalculator.calculateBasicTrion(calculatedCapacity);
        const equipmentTrion = TrionCalculator.calculateEquipmentTrion(calculatedCapacity);
        const combatTrion = TrionCalculator.calculateCombatTrion(calculatedCapacity);
        
        console.log(`    ${char.name}:`);
        console.log(`      原作トリオン値: ${char.trion}/12`);
        console.log(`      計算式: ${char.trion}³ × 30 = ${Math.pow(char.trion, 3)} × 30`);
        console.log(`      総トリオン容量: ${preset.stats.trionCapacity}`);
        console.log(`      ├─基本トリオン (固定): ${basicTrion}`);
        console.log(`      ├─装備トリオン (1/10): ${equipmentTrion}`);
        console.log(`      └─戦闘トリオン (残り): ${combatTrion}`);
        console.log(`      ランク: ${TrionCalculator.getTrionRank(char.trion)}`);
        console.log('');
        
        if (preset.stats.trionCapacity !== calculatedCapacity) {
          throw new Error(`Character capacity mismatch for ${char.name}: expected ${calculatedCapacity}, got ${preset.stats.trionCapacity}`);
        }
      });

      // 3. トリオン格差の分析
      console.log('  📊 Analyzing trion capacity differences...');
      console.log('');
      
      const mikumo = TrionCalculator.calculateTrionCapacity(2);
      const yuma = TrionCalculator.calculateTrionCapacity(4);
      const jin = TrionCalculator.calculateTrionCapacity(6);
      const chika = TrionCalculator.calculateTrionCapacity(12);
      
      console.log(`    千佳 vs 修: ${chika} ÷ ${mikumo} = ${(chika/mikumo).toFixed(1)}倍`);
      console.log(`    千佳 vs 遊真: ${chika} ÷ ${yuma} = ${(chika/yuma).toFixed(1)}倍`);
      console.log(`    千佳 vs 迅: ${chika} ÷ ${jin} = ${(chika/jin).toFixed(1)}倍`);
      console.log(`    迅 vs 修: ${jin} ÷ ${mikumo} = ${(jin/mikumo).toFixed(1)}倍`);
      console.log(`    遊真 vs 修: ${yuma} ÷ ${mikumo} = ${(yuma/mikumo).toFixed(1)}倍`);
      console.log('');
      console.log('    → 三雲修（トリオン2）を基準とした圧倒的な差を表現');

      // 4. 戦略的意味
      console.log('\n  🎯 Strategic implications of cubic calculation...');
      console.log('');
      console.log('    • 三雲修（トリオン2）を基準とした現実的な差');
      console.log('    • 基本トリオン（120固定）: 生命維持・身体強化');
      console.log('    • 装備トリオン（1/10）: トリガー装備コスト');
      console.log('    • 戦闘トリオン（残り）: 実際の戦闘で使用');
      console.log('    • トリガーセットコスト（一律10）: 公平性重視');
      console.log('    • 低トリオンキャラは装備トリオンが制限要因');

      console.log('\n✅ Trion Cube Calculation Test Passed');
      return true;
      
    } catch (error) {
      console.error('❌ Trion Cube Calculation Test Failed:', error);
      return false;
    }
  }
}

/**
 * トリオン容量グラフの可視化（コンソール版）
 */
export class TrionCapacityVisualization {
  static run(): void {
    console.log('\n📈 TRION CAPACITY VISUALIZATION (Cubic)');
    console.log('========================================\n');

    console.log('トリオン値とトリオン容量の関係（3乗曲線）:');
    console.log('');
    
    for (let i = 0; i <= 12; i++) {
      const capacity = TrionCalculator.calculateTrionCapacity(i);
      const barLength = Math.floor(capacity / 1300); // スケール調整（係数30対応）
      const bar = '█'.repeat(Math.min(barLength, 40)); // 最大40文字
      
      console.log(`  ${i.toString().padStart(2)}: ${bar} ${capacity}`);
    }
    
    console.log('\n特徴:');
    console.log('  • 0-2: 低トリオン（三雲修レベル）');
    console.log('  • 3-5: 一般隊員レベル');
    console.log('  • 6-8: エリート隊員レベル');
    console.log('  • 9-12: 規格外レベル（トリオンモンスター）');
    console.log('');
    console.log('三雲修（トリオン2）を基準とした3乗曲線により、');
    console.log('原作の圧倒的なトリオン格差が数値として表現されています。');
  }
}

// エクスポート用のメイン関数
export function runTrionCubeCalculationValidation(): void {
  console.log('🔧 TRION CUBE CALCULATION VALIDATION');
  console.log('====================================\n');
  
  // 基本機能テスト
  const testResult = TrionCubeCalculationTest.run();
  
  // 可視化
  TrionCapacityVisualization.run();
  
  // 最終判定
  if (testResult) {
    console.log('\n🎉 TRION CUBE CALCULATION VALIDATION PASSED');
    console.log('New cubic formula is functioning correctly.');
    console.log('Trion capacity now scales dramatically with higher values.');
  } else {
    console.log('\n⚠️  TRION CUBE CALCULATION VALIDATION FAILED');
    console.log('Some issues were detected. Please review and fix.');
  }
}