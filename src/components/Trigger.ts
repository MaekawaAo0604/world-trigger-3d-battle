import { TriggerType, TriggerSet, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';

/**
 * トリガーの状態
 */
export interface TriggerState {
  type: TriggerType;
  active: boolean;
  cooldownRemaining: number;
  ammo?: number;  // 一部のトリガー用
}

/**
 * トリガーを管理するコンポーネント
 */
export class Trigger {
  public triggerSet: TriggerSet;
  public states: Map<TriggerType, TriggerState> = new Map();
  public currentSlot: number = 1;  // 現在選択中のスロット番号 (1-4 or C1-C4)
  public currentTrigger: TriggerType | null = null;
  public lastGeneratedTrigger: TriggerType | null = null; // 最後に生成された武器のトリガー
  public weaponGenerated: boolean = false; // 武器が生成されているか
  public leftCurrentSlot: number = 2;  // 左手のスロット番号
  public leftCurrentTrigger: TriggerType | null = null;
  public leftWeaponGenerated: boolean = false; // 左手武器が生成されているか

  constructor(triggerSet: TriggerSet, character?: any) {
    this.triggerSet = { ...triggerSet };
    this.initializeStates();
    this.updateCurrentTriggers();
    
    // 初期セットコストを適用（キャラクターが提供された場合）
    if (character) {
      this.consumeSetCost(character);
    }
  }

  /**
   * トリガーの状態を初期化
   */
  private initializeStates(): void {
    const triggers = [
      this.triggerSet.slot1,
      this.triggerSet.slot2,
      this.triggerSet.slot3,
      this.triggerSet.slot4,
      this.triggerSet.c1,
      this.triggerSet.c2,
      this.triggerSet.c3,
      this.triggerSet.c4
    ].filter(t => t !== null) as TriggerType[];

    for (const triggerType of triggers) {
      this.states.set(triggerType, {
        type: triggerType,
        active: false,
        cooldownRemaining: 0,
        ammo: this.getDefaultAmmo(triggerType)
      });
    }
  }

  /**
   * デフォルトの弾数を取得
   */
  private getDefaultAmmo(type: TriggerType): number | undefined {
    const definition = TRIGGER_DEFINITIONS[type];
    switch (definition.category) {
      case 'sniper':
        return 10;
      case 'gunner':
        return 30;
      default:
        return undefined;
    }
  }

  /**
   * スロットを選択
   */
  selectSlot(slot: number): boolean {
    if (slot < 1 || slot > 4) return false;

    const triggerType = this.getTriggerAtSlot(slot);
    if (!triggerType) return false;

    const state = this.states.get(triggerType);
    if (!state || state.cooldownRemaining > 0) return false;

    // 現在のトリガーを非アクティブに
    if (this.currentTrigger) {
      const currentState = this.states.get(this.currentTrigger);
      if (currentState) {
        currentState.active = false;
      }
    }

    // 新しいトリガーをアクティブに
    this.currentTrigger = triggerType;
    state.active = true;
    this.currentSlot = slot;

    // スナイパー以外は切り替えクールダウンを設定（2秒）
    const definition = TRIGGER_DEFINITIONS[triggerType];
    if (definition.category !== 'sniper') {
      state.cooldownRemaining = 2.0;
    } else {
      state.cooldownRemaining = 0; // スナイパーはすぐに使用可能
    }

    return true;
  }

  /**
   * 左手Cスロットを選択 (1-4キー用) - 左手はC1-C4専用
   */
  selectLeftSlot(slot: number): boolean {
    console.log(`Attempting to select left C-slot ${slot}`);
    if (slot < 1 || slot > 4) {
      console.log(`Invalid C-slot number: ${slot}`);
      return false;
    }

    const triggerType = this.getTriggerAtCSlot(slot);
    console.log(`Trigger at C-slot ${slot}:`, triggerType);
    console.log('Current triggerSet C-slots:', {
      c1: this.triggerSet.c1,
      c2: this.triggerSet.c2,
      c3: this.triggerSet.c3,
      c4: this.triggerSet.c4
    });
    if (!triggerType) {
      console.log(`No trigger found at C-slot ${slot}`);
      return false;
    }

    const state = this.states.get(triggerType);
    console.log(`Trigger state:`, state);
    if (!state || state.cooldownRemaining > 0) {
      console.log(`Trigger not available: state=${!!state}, cooldown=${state?.cooldownRemaining || 'N/A'}`);
      return false;
    }

    // 現在の左手トリガーを非アクティブに
    if (this.leftCurrentTrigger) {
      const currentState = this.states.get(this.leftCurrentTrigger);
      if (currentState) {
        // 右手と左手で同じトリガーが選択されている場合はスキップ
        if (this.leftCurrentTrigger !== this.currentTrigger) {
          currentState.active = false;
        }
      }
    }

    // 新しい左手トリガーをアクティブに
    this.leftCurrentTrigger = triggerType;
    this.leftCurrentSlot = slot + 4; // C1-C4 は 5-8 として記録

    // 右手と異なるトリガーの場合のみアクティブ状態を変更
    if (triggerType !== this.currentTrigger) {
      state.active = true;
      // 切り替えクールダウンを設定（1秒）
      state.cooldownRemaining = 1.0;
    }

    console.log(`Left hand C-trigger selected: C${slot}, trigger: ${triggerType}`);
    return true;
  }


  /**
   * トリガーを使用
   */
  useTrigger(): boolean {
    if (!this.currentTrigger) return false;

    const state = this.states.get(this.currentTrigger);
    if (!state || !state.active || state.cooldownRemaining > 0) return false;

    const definition = TRIGGER_DEFINITIONS[this.currentTrigger];

    // 弾数チェック
    if (state.ammo !== undefined && state.ammo <= 0) {
      return false;
    }

    // 使用
    if (state.ammo !== undefined) {
      state.ammo--;
    }
    state.cooldownRemaining = definition.cooldown;

    return true;
  }

  /**
   * クールダウンを更新
   */
  updateCooldowns(deltaTime: number): void {
    for (const state of this.states.values()) {
      if (state.cooldownRemaining > 0) {
        state.cooldownRemaining = Math.max(0, state.cooldownRemaining - deltaTime);
      }
    }
  }

  /**
   * トリオンコストを計算
   */
  getTrionCost(): number {
    if (!this.currentTrigger) return 0;
    return TRIGGER_DEFINITIONS[this.currentTrigger].trionCost;
  }

  /**
   * アクティブなトリガーの情報を取得
   */
  getActiveTriggerInfo() {
    if (!this.currentTrigger) return null;
    
    const state = this.states.get(this.currentTrigger);
    const definition = TRIGGER_DEFINITIONS[this.currentTrigger];
    
    return {
      ...definition,
      state: state,
      canUse: state && state.active && state.cooldownRemaining <= 0 && 
              (state.ammo === undefined || state.ammo > 0)
    };
  }

  /**
   * 弾薬を補充
   */
  reloadAmmo(triggerType?: TriggerType): void {
    if (triggerType) {
      const state = this.states.get(triggerType);
      if (state && state.ammo !== undefined) {
        state.ammo = this.getDefaultAmmo(triggerType) || 0;
      }
    } else {
      // 全トリガーの弾薬を補充
      for (const [type, state] of this.states) {
        if (state.ammo !== undefined) {
          state.ammo = this.getDefaultAmmo(type) || 0;
        }
      }
    }
  }

  /**
   * スロットのトリガーを取得
   */
  getTriggerAtSlot(slot: number): TriggerType | null {
    const triggers = [
      this.triggerSet.slot1,
      this.triggerSet.slot2,
      this.triggerSet.slot3,
      this.triggerSet.slot4
    ];
    return triggers[slot - 1] || null;
  }

  /**
   * Cスロットのトリガーを取得
   */
  getTriggerAtCSlot(slot: number): TriggerType | null {
    const triggers = [
      this.triggerSet.c1,
      this.triggerSet.c2,
      this.triggerSet.c3,
      this.triggerSet.c4
    ];
    return triggers[slot - 1] || null;
  }

  /**
   * 現在のトリガーを更新
   */
  updateCurrentTriggers(): void {
    // メイントリガーをスロット1に設定
    this.currentTrigger = this.getTriggerAtSlot(1);
    this.currentSlot = 1;
    
    // 左手トリガーは初期化時は設定しない（プレイヤーが手動で選択）
    this.leftCurrentTrigger = null;
    this.leftCurrentSlot = 0;
    
    // 状態をアクティブに
    if (this.currentTrigger) {
      const state = this.states.get(this.currentTrigger);
      if (state) {
        state.active = true;
      }
    }
  }

  /**
   * 武器を生成（アタッカー・スナイパー・ガンナートリガー）
   */
  generateWeapon(): boolean {
    if (!this.currentTrigger) return false;
    
    const definition = TRIGGER_DEFINITIONS[this.currentTrigger];
    console.log(`🔫 右手武器生成: ${this.currentTrigger} (カテゴリ: ${definition.category})`);
    
    if (definition.category !== 'attacker' && definition.category !== 'sniper' && definition.category !== 'gunner') return false;
    
    if (this.weaponGenerated) return false; // 既に生成済み
    
    // スナイパー武器生成時はクールダウンをリセット（すぐに撃てるように）
    if (definition.category === 'sniper') {
      const state = this.states.get(this.currentTrigger);
      if (state) {
        console.log('Resetting sniper cooldown from', state.cooldownRemaining, 'to 0');
        state.cooldownRemaining = 0;
      } else {
        console.log('No state found for sniper trigger:', this.currentTrigger);
      }
    }
    
    this.weaponGenerated = true;
    return true;
  }

  /**
   * 武器攻撃を実行（武器生成後のみ）
   */
  useWeaponAttack(): boolean {
    if (!this.currentTrigger || !this.weaponGenerated) return false;
    
    const definition = TRIGGER_DEFINITIONS[this.currentTrigger];
    if (definition.category !== 'attacker') return false;
    
    const state = this.states.get(this.currentTrigger);
    if (!state || !state.active || state.cooldownRemaining > 0) return false;
    
    // 武器攻撃はクールダウンのみ適用
    state.cooldownRemaining = definition.cooldown;
    return true;
  }

  /**
   * 武器を解除
   */
  dismissWeapon(): void {
    this.weaponGenerated = false;
    this.lastGeneratedTrigger = null;
  }

  /**
   * 左手武器を生成
   */
  generateLeftWeapon(): boolean {
    if (!this.leftCurrentTrigger) return false;
    
    const definition = TRIGGER_DEFINITIONS[this.leftCurrentTrigger];
    console.log(`🔫 左手武器生成: ${this.leftCurrentTrigger} (カテゴリ: ${definition.category})`);
    
    // 左手でも様々なカテゴリのトリガーを生成可能
    if (definition.category !== 'attacker' && 
        definition.category !== 'sniper' && 
        definition.category !== 'gunner' && 
        definition.category !== 'shooter') return false;
    
    if (this.leftWeaponGenerated) return false; // 既に生成済み
    
    // スナイパー武器生成時はクールダウンをリセット（すぐに撃てるように）
    if (definition.category === 'sniper') {
      const state = this.states.get(this.leftCurrentTrigger);
      if (state) {
        console.log('Resetting left sniper cooldown from', state.cooldownRemaining, 'to 0');
        state.cooldownRemaining = 0;
      }
    }
    
    this.leftWeaponGenerated = true;
    return true;
  }

  /**
   * 左手武器攻撃を実行
   */
  useLeftWeaponAttack(): boolean {
    if (!this.leftCurrentTrigger || !this.leftWeaponGenerated) return false;
    
    const definition = TRIGGER_DEFINITIONS[this.leftCurrentTrigger];
    // 左手でも様々なカテゴリの攻撃が可能
    if (definition.category !== 'attacker' && 
        definition.category !== 'sniper' && 
        definition.category !== 'gunner' && 
        definition.category !== 'shooter') return false;
    
    const state = this.states.get(this.leftCurrentTrigger);
    if (!state || state.cooldownRemaining > 0) return false;
    
    // 左手武器攻撃はクールダウンのみ適用
    state.cooldownRemaining = definition.cooldown;
    return true;
  }

  /**
   * 左手武器を解除
   */
  dismissLeftWeapon(): void {
    this.leftWeaponGenerated = false;
  }

  /**
   * 左手武器生成のトリオンコストを取得
   */
  getLeftWeaponGenerationCost(): number {
    if (!this.leftCurrentTrigger) return 0;
    
    const definition = TRIGGER_DEFINITIONS[this.leftCurrentTrigger];
    if (definition.category !== 'attacker' && 
        definition.category !== 'sniper' && 
        definition.category !== 'gunner' && 
        definition.category !== 'shooter') return 0;
    
    return definition.trionCost;
  }

  /**
   * 武器生成のトリオンコストを取得
   */
  getWeaponGenerationCost(): number {
    if (!this.currentTrigger) return 0;
    
    const definition = TRIGGER_DEFINITIONS[this.currentTrigger];
    if (definition.category !== 'attacker' && definition.category !== 'sniper' && definition.category !== 'gunner') return 0;
    
    return definition.trionCost;
  }

  /**
   * トリガーセット全体のセットコストを計算
   */
  getTriggerSetCost(): number {
    let totalCost = 0;
    
    // メインスロット（1-4）
    [this.triggerSet.slot1, this.triggerSet.slot2, this.triggerSet.slot3, this.triggerSet.slot4].forEach(triggerType => {
      if (triggerType) {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        totalCost += definition.setCost;
      }
    });
    
    // Cスロット（C1-C4）
    [this.triggerSet.c1, this.triggerSet.c2, this.triggerSet.c3, this.triggerSet.c4].forEach(triggerType => {
      if (triggerType) {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        totalCost += definition.setCost;
      }
    });
    
    return totalCost;
  }

  /**
   * 特定のトリガーセットが装備可能かチェック
   */
  canAffordTriggerSet(triggerSet: any, maxTrion: number): boolean {
    let totalCost = 0;
    
    // 全スロットのコストを計算
    const allSlots = [
      triggerSet.slot1, triggerSet.slot2, triggerSet.slot3, triggerSet.slot4,
      triggerSet.c1, triggerSet.c2, triggerSet.c3, triggerSet.c4
    ];
    
    for (const triggerType of allSlots) {
      if (triggerType) {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        totalCost += definition.setCost;
      }
    }
    
    return totalCost <= maxTrion;
  }

  /**
   * トリガーセットのセットコストを消費（最大トリオンから引く）
   */
  consumeSetCost(character: any): boolean {
    const totalCost = this.getTriggerSetCost();
    
    if (character.stats.trionCapacity < totalCost) {
      return false; // トリオン不足
    }
    
    // 最大トリオンから引く（永続的な消費）
    character.stats.trionCapacity -= totalCost;
    
    // 現在トリオンも上限に合わせて調整
    if (character.stats.currentTrion > character.stats.trionCapacity) {
      character.stats.currentTrion = character.stats.trionCapacity;
    }
    
    return true;
  }

  /**
   * 前のトリガーセットのコストを返還
   */
  refundPreviousSetCost(character: any, previousTriggerSet: any): void {
    let previousCost = 0;
    
    const allSlots = [
      previousTriggerSet.slot1, previousTriggerSet.slot2, 
      previousTriggerSet.slot3, previousTriggerSet.slot4,
      previousTriggerSet.c1, previousTriggerSet.c2, 
      previousTriggerSet.c3, previousTriggerSet.c4
    ];
    
    for (const triggerType of allSlots) {
      if (triggerType) {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        previousCost += definition.setCost;
      }
    }
    
    // 最大トリオンに返還
    character.stats.trionCapacity += previousCost;
  }
}