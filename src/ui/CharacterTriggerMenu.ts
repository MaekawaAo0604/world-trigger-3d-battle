import { TriggerType, TRIGGER_DEFINITIONS, TriggerSet } from '../triggers/TriggerDefinitions';
import { CharacterType, CHARACTER_PRESETS } from '../components/Character';
import { SelectionStateManager } from '../managers/SelectionStateManager';
import { StatDisplayUtils, TrionCalculator, STAT_DESCRIPTIONS } from '../config/OriginalStats';

/**
 * キャラクター＆トリガー選択メニューUI管理クラス
 * キャラクターを先に選択してからトリガーを設定するフロー
 */
export class CharacterTriggerMenu {
  private menuElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private selectedCharacter: CharacterType | null = null;
  private currentTriggerSet: TriggerSet;
  private onSelectionComplete: ((character: CharacterType, triggerSet: TriggerSet) => void) | null = null;
  
  // UI要素
  private characterSelectElement: HTMLElement | null = null;
  private triggerSelectElement: HTMLElement | null = null;
  private trionBarElement: HTMLElement | null = null;
  private costDisplayElement: HTMLElement | null = null;

  constructor() {
    // デフォルトの空のトリガーセット
    this.currentTriggerSet = SelectionStateManager.getDefaultTriggerSet();
    this.createMenu();
  }

  /**
   * メニューUIを作成
   */
  private createMenu(): void {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'character-trigger-menu';
    this.menuElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(10, 10, 20, 0.95);
      z-index: 10000;
      display: none;
      color: white;
      font-family: Arial, sans-serif;
      overflow-y: auto;
    `;

    // ヘッダー
    const header = this.createHeader();
    this.menuElement.appendChild(header);

    // メインコンテンツ
    const mainContent = document.createElement('div');
    mainContent.style.cssText = `
      display: flex;
      min-height: calc(100vh - 120px);
    `;

    // キャラクター選択エリア
    this.characterSelectElement = this.createCharacterSelectArea();
    mainContent.appendChild(this.characterSelectElement);

    // トリガー選択エリア（初期は非表示）
    this.triggerSelectElement = this.createTriggerSelectArea();
    this.triggerSelectElement.style.display = 'none';
    mainContent.appendChild(this.triggerSelectElement);

    this.menuElement.appendChild(mainContent);

    // フッター
    const footer = this.createFooter();
    this.menuElement.appendChild(footer);

    document.body.appendChild(this.menuElement);
  }

  /**
   * ヘッダーを作成
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 20px;
      background: rgba(20, 20, 40, 0.9);
      border-bottom: 2px solid #444;
      text-align: center;
    `;

    const title = document.createElement('h1');
    title.textContent = 'キャラクター・トリガー選択';
    title.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #66ccff;
    `;

    const subtitle = document.createElement('p');
    subtitle.id = 'menu-subtitle';
    subtitle.textContent = '1. キャラクターを選択してください';
    subtitle.style.cssText = `
      margin: 0;
      font-size: 16px;
      color: #aaa;
    `;

    header.appendChild(title);
    header.appendChild(subtitle);
    return header;
  }

  /**
   * キャラクター選択エリアを作成
   */
  private createCharacterSelectArea(): HTMLElement {
    const area = document.createElement('div');
    area.style.cssText = `
      flex: 1;
      padding: 30px;
      background: linear-gradient(135deg, rgba(30, 30, 50, 0.8), rgba(20, 20, 40, 0.8));
    `;

    const title = document.createElement('h2');
    title.textContent = '🎭 キャラクター選択';
    title.style.cssText = `
      margin: 0 0 30px 0;
      text-align: center;
      color: #ffcc00;
      font-size: 24px;
    `;
    area.appendChild(title);

    // キャラクターカード
    const charactersGrid = document.createElement('div');
    charactersGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      max-width: 1000px;
      margin: 0 auto;
    `;

    // プレイ可能キャラクターを表示（AI_ENEMYを除く）
    const playableCharacters = [
      CharacterType.MIKUMO_OSAMU,
      CharacterType.AMATORI_CHIKA,
      CharacterType.KUGA_YUMA,
      CharacterType.JIN_YUICHI
    ];

    playableCharacters.forEach(charType => {
      const preset = CHARACTER_PRESETS[charType];
      const card = this.createCharacterCard(charType, preset);
      charactersGrid.appendChild(card);
    });

    area.appendChild(charactersGrid);
    return area;
  }

