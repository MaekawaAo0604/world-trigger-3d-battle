import { TriggerType, TRIGGER_DEFINITIONS, TriggerSet } from '../triggers/TriggerDefinitions';

/**
 * トリガーメニューUI管理クラス
 */
export class TriggerMenu {
  private menuElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private currentTriggerSet: TriggerSet;
  private onTriggerSetChange: ((triggerSet: TriggerSet) => void) | null = null;
  private maxTrion: number = 100; // デフォルト値
  private costDisplayElement: HTMLElement | null = null;

  constructor(initialTriggerSet: TriggerSet) {
    this.currentTriggerSet = { ...initialTriggerSet };
    this.createMenu();
  }

  /**
   * メニューUIを作成
   */
  private createMenu(): void {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'trigger-menu';
    this.menuElement.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 800px;
      height: 600px;
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #444;
      border-radius: 10px;
      z-index: 10000;
      display: none;
      color: white;
      font-family: Arial, sans-serif;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
    `;

    // タイトルとコスト表示
    const headerArea = document.createElement('div');
    headerArea.style.cssText = `
      padding: 20px;
      border-bottom: 1px solid #555;
      background: rgba(40, 40, 50, 0.8);
      border-radius: 8px 8px 0 0;
    `;

    const title = document.createElement('h2');
    title.textContent = 'トリガーセット編集';
    title.style.cssText = `
      margin: 0 0 10px 0;
      text-align: center;
    `;

    // コスト表示エリア
    this.costDisplayElement = document.createElement('div');
    this.costDisplayElement.style.cssText = `
      text-align: center;
      font-size: 16px;
      font-weight: bold;
    `;
    this.updateCostDisplay();

    headerArea.appendChild(title);
    headerArea.appendChild(this.costDisplayElement);
    this.menuElement.appendChild(headerArea);

    // メインコンテンツエリア
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
      display: flex;
      height: calc(100% - 140px);
      padding: 20px;
      gap: 20px;
    `;

    // 左側：現在のトリガーセット
    const currentSetArea = this.createCurrentSetArea();
    
    // 右側：利用可能なトリガー一覧
    const availableTriggersArea = this.createAvailableTriggersArea();

    contentArea.appendChild(currentSetArea);
    contentArea.appendChild(availableTriggersArea);
    this.menuElement.appendChild(contentArea);

    // 下部：ボタンエリア
    const buttonArea = document.createElement('div');
    buttonArea.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 20px;
      padding: 20px;
      border-top: 1px solid #555;
    `;

    const applyButton = document.createElement('button');
    applyButton.textContent = '適用';
    applyButton.style.cssText = `
      padding: 10px 30px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    `;
    applyButton.onclick = () => this.applyChanges();

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'キャンセル';
    cancelButton.style.cssText = `
      padding: 10px 30px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    `;
    cancelButton.onclick = () => this.close();

    buttonArea.appendChild(applyButton);
    buttonArea.appendChild(cancelButton);
    this.menuElement.appendChild(buttonArea);

    document.body.appendChild(this.menuElement);
  }

  /**
   * 現在のトリガーセット表示エリアを作成
   */
  private createCurrentSetArea(): HTMLElement {
    const area = document.createElement('div');
    area.style.cssText = `
      flex: 1;
      background: rgba(30, 30, 40, 0.8);
      border-radius: 8px;
      padding: 15px;
    `;

    const title = document.createElement('h3');
    title.textContent = '現在のトリガーセット';
    title.style.cssText = `
      margin: 0 0 15px 0;
      color: #ffcc00;
      text-align: center;
    `;
    area.appendChild(title);

    const slotsContainer = document.createElement('div');
    slotsContainer.id = 'current-trigger-slots';
    
    const slots = ['main', 'sub', 'optional1', 'optional2'];
    const slotNames = ['メイン（右手）', 'サブ（左手）', 'オプション1', 'オプション2'];

    slots.forEach((slot, index) => {
      const slotDiv = document.createElement('div');
      slotDiv.style.cssText = `
        margin-bottom: 15px;
        padding: 10px;
        border: 1px solid #555;
        border-radius: 5px;
        background: rgba(40, 40, 50, 0.6);
        cursor: pointer;
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;
      
      slotDiv.onclick = () => this.clearSlot(slot as keyof TriggerSet);

      const slotLabel = document.createElement('div');
      slotLabel.style.cssText = `
        font-weight: bold;
        color: #aaa;
      `;
      slotLabel.textContent = slotNames[index];

      const triggerInfo = document.createElement('div');
      triggerInfo.id = `slot-${slot}`;
      triggerInfo.style.cssText = `
        text-align: right;
        flex: 1;
        margin-left: 10px;
      `;

      slotDiv.appendChild(slotLabel);
      slotDiv.appendChild(triggerInfo);
      slotsContainer.appendChild(slotDiv);
    });

    area.appendChild(slotsContainer);
    return area;
  }

  /**
   * 利用可能なトリガー一覧エリアを作成
   */
  private createAvailableTriggersArea(): HTMLElement {
    const area = document.createElement('div');
    area.style.cssText = `
      flex: 1;
      background: rgba(30, 30, 40, 0.8);
      border-radius: 8px;
      padding: 15px;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = '利用可能なトリガー';
    title.style.cssText = `
      margin: 0 0 15px 0;
      color: #ffcc00;
      text-align: center;
    `;
    area.appendChild(title);

    // カテゴリ別にトリガーを表示
    const categories = {
      'attacker': 'アタッカー',
      'shooter': 'シューター', 
      'sniper': 'スナイパー',
      'gunner': 'ガンナー',
      'defense': '防御',
      'optional': '補助'
    };

    Object.entries(categories).forEach(([category, categoryName]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.style.cssText = `
        margin-bottom: 20px;
      `;

      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = categoryName;
      categoryTitle.style.cssText = `
        margin: 0 0 10px 0;
        color: #66ccff;
        border-bottom: 1px solid #555;
        padding-bottom: 5px;
      `;
      categoryDiv.appendChild(categoryTitle);

      // このカテゴリのトリガーを表示
      Object.values(TriggerType).forEach(triggerType => {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        if (definition.category === category) {
          const triggerDiv = document.createElement('div');
          triggerDiv.style.cssText = `
            padding: 8px;
            margin-bottom: 5px;
            background: rgba(50, 50, 60, 0.8);
            border-radius: 3px;
            cursor: pointer;
            border: 1px solid transparent;
          `;
          
          triggerDiv.onmouseover = () => {
            triggerDiv.style.borderColor = '#66ccff';
            triggerDiv.style.background = 'rgba(70, 70, 80, 0.8)';
          };
          
          triggerDiv.onmouseout = () => {
            triggerDiv.style.borderColor = 'transparent';
            triggerDiv.style.background = 'rgba(50, 50, 60, 0.8)';
          };

          triggerDiv.onclick = () => this.showTriggerAssignMenu(triggerType);

          const triggerName = document.createElement('div');
          triggerName.textContent = definition.name;
          triggerName.style.cssText = `
            font-weight: bold;
            margin-bottom: 3px;
          `;

          const triggerDesc = document.createElement('div');
          triggerDesc.textContent = definition.description;
          triggerDesc.style.cssText = `
            font-size: 12px;
            color: #ccc;
          `;

          triggerDiv.appendChild(triggerName);
          triggerDiv.appendChild(triggerDesc);
          categoryDiv.appendChild(triggerDiv);
        }
      });

      area.appendChild(categoryDiv);
    });

    return area;
  }

  /**
   * トリガー割り当てメニューを表示
   */
  private showTriggerAssignMenu(triggerType: TriggerType): void {
    const assignMenu = document.createElement('div');
    assignMenu.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(40, 40, 50, 0.95);
      border: 2px solid #666;
      border-radius: 8px;
      padding: 20px;
      z-index: 10001;
      color: white;
    `;

    const title = document.createElement('h3');
    title.textContent = `${TRIGGER_DEFINITIONS[triggerType].name}を割り当て`;
    title.style.cssText = `
      margin: 0 0 15px 0;
      text-align: center;
    `;
    assignMenu.appendChild(title);

    const slots = [
      { key: 'main', name: 'メイン（右手）' },
      { key: 'sub', name: 'サブ（左手）' },
      { key: 'optional1', name: 'オプション1' },
      { key: 'optional2', name: 'オプション2' }
    ];

    slots.forEach(slot => {
      const button = document.createElement('button');
      button.textContent = slot.name;
      button.style.cssText = `
        display: block;
        width: 100%;
        padding: 10px;
        margin-bottom: 10px;
        background: #555;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      `;
      
      button.onclick = () => {
        this.assignTriggerToSlot(triggerType, slot.key as keyof TriggerSet);
        document.body.removeChild(assignMenu);
      };

      assignMenu.appendChild(button);
    });

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'キャンセル';
    cancelButton.style.cssText = `
      display: block;
      width: 100%;
      padding: 10px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    `;
    cancelButton.onclick = () => document.body.removeChild(assignMenu);

    assignMenu.appendChild(cancelButton);
    document.body.appendChild(assignMenu);
  }

  /**
   * トリガーをスロットに割り当て
   */
  private assignTriggerToSlot(triggerType: TriggerType, slot: keyof TriggerSet): void {
    this.currentTriggerSet[slot] = triggerType;
    this.updateCurrentSetDisplay();
  }

  /**
   * スロットをクリア
   */
  private clearSlot(slot: keyof TriggerSet): void {
    this.currentTriggerSet[slot] = null;
    this.updateCurrentSetDisplay();
  }

  /**
   * 現在のセット表示を更新
   */
  private updateCurrentSetDisplay(): void {
    const slots = ['main', 'sub', 'optional1', 'optional2'];
    
    slots.forEach(slot => {
      const element = document.getElementById(`slot-${slot}`);
      if (element) {
        const triggerType = this.currentTriggerSet[slot as keyof TriggerSet];
        if (triggerType) {
          const definition = TRIGGER_DEFINITIONS[triggerType];
          element.innerHTML = `
            <div style="font-weight: bold;">${definition.name}</div>
            <div style="font-size: 12px; color: #ccc;">${definition.description}</div>
            <div style="font-size: 11px; color: #ffaa00;">コスト: ${definition.setCost}</div>
          `;
        } else {
          element.innerHTML = `
            <div style="color: #666; font-style: italic;">未設定</div>
          `;
        }
      }
    });
    
    // コスト表示を更新
    this.updateCostDisplay();
  }

  /**
   * メニューを開く
   */
  open(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'block';
      this.isOpen = true;
      this.updateCurrentSetDisplay();
    }
  }

  /**
   * メニューを閉じる
   */
  close(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
      this.isOpen = false;
    }
  }

  /**
   * 変更を適用
   */
  private applyChanges(): void {
    if (this.onTriggerSetChange) {
      this.onTriggerSetChange(this.currentTriggerSet);
    }
    this.close();
  }

  /**
   * トリガーセット変更コールバックを設定
   */
  setOnTriggerSetChange(callback: (triggerSet: TriggerSet) => void): void {
    this.onTriggerSetChange = callback;
  }

  /**
   * 最大トリオン値を設定
   */
  setMaxTrion(maxTrion: number): void {
    this.maxTrion = maxTrion;
    this.updateCostDisplay();
  }

  /**
   * コスト表示を更新
   */
  private updateCostDisplay(): void {
    if (!this.costDisplayElement) return;

    const totalCost = this.calculateTotalCost();
    const isAffordable = totalCost <= this.maxTrion;
    
    this.costDisplayElement.innerHTML = `
      <span>セットコスト: ${totalCost} / ${this.maxTrion}</span>
      <span style="color: ${isAffordable ? '#4CAF50' : '#F44336'}; margin-left: 10px;">
        ${isAffordable ? '✓ 装備可能' : '✗ トリオン不足'}
      </span>
    `;
  }

  /**
   * 現在のトリガーセットの総コストを計算
   */
  private calculateTotalCost(): number {
    let totalCost = 0;
    
    const allSlots = [
      this.currentTriggerSet.slot1, this.currentTriggerSet.slot2,
      this.currentTriggerSet.slot3, this.currentTriggerSet.slot4,
      this.currentTriggerSet.c1, this.currentTriggerSet.c2,
      this.currentTriggerSet.c3, this.currentTriggerSet.c4
    ];
    
    for (const triggerType of allSlots) {
      if (triggerType) {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        totalCost += definition.setCost;
      }
    }
    
    return totalCost;
  }

  /**
   * 現在のセットが装備可能かチェック
   */
  private isCurrentSetAffordable(): boolean {
    return this.calculateTotalCost() <= this.maxTrion;
  }

  /**
   * 現在のトリガーセットを更新
   */
  updateTriggerSet(triggerSet: TriggerSet): void {
    this.currentTriggerSet = { ...triggerSet };
    this.updateCurrentSetDisplay();
  }

  /**
   * メニューが開いているかどうか
   */
  isMenuOpen(): boolean {
    return this.isOpen;
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    if (this.menuElement && this.menuElement.parentNode) {
      this.menuElement.parentNode.removeChild(this.menuElement);
    }
  }
}