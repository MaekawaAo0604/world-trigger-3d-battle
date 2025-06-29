import { CharacterType } from '../components/Character';
import { TriggerSet } from '../triggers/TriggerDefinitions';

/**
 * 選択状態のデータ構造
 */
interface SelectionState {
  character: CharacterType | null;
  triggerSet: TriggerSet;
  timestamp: number;
}

/**
 * 選択状態の管理クラス
 * キャラクター・トリガー選択の状態を保存・復元する
 */
export class SelectionStateManager {
  private static readonly STORAGE_KEY = 'worldTrigger3D_selectionState';

  /**
   * 選択状態を保存
   */
  static saveSelection(character: CharacterType, triggerSet: TriggerSet): void {
    try {
      const state: SelectionState = {
        character,
        triggerSet: { ...triggerSet },
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      console.log(`SelectionStateManager: Saved selection - ${character}`);
    } catch (error) {
      console.warn('SelectionStateManager: Failed to save selection state:', error);
    }
  }

  /**
   * 選択状態を読み込み
   */
  static loadSelection(): { character: CharacterType | null; triggerSet: TriggerSet } | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const state: SelectionState = JSON.parse(saved);
      
      // 24時間以上古い場合は無効とする
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      if (Date.now() - state.timestamp > maxAge) {
        this.clearSelection();
        return null;
      }

      console.log(`SelectionStateManager: Loaded selection - ${state.character}`);
      return {
        character: state.character,
        triggerSet: state.triggerSet
      };
    } catch (error) {
      console.warn('SelectionStateManager: Failed to load selection state:', error);
      return null;
    }
  }

  /**
   * 選択状態をクリア
   */
  static clearSelection(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('SelectionStateManager: Selection state cleared');
    } catch (error) {
      console.warn('SelectionStateManager: Failed to clear selection state:', error);
    }
  }

  /**
   * 保存された状態があるかチェック
   */
  static hasSavedSelection(): boolean {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return false;

      const state: SelectionState = JSON.parse(saved);
      const maxAge = 24 * 60 * 60 * 1000;
      
      return Date.now() - state.timestamp <= maxAge;
    } catch (error) {
      return false;
    }
  }

  /**
   * デフォルトのトリガーセットを取得
   */
  static getDefaultTriggerSet(): TriggerSet {
    return {
      slot1: null,
      slot2: null,
      slot3: null,
      slot4: null,
      c1: null,
      c2: null,
      c3: null,
      c4: null
    };
  }
}