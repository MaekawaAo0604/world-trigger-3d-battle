import * as THREE from 'three';

/**
 * 数学関連のユーティリティ関数
 */
export class MathUtils {
  /**
   * 角度をラジアンに変換
   */
  static degreesToRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  /**
   * ラジアンを角度に変換
   */
  static radiansToDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }

  /**
   * 値を指定範囲内にクランプ
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 線形補間
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Vector3の線形補間
   */
  static lerpVector3(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.lerp(a.x, b.x, t),
      this.lerp(a.y, b.y, t),
      this.lerp(a.z, b.z, t)
    );
  }

  /**
   * 2点間の距離を計算
   */
  static distance(a: THREE.Vector3, b: THREE.Vector3): number {
    return a.distanceTo(b);
  }

  /**
   * 角度を正規化（-π to π）
   */
  static normalizeAngle(angle: number): number {
    return ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
  }

  /**
   * 2つのVector3の内積
   */
  static dot(a: THREE.Vector3, b: THREE.Vector3): number {
    return a.dot(b);
  }

  /**
   * 2つのVector3の外積
   */
  static cross(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3().crossVectors(a, b);
  }
}