import * as THREE from 'three';

/**
 * 入力状態を管理するコンポーネント
 */
export class Input {
  // 移動入力
  public moveDirection: THREE.Vector2 = new THREE.Vector2(0, 0);
  public lookDirection: THREE.Vector2 = new THREE.Vector2(0, 0);
  
  // ボタン入力
  public jump: boolean = false;
  public dash: boolean = false;
  public mainRightAction: boolean = false;  // 右手メインアクション（右クリック）
  public subRightAction: boolean = false;   // 右手サブアクション（Eキー）
  public mainLeftAction: boolean = false;   // 左手メインアクション（左クリック）
  public subLeftAction: boolean = false;    // 左手サブアクション（Qキー）
  public generateWeapon: boolean = false;
  public generateLeftWeapon: boolean = false;  // 左手武器生成
  public isMainActionHeld: boolean = false;    // 右クリック長押し状態
  public isLeftActionHeld: boolean = false;    // 左クリック長押し状態
  
  // トリガー切り替え
  public triggerSlot: number = -1;  // 右手: 1-4の数字キー、-1は切り替えなし
  public leftTriggerSlot: number = -1;  // 左手: Shift+1-4キーでC1-C4選択、-1は切り替えなし
  
  // トリガーメニュー
  public openTriggerMenu: boolean = false;  // Tabキーでトリガーメニューを開く
  
  // マウス位置（画面座標）
  public mousePosition: THREE.Vector2 = new THREE.Vector2(0, 0);
  public mouseWorldPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  /**
   * 入力をリセット
   */
  reset(): void {
    this.moveDirection.set(0, 0);
    this.lookDirection.set(0, 0);
    this.jump = false;
    this.dash = false;
    this.mainRightAction = false;
    this.subRightAction = false;
    this.mainLeftAction = false;
    this.subLeftAction = false;
    this.generateWeapon = false;
    this.generateLeftWeapon = false;
    this.triggerSlot = -1;
    this.leftTriggerSlot = -1;
    this.openTriggerMenu = false;
    // 連射状態はリセットしない（長押し継続のため）
  }
  
  /**
   * 移動入力があるか確認
   */
  hasMovement(): boolean {
    return this.moveDirection.lengthSq() > 0.01;
  }
  
  /**
   * 視点入力があるか確認
   */
  hasLookInput(): boolean {
    return this.lookDirection.lengthSq() > 0.01;
  }
  
  /**
   * 正規化された移動方向を取得
   */
  getNormalizedMoveDirection(): THREE.Vector2 {
    return this.hasMovement() ? 
      this.moveDirection.clone().normalize() : 
      new THREE.Vector2(0, 0);
  }
}