  /**
   * キャラクターカードを作成
   */
  private createCharacterCard(charType: CharacterType, preset: any): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(40, 40, 60, 0.9);
      border: 2px solid #555;
      border-radius: 12px;
      padding: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    `;

    card.onmouseover = () => {
      card.style.borderColor = '#66ccff';
      card.style.transform = 'translateY(-5px)';
      card.style.boxShadow = '0 10px 25px rgba(102, 204, 255, 0.3)';
    };

    card.onmouseout = () => {
      if (this.selectedCharacter !== charType) {
        card.style.borderColor = '#555';
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      }
    };

    card.onclick = () => this.selectCharacter(charType);

    // キャラクター名
    const name = document.createElement('h3');
    name.textContent = preset.name;
    name.style.cssText = `
      margin: 0 0 15px 0;
      color: #ffcc00;
      text-align: center;
      font-size: 20px;
    `;

    // クラス
    const classDiv = document.createElement('div');
    classDiv.textContent = `🎯 ${preset.class}`;
    classDiv.style.cssText = `
      text-align: center;
      margin-bottom: 20px;
      color: #66ccff;
      font-weight: bold;
    `;

    // トリオン表示（最重要）
    const trionDiv = document.createElement('div');
    trionDiv.style.cssText = `
      margin-bottom: 20px;
      padding: 15px;
      background: rgba(20, 20, 30, 0.8);
      border-radius: 8px;
      border: 1px solid #444;
    `;

    const trionLabel = document.createElement('div');
    const originalTrion = preset.stats.originalStats?.trion || 0;
    const trionRank = TrionCalculator.getTrionRank(originalTrion);
    trionLabel.innerHTML = `⚡ トリオン容量 <span style="color: ${StatDisplayUtils.getStatColor(originalTrion)};">[${trionRank}]</span>`;
    trionLabel.style.cssText = `
      color: #ffaa00;
      font-weight: bold;
      margin-bottom: 8px;
      text-align: center;
    `;

    const trionValue = document.createElement('div');
    trionValue.textContent = `${preset.stats.trionCapacity}`;
    trionValue.style.cssText = `
      font-size: 32px;
      font-weight: bold;
      text-align: center;
      color: #4CAF50;
      text-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
    `;

    const trionOriginal = document.createElement('div');
    trionOriginal.innerHTML = `原作値: ${originalTrion}/12`;
    trionOriginal.style.cssText = `
      font-size: 12px;
      text-align: center;
      color: #ccc;
      margin-top: 5px;
    `;
    
    const trionBar = StatDisplayUtils.createStatBar(originalTrion, 12);
    trionBar.style.marginTop = '5px';

    trionDiv.appendChild(trionLabel);
    trionDiv.appendChild(trionValue);
    trionDiv.appendChild(trionOriginal);
    trionDiv.appendChild(trionBar);

    // 原作ステータス詳細
    const originalStatsDiv = document.createElement('div');
    originalStatsDiv.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background: rgba(30, 30, 40, 0.6);
      border-radius: 6px;
      border: 1px solid #333;
    `;

    const originalStatsTitle = document.createElement('div');
    originalStatsTitle.textContent = '📊 原作ステータス (0-12)';
    originalStatsTitle.style.cssText = `
      font-size: 12px;
      color: #66ccff;
      font-weight: bold;
      margin-bottom: 8px;
      text-align: center;
    `;
    originalStatsDiv.appendChild(originalStatsTitle);

