import { TriggerType } from '../triggers/TriggerDefinitions';

/**
 * 分割可能なシューター弾用コンポーネント（アステロイド、バイパーなど）
 */
export class SplittingTrigger {
  public triggerType: TriggerType;
  public currentSplitLevel: number = 1; // 1=4分割, 2=9分割, 3=16分割
  public maxSplitLevel: number = 3;
  public cubeSize: number = 1.0; // トリオン量に基づくサイズ
  public isGenerated: boolean = false;
  public cubeEntities: Map<number, any> = new Map(); // 分割されたキューブの管理

  constructor(triggerType: TriggerType) {
    this.triggerType = triggerType;
  }

  /**
   * 分割数を取得
   */
  getSplitCount(): number {
    switch (this.currentSplitLevel) {
      case 1: return 4;   // 2x2
      case 2: return 9;   // 3x3
      case 3: return 16;  // 4x4
      default: return 4;
    }
  }

  /**
   * 一発当たりのダメージ倍率
   */
  getDamageMultiplier(): number {
    const splitCount = this.getSplitCount();
    // 総ダメージは一定、分割数で割る
    return 1.0 / splitCount;
  }

  /**
   * 次の分割レベルに進む
   */
  nextSplitLevel(): boolean {
    if (this.currentSplitLevel < this.maxSplitLevel) {
      this.currentSplitLevel++;
      return true;
    }
    return false;
  }

  /**
   * 分割をリセット
   */
  resetSplit(): void {
    this.currentSplitLevel = 1;
  }

  /**
   * トリオン量に基づいてキューブサイズを設定
   */
  setTrionBasedSize(trionRatio: number): void {
    // トリオン量に比例してサイズを決定（0.5倍～1.5倍）
    this.cubeSize = 0.5 + (trionRatio * 1.0);
  }

  /**
   * 分割可能かどうか
   */
  canSplit(): boolean {
    return this.currentSplitLevel < this.maxSplitLevel;
  }
}