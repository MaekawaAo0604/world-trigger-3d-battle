import { Character } from '../components/Character';
import { Trigger } from '../components/Trigger';
import { TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';

/**
 * HUD（Head-Up Display）システム
 */
export class HUD {
  private container: HTMLElement;
  private hudElement: HTMLElement;
  private trionGauge: HTMLElement;
  private trionFill: HTMLElement;
  private triggerSlots: HTMLElement[] = [];
  private leftTriggerSlots: HTMLElement[] = [];
  private fpsCounter: HTMLElement;
  private debugInfo: HTMLElement;
  private lastFpsUpdate: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.hudElement = this.createHUD();
    this.container.appendChild(this.hudElement);
    
    // 要素の参照を取得
    this.trionGauge = this.hudElement.querySelector('.trion-gauge')!;
    this.trionFill = this.hudElement.querySelector('.trion-fill')!;
    this.fpsCounter = this.hudElement.querySelector('.fps-counter')!;
    this.debugInfo = this.hudElement.querySelector('.debug-info')!;
    
    // 右手トリガースロットの参照を取得
    for (let i = 1; i <= 4; i++) {
      const slot = this.hudElement.querySelector(`.trigger-slot[data-slot="${i}"]`)! as HTMLElement;
      this.triggerSlots.push(slot);
    }
    
    // 左手トリガースロットの参照を取得
    for (let i = 1; i <= 4; i++) {
      const slot = this.hudElement.querySelector(`.left-trigger-slot[data-slot="${i}"]`)! as HTMLElement;
      this.leftTriggerSlots.push(slot);
    }
  }

  /**
   * HUD要素を作成
   */
  private createHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';
    
    hud.innerHTML = `
      <!-- 現在選択中のトリガー表示 -->
      <div class="hud-element current-triggers">
        <div class="current-trigger-display">
          <div class="right-hand-trigger">
            <span class="hand-label">右手:</span>
            <span class="trigger-name" id="right-trigger-name">未選択</span>
          </div>
          <div class="left-hand-trigger">
            <span class="hand-label">左手:</span>
            <span class="trigger-name" id="left-trigger-name">未選択</span>
          </div>
        </div>
      </div>
      
      <!-- トリオンゲージ -->
      <div class="hud-element trion-gauge">
        <div class="gauge-label">トリオン</div>
        <div class="trion-bar">
          <div class="trion-fill" style="width: 100%"></div>
        </div>
        <div class="gauge-text">
          <span class="current-trion">100</span> / <span class="max-trion">100</span>
        </div>
      </div>

      <!-- 右手トリガースロット -->
      <div class="hud-element trigger-slots">
        <div class="slots-label">右手 (1-4)</div>
        <div class="trigger-slot" data-slot="1">
          <div class="slot-number">1</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
        <div class="trigger-slot" data-slot="2">
          <div class="slot-number">2</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
        <div class="trigger-slot" data-slot="3">
          <div class="slot-number">3</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
        <div class="trigger-slot" data-slot="4">
          <div class="slot-number">4</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
      </div>

      <!-- 左手トリガースロット -->
      <div class="hud-element left-trigger-slots">
        <div class="slots-label">左手 (Ctrl+1-4)</div>
        <div class="left-trigger-slot" data-slot="1">
          <div class="slot-number">C1</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
        <div class="left-trigger-slot" data-slot="2">
          <div class="slot-number">C2</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
        <div class="left-trigger-slot" data-slot="3">
          <div class="slot-number">C3</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
        <div class="left-trigger-slot" data-slot="4">
          <div class="slot-number">C4</div>
          <div class="slot-trigger">---</div>
          <div class="slot-cooldown"></div>
        </div>
      </div>

      <!-- FPSカウンター -->
      <div class="hud-element fps-counter">
        FPS: <span class="fps-value">60</span>
      </div>

      <!-- デバッグ情報 -->
      <div class="hud-element debug-info">
        <div class="debug-line">座標: <span class="debug-position">0, 0, 0</span></div>
        <div class="debug-line">速度: <span class="debug-velocity">0.0</span></div>
        <div class="debug-line">アクティブトリガー: <span class="debug-trigger">なし</span></div>
      </div>

      <!-- 操作ガイド -->
      <div class="hud-element controls-help">
        <div class="help-title">操作</div>
        <div class="help-line">WASD: 移動</div>
        <div class="help-line">Shift: ダッシュ</div>
        <div class="help-line">Space: ジャンプ</div>
        <div class="help-line">左クリック: 左手横薙ぎ</div>
        <div class="help-line">右クリック: 右手横薙ぎ</div>
        <div class="help-line">Q: 左手縦斬り</div>
        <div class="help-line">E: 右手縦斬り</div>
        <div class="help-line">R: 右手武器生成</div>
        <div class="help-line">T: 左手武器生成</div>
        <div class="help-line">1-4: 右手トリガー切替</div>
        <div class="help-line">Ctrl+1-4: 左手トリガー切替</div>
      </div>
    `;

    return hud;
  }

  /**
   * キャラクターの状態を更新
   */
  updateCharacter(character: Character): void {
    // トリオンゲージを更新
    const percentage = character.getTrionPercentage();
    this.trionFill.style.width = `${percentage}%`;
    
    // 色を変更（残量に応じて）
    if (percentage > 60) {
      this.trionFill.style.background = 'linear-gradient(to right, #00ff88, #00ffff)';
    } else if (percentage > 30) {
      this.trionFill.style.background = 'linear-gradient(to right, #ffff00, #ff8800)';
    } else {
      this.trionFill.style.background = 'linear-gradient(to right, #ff0000, #ff4400)';
    }

    // 数値を更新
    this.trionGauge.querySelector('.current-trion')!.textContent = 
      Math.ceil(character.stats.currentTrion).toString();
    this.trionGauge.querySelector('.max-trion')!.textContent = 
      character.stats.trionCapacity.toString();
  }

  /**
   * トリガーの状態を更新
   */
  updateTrigger(trigger: Trigger): void {
    // 現在選択中のトリガー名を更新
    const rightTriggerNameElement = document.getElementById('right-trigger-name');
    const leftTriggerNameElement = document.getElementById('left-trigger-name');
    
    if (rightTriggerNameElement) {
      if (trigger.currentTrigger) {
        const rightDefinition = TRIGGER_DEFINITIONS[trigger.currentTrigger];
        rightTriggerNameElement.textContent = rightDefinition ? rightDefinition.name : '未設定';
        rightTriggerNameElement.style.color = '#ffcc00';
      } else {
        rightTriggerNameElement.textContent = '未選択';
        rightTriggerNameElement.style.color = '#666';
      }
    }
    
    if (leftTriggerNameElement) {
      if (trigger.leftCurrentTrigger) {
        const leftDefinition = TRIGGER_DEFINITIONS[trigger.leftCurrentTrigger];
        leftTriggerNameElement.textContent = leftDefinition ? leftDefinition.name : '未設定';
        leftTriggerNameElement.style.color = '#66ccff';
        console.log('HUD: Left trigger display updated to:', leftDefinition?.name, 'Slot:', trigger.leftCurrentSlot);
      } else {
        leftTriggerNameElement.textContent = '未選択';
        leftTriggerNameElement.style.color = '#666';
        console.log('HUD: Left trigger display updated to: 未選択');
      }
    }
    
    for (let i = 0; i < 4; i++) {
      const slot = this.triggerSlots[i];
      const triggerType = trigger.getTriggerAtSlot(i + 1);
      
      if (triggerType) {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        const state = trigger.states.get(triggerType);
        
        // トリガー名を表示
        slot.querySelector('.slot-trigger')!.textContent = definition.name;
        
        // アクティブ状態（現在選択中のトリガー）
        slot.classList.toggle('active', trigger.currentSlot === i + 1);
        
        // クールダウン表示
        const cooldownElement = slot.querySelector('.slot-cooldown')! as HTMLElement;
        if (state && state.cooldownRemaining > 0) {
          const percentage = (state.cooldownRemaining / definition.cooldown) * 100;
          cooldownElement.style.display = 'block';
          cooldownElement.style.width = `${percentage}%`;
          slot.classList.add('on-cooldown');
        } else {
          cooldownElement.style.display = 'none';
          slot.classList.remove('on-cooldown');
        }
        
        // 弾数表示（該当するトリガーの場合）
        if (state && state.ammo !== undefined) {
          const ammoElement = slot.querySelector('.slot-ammo');
          if (ammoElement) {
            ammoElement.textContent = `${state.ammo}`;
          } else {
            const ammoDiv = document.createElement('div');
            ammoDiv.className = 'slot-ammo';
            ammoDiv.textContent = `${state.ammo}`;
            slot.appendChild(ammoDiv);
          }
        }
      } else {
        slot.querySelector('.slot-trigger')!.textContent = '---';
        slot.classList.remove('active', 'on-cooldown');
        (slot.querySelector('.slot-cooldown')! as HTMLElement).style.display = 'none';
      }
    }
    
    // 左手トリガーの状態を更新
    this.updateLeftTrigger(trigger);
  }

  /**
   * 左手トリガーの状態を更新
   */
  updateLeftTrigger(trigger: Trigger): void {
    for (let i = 0; i < 4; i++) {
      const slot = this.leftTriggerSlots[i];
      const triggerType = trigger.getTriggerAtCSlot(i + 1); // C1-C4スロットから取得
      
      if (triggerType) {
        const definition = TRIGGER_DEFINITIONS[triggerType];
        const state = trigger.states.get(triggerType);
        
        // トリガー名を表示
        slot.querySelector('.slot-trigger')!.textContent = definition.name;
        
        // 左手アクティブ状態（C1-C4は5-8で記録されている）
        const isActive = trigger.leftCurrentSlot === i + 5;
        slot.classList.toggle('active', isActive);
        console.log(`HUD: Left slot C${i+1}: trigger=${definition.name}, currentSlot=${trigger.leftCurrentSlot}, expectedSlot=${i+5}, active=${isActive}`);
        
        // クールダウン表示
        const cooldownElement = slot.querySelector('.slot-cooldown')! as HTMLElement;
        if (state && state.cooldownRemaining > 0) {
          const percentage = (state.cooldownRemaining / definition.cooldown) * 100;
          cooldownElement.style.display = 'block';
          cooldownElement.style.width = `${percentage}%`;
          slot.classList.add('on-cooldown');
        } else {
          cooldownElement.style.display = 'none';
          slot.classList.remove('on-cooldown');
        }
        
        // 弾数表示（該当するトリガーの場合）
        if (state && state.ammo !== undefined) {
          const ammoElement = slot.querySelector('.slot-ammo');
          if (ammoElement) {
            ammoElement.textContent = `${state.ammo}`;
          } else {
            const ammoDiv = document.createElement('div');
            ammoDiv.className = 'slot-ammo';
            ammoDiv.textContent = `${state.ammo}`;
            slot.appendChild(ammoDiv);
          }
        }
      } else {
        slot.querySelector('.slot-trigger')!.textContent = '---';
        slot.classList.remove('active', 'on-cooldown');
        (slot.querySelector('.slot-cooldown')! as HTMLElement).style.display = 'none';
      }
    }
  }

  /**
   * FPSを更新
   */
  updateFPS(_deltaTime: number): void {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsUpdate));
      this.fpsCounter.querySelector('.fps-value')!.textContent = this.fps.toString();
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }

  /**
   * デバッグ情報を更新
   */
  updateDebug(position: THREE.Vector3, velocity: number, activeTrigger: string): void {
    this.debugInfo.querySelector('.debug-position')!.textContent = 
      `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`;
    this.debugInfo.querySelector('.debug-velocity')!.textContent = 
      velocity.toFixed(1);
    this.debugInfo.querySelector('.debug-trigger')!.textContent = 
      activeTrigger || 'なし';
  }

  /**
   * 勝利メッセージを表示
   */
  showVictory(): void {
    // ゲームを停止し、Pointer Lockを解除
    this.stopGame();
    
    // Pointer Lockを強制解除
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // マウスイベントをブロック
    document.body.style.pointerEvents = 'none';
    
    // 既存のオーバーレイを削除
    const existingOverlay = document.getElementById('victory-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // オーバーレイを作成し、直接bodyに追加
    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 999999 !important;
      pointer-events: auto !important;
      font-family: Arial, sans-serif !important;
    `;
    
    // オーバーレイのマウスイベントを停止
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('mouseup', (e) => e.stopPropagation());
    overlay.addEventListener('mousemove', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());
    
    // タイトル
    const title = document.createElement('h1');
    title.textContent = '勝利！';
    title.style.cssText = 'color: white; font-size: 3rem; margin-bottom: 1rem; text-align: center;';
    
    // メッセージ
    const message = document.createElement('p');
    message.textContent = '敵を倒しました';
    message.style.cssText = 'color: white; font-size: 1.5rem; margin-bottom: 2rem; text-align: center;';
    
    // ボタン
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'もう一度';
    restartBtn.id = 'victory-restart-btn';
    restartBtn.style.cssText = `
      padding: 20px 40px !important;
      font-size: 1.5rem !important;
      background-color: #007bff !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      z-index: 1000000 !important;
      position: relative !important;
      margin: 20px !important;
    `;
    
    // 複数の方法でクリックイベントを設定
    const handleRestart = () => {
      alert('勝利ボタンがクリックされました！リロードします。');
      window.location.reload();
    };
    
    restartBtn.addEventListener('click', handleRestart);
    restartBtn.addEventListener('touchstart', handleRestart);
    restartBtn.onclick = handleRestart;
    restartBtn.ontouchstart = handleRestart;
    
    // キーボードでも操作可能に
    restartBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleRestart();
      }
    });
    
    // ホバーエフェクト
    restartBtn.addEventListener('mouseenter', () => {
      restartBtn.style.backgroundColor = '#0056b3 !important';
    });
    
    restartBtn.addEventListener('mouseleave', () => {
      restartBtn.style.backgroundColor = '#007bff !important';
    });
    
    // フォーカス可能にする
    restartBtn.tabIndex = 0;
    restartBtn.focus();
    
    // 要素を組み立て
    overlay.appendChild(title);
    overlay.appendChild(message);
    overlay.appendChild(restartBtn);
    
    // bodyに追加
    document.body.appendChild(overlay);
    
    console.warn('✅ 勝利画面が表示されました');
  }

  /**
   * 敗北メッセージを表示
   */
  showDefeat(): void {
    // ゲームを停止し、Pointer Lockを解除
    this.stopGame();
    
    // Pointer Lockを強制解除
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    
    // マウスイベントをブロック
    document.body.style.pointerEvents = 'none';
    
    // 既存のオーバーレイを削除
    const existingOverlay = document.getElementById('defeat-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    // オーバーレイを作成し、直接bodyに追加
    const overlay = document.createElement('div');
    overlay.id = 'defeat-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 999999 !important;
      pointer-events: auto !important;
      font-family: Arial, sans-serif !important;
    `;
    
    // オーバーレイのマウスイベントを停止
    overlay.addEventListener('mousedown', (e) => e.stopPropagation());
    overlay.addEventListener('mouseup', (e) => e.stopPropagation());
    overlay.addEventListener('mousemove', (e) => e.stopPropagation());
    overlay.addEventListener('click', (e) => e.stopPropagation());
    
    // タイトル
    const title = document.createElement('h1');
    title.textContent = '敗北...';
    title.style.cssText = 'color: white; font-size: 3rem; margin-bottom: 1rem; text-align: center;';
    
    // メッセージ
    const message = document.createElement('p');
    message.textContent = 'トリオンが尽きました';
    message.style.cssText = 'color: white; font-size: 1.5rem; margin-bottom: 2rem; text-align: center;';
    
    // ボタン
    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'もう一度';
    restartBtn.id = 'defeat-restart-btn';
    restartBtn.style.cssText = `
      padding: 20px 40px !important;
      font-size: 1.5rem !important;
      background-color: #dc3545 !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      cursor: pointer !important;
      pointer-events: auto !important;
      z-index: 1000000 !important;
      position: relative !important;
      margin: 20px !important;
    `;
    
    // 複数の方法でクリックイベントを設定
    const handleRestart = () => {
      alert('敗北ボタンがクリックされました！リロードします。');
      window.location.reload();
    };
    
    restartBtn.addEventListener('click', handleRestart);
    restartBtn.addEventListener('touchstart', handleRestart);
    restartBtn.onclick = handleRestart;
    restartBtn.ontouchstart = handleRestart;
    
    // キーボードでも操作可能に
    restartBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleRestart();
      }
    });
    
    // ホバーエフェクト
    restartBtn.addEventListener('mouseenter', () => {
      restartBtn.style.backgroundColor = '#a02a37 !important';
    });
    
    restartBtn.addEventListener('mouseleave', () => {
      restartBtn.style.backgroundColor = '#dc3545 !important';
    });
    
    // フォーカス可能にする
    restartBtn.tabIndex = 0;
    restartBtn.focus();
    
    // 要素を組み立て
    overlay.appendChild(title);
    overlay.appendChild(message);
    overlay.appendChild(restartBtn);
    
    // bodyに追加
    document.body.appendChild(overlay);
    
    console.warn('❌ 敗北画面が表示されました');
  }

  /**
   * ゲームを停止
   */
  private stopGame(): void {
    console.warn('🛑 ゲームを停止中...');
    
    // ゲームループを停止
    if ((window as any).gameInstance) {
      (window as any).gameInstance.stop();
      console.warn('✅ ゲームループ停止');
    }
    
    // Pointer Lockを強制解除
    if (document.pointerLockElement) {
      document.exitPointerLock();
      console.warn('✅ Pointer Lock解除');
    }
    
    // すべてのマウスイベントをブロック
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.pointerEvents = 'none';
      console.warn('✅ キャンバスイベント無効化');
    }
    
    // 入力システムを無効化
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    console.warn('✅ 入力イベント削除完了');
  }
  
  // イベントハンドラーの参照を保持するためのプロパティ
  private handleKeyDown = (_e: KeyboardEvent) => {};
  private handleKeyUp = (_e: KeyboardEvent) => {};
  private handleMouseDown = (_e: MouseEvent) => {};
  private handleMouseUp = (_e: MouseEvent) => {};
  private handleMouseMove = (_e: MouseEvent) => {};

  /**
   * HUDを破棄
   */
  destroy(): void {
    if (this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
  }
}

