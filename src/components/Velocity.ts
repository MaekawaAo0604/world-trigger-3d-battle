import * as THREE from 'three';

/**
 * 速度を管理するコンポーネント
 */
export class Velocity {
  public linear: THREE.Vector3;
  public angular: THREE.Vector3;
  public damping: number;

  constructor(
    linear: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    angular: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    damping: number = 0.9
  ) {
    this.linear = linear.clone();
    this.angular = angular.clone();
    this.damping = damping;
  }

  /**
   * 速度に減衰を適用
   */
  applyDamping(deltaTime: number): void {
    const dampingFactor = Math.pow(this.damping, deltaTime);
    this.linear.multiplyScalar(dampingFactor);
    this.angular.multiplyScalar(dampingFactor);
  }

  /**
   * 力を加える
   */
  addForce(force: THREE.Vector3, mass: number = 1): void {
    const acceleration = force.clone().divideScalar(mass);
    this.linear.add(acceleration);
  }

  /**
   * インパルスを加える
   */
  addImpulse(impulse: THREE.Vector3): void {
    this.linear.add(impulse);
  }

  /**
   * 速度をリセット
   */
  reset(): void {
    this.linear.set(0, 0, 0);
    this.angular.set(0, 0, 0);
  }

  /**
   * 速度の大きさを取得
   */
  getSpeed(): number {
    return this.linear.length();
  }

  /**
   * 速度を制限
   */
  clampSpeed(maxSpeed: number): void {
    const speed = this.getSpeed();
    if (speed > maxSpeed) {
      this.linear.normalize().multiplyScalar(maxSpeed);
    }
  }
}