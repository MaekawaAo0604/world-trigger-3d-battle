import * as THREE from 'three';

/**
 * シールドの状態を管理するコンポーネント
 */
export class Shield {
  public active: boolean = false;
  public chargeTime: number = 0;        // チャージ時間（秒）
  public size: number = 1;              // シールドのサイズ（1-3）
  public orientation: THREE.Euler;      // シールドの向き
  public deployPosition: THREE.Vector3;  // シールドを展開した位置
  public deployOffset: THREE.Vector3;    // キャラクターからの相対位置
  public trionDrainRate: number = 2;    // 秒間トリオン消費量
  public maxSize: number = 3;           // 最大サイズ
  public minSize: number = 1;           // 最小サイズ
  public chargeRate: number = 2;        // チャージ速度（サイズ/秒）
  public baseDurability: number = 100;  // 基本耐久力
  public currentDurability: number = 100; // 現在の耐久力

  constructor() {
    this.orientation = new THREE.Euler(0, 0, 0);
    this.deployPosition = new THREE.Vector3(0, 0, 0);
    this.deployOffset = new THREE.Vector3(0, 0, 0);
  }

  /**
   * シールドのチャージを開始
   */
  startCharge(): void {
    this.active = true;
    this.chargeTime = 0;
    this.size = this.minSize;
  }

  /**
   * チャージを更新
   */
  updateCharge(deltaTime: number): void {
    if (!this.active) return;
    
    this.chargeTime += deltaTime;
    // チャージ時間に応じてサイズを計算
    this.size = Math.min(
      this.minSize + this.chargeTime * this.chargeRate,
      this.maxSize
    );
  }

  /**
   * シールドを展開（チャージ終了）
   */
  deploy(cameraRotation: { x: number, y: number }, playerPosition: THREE.Vector3): void {
    // カメラの向きをシールドの向きに設定
    this.orientation.set(cameraRotation.x, cameraRotation.y, 0);
    
    // カメラの向きから前方ベクトルを計算
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(this.orientation);
    
    // シールドをキャラクターの前方2メートルに配置
    const distance = 2.0;
    this.deployPosition = playerPosition.clone().add(forward.multiplyScalar(distance));
    
    // キャラクターからの相対位置を記録
    this.deployOffset = this.deployPosition.clone().sub(playerPosition);
    
    // サイズに反比例した耐久力を設定
    // サイズ1: 100%, サイズ2: 50%, サイズ3: 33%
    const durabilityMultiplier = 1 / this.size;
    this.currentDurability = this.baseDurability * durabilityMultiplier;
  }

  /**
   * シールドを解除
   */
  deactivate(): void {
    this.active = false;
    this.chargeTime = 0;
    this.size = this.minSize;
    this.currentDurability = this.baseDurability;
  }

  /**
   * トリオン消費量を取得
   */
  getTrionCost(): number {
    // サイズに応じてトリオン消費量を増加
    return this.trionDrainRate * this.size;
  }

  /**
   * シールドの実際のサイズを取得（3Dスケール用）
   */
  getScale(): THREE.Vector3 {
    // 横幅はサイズに応じて増加、高さは固定
    return new THREE.Vector3(this.size * 1.5, 2, 0.1);
  }

  /**
   * ダメージを受ける
   */
  takeDamage(damage: number): boolean {
    this.currentDurability -= damage;
    
    // 耐久力が0以下になったら破壊
    if (this.currentDurability <= 0) {
      this.deactivate();
      return true; // 破壊された
    }
    return false; // まだ耐えている
  }

  /**
   * 耐久力の割合を取得
   */
  getDurabilityPercentage(): number {
    const maxDurability = this.baseDurability / this.size;
    return (this.currentDurability / maxDurability) * 100;
  }
}