// HUDのスタイルを追加
const hudStyle = document.createElement('style');
hudStyle.textContent = `
.hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.hud-element {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 136, 0.3);
  font-size: 14px;
  pointer-events: auto;
  backdrop-filter: blur(5px);
}

/* 現在選択中のトリガー表示 */
.current-triggers {
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  padding: 20px;
  text-align: center;
}

.current-trigger-display {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.right-hand-trigger, .left-hand-trigger {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.hand-label {
  font-size: 12px;
  opacity: 0.8;
  font-weight: bold;
}

.trigger-name {
  font-size: 18px;
  font-weight: bold;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  min-height: 22px;
  display: flex;
  align-items: center;
}

/* トリオンゲージ */
.trion-gauge {
  bottom: 30px;
  left: 30px;
  width: 300px;
}

.gauge-label {
  color: #00ff88;
  font-weight: bold;
  margin-bottom: 5px;
}

.trion-bar {
  width: 100%;
  height: 20px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin: 5px 0;
}

.trion-fill {
  height: 100%;
  background: linear-gradient(to right, #00ff88, #00ffff);
  transition: width 0.3s ease;
  border-radius: 10px;
}

.gauge-text {
  text-align: center;
  font-size: 12px;
  color: #ccc;
}

/* 右手トリガースロット */
.trigger-slots {
  bottom: 30px;
  right: 30px;
  background: none;
  padding: 0;
}

/* 左手トリガースロット */
.left-trigger-slots {
  bottom: 30px;
  right: 380px;
  background: none;
  padding: 0;
}

.slots-label {
  color: #00ff88;
  font-size: 12px;
  text-align: center;
  margin-bottom: 5px;
  font-weight: bold;
}

.trigger-slots {
  display: flex;
  gap: 10px;
  background: none;
  padding: 0;
}

.left-trigger-slots {
  display: flex;
  gap: 10px;
  background: none;
  padding: 0;
}

.slots-label {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

.trigger-slot, .left-trigger-slot {
  width: 80px;
  height: 80px;
  background-color: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.left-trigger-slot {
  border-color: rgba(255, 136, 0, 0.3);
}

.trigger-slot.active {
  background-color: rgba(0, 255, 136, 0.3);
  border-color: #00ff88;
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
}

.left-trigger-slot.active {
  background-color: rgba(255, 136, 0, 0.3);
  border-color: #ff8800;
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(255, 136, 0, 0.5);
}

.trigger-slot.on-cooldown, .left-trigger-slot.on-cooldown {
  opacity: 0.6;
}

.slot-number {
  font-size: 10px;
  color: #888;
  margin-bottom: 2px;
}

.slot-trigger {
  font-weight: bold;
  color: #fff;
  font-size: 10px;
  line-height: 1.2;
}

.slot-cooldown {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background-color: #ff4444;
  display: none;
  transition: width 0.1s linear;
}

.slot-ammo {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 9px;
  color: #00ffff;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 1px 3px;
  border-radius: 2px;
}

/* FPSカウンター */
.fps-counter {
  top: 20px;
  right: 20px;
  font-family: monospace;
  font-size: 16px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 8px 12px;
}

.fps-value {
  color: #00ff88;
  font-weight: bold;
}

/* デバッグ情報 */
.debug-info {
  top: 20px;
  left: 20px;
  font-family: monospace;
  font-size: 12px;
  max-width: 300px;
  background-color: rgba(0, 0, 0, 0.6);
}

.debug-line {
  margin-bottom: 3px;
}

/* 操作ガイド */
.controls-help {
  top: 50%;
  left: 20px;
  transform: translateY(-50%);
  font-size: 12px;
  background-color: rgba(0, 0, 0, 0.7);
  max-width: 200px;
}

.help-title {
  color: #00ff88;
  font-weight: bold;
  margin-bottom: 8px;
  text-align: center;
}

.help-line {
  margin-bottom: 3px;
  color: #ccc;
}

/* 勝敗画面 */
.victory-screen, .defeat-screen {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.9);
  padding: 40px;
  border-radius: 15px;
  text-align: center;
  border: 2px solid #00ff88;
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.5);
}

.defeat-screen {
  border-color: #ff0044;
  box-shadow: 0 0 30px rgba(255, 0, 68, 0.5);
}

.victory-screen h1 {
  color: #00ff88;
  font-size: 48px;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.7);
}

.defeat-screen h1 {
  color: #ff0044;
  font-size: 48px;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(255, 0, 68, 0.7);
}

.restart-button {
  background: linear-gradient(to right, #00ff88, #00ffff);
  color: #000;
  border: none;
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 20px;
  transition: all 0.3s ease;
}

.restart-button:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 20px rgba(0, 255, 136, 0.5);
}
`;
document.head.appendChild(hudStyle);

// THREE.jsをインポート
import * as THREE from 'three';