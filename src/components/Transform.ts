import * as THREE from 'three';

/**
 * 位置・回転・スケールを管理するコンポーネント
 */
export class Transform {
  public position: THREE.Vector3;
  public rotation: THREE.Euler;
  public scale: THREE.Vector3;

  constructor(
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    rotation: THREE.Euler = new THREE.Euler(0, 0, 0),
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
  ) {
    this.position = position.clone();
    this.rotation = rotation.clone();
    this.scale = scale.clone();
  }

  /**
   * 前方ベクトルを取得
   */
  getForward(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyEuler(this.rotation);
    return forward.normalize();
  }

  /**
   * 右方向ベクトルを取得
   */
  getRight(): THREE.Vector3 {
    const right = new THREE.Vector3(1, 0, 0);
    right.applyEuler(this.rotation);
    return right.normalize();
  }

  /**
   * 上方向ベクトルを取得
   */
  getUp(): THREE.Vector3 {
    const up = new THREE.Vector3(0, 1, 0);
    up.applyEuler(this.rotation);
    return up.normalize();
  }

  /**
   * 指定位置を向く
   */
  lookAt(target: THREE.Vector3): void {
    const direction = new THREE.Vector3()
      .subVectors(target, this.position)
      .normalize();
    
    this.rotation.y = Math.atan2(direction.x, direction.z);
    this.rotation.x = Math.asin(-direction.y);
  }

  /**
   * 変換行列を取得
   */
  getMatrix(): THREE.Matrix4 {
    const matrix = new THREE.Matrix4();
    matrix.compose(this.position, 
      new THREE.Quaternion().setFromEuler(this.rotation), 
      this.scale
    );
    return matrix;
  }
}