    if (preset.stats.originalStats) {
      const originalStats = preset.stats.originalStats;
      const statEntries = [
        { key: 'mobility', name: '機動力', value: originalStats.mobility },
        { key: 'trion', name: 'トリオン', value: originalStats.trion }
      ];
      
      // 参考値があれば追加
      if (originalStats.technique !== undefined) {
        statEntries.push({ key: 'technique', name: '技術（参考）', value: originalStats.technique });
      }
      if (originalStats.range !== undefined) {
        statEntries.push({ key: 'range', name: '射程（参考）', value: originalStats.range });
      }
      if (originalStats.command !== undefined) {
        statEntries.push({ key: 'command', name: '指揮（参考）', value: originalStats.command });
      }
      if (originalStats.special !== undefined) {
        statEntries.push({ key: 'special', name: '特殊戦術（参考）', value: originalStats.special });
      }

      statEntries.forEach(stat => {
        const statDiv = document.createElement('div');
        statDiv.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        `;

        const label = document.createElement('span');
        label.textContent = stat.name;
        label.style.cssText = `
          font-size: 11px;
          color: #ccc;
        `;

        const valueContainer = document.createElement('div');
        valueContainer.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
        `;

        const value = document.createElement('span');
        value.textContent = `${stat.value}`;
        value.style.cssText = `
          font-weight: bold;
          color: ${StatDisplayUtils.getStatColor(stat.value)};
          font-size: 11px;
          min-width: 20px;
        `;

        const rank = document.createElement('span');
        rank.textContent = StatDisplayUtils.getStatRank(stat.value);
        rank.style.cssText = `
          font-size: 10px;
          color: ${StatDisplayUtils.getStatColor(stat.value)};
          font-weight: bold;
          min-width: 20px;
        `;

        valueContainer.appendChild(value);
        valueContainer.appendChild(rank);
        statDiv.appendChild(label);
        statDiv.appendChild(valueContainer);
        originalStatsDiv.appendChild(statDiv);
        
        // バー表示を追加
        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
          margin-top: 4px;
          margin-bottom: 8px;
        `;
        const bar = StatDisplayUtils.createStatBar(stat.value, 12);
        bar.style.height = '8px'; // 少し細めに
        barContainer.appendChild(bar);
        originalStatsDiv.appendChild(barContainer);
      });
    }

    // ゲーム内ステータス（計算済み）
    const gameStatsDiv = document.createElement('div');
    gameStatsDiv.style.cssText = `
      margin-top: 10px;
    `;

    const gameStatsTitle = document.createElement('div');
    gameStatsTitle.textContent = '🎮 ゲーム内ステータス';
    gameStatsTitle.style.cssText = `
      font-size: 12px;
      color: #ffcc00;
      font-weight: bold;
      margin-bottom: 8px;
      text-align: center;
    `;
    gameStatsDiv.appendChild(gameStatsTitle);

    const gameStats = [
      { name: '機動力', value: Math.round(preset.stats.mobility), color: '#2196F3' },
      { name: 'トリオン容量', value: preset.stats.trionCapacity, color: '#4CAF50' }
    ];

    gameStats.forEach(stat => {
      const statContainer = document.createElement('div');
      statContainer.style.cssText = `
        margin-bottom: 12px;
      `;

      const statDiv = document.createElement('div');
      statDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      `;

      const label = document.createElement('span');
      label.textContent = stat.name;
      label.style.cssText = `
        font-size: 12px;
        color: #ccc;
      `;

      const value = document.createElement('span');
      value.textContent = `${stat.value}`;
      value.style.cssText = `
        font-weight: bold;
        color: ${stat.color};
        font-size: 12px;
      `;

      statDiv.appendChild(label);
      statDiv.appendChild(value);
      statContainer.appendChild(statDiv);
      
      // バー表示を追加
      const maxValue = stat.name === '機動力' ? 100 : 1000; // トリオン容量は1000までのスケール
      const bar = StatDisplayUtils.createStatBar(stat.value, maxValue);
      bar.style.height = '10px';
      statContainer.appendChild(bar);
      
      gameStatsDiv.appendChild(statContainer);
    });

    card.appendChild(name);
    card.appendChild(classDiv);
    card.appendChild(trionDiv);
    card.appendChild(originalStatsDiv);
    card.appendChild(gameStatsDiv);

    return card;
  }

