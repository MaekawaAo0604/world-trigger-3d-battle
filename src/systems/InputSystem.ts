import * as THREE from 'three';
import { System } from '../ecs/System';
import { Input } from '../components/Input';
import { RenderSystem } from './RenderSystem';
import { ShootingSystem } from './ShootingSystem';

/**
 * 入力を管理するシステム
 */
export class InputSystem extends System {
  private keys: Map<string, boolean> = new Map();
  private mouseButtons: Map<number, boolean> = new Map();
  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  
  // 前フレームの状態（ワンショット入力用）
  private previousMouseButtons: Map<number, boolean> = new Map();
  private previousKeys: Map<string, boolean> = new Map();
  private ctrlPressed: boolean = false;
  private shiftPressed: boolean = false;

  constructor() {
    super();
    this.priority = 100; // 最初に実行
    this.setupEventListeners();
  }

  /**
   * キーが押された瞬間を検出（ワンショット）
   */
  private isKeyJustPressed(key: string): boolean {
    return (this.keys.get(key) === true) && (this.previousKeys.get(key) !== true);
  }

  /**
   * マウスボタンが押された瞬間を検出（ワンショット）
   */
  private isMouseButtonJustPressed(button: number): boolean {
    return (this.mouseButtons.get(button) === true) && (this.previousMouseButtons.get(button) !== true);
  }

  requiredComponents() {
    return [Input];
  }

  private setupEventListeners(): void {
    // キーボードイベント
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.key.toLowerCase(), true);
      this.ctrlPressed = e.ctrlKey;
      this.shiftPressed = e.shiftKey;
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.key.toLowerCase(), false);
      this.ctrlPressed = e.ctrlKey;
      this.shiftPressed = e.shiftKey;
    });

    // マウスイベント
    window.addEventListener('mousedown', (e) => {
      this.mouseButtons.set(e.button, true);
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons.set(e.button, false);
    });

    window.addEventListener('mousemove', (e) => {
      this.mousePosition.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mousePosition.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // コンテキストメニューを無効化
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  update(_deltaTime: number): void {
    const entities = this.getEntities();
    const renderSystem = this.world?.getSystem(RenderSystem);

    for (const entity of entities) {
      const input = entity.getComponent(Input)!;

      // 移動入力
      const moveX = 
        (this.keys.get('d') || this.keys.get('arrowright') ? 1 : 0) +
        (this.keys.get('a') || this.keys.get('arrowleft') ? -1 : 0);
      const moveY = 
        (this.keys.get('w') || this.keys.get('arrowup') ? 1 : 0) +
        (this.keys.get('s') || this.keys.get('arrowdown') ? -1 : 0);

      input.moveDirection.set(moveX, moveY);
      if (input.moveDirection.lengthSq() > 1) {
        input.moveDirection.normalize();
      }

      // アクション入力
      input.jump = this.keys.get(' ') || false;
      input.dash = this.keys.get('shift') || false;
      input.mainRightAction = this.isMouseButtonJustPressed(0);    // 左クリック（右手メイン）
      input.subRightAction = this.isMouseButtonJustPressed(2);     // 右クリック（右手サブ）
      input.mainLeftAction = this.isKeyJustPressed('q');           // Qキー（左手メイン）
      input.subLeftAction = this.isKeyJustPressed('e');            // Eキー（左手サブ）

      // 長押し状態の検出
      input.isMainActionHeld = this.mouseButtons.get(0) || false;  // 左クリック長押し
      input.isLeftActionHeld = this.keys.get('q') || false;        // Qキー長押し
      input.generateWeapon = this.isKeyJustPressed('r');           // Rキー
      input.generateLeftWeapon = this.isKeyJustPressed('t');       // Tキー（左手武器生成）
      
      // トリガーメニュー
      input.openTriggerMenu = this.isKeyJustPressed('tab');        // Tabキー（トリガーメニュー）

      // 右手トリガー切り替え（1-4の数字キー）- 修飾キーなし
      input.triggerSlot = -1; // デフォルトはリセット
      if (!this.ctrlPressed && !this.shiftPressed) {
        for (let i = 1; i <= 4; i++) {
          if (this.keys.get(i.toString())) {
            input.triggerSlot = i;
            console.log(`Right hand slot ${i} selected`);
            break;
          }
        }
      }

      // 左手トリガー切り替え（Ctrl+1-4キーまたはShift+1-4キー）- C1-C4専用
      input.leftTriggerSlot = -1; // デフォルトはリセット
      if ((this.shiftPressed && !this.ctrlPressed) || (this.ctrlPressed && !this.shiftPressed)) {
        for (let i = 1; i <= 4; i++) {
          if (this.keys.get(i.toString())) {
            input.leftTriggerSlot = i;
            input.triggerSlot = -1; // 右手の切り替えを無効にする
            const modifier = this.shiftPressed ? 'Shift' : 'Ctrl';
            console.log(`Left hand C-slot ${i} selected (${modifier}+${i})`);
            break;
          }
        }
      }

      // マウス位置
      input.mousePosition.copy(this.mousePosition);

      // ワールド座標でのマウス位置を計算
      if (renderSystem) {
        const camera = renderSystem.getCamera();

        this.raycaster.setFromCamera(this.mousePosition, camera);
        
        // 地面との交点を計算
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, intersection);
        
        if (intersection) {
          input.mouseWorldPosition.copy(intersection);
        }
      }
    }

    // デバッグキー処理
    this.handleDebugKeys();

    // 前フレームの状態を更新
    this.updatePreviousStates();
  }

  /**
   * デバッグキーの処理
   */
  private handleDebugKeys(): void {
    const shootingSystem = this.world?.getSystem(ShootingSystem);
    
    if (!shootingSystem) return;

    // Dキーでデバッグ表示切り替え
    if (this.isKeyJustPressed('d')) {
      shootingSystem.toggleDebugMode();
    }

    // Bキーで武器射程調整（5m ⇔ 10m）
    if (this.isKeyJustPressed('b')) {
      // 現在の設定を切り替え
      const currentRange = 7.0; // デフォルト値
      const newRange = currentRange === 7.0 ? 5.0 : 7.0;
      shootingSystem.setMaxWeaponRange(newRange);
      console.log(`Weapon range set to: ${newRange}m`);
    }

    // Vキーで最大射撃射程調整（100m ⇔ 300m）
    if (this.isKeyJustPressed('v')) {
      const currentRange = 200.0; // デフォルト値
      const newRange = currentRange === 200.0 ? 100.0 : 300.0;
      shootingSystem.setMaxShootingRange(newRange);
      console.log(`Shooting range set to: ${newRange}m`);
    }
  }

  /**
   * 前フレームの状態を更新
   */
  private updatePreviousStates(): void {
    this.previousKeys.clear();
    this.previousMouseButtons.clear();
    
    for (const [key, value] of this.keys) {
      this.previousKeys.set(key, value);
    }
    
    for (const [button, value] of this.mouseButtons) {
      this.previousMouseButtons.set(button, value);
    }
  }

  /**
   * キーが押されているか確認
   */
  isKeyPressed(key: string): boolean {
    return this.keys.get(key.toLowerCase()) || false;
  }

  /**
   * マウスボタンが押されているか確認
   */
  isMouseButtonPressed(button: number): boolean {
    return this.mouseButtons.get(button) || false;
  }

  destroy(): void {
    // イベントリスナーは削除しない（グローバルで1つだけ）
    super.destroy();
  }
}