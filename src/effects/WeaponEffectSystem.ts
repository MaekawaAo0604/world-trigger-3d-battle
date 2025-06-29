import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { Velocity } from '../components/Velocity';
import { RenderSystem } from '../systems/RenderSystem';
import { AttackEffects } from './AttackEffects';

/**
 * 武器関連エフェクトの管理を専門とするクラス
 * マズルフラッシュ、軌跡エフェクト、ヒットエフェクトなどを担当
 */
export class WeaponEffectSystem {
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * マズルフラッシュエフェクトを作成
   */
  createMuzzleFlash(entity: Entity, transform: Transform, isLeftHand: boolean): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // マズル位置を計算
    const muzzleOffset = isLeftHand ? 
      new THREE.Vector3(-0.3, 1.5, 0.5) : 
      new THREE.Vector3(0.3, 1.5, 0.5);
    const muzzlePosition = transform.position.clone().add(muzzleOffset);

    // マズルフラッシュのジオメトリとマテリアル
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8
    });

    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(muzzlePosition);
    scene.add(flash);

    // 短時間後に削除
    setTimeout(() => {
      scene.remove(flash);
      flashGeometry.dispose();
      flashMaterial.dispose();
    }, 50); // 50ms後に削除

    console.log('WeaponEffectSystem: Muzzle flash created');
  }

  /**
   * ガンナー弾道軌跡エフェクトを作成
   */
  createGunnerTrailEffect(entity: Entity, transform: Transform, projectile: Entity): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // 弾丸の軌跡エフェクト（薄い青い線）
    const projectileTransform = projectile.getComponent(Transform);
    const projectileVelocity = projectile.getComponent(Velocity);
    
    if (!projectileTransform || !projectileVelocity) return;

    const startPosition = transform.position.clone().add(new THREE.Vector3(0.3, 1.5, 0.5));
    const direction = projectileVelocity.linear.clone().normalize();
    const trailLength = 2.0; // 軌跡の長さ
    const endPosition = startPosition.clone().add(direction.multiplyScalar(trailLength));

    // 軌跡ライン
    const trailGeometry = new THREE.BufferGeometry().setFromPoints([startPosition, endPosition]);
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.6,
      linewidth: 2
    });

    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);

    // 軌跡を短時間表示後削除
    setTimeout(() => {
      scene.remove(trailLine);
      trailGeometry.dispose();
      trailMaterial.dispose();
    }, 100); // 100ms後に削除

    console.log('WeaponEffectSystem: Gunner trail effect created');
  }

  /**
   * ヒットエフェクトを作成
   */
  createHitEffect(position: THREE.Vector3): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) {
      console.warn('WeaponEffectSystem: No scene available for hit effect');
      return;
    }

    // AttackEffectsクラスを使用してヒットエフェクトを作成
    AttackEffects.createHitEffect(scene, position);
    console.log('WeaponEffectSystem: Hit effect created at', position);
  }

  /**
   * スコープグリントエフェクトを作成（狙撃時の反射光）
   */
  createScopeGlint(weaponPosition: THREE.Vector3): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // スコープの反射光エフェクト
    const glintGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const glintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      emissive: 0xffffff,
      emissiveIntensity: 0.8
    });

    const glint = new THREE.Mesh(glintGeometry, glintMaterial);
    glint.position.copy(weaponPosition);
    glint.position.y += 0.1; // スコープの位置
    scene.add(glint);

    // フリッカー効果
    let opacity = 0.9;
    let increasing = false;
    const flicker = setInterval(() => {
      if (increasing) {
        opacity += 0.1;
        if (opacity >= 1.0) increasing = false;
      } else {
        opacity -= 0.1;
        if (opacity <= 0.3) increasing = true;
      }
      glintMaterial.opacity = opacity;
    }, 100);

    // 3秒後に削除
    setTimeout(() => {
      clearInterval(flicker);
      scene.remove(glint);
      glintGeometry.dispose();
      glintMaterial.dispose();
    }, 3000);

    console.log('WeaponEffectSystem: Scope glint effect created');
  }

  /**
   * 弾丸の軌跡エフェクトを作成（スナイパー用）
   */
  createSniperTrailEffect(startPos: THREE.Vector3, endPos: THREE.Vector3): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // スナイパーの軌跡（細い光の線）
    const trailGeometry = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.8,
      linewidth: 1
    });

    const trailLine = new THREE.Line(trailGeometry, trailMaterial);
    scene.add(trailLine);

    // フェードアウトアニメーション
    let opacity = 0.8;
    const fadeOut = setInterval(() => {
      opacity -= 0.1;
      trailMaterial.opacity = opacity;
      
      if (opacity <= 0) {
        clearInterval(fadeOut);
        scene.remove(trailLine);
        trailGeometry.dispose();
        trailMaterial.dispose();
      }
    }, 50);

    console.log('WeaponEffectSystem: Sniper trail effect created');
  }

  /**
   * 爆発の煙エフェクトを作成
   */
  createSmokeEffect(position: THREE.Vector3): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // 煙のパーティクル
    const smokeGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0x666666,
      transparent: true,
      opacity: 0.3
    });

    const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
    smoke.position.copy(position);
    scene.add(smoke);

    // 煙の上昇と拡散アニメーション
    let scale = 1.0;
    let opacity = 0.3;
    let yOffset = 0;
    
    const animateSmoke = () => {
      scale += 0.1;
      opacity -= 0.02;
      yOffset += 0.05;
      
      smoke.scale.setScalar(scale);
      smoke.position.y = position.y + yOffset;
      smokeMaterial.opacity = opacity;
      
      if (opacity > 0) {
        requestAnimationFrame(animateSmoke);
      } else {
        scene.remove(smoke);
        smokeGeometry.dispose();
        smokeMaterial.dispose();
      }
    };
    
    animateSmoke();
    console.log('WeaponEffectSystem: Smoke effect created');
  }

  /**
   * 武器チャージエフェクトを作成
   */
  createChargeEffect(weaponPosition: THREE.Vector3, color: number = 0x00ffff): void {
    const renderSystem = this.world.getSystem(RenderSystem);
    const scene = renderSystem?.getScene();
    if (!scene) return;

    // チャージエフェクトの球体
    const chargeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const chargeMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.7,
      emissive: color,
      emissiveIntensity: 0.5
    });

    const charge = new THREE.Mesh(chargeGeometry, chargeMaterial);
    charge.position.copy(weaponPosition);
    scene.add(charge);

    // パルス効果
    let scale = 0.5;
    let growing = true;
    
    const pulse = setInterval(() => {
      if (growing) {
        scale += 0.1;
        if (scale >= 1.5) growing = false;
      } else {
        scale -= 0.1;
        if (scale <= 0.5) growing = true;
      }
      charge.scale.setScalar(scale);
    }, 100);

    // 2秒後に削除
    setTimeout(() => {
      clearInterval(pulse);
      scene.remove(charge);
      chargeGeometry.dispose();
      chargeMaterial.dispose();
    }, 2000);

    console.log('WeaponEffectSystem: Charge effect created');
  }

  /**
   * クリーンアップ（必要に応じて）
   */
  destroy(): void {
    // 特に状態を保持していないため、現在は何もしない
    console.log('WeaponEffectSystem: Destroyed');
  }
}