  /**
   * トリガー選択エリアを作成
   */
  private createTriggerSelectArea(): HTMLElement {
    const area = document.createElement('div');
    area.style.cssText = `
      flex: 1;
      padding: 30px;
      background: linear-gradient(135deg, rgba(20, 40, 30, 0.8), rgba(10, 30, 20, 0.8));
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 30px;
    `;

    const title = document.createElement('h2');
    title.textContent = '⚔️ トリガー選択';
    title.style.cssText = `
      margin: 0 0 15px 0;
      text-align: center;
      color: #ffcc00;
      font-size: 24px;
    `;

    // トリオンバー
    this.trionBarElement = this.createTrionBar();
    
    // コスト表示
    this.costDisplayElement = document.createElement('div');
    this.costDisplayElement.style.cssText = `
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
    `;

    header.appendChild(title);
    header.appendChild(this.trionBarElement);
    header.appendChild(this.costDisplayElement);
    area.appendChild(header);

    // トリガーセット編集エリア
    const editArea = document.createElement('div');
    editArea.style.cssText = `
      display: flex;
      gap: 20px;
      height: calc(100% - 200px);
    `;

    // 現在のセット
    const currentSetArea = this.createCurrentTriggerSetArea();
    // 利用可能トリガー
    const availableArea = this.createAvailableTriggersArea();

    editArea.appendChild(currentSetArea);
    editArea.appendChild(availableArea);
    area.appendChild(editArea);

    return area;
  }

  /**
   * トリオンバーを作成
   */
  private createTrionBar(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      margin: 0 auto 20px auto;
      max-width: 400px;
    `;

    const label = document.createElement('div');
    label.textContent = '⚡ 出撃時トリオン残量';
    label.style.cssText = `
      text-align: center;
      color: #ffaa00;
      font-weight: bold;
      margin-bottom: 10px;
    `;

    const barContainer = document.createElement('div');
    barContainer.style.cssText = `
      width: 100%;
      height: 30px;
      background: rgba(20, 20, 30, 0.8);
      border: 2px solid #444;
      border-radius: 15px;
      position: relative;
      overflow: hidden;
    `;

    const barFill = document.createElement('div');
    barFill.id = 'trion-bar-fill';
    barFill.style.cssText = `
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      border-radius: 13px;
      transition: all 0.3s ease;
      position: relative;
    `;

    const barText = document.createElement('div');
    barText.id = 'trion-bar-text';
    barText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: bold;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      z-index: 1;
    `;

    barFill.appendChild(barText);
    barContainer.appendChild(barFill);
    container.appendChild(label);
    container.appendChild(barContainer);

    return container;
  }

