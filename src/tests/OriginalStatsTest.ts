/**
 * 原作準拠ステータスシステムのテスト
 */

import { 
  TrionCalculator, 
  ORIGINAL_CHARACTER_STATS,
  StatDisplayUtils,
  STAT_DESCRIPTIONS,
  CLASS_STAT_TENDENCIES
} from '../config/OriginalStats';
import { CharacterType, CHARACTER_PRESETS } from '../components/Character';

/**
 * 原作ステータスシステムのテストクラス
 */
export class OriginalStatsTest {
  static run(): boolean {
    console.log('📊 OriginalStats Test Starting...');
    
    try {
      // 1. トリオン係数計算のテスト
      console.log('  ⚡ Testing trion coefficient calculation...');
      
      const trionTests = [
        { coefficient: 4, expected: 50, description: '標準（一般隊員）' },
        { coefficient: 6, expected: 100, description: '高い（迅悠一）' },
        { coefficient: 12, expected: 800, description: '規格外（雨取千佳）' }
      ];
      
      trionTests.forEach(test => {
        const calculated = TrionCalculator.calculateTrionCapacity(test.coefficient);
        console.log(`    係数${test.coefficient}: ${calculated} (期待値: ${test.expected}) - ${test.description}`);
        
        if (calculated !== test.expected) {
          throw new Error(`Trion calculation failed: coefficient ${test.coefficient}, expected ${test.expected}, got ${calculated}`);
        }
      });

      // 2. キャラクタープリセットの検証
      console.log('  🎭 Testing character presets...');
      
      Object.entries(CHARACTER_PRESETS).forEach(([charType, preset]) => {
        const originalStats = preset.stats.originalStats;
        console.log(`    ${preset.name}:`);
        console.log(`      トリオン: ${preset.stats.trionCapacity} (原作値: ${originalStats?.trion}/12)`);
        console.log(`      機動力: ${Math.round(preset.stats.mobility)} (原作値: ${originalStats?.mobility}/12)`);
        console.log(`      技術: ${Math.round(preset.stats.technique)} (原作値: ${originalStats?.technique}/12)`);
        
        if (!originalStats) {
          throw new Error(`Missing original stats for ${preset.name}`);
        }
      });

      // 3. ステータス表示ユーティリティのテスト
      console.log('  ⭐ Testing stat display utilities...');
      
      const displayTests = [
        { value: 12, expectedRank: 'SS', expectedStars: 12 },
        { value: 9, expectedRank: 'S', expectedStars: 9 },
        { value: 6, expectedRank: 'B', expectedStars: 6 },
        { value: 3, expectedRank: 'C', expectedStars: 3 },
        { value: 0, expectedRank: 'D', expectedStars: 0 }
      ];
      
      displayTests.forEach(test => {
        const rank = StatDisplayUtils.getStatRank(test.value);
        const stars = StatDisplayUtils.getStarRating(test.value);
        const starCount = (stars.match(/★/g) || []).length;
        
        console.log(`    値${test.value}: ${rank}ランク, ${starCount}★`);
        
        if (rank !== test.expectedRank || starCount !== test.expectedStars) {
          throw new Error(`Display utility failed for value ${test.value}`);
        }
      });

      // 4. 原作ステータスの特徴テスト
      console.log('  🎯 Testing character stat characteristics...');
      
      const chika = ORIGINAL_CHARACTER_STATS[CharacterType.AMATORI_CHIKA];
      const yuma = ORIGINAL_CHARACTER_STATS[CharacterType.KUGA_YUMA];
      const jin = ORIGINAL_CHARACTER_STATS[CharacterType.JIN_YUICHI];
      
      // 千佳の特徴確認
      if (chika.trion !== 12 || chika.mobility <= 3 || chika.range < 10) {
        throw new Error('Chika characteristics validation failed');
      }
      console.log(`    ✓ 雨取千佳: 超高トリオン(${chika.trion}), 低機動力(${chika.mobility}), 超高射程(${chika.range})`);
      
      // 遊真の特徴確認
      if (yuma.technique < 10 || yuma.mobility < 8 || yuma.special < 9) {
        throw new Error('Yuma characteristics validation failed');
      }
      console.log(`    ✓ 空閑遊真: 超高技術(${yuma.technique}), 高機動力(${yuma.mobility}), 超高特殊戦術(${yuma.special})`);
      
      // 迅の特徴確認  
      if (jin.command < 8 || jin.special !== 12 || jin.technique < 9) {
        throw new Error('Jin characteristics validation failed');
      }
      console.log(`    ✓ 迅悠一: 高指揮(${jin.command}), 最高特殊戦術(${jin.special}), 高技術(${jin.technique})`);

      // 5. クラス特性との整合性テスト
      console.log('  🏷️ Testing class tendencies...');
      
      Object.entries(CLASS_STAT_TENDENCIES).forEach(([charClass, tendency]) => {
        console.log(`    ${charClass}: ${tendency.description}`);
        console.log(`      重要ステータス: ${tendency.focus.join(', ')}`);
      });

      // 6. ゲーム内ステータス変換のテスト
      console.log('  🎮 Testing game stat conversion...');
      
      Object.entries(CHARACTER_PRESETS).forEach(([charType, preset]) => {
        const originalStats = preset.stats.originalStats!;
        
        // 攻撃力と防御力の計算確認
        const expectedAttack = TrionCalculator.calculateAttackPower(originalStats.technique, originalStats.mobility);
        const expectedDefense = TrionCalculator.calculateDefense(originalStats.mobility, originalStats.technique);
        
        console.log(`    ${preset.name}:`);
        console.log(`      攻撃力: ${preset.stats.attackPower} (計算値: ${expectedAttack})`);
        console.log(`      防御力: ${preset.stats.defense} (計算値: ${expectedDefense})`);
        
        if (preset.stats.attackPower !== expectedAttack || preset.stats.defense !== expectedDefense) {
          throw new Error(`Stat conversion failed for ${preset.name}`);
        }
      });

      console.log('✅ OriginalStats Test Passed');
      return true;
      
    } catch (error) {
      console.error('❌ OriginalStats Test Failed:', error);
      return false;
    }
  }
}

