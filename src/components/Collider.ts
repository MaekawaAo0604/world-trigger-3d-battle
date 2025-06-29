import * as THREE from 'three';

export enum ColliderType {
  BOX = 'box',
  SPHERE = 'sphere',
  CAPSULE = 'capsule'
}

export enum CollisionLayer {
  DEFAULT = 0x0001,
  PLAYER = 0x0002,
  CHARACTER = 0x0002,  // PLAYERのエイリアス
  ENEMY = 0x0004,
  PROJECTILE = 0x0008,
  TRIGGER = 0x0010,
  ENVIRONMENT = 0x0020,
  SHIELD = 0x0040
}

/**
 * 衝突判定を管理するコンポーネント
 */
export class Collider {
  public type: ColliderType;
  public size: THREE.Vector3;  // Box: 半径, Sphere: x=radius, Capsule: x=radius, y=height
  public offset: THREE.Vector3;
  public layer: number;
  public mask: number;  // 衝突対象のレイヤー
  public isTrigger: boolean;

  constructor(
    type: ColliderType,
    size: THREE.Vector3,
    layer: CollisionLayer = CollisionLayer.DEFAULT,
    mask: number = 0xFFFF,
    isTrigger: boolean = false,
    offset: THREE.Vector3 = new THREE.Vector3(0, 0, 0)
  ) {
    this.type = type;
    this.size = size.clone();
    this.offset = offset.clone();
    this.layer = layer;
    this.mask = mask;
    this.isTrigger = isTrigger;
  }

  /**
   * バウンディングボックスを取得
   */
  getBoundingBox(position: THREE.Vector3): THREE.Box3 {
    const min = position.clone().add(this.offset).sub(this.size);
    const max = position.clone().add(this.offset).add(this.size);
    return new THREE.Box3(min, max);
  }

  /**
   * バウンディングスフィアを取得
   */
  getBoundingSphere(position: THREE.Vector3): THREE.Sphere {
    const center = position.clone().add(this.offset);
    const radius = this.type === ColliderType.SPHERE ? 
      this.size.x : this.size.length();
    return new THREE.Sphere(center, radius);
  }

  /**
   * レイヤーマスクをチェック
   */
  canCollideWith(otherLayer: number): boolean {
    return (this.mask & otherLayer) !== 0;
  }

  /**
   * 衝突判定（簡易版）
   */
  intersects(
    thisPosition: THREE.Vector3,
    other: Collider,
    otherPosition: THREE.Vector3
  ): boolean {
    if (!this.canCollideWith(other.layer)) {
      return false;
    }

    // 簡易的にバウンディングスフィアで判定
    const thisSphere = this.getBoundingSphere(thisPosition);
    const otherSphere = other.getBoundingSphere(otherPosition);
    
    return thisSphere.intersectsSphere(otherSphere);
  }
}

/**
 * プリセットコライダー
 */
export const COLLIDER_PRESETS = {
  character: new Collider(
    ColliderType.CAPSULE,
    new THREE.Vector3(0.5, 1.8, 0.5),
    CollisionLayer.PLAYER
  ),
  enemy: new Collider(
    ColliderType.CAPSULE,
    new THREE.Vector3(0.5, 1.8, 0.5),
    CollisionLayer.ENEMY
  ),
  projectile: new Collider(
    ColliderType.SPHERE,
    new THREE.Vector3(0.2, 0.2, 0.2),
    CollisionLayer.PROJECTILE,
    CollisionLayer.PLAYER | CollisionLayer.ENEMY | CollisionLayer.ENVIRONMENT
  )
};