  /**
   * 現在のトリガーセットエリアを作成
   */
  private createCurrentTriggerSetArea(): HTMLElement {
    const area = document.createElement('div');
    area.style.cssText = `
      flex: 1;
      background: rgba(30, 30, 40, 0.8);
      border-radius: 8px;
      padding: 20px;
      max-height: 500px;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = '現在のトリガーセット';
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: #ffcc00;
      text-align: center;
    `;
    area.appendChild(title);

    const slotsContainer = document.createElement('div');
    slotsContainer.id = 'current-trigger-slots';
    
    const slots = [
      { key: 'slot1', name: 'スロット1（右手メイン）' },
      { key: 'slot2', name: 'スロット2（右手サブ）' },
      { key: 'slot3', name: 'スロット3' },
      { key: 'slot4', name: 'スロット4' },
      { key: 'c1', name: 'C1（左手）' },
      { key: 'c2', name: 'C2（左手）' },
      { key: 'c3', name: 'C3（左手）' },
      { key: 'c4', name: 'C4（左手）' }
    ];

    slots.forEach(slot => {
      const slotDiv = document.createElement('div');
      slotDiv.style.cssText = `
        margin-bottom: 12px;
        padding: 12px;
        border: 1px solid #555;
        border-radius: 6px;
        background: rgba(40, 40, 50, 0.6);
        cursor: pointer;
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.2s ease;
      `;
      
      slotDiv.onmouseover = () => {
        slotDiv.style.borderColor = '#f44336';
        slotDiv.style.background = 'rgba(244, 67, 54, 0.1)';
      };
      
      slotDiv.onmouseout = () => {
        slotDiv.style.borderColor = '#555';
        slotDiv.style.background = 'rgba(40, 40, 50, 0.6)';
      };
      
      slotDiv.onclick = () => this.clearSlot(slot.key as keyof TriggerSet);

      const slotLabel = document.createElement('div');
      slotLabel.style.cssText = `
        font-weight: bold;
        color: #aaa;
        font-size: 12px;
      `;
      slotLabel.textContent = slot.name;

      const triggerInfo = document.createElement('div');
      triggerInfo.id = `slot-${slot.key}`;
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
      padding: 20px;
      max-height: 500px;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = '利用可能なトリガー';
    title.style.cssText = `
      margin: 0 0 20px 0;
      color: #ffcc00;
      text-align: center;
    `;
    area.appendChild(title);

    // カテゴリ別にトリガーを表示
    const categories = {
      'attacker': '⚔️ アタッカー',
      'shooter': '🎯 シューター', 
      'sniper': '🔭 スナイパー',
      'gunner': '🔫 ガンナー',
      'defense': '🛡️ 防御',
      'optional': '🔧 補助'
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
        font-size: 14px;
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
            border-radius: 4px;
            cursor: pointer;
            border: 1px solid transparent;
            transition: all 0.2s ease;
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
            font-size: 13px;
          `;

          const triggerCost = document.createElement('div');
          triggerCost.textContent = `セットコスト: ${definition.setCost}`;
          triggerCost.style.cssText = `
            font-size: 11px;
            color: #ffaa00;
            font-weight: bold;
          `;

          triggerDiv.appendChild(triggerName);
          triggerDiv.appendChild(triggerCost);
          categoryDiv.appendChild(triggerDiv);
        }
      });

      area.appendChild(categoryDiv);
    });

    return area;
  }

  /**
   * フッターを作成
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 20px;
      background: rgba(20, 20, 40, 0.9);
      border-top: 2px solid #444;
      display: flex;
      justify-content: center;
      gap: 20px;
    `;

    const startButton = document.createElement('button');
    startButton.id = 'start-battle-button';
    startButton.textContent = '🚀 戦闘開始';
    startButton.style.cssText = `
      padding: 15px 40px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      display: none;
      transition: all 0.3s ease;
    `;
    startButton.onclick = () => this.startBattle();

    const cancelButton = document.createElement('button');
    cancelButton.textContent = '❌ キャンセル';
    cancelButton.style.cssText = `
      padding: 15px 40px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      transition: all 0.3s ease;
    `;
    cancelButton.onclick = () => this.close();

    footer.appendChild(startButton);
    footer.appendChild(cancelButton);
    return footer;
  }

  /**
   * キャラクターを選択
   */
  private selectCharacter(charType: CharacterType): void {
    this.selectedCharacter = charType;
    
    // 選択状態をUIに反映
    const cards = document.querySelectorAll('#character-trigger-menu [style*="cursor: pointer"]');
    cards.forEach(card => {
      const cardElement = card as HTMLElement;
      cardElement.style.borderColor = '#555';
      cardElement.style.transform = 'translateY(0)';
      cardElement.style.boxShadow = 'none';
    });
    
    // 選択されたカードをハイライト
    const selectedCard = document.querySelector(`#character-trigger-menu [onclick*="${charType}"]`) as HTMLElement;
    if (selectedCard) {
      selectedCard.style.borderColor = '#4CAF50';
      selectedCard.style.transform = 'translateY(-5px)';
      selectedCard.style.boxShadow = '0 10px 25px rgba(76, 175, 80, 0.3)';
    }

    // トリガー選択エリアを表示
    if (this.triggerSelectElement) {
      this.triggerSelectElement.style.display = 'block';
    }

    // サブタイトルを更新
    const subtitle = document.getElementById('menu-subtitle');
    if (subtitle) {
      const preset = CHARACTER_PRESETS[charType];
      subtitle.textContent = `2. ${preset.name}のトリガーを設定してください`;
    }

    // トリオンバーを更新
    this.updateTrionDisplay();
    
    // 戦闘開始ボタンを表示
    const startButton = document.getElementById('start-battle-button');
    if (startButton) {
      startButton.style.display = 'block';
    }

    console.log(`Character selected: ${charType}`);
  }

  /**
   * トリガーをスロットに割り当て
   */
  private assignTriggerToSlot(triggerType: TriggerType, slot: keyof TriggerSet): void {
    this.currentTriggerSet[slot] = triggerType;
    this.updateCurrentSetDisplay();
    this.updateTrionDisplay();
  }

  /**
   * スロットをクリア
   */
  private clearSlot(slot: keyof TriggerSet): void {
    this.currentTriggerSet[slot] = null;
    this.updateCurrentSetDisplay();
    this.updateTrionDisplay();
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
      min-width: 300px;
    `;

    const title = document.createElement('h3');
    title.textContent = `${TRIGGER_DEFINITIONS[triggerType].name}を割り当て`;
    title.style.cssText = `
      margin: 0 0 15px 0;
      text-align: center;
      color: #ffcc00;
    `;
    assignMenu.appendChild(title);

    const slots = [
      { key: 'slot1', name: 'スロット1（右手メイン）' },
      { key: 'slot2', name: 'スロット2（右手サブ）' },
      { key: 'slot3', name: 'スロット3' },
      { key: 'slot4', name: 'スロット4' },
      { key: 'c1', name: 'C1（左手）' },
      { key: 'c2', name: 'C2（左手）' },
      { key: 'c3', name: 'C3（左手）' },
      { key: 'c4', name: 'C4（左手）' }
    ];

    slots.forEach(slot => {
      const button = document.createElement('button');
      button.textContent = slot.name;
      button.style.cssText = `
        display: block;
        width: 100%;
        padding: 10px;
        margin-bottom: 8px;
        background: #555;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: background 0.2s ease;
      `;
      
      button.onmouseover = () => button.style.background = '#666';
      button.onmouseout = () => button.style.background = '#555';
      
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
      margin-top: 10px;
    `;
    cancelButton.onclick = () => document.body.removeChild(assignMenu);

    assignMenu.appendChild(cancelButton);
    document.body.appendChild(assignMenu);
  }

  /**
   * 現在のセット表示を更新
   */
  private updateCurrentSetDisplay(): void {
    const slots = ['slot1', 'slot2', 'slot3', 'slot4', 'c1', 'c2', 'c3', 'c4'];
    
    slots.forEach(slot => {
      const element = document.getElementById(`slot-${slot}`);
      if (element) {
        const triggerType = this.currentTriggerSet[slot as keyof TriggerSet];
        if (triggerType) {
          const definition = TRIGGER_DEFINITIONS[triggerType];
          element.innerHTML = `
            <div style="font-weight: bold; font-size: 13px;">${definition.name}</div>
            <div style="font-size: 11px; color: #ffaa00;">コスト: ${definition.setCost}</div>
          `;
        } else {
          element.innerHTML = `
            <div style="color: #666; font-style: italic; font-size: 12px;">未設定</div>
          `;
        }
      }
    });
  }

  /**
   * トリオン表示を更新
   */
  private updateTrionDisplay(): void {
    if (!this.selectedCharacter || !this.trionBarElement || !this.costDisplayElement) return;

    const preset = CHARACTER_PRESETS[this.selectedCharacter];
    const maxTrion = preset.stats.trionCapacity;
    const setCost = this.calculateTotalCost();
    const remainingTrion = maxTrion - setCost;
    const percentage = Math.max(0, (remainingTrion / maxTrion) * 100);

    // バーの色を決定
    let barColor = '#4CAF50'; // 緑
    if (percentage < 30) {
      barColor = '#F44336'; // 赤
    } else if (percentage < 60) {
      barColor = '#FF9800'; // オレンジ
    }

    // バーを更新
    const barFill = document.getElementById('trion-bar-fill');
    const barText = document.getElementById('trion-bar-text');
    
    if (barFill && barText) {
      barFill.style.width = `${percentage}%`;
      barFill.style.background = `linear-gradient(90deg, ${barColor}, ${barColor}AA)`;
      barText.textContent = `${remainingTrion} / ${maxTrion}`;
    }

    // コスト表示を更新
    const isAffordable = setCost <= maxTrion;
    this.costDisplayElement.innerHTML = `
      <div style="margin-bottom: 10px;">
        <span style="color: #ffaa00;">💰 セットコスト:</span>
        <span style="color: ${isAffordable ? '#4CAF50' : '#F44336'}; font-weight: bold; margin-left: 10px;">
          ${setCost} / ${maxTrion}
        </span>
      </div>
      <div style="color: ${isAffordable ? '#4CAF50' : '#F44336'}; font-weight: bold;">
        ${isAffordable ? '✅ 装備可能' : '❌ トリオン不足'}
      </div>
    `;

    // 戦闘開始ボタンの状態を更新
    const startButton = document.getElementById('start-battle-button');
    if (startButton) {
      startButton.style.background = isAffordable ? '#4CAF50' : '#666';
      startButton.style.cursor = isAffordable ? 'pointer' : 'not-allowed';
      (startButton as HTMLButtonElement).disabled = !isAffordable;
    }
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
   * 戦闘を開始
   */
  private startBattle(): void {
    if (!this.selectedCharacter) return;

    const setCost = this.calculateTotalCost();
    const preset = CHARACTER_PRESETS[this.selectedCharacter];
    
    if (setCost > preset.stats.trionCapacity) {
      alert('トリオン不足のため戦闘を開始できません');
      return;
    }

    // 選択状態を保存
    SelectionStateManager.saveSelection(this.selectedCharacter, this.currentTriggerSet);

    if (this.onSelectionComplete) {
      this.onSelectionComplete(this.selectedCharacter, this.currentTriggerSet);
    }
    this.close();
  }

  /**
   * メニューを開く
   */
  open(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'block';
      this.isOpen = true;
      
      // 保存された選択状態を読み込み
      const savedSelection = SelectionStateManager.loadSelection();
      if (savedSelection && savedSelection.character) {
        console.log('CharacterTriggerMenu: Loading saved selection');
        this.selectedCharacter = savedSelection.character;
        this.currentTriggerSet = savedSelection.triggerSet;
        
        // UIを更新
        this.selectCharacter(this.selectedCharacter);
        this.updateCurrentSetDisplay();
        this.updateTrionDisplay();
      } else {
        // 初期状態にリセット
        this.selectedCharacter = null;
        this.currentTriggerSet = SelectionStateManager.getDefaultTriggerSet();
        
        if (this.triggerSelectElement) {
          this.triggerSelectElement.style.display = 'none';
        }
        
        const subtitle = document.getElementById('menu-subtitle');
        if (subtitle) {
          subtitle.textContent = '1. キャラクターを選択してください';
        }
        
        const startButton = document.getElementById('start-battle-button');
        if (startButton) {
          startButton.style.display = 'none';
        }
      }
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
   * 選択完了コールバックを設定
   */
  setOnSelectionComplete(callback: (character: CharacterType, triggerSet: TriggerSet) => void): void {
    this.onSelectionComplete = callback;
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