/**
 * ステータス比較とバランス分析
 */
export class StatBalanceAnalysis {
  static run(): void {
    console.log('\n📈 ORIGINAL STATS BALANCE ANALYSIS');
    console.log('===================================\n');

    console.log('🎭 キャラクター特性分析:');
    
    Object.entries(CHARACTER_PRESETS).forEach(([charType, preset]) => {
      const original = preset.stats.originalStats!;
      
      console.log(`\n  ${preset.name} (${preset.class}):`);
      console.log(`    🎯 戦闘スタイル: ${this.analyzeStyle(original)}`);
      console.log(`    ⚡ トリオン: ${original.trion}/12 [${TrionCalculator.getTrionRank(original.trion)}] → ${preset.stats.trionCapacity}`);
      console.log(`    🏃 機動力: ${original.mobility}/12 [${StatDisplayUtils.getStatRank(original.mobility)}]`);
      console.log(`    🎯 技術: ${original.technique}/12 [${StatDisplayUtils.getStatRank(original.technique)}]`);
      console.log(`    📏 射程: ${original.range}/12 [${StatDisplayUtils.getStatRank(original.range)}]`);
      console.log(`    👥 指揮: ${original.command}/12 [${StatDisplayUtils.getStatRank(original.command)}]`);
      console.log(`    ✨ 特殊戦術: ${original.special}/12 [${StatDisplayUtils.getStatRank(original.special)}]`);
      console.log(`    📊 総合評価: ${this.getTotalRating(original)}`);
    });

    console.log('\n⚖️ バランス分析:');
    console.log('  • 雨取千佳: トリオン量で圧倒的優位、機動力が弱点');
    console.log('  • 空閑遊真: 技術と機動力に秀でた近接戦のエキスパート');
    console.log('  • 迅悠一: サイドエフェクトによる特殊戦術の専門家');
    console.log('  • AIエネミー: 標準的なB級隊員レベルのバランス型');

    console.log('\n🎮 ゲーム内での戦略的意味:');
    console.log('  1. トリオン係数システムにより原作の特徴を忠実再現');
    console.log('  2. 各キャラクターに明確な役割と戦術的アイデンティティ');
    console.log('  3. 弱点と強みのバランスによる戦略性の向上');
    console.log('  4. 原作ファンが納得する数値設定と表現');

    console.log('\n🔢 トリオン係数の効果:');
    for (let i = 0; i <= 12; i++) {
      const capacity = TrionCalculator.calculateTrionCapacity(i);
      const rank = TrionCalculator.getTrionRank(i);
      console.log(`    係数${i.toString().padStart(2)}: ${capacity.toString().padStart(3)} [${rank}] ${StatDisplayUtils.getStarRating(i)}`);
    }
  }

  private static analyzeStyle(stats: any): string {
    if (stats.trion >= 10) return '圧倒的物量戦';
    if (stats.technique >= 10 && stats.mobility >= 8) return '技巧派アタッカー';
    if (stats.range >= 8) return '遠距離狙撃手';
    if (stats.special >= 10) return '特殊戦術の専門家';
    if (stats.command >= 7) return 'チーム戦術指揮官';
    return 'バランス型';
  }

  private static getTotalRating(stats: any): string {
    const total = stats.mobility + stats.technique + stats.range + stats.command + stats.special + stats.trion;
    if (total >= 60) return 'S級レベル';
    if (total >= 45) return 'A級レベル';
    if (total >= 30) return 'B級レベル';
    return 'C級レベル';
  }
}

// エクスポート用のメイン関数
export function runOriginalStatsValidation(): void {
  console.log('🔧 ORIGINAL STATS SYSTEM VALIDATION');
  console.log('====================================\n');
  
  // 基本機能テスト
  const testResult = OriginalStatsTest.run();
  
  // バランス分析
  StatBalanceAnalysis.run();
  
  // 最終判定
  if (testResult) {
    console.log('\n🎉 ORIGINAL STATS SYSTEM VALIDATION PASSED');
    console.log('Original-based stats system is functioning correctly.');
    console.log('Characters now reflect authentic World Trigger statistics.');
  } else {
    console.log('\n⚠️  ORIGINAL STATS SYSTEM VALIDATION FAILED');
    console.log('Some issues were detected. Please review and fix.');
  }
}