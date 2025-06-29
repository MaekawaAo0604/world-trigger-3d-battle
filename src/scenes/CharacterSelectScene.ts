import { CharacterType, CHARACTER_PRESETS } from '../components/Character';

export interface CharacterSelectResult {
  characterType: CharacterType;
  confirmed: boolean;
}

/**
 * キャラクター選択シーン
 */
export class CharacterSelectScene {
  private container: HTMLElement;
  private selectedCharacter: CharacterType = CharacterType.MIKUMO_OSAMU;
  private onComplete: (result: CharacterSelectResult) => void;

  constructor(
    container: HTMLElement,
    onComplete: (result: CharacterSelectResult) => void
  ) {
    this.container = container;
    this.onComplete = onComplete;
  }

  /**
   * シーンを表示
   */
  show(): void {
    const html = `
      <div class="character-select-screen">
        <h1 class="select-title">キャラクター選択</h1>
        <div class="character-grid">
          ${this.createCharacterCards()}
        </div>
        <button class="start-button" id="start-game">バトル開始</button>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    wrapper.className = 'scene-wrapper';
    this.container.appendChild(wrapper);

    this.setupEventListeners();
    this.updateSelection();
  }

  /**
   * キャラクターカードを作成
   */
  private createCharacterCards(): string {
    const characters = [
      CharacterType.MIKUMO_OSAMU,
      CharacterType.KUGA_YUMA,
      CharacterType.AMATORI_CHIKA,
      CharacterType.JIN_YUICHI
    ];

    return characters.map(type => {
      const preset = CHARACTER_PRESETS[type];
      const stats = preset.stats;
      
      return `
        <div class="character-card" data-character="${type}">
          <h3 class="character-name">${preset.name}</h3>
          <div class="character-class">${this.getClassDisplay(preset.class)}</div>
          <div class="character-preview">
            <div class="preview-placeholder"></div>
          </div>
          <div class="character-stats">
            <div class="stat-row">
              <span class="stat-label">トリオン量:</span>
              <div class="stat-bar">
                <div class="stat-fill" style="width: ${Math.min((stats.trionCapacity / 52000) * 100, 100)}%"></div>
              </div>
              <span class="stat-value">${stats.trionCapacity}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">機動力:</span>
              <div class="stat-bar">
                <div class="stat-fill" style="width: ${stats.mobility}%"></div>
              </div>
              <span class="stat-value">${stats.mobility}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * クラス表示名を取得
   */
  private getClassDisplay(cls: string): string {
    const classNames: Record<string, string> = {
      'attacker': 'アタッカー',
      'sniper': 'スナイパー',
      'all_rounder': 'オールラウンダー',
      'shooter': 'シューター',
      'gunner': 'ガンナー'
    };
    return classNames[cls] || cls;
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // キャラクターカードのクリック
    const cards = this.container.querySelectorAll('.character-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const character = card.getAttribute('data-character') as CharacterType;
        this.selectedCharacter = character;
        this.updateSelection();
      });
    });

    // スタートボタン
    const startButton = this.container.querySelector('#start-game');
    startButton?.addEventListener('click', () => {
      this.onComplete({
        characterType: this.selectedCharacter,
        confirmed: true
      });
      this.hide();
    });
  }

  /**
   * 選択状態を更新
   */
  private updateSelection(): void {
    const cards = this.container.querySelectorAll('.character-card');
    cards.forEach(card => {
      const isSelected = card.getAttribute('data-character') === this.selectedCharacter;
      card.classList.toggle('selected', isSelected);
    });
  }

  /**
   * シーンを非表示
   */
  hide(): void {
    const wrapper = this.container.querySelector('.scene-wrapper');
    if (wrapper) {
      wrapper.remove();
    }
  }
}

// キャラクター選択画面のスタイルを追加
const style = document.createElement('style');
style.textContent = `
.scene-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.character-select-screen {
  width: 90%;
  max-width: 1200px;
  padding: 40px;
  background-color: #1a1a1a;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.select-title {
  text-align: center;
  color: #00ff88;
  font-size: 36px;
  margin-bottom: 30px;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 40px;
}

.character-card {
  background-color: #2a2a2a;
  border: 2px solid #444;
  border-radius: 10px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.character-card:hover {
  border-color: #00ff88;
  transform: translateY(-5px);
  box-shadow: 0 5px 20px rgba(0, 255, 136, 0.3);
}

.character-card.selected {
  border-color: #00ff88;
  background-color: #2a3a2a;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

.character-name {
  color: #fff;
  font-size: 24px;
  margin-bottom: 10px;
  text-align: center;
}

.character-class {
  color: #00ff88;
  font-size: 16px;
  text-align: center;
  margin-bottom: 20px;
}

.character-preview {
  height: 150px;
  background-color: #1a1a1a;
  border-radius: 5px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-placeholder {
  width: 80px;
  height: 120px;
  background: linear-gradient(to bottom, #666, #333);
  border-radius: 5px;
}

.character-stats {
  color: #ccc;
  font-size: 14px;
}

.stat-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.stat-label {
  width: 80px;
  font-size: 12px;
}

.stat-bar {
  flex: 1;
  height: 10px;
  background-color: #1a1a1a;
  border-radius: 5px;
  margin: 0 10px;
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  background: linear-gradient(to right, #00ff88, #00ffff);
  transition: width 0.3s ease;
}

.stat-value {
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: #00ff88;
}

.start-button {
  display: block;
  width: 200px;
  margin: 0 auto;
  padding: 15px 30px;
  background: linear-gradient(to right, #00ff88, #00ffff);
  color: #000;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-button:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(0, 255, 136, 0.5);
}

.start-button:active {
  transform: scale(0.95);
}
`;
document.head.appendChild(style);