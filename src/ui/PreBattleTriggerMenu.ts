import { TriggerType, TRIGGER_DEFINITIONS, TriggerSet, CLASS_TRIGGER_SETS } from '../triggers/TriggerDefinitions';
import { CharacterClass } from '../components/Character';

/**
 * 戦闘開始前のトリガーセット選択UI
 */
export class PreBattleTriggerMenu {
  private menuElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private currentTriggerSet: TriggerSet;
  private onStartBattle: ((triggerSet: TriggerSet) => void) | null = null;
  private selectedClass: CharacterClass = CharacterClass.ALL_ROUNDER;

  constructor() {
    this.currentTriggerSet = { ...CLASS_TRIGGER_SETS[CharacterClass.ALL_ROUNDER] };
    this.createMenu();
  }

  /**
   * メニューUIを作成
   */
  private createMenu(): void {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'pre-battle-trigger-menu';
    this.menuElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(10, 15, 35, 0.95), rgba(25, 30, 50, 0.95));
      z-index: 15000;
      display: none;
      color: white;
      font-family: 'Arial', sans-serif;
      overflow-y: auto;
    `;

    // メインコンテナ
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    `;

    // ヘッダー
    const header = this.createHeader();
    container.appendChild(header);

    // メインコンテンツ
    const mainContent = document.createElement('div');
    mainContent.style.cssText = `
      display: flex;
      flex: 1;
      gap: 30px;
      margin: 30px 0;
    `;

    // 左側：クラス選択とプリセット
    const leftPanel = this.createLeftPanel();
    
    // 中央：現在のトリガーセット
    const centerPanel = this.createCenterPanel();
    
    // 右側：利用可能なトリガー
    const rightPanel = this.createRightPanel();

    mainContent.appendChild(leftPanel);
    mainContent.appendChild(centerPanel);
    mainContent.appendChild(rightPanel);
    container.appendChild(mainContent);

    // フッター（戦闘開始ボタン）
    const footer = this.createFooter();
    container.appendChild(footer);

