import * as THREE from 'three';

/**
 * 3Dメッシュを管理するコンポーネント
 */
export class MeshComponent {
  public mesh: THREE.Mesh | THREE.Group;
  public castShadow: boolean;
  public receiveShadow: boolean;

  constructor(
    mesh: THREE.Mesh | THREE.Group,
    castShadow: boolean = true,
    receiveShadow: boolean = true
  ) {
    this.mesh = mesh;
    this.castShadow = castShadow;
    this.receiveShadow = receiveShadow;

    // 影の設定を適用
    this.updateShadowSettings();
  }

  /**
   * 影の設定を更新
   */
  private updateShadowSettings(): void {
    if (this.mesh instanceof THREE.Mesh) {
      this.mesh.castShadow = this.castShadow;
      this.mesh.receiveShadow = this.receiveShadow;
    } else if (this.mesh instanceof THREE.Group) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = this.castShadow;
          child.receiveShadow = this.receiveShadow;
        }
      });
    }
  }

  /**
   * マテリアルを設定
   */
  setMaterial(material: THREE.Material): void {
    if (this.mesh instanceof THREE.Mesh) {
      this.mesh.material = material;
    } else if (this.mesh instanceof THREE.Group) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = material;
        }
      });
    }
  }

  /**
   * 可視性を設定
   */
  setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  /**
   * メッシュを破棄
   */
  dispose(): void {
    if (this.mesh instanceof THREE.Mesh) {
      this.mesh.geometry.dispose();
      if (this.mesh.material instanceof THREE.Material) {
        this.mesh.material.dispose();
      }
    } else if (this.mesh instanceof THREE.Group) {
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
  }
}