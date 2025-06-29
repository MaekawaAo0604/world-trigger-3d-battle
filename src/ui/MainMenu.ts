import { CharacterTriggerMenu } from './CharacterTriggerMenu';
import { TriggerSet } from '../triggers/TriggerDefinitions';
import { CharacterType } from '../components/Character';

/**
 * メインメニューUI管理クラス
 */
export class MainMenu {
  private menuElement: HTMLElement | null = null;
  private characterTriggerMenu: CharacterTriggerMenu | null = null;
  private onStartGame: ((character: CharacterType, triggerSet: TriggerSet) => void) | null = null;

  constructor() {
    this.createMenu();
    this.setupCharacterTriggerMenu();
  }

  /**
   * メインメニューUIを作成
   */
  private createMenu(): void {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'main-menu';
    this.menuElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, 
        rgba(15, 25, 50, 0.95) 0%,
        rgba(25, 35, 65, 0.95) 50%,
        rgba(35, 45, 80, 0.95) 100%
      );
      z-index: 12000;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: white;
      font-family: 'Arial', sans-serif;
    `;

    // タイトル
    const title = document.createElement('h1');
    title.textContent = 'World Trigger 3D Battle';
    title.style.cssText = `
      font-size: 4em;
      margin-bottom: 20px;
      color: #ffcc00;
      text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.7);
      text-align: center;
      font-weight: bold;
    `;
    this.menuElement.appendChild(title);

    // サブタイトル
    const subtitle = document.createElement('p');
    subtitle.textContent = 'ボーダーとなって戦え！';
    subtitle.style.cssText = `
      font-size: 1.5em;
      margin-bottom: 50px;
      color: #ccc;
      text-align: center;
    `;
    this.menuElement.appendChild(subtitle);

    // ボタンコンテナ
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 20px;
      align-items: center;
    `;

    // 戦闘開始ボタン
    const startButton = this.createButton('戦闘開始', '#4CAF50', () => {
      this.showCharacterTriggerMenu();
    });

    // オプションボタン（将来的に実装）
    const optionsButton = this.createButton('オプション', '#2196F3', () => {
      alert('オプションは今後実装予定です');
    });

    // 終了ボタン
    const exitButton = this.createButton('終了', '#f44336', () => {
      if (confirm('ゲームを終了しますか？')) {
        window.close();
      }
    });

    buttonContainer.appendChild(startButton);
    buttonContainer.appendChild(optionsButton);
    buttonContainer.appendChild(exitButton);
    this.menuElement.appendChild(buttonContainer);

    // 操作説明
    const controls = this.createControlsInfo();
    this.menuElement.appendChild(controls);

    document.body.appendChild(this.menuElement);
  }

  /**
   * ボタンを作成
   */
  private createButton(text: string, color: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 20px 60px;
      background: linear-gradient(135deg, ${color}, ${this.darkenColor(color, 0.1)});
      color: white;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-size: 20px;
      font-weight: bold;
      box-shadow: 0 4px 15px ${this.addAlpha(color, 0.3)};
      transition: all 0.3s ease;
      min-width: 200px;
    `;

    button.onmouseover = () => {
      button.style.background = `linear-gradient(135deg, ${this.lightenColor(color, 0.1)}, ${color})`;
      button.style.transform = 'translateY(-3px)';
      button.style.boxShadow = `0 6px 20px ${this.addAlpha(color, 0.4)}`;
    };

    button.onmouseout = () => {
      button.style.background = `linear-gradient(135deg, ${color}, ${this.darkenColor(color, 0.1)})`;
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = `0 4px 15px ${this.addAlpha(color, 0.3)}`;
    };

    button.onclick = onClick;
    return button;
  }

  /**
   * 操作説明を作成
   */
  private createControlsInfo(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
      color: #aaa;
      font-size: 14px;
      max-width: 800px;
    `;

    const title = document.createElement('h3');
    title.textContent = '基本操作';
    title.style.cssText = `
      margin: 0 0 15px 0;
      color: #66ccff;
      font-size: 18px;
    `;
    container.appendChild(title);

    const controls = [
      'WASD: 移動',
      'マウス: 視点操作',
      '左クリック: 攻撃/射撃',
      'R: 武器生成',
      '1-4: トリガー切り替え',
      'Space: ジャンプ',
      'E: サブアクション（スコープなど）'
    ];

    const controlsGrid = document.createElement('div');
    controlsGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 10px;
    `;

    controls.forEach(control => {
      const controlDiv = document.createElement('div');
      controlDiv.textContent = control;
      controlDiv.style.cssText = `
        padding: 5px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
      `;
      controlsGrid.appendChild(controlDiv);
    });

    container.appendChild(controlsGrid);
    return container;
  }

  /**
   * キャラクター・トリガー選択メニューを設定
   */
  private setupCharacterTriggerMenu(): void {
    this.characterTriggerMenu = new CharacterTriggerMenu();
    this.characterTriggerMenu.setOnSelectionComplete((character, triggerSet) => {
      this.startGame(character, triggerSet);
    });
  }

  /**
   * キャラクター・トリガー選択メニューを表示
   */
  private showCharacterTriggerMenu(): void {
    if (this.characterTriggerMenu) {
      this.hide();
      this.characterTriggerMenu.open();
    }
  }

  /**
   * ゲーム開始
   */
  private startGame(character: CharacterType, triggerSet: TriggerSet): void {
    if (this.onStartGame) {
      this.onStartGame(character, triggerSet);
    }
  }

  /**
   * 色を暗くする
   */
  private darkenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substring(0, 2), 16) - Math.round(255 * amount));
    const g = Math.max(0, parseInt(hex.substring(2, 4), 16) - Math.round(255 * amount));
    const b = Math.max(0, parseInt(hex.substring(4, 6), 16) - Math.round(255 * amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * 色を明るくする
   */
  private lightenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.substring(0, 2), 16) + Math.round(255 * amount));
    const g = Math.min(255, parseInt(hex.substring(2, 4), 16) + Math.round(255 * amount));
    const b = Math.min(255, parseInt(hex.substring(4, 6), 16) + Math.round(255 * amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * 色にアルファ値を追加
   */
  private addAlpha(color: string, alpha: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * ゲーム開始コールバックを設定
   */
  setOnStartGame(callback: (character: CharacterType, triggerSet: TriggerSet) => void): void {
    this.onStartGame = callback;
  }

  /**
   * メニューを表示
   */
  show(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'flex';
    }
  }

  /**
   * メニューを非表示
   */
  hide(): void {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
    }
  }

  /**
   * ESCキーでメインメニューに戻る
   */
  handleEscape(): void {
    if (this.characterTriggerMenu?.isMenuOpen()) {
      this.characterTriggerMenu.close();
      this.show();
    }
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    if (this.characterTriggerMenu) {
      this.characterTriggerMenu.destroy();
    }
    if (this.menuElement && this.menuElement.parentNode) {
      this.menuElement.parentNode.removeChild(this.menuElement);
    }
  }
}