    this.menuElement.appendChild(container);
    document.body.appendChild(this.menuElement);
  }

  /**
   * ヘッダーを作成
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      text-align: center;
      padding: 20px;
      border-bottom: 2px solid #444;
      background: rgba(20, 25, 45, 0.8);
      border-radius: 10px;
      margin-bottom: 20px;
    `;

    const title = document.createElement('h1');
    title.textContent = 'トリガーセット選択';
    title.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 2.5em;
      color: #ffcc00;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = '右手：1-4スロット、左手：C1-C4スロット（Ctrl+1-4またはShift+1-4で切り替え）';
    subtitle.style.cssText = `
      margin: 0;
      font-size: 1.2em;
      color: #ccc;
    `;

    header.appendChild(title);
    header.appendChild(subtitle);
    return header;
  }

  /**
   * 左パネル（クラス選択）を作成
   */
  private createLeftPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 0 0 280px;
      background: rgba(30, 35, 55, 0.8);
      border-radius: 10px;
      padding: 20px;
      height: fit-content;
    `;

    const title = document.createElement('h3');
    title.textContent = 'クラス選択';
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: #66ccff;
      text-align: center;
      border-bottom: 1px solid #555;
      padding-bottom: 10px;
    `;
    panel.appendChild(title);

    // クラス選択ボタン
    const classes = [
      { key: CharacterClass.ATTACKER, name: 'アタッカー', color: '#ff6666' },
      { key: CharacterClass.SHOOTER, name: 'シューター', color: '#66ff66' },
      { key: CharacterClass.SNIPER, name: 'スナイパー', color: '#6666ff' },
      { key: CharacterClass.GUNNER, name: 'ガンナー', color: '#ffff66' },
      { key: CharacterClass.ALL_ROUNDER, name: 'オールラウンダー', color: '#ff9966' }
    ];

    classes.forEach(classInfo => {
      const button = document.createElement('button');
      button.textContent = classInfo.name;
      button.style.cssText = `
        display: block;
        width: 100%;
        padding: 15px;
        margin-bottom: 10px;
        background: ${this.selectedClass === classInfo.key ? classInfo.color : 'rgba(60, 60, 80, 0.8)'};
        color: ${this.selectedClass === classInfo.key ? '#000' : '#fff'};
        border: 2px solid ${classInfo.color};
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: all 0.3s ease;
      `;

      button.onmouseover = () => {
        if (this.selectedClass !== classInfo.key) {
          button.style.background = `rgba(${this.hexToRgb(classInfo.color)}, 0.3)`;
        }
      };

      button.onmouseout = () => {
        if (this.selectedClass !== classInfo.key) {
          button.style.background = 'rgba(60, 60, 80, 0.8)';
        }
      };

      button.onclick = () => {
        this.selectClass(classInfo.key);
        this.updateClassButtons();
      };

      button.id = `class-${classInfo.key}`;
      panel.appendChild(button);
    });

    return panel;
  }

  /**
   * 中央パネル（現在のトリガーセット）を作成
   */
  private createCenterPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 1;
      background: rgba(30, 35, 55, 0.8);
      border-radius: 10px;
      padding: 20px;
    `;

    const title = document.createElement('h3');
    title.textContent = '現在のトリガーセット';
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: #ffcc00;
      text-align: center;
      border-bottom: 1px solid #555;
      padding-bottom: 10px;
    `;
    panel.appendChild(title);

    const slotsContainer = document.createElement('div');
    slotsContainer.id = 'pre-battle-trigger-slots';
    
    // 右手スロット（1-4）
    const mainSlotsTitle = document.createElement('h4');
    mainSlotsTitle.textContent = '右手スロット（1-4キー）';
    mainSlotsTitle.style.cssText = `
      margin: 0 0 15px 0;
      color: #ffcc00;
      text-align: center;
      border-bottom: 1px solid #666;
      padding-bottom: 8px;
    `;
    slotsContainer.appendChild(mainSlotsTitle);
    
    const mainSlots = [
      { key: 'slot1', name: '右手スロット1', icon: '①', shortcut: '1' },
      { key: 'slot2', name: '右手スロット2', icon: '②', shortcut: '2' },
      { key: 'slot3', name: '右手スロット3', icon: '③', shortcut: '3' },
      { key: 'slot4', name: '右手スロット4', icon: '④', shortcut: '4' }
    ];
    
    mainSlots.forEach(slot => {
      slotsContainer.appendChild(this.createSlotElement(slot));
    });
    
    // 左手スロット（C1-C4）
    const cSlotsTitle = document.createElement('h4');
    cSlotsTitle.textContent = '左手スロット（Shift+1-4キー）';
    cSlotsTitle.style.cssText = `
      margin: 25px 0 15px 0;
      color: #66ccff;
      text-align: center;
      border-bottom: 1px solid #666;
      padding-bottom: 8px;
    `;
    slotsContainer.appendChild(cSlotsTitle);
    
    const cSlots = [
      { key: 'c1', name: '左手C1スロット', icon: 'C①', shortcut: 'Ctrl/Shift+1' },
      { key: 'c2', name: '左手C2スロット', icon: 'C②', shortcut: 'Ctrl/Shift+2' },
      { key: 'c3', name: '左手C3スロット', icon: 'C③', shortcut: 'Ctrl/Shift+3' },
      { key: 'c4', name: '左手C4スロット', icon: 'C④', shortcut: 'Ctrl/Shift+4' }
    ];

    cSlots.forEach(slot => {
      slotsContainer.appendChild(this.createSlotElement(slot));
    });

    panel.appendChild(slotsContainer);
    return panel;
  }

  /**
   * 右パネル（利用可能なトリガー）を作成
   */
  private createRightPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      flex: 0 0 320px;
      background: rgba(30, 35, 55, 0.8);
      border-radius: 10px;
      padding: 20px;
      max-height: 600px;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = '利用可能なトリガー';
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: #66ccff;
      text-align: center;
      border-bottom: 1px solid #555;
      padding-bottom: 10px;
    `;
    panel.appendChild(title);

    // カテゴリ別にトリガーを表示
    const categories = {
      'attacker': { name: 'アタッカー', color: '#ff6666' },
      'shooter': { name: 'シューター', color: '#66ff66' },
      'sniper': { name: 'スナイパー', color: '#6666ff' },
      'gunner': { name: 'ガンナー', color: '#ffff66' },
      'defense': { name: '防御', color: '#cc66ff' },
      'optional': { name: '補助', color: '#66ffcc' }
    };

    Object.entries(categories).forEach(([category, categoryInfo]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.style.cssText = `
        margin-bottom: 25px;
      `;

      const categoryTitle = document.createElement('h4');
      categoryTitle.textContent = categoryInfo.name;
      categoryTitle.style.cssText = `
        margin: 0 0 15px 0;
        color: ${categoryInfo.color};
        border-bottom: 1px solid ${categoryInfo.color};
        padding-bottom: 8px;
        font-size: 16px;
      `;
      categoryDiv.appendChild(categoryTitle);

      // このカテゴリのトリガーを表示
      Object.values(TriggerType).forEach(triggerType => {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        if (definition.category === category) {
          const triggerDiv = document.createElement('div');
          triggerDiv.style.cssText = `
            padding: 12px;
            margin-bottom: 8px;
            background: rgba(50, 55, 75, 0.8);
            border-radius: 6px;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.3s ease;
          `;
          
          triggerDiv.onmouseover = () => {
            triggerDiv.style.borderColor = categoryInfo.color;
            triggerDiv.style.background = 'rgba(60, 65, 85, 0.8)';
          };
          
          triggerDiv.onmouseout = () => {
            triggerDiv.style.borderColor = 'transparent';
            triggerDiv.style.background = 'rgba(50, 55, 75, 0.8)';
          };

          triggerDiv.onclick = () => this.showTriggerAssignMenu(triggerType);

          const triggerName = document.createElement('div');
          triggerName.textContent = definition.name;
          triggerName.style.cssText = `
            font-weight: bold;
            margin-bottom: 5px;
            color: #fff;
          `;

          const triggerDesc = document.createElement('div');
          triggerDesc.textContent = definition.description;
          triggerDesc.style.cssText = `
            font-size: 12px;
            color: #bbb;
            line-height: 1.3;
          `;

          triggerDiv.appendChild(triggerName);
          triggerDiv.appendChild(triggerDesc);
          categoryDiv.appendChild(triggerDiv);
        }
      });

      panel.appendChild(categoryDiv);
    });

    return panel;
  }

  /**
   * フッター（戦闘開始ボタン）を作成
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 30px;
      padding: 30px 20px;
      border-top: 2px solid #444;
      background: rgba(20, 25, 45, 0.8);
      border-radius: 10px;
      margin-top: 20px;
    `;

    const startButton = document.createElement('button');
    startButton.textContent = '戦闘開始';
    startButton.style.cssText = `
      padding: 20px 50px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 20px;
      font-weight: bold;
      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
      transition: all 0.3s ease;
    `;

    startButton.onmouseover = () => {
      startButton.style.background = 'linear-gradient(135deg, #45a049, #4CAF50)';
      startButton.style.transform = 'translateY(-2px)';
      startButton.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
    };

    startButton.onmouseout = () => {
      startButton.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      startButton.style.transform = 'translateY(0)';
      startButton.style.boxShadow = '0 4px 15px rgba(76, 175, 80, 0.3)';
    };

    startButton.onclick = () => this.startBattle();

    footer.appendChild(startButton);
    return footer;
  }

  /**
   * クラスを選択
   */
  private selectClass(characterClass: CharacterClass): void {
    this.selectedClass = characterClass;
    this.currentTriggerSet = { ...CLASS_TRIGGER_SETS[characterClass] };
    this.updateCurrentSetDisplay();
  }

  /**
   * クラスボタンの表示を更新
   */
  private updateClassButtons(): void {
    const classes = [
      { key: CharacterClass.ATTACKER, color: '#ff6666' },
      { key: CharacterClass.SHOOTER, color: '#66ff66' },
      { key: CharacterClass.SNIPER, color: '#6666ff' },
      { key: CharacterClass.GUNNER, color: '#ffff66' },
      { key: CharacterClass.ALL_ROUNDER, color: '#ff9966' }
    ];

    classes.forEach(classInfo => {
      const button = document.getElementById(`class-${classInfo.key}`) as HTMLButtonElement;
      if (button) {
        const isSelected = this.selectedClass === classInfo.key;
        button.style.background = isSelected ? classInfo.color : 'rgba(60, 60, 80, 0.8)';
        button.style.color = isSelected ? '#000' : '#fff';
      }
    });
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
      background: rgba(20, 25, 45, 0.98);
      border: 3px solid #666;
      border-radius: 15px;
      padding: 30px;
      z-index: 16000;
      color: white;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    `;

    const title = document.createElement('h3');
    title.textContent = `${TRIGGER_DEFINITIONS[triggerType].name}を割り当て`;
    title.style.cssText = `
      margin: 0 0 25px 0;
      text-align: center;
      color: #ffcc00;
      font-size: 20px;
    `;
    assignMenu.appendChild(title);

    const slots = [
      { key: 'slot1', name: 'スロット1', icon: '①' },
      { key: 'slot2', name: 'スロット2', icon: '②' },
      { key: 'slot3', name: 'スロット3', icon: '③' },
      { key: 'slot4', name: 'スロット4', icon: '④' },
      { key: 'c1', name: 'C1スロット', icon: 'C①' },
      { key: 'c2', name: 'C2スロット', icon: 'C②' },
      { key: 'c3', name: 'C3スロット', icon: 'C③' },
      { key: 'c4', name: 'C4スロット', icon: 'C④' }
    ];

    slots.forEach(slot => {
      const button = document.createElement('button');
      button.innerHTML = `${slot.icon} ${slot.name}`;
      button.style.cssText = `
        display: block;
        width: 100%;
        padding: 15px;
        margin-bottom: 15px;
        background: rgba(60, 65, 85, 0.8);
        color: white;
        border: 2px solid #555;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;
      `;
      
      button.onmouseover = () => {
        button.style.borderColor = '#66ccff';
        button.style.background = 'rgba(70, 75, 95, 0.8)';
      };

      button.onmouseout = () => {
        button.style.borderColor = '#555';
        button.style.background = 'rgba(60, 65, 85, 0.8)';
      };

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
      padding: 15px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 10px;
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
   * スロット要素を作成
   */
  private createSlotElement(slot: { key: string; name: string; icon: string; shortcut: string }): HTMLElement {
    const slotDiv = document.createElement('div');
    slotDiv.style.cssText = `
      margin-bottom: 15px;
      padding: 15px;
      border: 2px solid #555;
      border-radius: 8px;
      background: rgba(40, 45, 65, 0.8);
      cursor: pointer;
      min-height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.3s ease;
    `;
    
    slotDiv.onmouseover = () => {
      slotDiv.style.borderColor = '#66ccff';
      slotDiv.style.background = 'rgba(50, 55, 75, 0.8)';
    };
    
    slotDiv.onmouseout = () => {
      slotDiv.style.borderColor = '#555';
      slotDiv.style.background = 'rgba(40, 45, 65, 0.8)';
    };

    slotDiv.onclick = () => this.clearSlot(slot.key as keyof TriggerSet);

    const leftContent = document.createElement('div');
    leftContent.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const icon = document.createElement('div');
    icon.textContent = slot.icon;
    icon.style.cssText = `
      font-size: 18px;
      font-weight: bold;
    `;

    const slotInfo = document.createElement('div');
    const slotLabel = document.createElement('div');
    slotLabel.textContent = slot.name;
    slotLabel.style.cssText = `
      font-weight: bold;
      color: #ccc;
      margin-bottom: 3px;
      font-size: 14px;
    `;

    const shortcutLabel = document.createElement('div');
    shortcutLabel.textContent = `キー: ${slot.shortcut}`;
    shortcutLabel.style.cssText = `
      font-size: 10px;
      color: #888;
    `;

    slotInfo.appendChild(slotLabel);
    slotInfo.appendChild(shortcutLabel);
    leftContent.appendChild(icon);
    leftContent.appendChild(slotInfo);

    const triggerInfo = document.createElement('div');
    triggerInfo.id = `pre-battle-slot-${slot.key}`;
    triggerInfo.style.cssText = `
      text-align: right;
      flex: 1;
      margin-left: 15px;
    `;

    slotDiv.appendChild(leftContent);
    slotDiv.appendChild(triggerInfo);
    return slotDiv;
  }

  /**
   * 現在のセット表示を更新
   */
  private updateCurrentSetDisplay(): void {
    const allSlots = ['slot1', 'slot2', 'slot3', 'slot4', 'c1', 'c2', 'c3', 'c4'];
    
    allSlots.forEach(slot => {
      const element = document.getElementById(`pre-battle-slot-${slot}`);
      if (element) {
        const triggerType = this.currentTriggerSet[slot as keyof TriggerSet];
        if (triggerType) {
          const definition = TRIGGER_DEFINITIONS[triggerType];
          element.innerHTML = `
            <div style="font-weight: bold; color: #ffcc00; margin-bottom: 3px; font-size: 13px;">${definition.name}</div>
            <div style="font-size: 10px; color: #ccc; line-height: 1.2;">${definition.description}</div>
          `;
        } else {
          element.innerHTML = `
            <div style="color: #666; font-style: italic; font-size: 12px;">未設定</div>
            <div style="font-size: 10px; color: #555;">クリックして削除</div>
          `;
        }
      }
    });
  }

  /**
   * 戦闘開始
   */
  private startBattle(): void {
    if (this.onStartBattle) {
      this.onStartBattle(this.currentTriggerSet);
    }
    this.close();
  }

  /**
   * Hex色をRGB形式に変換
   */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `${r}, ${g}, ${b}`;
    }
    return '255, 255, 255';
  }

  /**
   * メニューを開く
   */
  open(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'block';
      this.isOpen = true;
      this.updateCurrentSetDisplay();
      this.updateClassButtons();
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
   * 戦闘開始コールバックを設定
   */
  setOnStartBattle(callback: (triggerSet: TriggerSet) => void): void {
    this.onStartBattle = callback;
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