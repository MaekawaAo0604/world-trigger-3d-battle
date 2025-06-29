import * as THREE from 'three';
import { TriggerType } from '../triggers/TriggerDefinitions';

/**
 * 武器の3Dメッシュ生成を専門とするファクトリクラス
 * 単一責任原則に従い、武器メッシュ作成のみを担当
 */
export class WeaponFactory {
  /**
   * トリガータイプに応じた武器メッシュを作成
   */
  static createWeaponMesh(triggerType: TriggerType, isLeftHand: boolean = false): THREE.Group {
    console.log('WeaponFactory: Creating weapon mesh for:', triggerType, 'isLeftHand:', isLeftHand);
    const weaponGroup = new THREE.Group();
    
    switch (triggerType) {
      case TriggerType.KOGETSU:
        weaponGroup.add(this.createKogetsuMesh());
        break;
      case TriggerType.RAYGUST:
        weaponGroup.add(this.createRaygustMesh());
        break;
      case TriggerType.IBIS:
        weaponGroup.add(this.createIbisMesh());
        break;
      case TriggerType.LIGHTNING:
        weaponGroup.add(this.createLightningMesh());
        break;
      case TriggerType.EAGLET:
        weaponGroup.add(this.createEagletMesh());
        break;
      case TriggerType.ASTEROID_GUN:
        weaponGroup.add(this.createAsteroidGunMesh());
        break;
      default:
        weaponGroup.add(this.createDefaultSwordMesh());
        break;
    }
    
    // 武器の持ち方を調整
    this.adjustWeaponOrientation(weaponGroup, triggerType, isLeftHand);
    
    console.log('WeaponFactory: Weapon mesh created successfully');
    return weaponGroup;
  }

  /**
   * 武器の向きを調整
   */
  private static adjustWeaponOrientation(weaponGroup: THREE.Group, triggerType: TriggerType, isLeftHand: boolean): void {
    weaponGroup.position.set(0, 0, 0); // ローカル原点
    
    const isGunType = this.isGunType(triggerType);
    
    if (isGunType) {
      // 銃器類は水平に構える（傾けない）
      if (isLeftHand) {
        weaponGroup.rotation.set(0, Math.PI * 0.8, Math.PI * 0.1);
      } else {
        weaponGroup.rotation.set(0, 0, 0);
      }
    } else {
      // 剣類は体の向きに対して相対的に正面方向に傾く
      if (isLeftHand) {
        weaponGroup.rotation.set(-Math.PI / 6, Math.PI / 12, 0);
      } else {
        weaponGroup.rotation.set(-Math.PI / 6, -Math.PI / 12, 0);
      }
    }
  }

  /**
   * 銃器タイプかどうかを判定
   */
  private static isGunType(triggerType: TriggerType): boolean {
    return (
      triggerType === TriggerType.ASTEROID_GUN || 
      triggerType === TriggerType.IBIS || 
      triggerType === TriggerType.LIGHTNING ||
      triggerType === TriggerType.EAGLET
    );
  }

  /**
   * 弧月のメッシュを作成
   */
  private static createKogetsuMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    
    // 柄の中央を手の位置（原点）に配置するため、全体を上方向にシフト
    const handleOffset = 0.125; // 柄の半分の長さ
    
    // 刀身（日本刀風の細長い形状）
    const bladeGeometry = new THREE.BoxGeometry(0.03, 1.0, 0.005);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe6f3ff, // より銀色に近い刀身
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0x001122,
      emissiveIntensity: 0.1
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.5 + handleOffset, 0); // 柄分上にシフト
    swordGroup.add(blade);
    
    // 刃文（刀身の模様）
    const hamon = new THREE.BoxGeometry(0.031, 0.8, 0.001);
    const hamonMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff, // トリオン色の刃文
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x004466,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.8
    });
    
    const hamonMesh = new THREE.Mesh(hamon, hamonMaterial);
    hamonMesh.position.set(0, 0.5 + handleOffset, 0.003); // 柄分上にシフト
    swordGroup.add(hamonMesh);
    
    // 鍔（つば）
    const guardGeometry = new THREE.TorusGeometry(0.08, 0.008, 8, 16);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.3
    });
    
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.position.set(0, handleOffset, 0); // 柄の上端
    guard.rotation.x = Math.PI / 2;
    swordGroup.add(guard);
    
    // 柄（つか）
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0); // 原点に配置（手の位置）
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    return swordGroup;
  }

  /**
   * レイガストのメッシュを作成
   */
  private static createRaygustMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    
    // 柄の中央を手の位置（原点）に配置するため、全体を上方向にシフト
    const handleOffset = 0.125; // 柄の半分の長さ
    
    // 刀身（レイガスト特有の幅広形状）
    const bladeGeometry = new THREE.BoxGeometry(0.06, 1.1, 0.025);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.55 + handleOffset, 0); // 柄分上にシフト
    swordGroup.add(blade);
    
    // 柄（つか）
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0); // 原点に配置（手の位置）
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    return swordGroup;
  }

  /**
   * デフォルトの剣メッシュを作成
   */
  private static createDefaultSwordMesh(): THREE.Group {
    const swordGroup = new THREE.Group();
    
    // 柄の中央を手の位置（原点）に配置するため、全体を上方向にシフト
    const handleOffset = 0.125; // 柄の半分の長さ
    
    // 刀身（デフォルト剣の形状）
    const bladeGeometry = new THREE.BoxGeometry(0.06, 1.1, 0.025);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.9,
      roughness: 0.1
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.55 + handleOffset, 0); // 柄分上にシフト
    swordGroup.add(blade);
    
    // 柄（つか）
    const handleGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.25, 8);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0, 0); // 原点に配置（手の位置）
    handle.rotation.z = Math.PI / 2;
    swordGroup.add(handle);
    
    return swordGroup;
  }

  /**
   * アイビスのメッシュを作成
   */
  private static createIbisMesh(): THREE.Group {
    const rifleGroup = new THREE.Group();
    
    // アイビス専用のマテリアル（オレンジの重火器）
    const ibisMainMaterial = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x441100,
      emissiveIntensity: 0.3
    });
    
    const ibisAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8800,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0xffaa22,
      emissiveIntensity: 0.5
    });
    
    const ibisHeavyMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.4
    });
    
    // 太いメインバレル（アイビスの特徴的な重量感）
    const barrelGeometry = new THREE.BoxGeometry(0.12, 0.12, 1.5);
    const barrel = new THREE.Mesh(barrelGeometry, ibisMainMaterial);
    barrel.position.set(0, 0, -0.4); // 前方に配置
    rifleGroup.add(barrel);
    
    // 巨大なマズルブレーキ（アイビス特有の重火器感）
    const muzzleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.12);
    const muzzle = new THREE.Mesh(muzzleGeometry, ibisAccentMaterial);
    muzzle.position.set(0, 0, -1.16); // バレル先端
    rifleGroup.add(muzzle);
    
    // マズルフラッシュハイダー
    const flashHiderGeometry = new THREE.BoxGeometry(0.18, 0.18, 0.04);
    const flashHider = new THREE.Mesh(flashHiderGeometry, ibisAccentMaterial);
    flashHider.position.set(0, 0, -1.24);
    rifleGroup.add(flashHider);
    
    // 大型スコープ（アイビス用の高倍率スコープ）
    const scopeBodyGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.6);
    const scopeBody = new THREE.Mesh(scopeBodyGeometry, ibisMainMaterial);
    scopeBody.position.set(0, 0.12, -0.3);
    rifleGroup.add(scopeBody);
    
    // スコープレンズ（前・大型）
    const frontLensGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.03);
    const frontLensMaterial = new THREE.MeshStandardMaterial({
      color: 0x2244ff,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.9,
      emissive: 0x0044ff,
      emissiveIntensity: 0.4
    });
    const frontLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    frontLens.position.set(0, 0.12, -0.61);
    rifleGroup.add(frontLens);
    
    // スコープレンズ（後）
    const rearLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    rearLens.position.set(0, 0.12, 0.01);
    rifleGroup.add(rearLens);
    
    // 重厚なレシーバー（機関部）
    const receiverGeometry = new THREE.BoxGeometry(0.14, 0.1, 0.4);
    const receiver = new THREE.Mesh(receiverGeometry, ibisMainMaterial);
    receiver.position.set(0, 0, 0.1);
    rifleGroup.add(receiver);
    
    // 強化トリガーガード
    const triggerGuardGeometry = new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, ibisMainMaterial);
    triggerGuard.position.set(0, -0.03, 0.1);
    triggerGuard.rotation.x = Math.PI / 2;
    rifleGroup.add(triggerGuard);
    
    // 大型ピストルグリップ
    const gripGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.1);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.3,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.075, 0);
    rifleGroup.add(grip);
    
    // 頑丈なストック
    const stockGeometry = new THREE.BoxGeometry(0.1, 0.06, 0.35);
    const stock = new THREE.Mesh(stockGeometry, ibisHeavyMaterial);
    stock.position.set(0, 0, 0.3);
    rifleGroup.add(stock);
    
    // 大型バットプレート
    const buttGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.03);
    const butt = new THREE.Mesh(buttGeometry, ibisMainMaterial);
    butt.position.set(0, 0, 0.495);
    rifleGroup.add(butt);
    
    // バイポッド（二脚）- アイビスの特徴
    const bipodLegGeometry = new THREE.BoxGeometry(0.005, 0.25, 0.005);
    const bipodMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.3
    });
    
    // 左脚
    const leftLeg = new THREE.Mesh(bipodLegGeometry, bipodMaterial);
    leftLeg.position.set(-0.08, -0.125, -0.8);
    leftLeg.rotation.z = Math.PI / 12; // 少し外向き
    rifleGroup.add(leftLeg);
    
    // 右脚
    const rightLeg = new THREE.Mesh(bipodLegGeometry, bipodMaterial);
    rightLeg.position.set(0.08, -0.125, -0.8);
    rightLeg.rotation.z = -Math.PI / 12; // 少し外向き
    rifleGroup.add(rightLeg);
    
    // バイポッド取り付け部
    const bipodMountGeometry = new THREE.BoxGeometry(0.2, 0.02, 0.04);
    const bipodMount = new THREE.Mesh(bipodMountGeometry, ibisHeavyMaterial);
    bipodMount.position.set(0, -0.06, -0.8);
    rifleGroup.add(bipodMount);
    
    // 重火器らしいエネルギーチャンバー
    for (let i = 0; i < 4; i++) {
      const chamberGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.2);
      const chamberMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6600,
        emissive: 0xff6600,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.8
      });
      const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
      const angle = (i * Math.PI) / 2;
      const x = Math.cos(angle) * 0.08;
      const y = Math.sin(angle) * 0.08;
      chamber.position.set(x, y, -0.4);
      rifleGroup.add(chamber);
    }
    
    return rifleGroup;
  }

  /**
   * イーグレットのメッシュを作成
   */
  private static createEagletMesh(): THREE.Group {
    const rifleGroup = new THREE.Group();
    
    // イーグレット専用のマテリアル（青緑色の中距離狙撃銃）
    const eagletMainMaterial = new THREE.MeshStandardMaterial({
      color: 0x00aacc,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0x002244,
      emissiveIntensity: 0.3
    });
    
    const eagletAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ddff,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0088cc,
      emissiveIntensity: 0.5
    });
    
    // メインバレル（中距離狙撃銃らしい適度な長さ）
    const barrelGeometry = new THREE.BoxGeometry(0.08, 0.08, 1.0);
    const barrel = new THREE.Mesh(barrelGeometry, eagletMainMaterial);
    barrel.position.set(0, 0, -0.2); // 前方に配置
    rifleGroup.add(barrel);
    
    // マズルコンペンセーター（イーグレット特有の精密射撃用）
    const muzzleGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.08);
    const muzzle = new THREE.Mesh(muzzleGeometry, eagletAccentMaterial);
    muzzle.position.set(0, 0, -0.72); // バレル先端
    rifleGroup.add(muzzle);
    
    // 中倍率スコープ（イーグレット用の中距離スコープ）
    const scopeBodyGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.45);
    const scopeBody = new THREE.Mesh(scopeBodyGeometry, eagletMainMaterial);
    scopeBody.position.set(0, 0.09, -0.15);
    rifleGroup.add(scopeBody);
    
    // スコープレンズ（前）
    const frontLensGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.02);
    const frontLensMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      metalness: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.85,
      emissive: 0x0044bb,
      emissiveIntensity: 0.3
    });
    const frontLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    frontLens.position.set(0, 0.09, -0.385);
    rifleGroup.add(frontLens);
    
    // スコープレンズ（後）
    const rearLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    rearLens.position.set(0, 0.09, 0.075);
    rifleGroup.add(rearLens);
    
    // レシーバー（機関部）
    const receiverGeometry = new THREE.BoxGeometry(0.1, 0.07, 0.32);
    const receiver = new THREE.Mesh(receiverGeometry, eagletMainMaterial);
    receiver.position.set(0, 0, 0.08);
    rifleGroup.add(receiver);
    
    // トリガーガード
    const triggerGuardGeometry = new THREE.TorusGeometry(0.045, 0.006, 6, 12, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, eagletMainMaterial);
    triggerGuard.position.set(0, -0.025, 0.08);
    triggerGuard.rotation.x = Math.PI / 2;
    rifleGroup.add(triggerGuard);
    
    // ピストルグリップ
    const gripGeometry = new THREE.BoxGeometry(0.05, 0.13, 0.09);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.25,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.065, 0);
    rifleGroup.add(grip);
    
    // ストック（中距離用の安定したストック）
    const stockGeometry = new THREE.BoxGeometry(0.08, 0.05, 0.32);
    const stock = new THREE.Mesh(stockGeometry, gripMaterial);
    stock.position.set(0, 0, 0.26);
    rifleGroup.add(stock);
    
    // バットプレート
    const buttGeometry = new THREE.BoxGeometry(0.1, 0.07, 0.025);
    const butt = new THREE.Mesh(buttGeometry, eagletMainMaterial);
    butt.position.set(0, 0, 0.435);
    rifleGroup.add(butt);
    
    // フォアグリップ（イーグレットの特徴的な安定性向上パーツ）
    const foregripeGeometry = new THREE.BoxGeometry(0.03, 0.08, 0.06);
    const foregrip = new THREE.Mesh(foregripeGeometry, gripMaterial);
    foregrip.position.set(0, -0.05, -0.4);
    rifleGroup.add(foregrip);
    
    // サイドレール（アクセサリー取り付け用）
    const railGeometry = new THREE.BoxGeometry(0.12, 0.01, 0.6);
    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.9,
      roughness: 0.3
    });
    const topRail = new THREE.Mesh(railGeometry, railMaterial);
    topRail.position.set(0, 0.045, -0.15);
    rifleGroup.add(topRail);
    
    // エネルギーインジケーター（イーグレット特有の射程延長システム）
    for (let i = 0; i < 3; i++) {
      const indicatorGeometry = new THREE.BoxGeometry(0.008, 0.008, 0.15);
      const indicatorMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aacc,
        emissive: 0x00aacc,
        emissiveIntensity: 0.7,
        transparent: true,
        opacity: 0.9
      });
      const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
      const angle = (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * 0.05;
      const y = Math.sin(angle) * 0.05;
      indicator.position.set(x, y, -0.2);
      rifleGroup.add(indicator);
    }
    
    // 可変チョーク（イーグレットの射程調整機構）
    const chokeGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.04);
    const choke = new THREE.Mesh(chokeGeometry, eagletAccentMaterial);
    choke.position.set(0, 0, -0.78);
    rifleGroup.add(choke);
    
    return rifleGroup;
  }

  /**
   * ライトニングのメッシュを作成
   */
  private static createLightningMesh(): THREE.Group {
    const rifleGroup = new THREE.Group();
    
    // ライトニング専用のマテリアル（黄色の発光）
    const lightningMainMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x444400,
      emissiveIntensity: 0.4
    });
    
    const lightningAccentMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xffff88,
      emissiveIntensity: 0.6
    });
    
    // メインバレル（細長い狙撃銃の銃身）- 負のZ軸方向（前方）に向ける
    const barrelGeometry = new THREE.BoxGeometry(0.06, 0.06, 1.2);
    const barrel = new THREE.Mesh(barrelGeometry, lightningMainMaterial);
    barrel.position.set(0, 0, -0.3); // 負のZ軸前方にシフト
    rifleGroup.add(barrel);
    
    // 銃口部分（マズルブレーキ）- 銃身の先端
    const muzzleGeometry = new THREE.BoxGeometry(0.07, 0.07, 0.08);
    const muzzle = new THREE.Mesh(muzzleGeometry, lightningAccentMaterial);
    muzzle.position.set(0, 0, -0.94); // バレルの先端
    rifleGroup.add(muzzle);
    
    // スコープ（狙撃銃の特徴）- バレルの上
    const scopeBodyGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.4);
    const scopeBody = new THREE.Mesh(scopeBodyGeometry, lightningMainMaterial);
    scopeBody.position.set(0, 0.08, -0.2); // バレルの上
    rifleGroup.add(scopeBody);
    
    // スコープレンズ（前）- スコープの前端
    const frontLensGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.02);
    const frontLensMaterial = new THREE.MeshStandardMaterial({
      color: 0x4444ff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.8,
      emissive: 0x0022ff,
      emissiveIntensity: 0.3
    });
    const frontLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    frontLens.position.set(0, 0.08, -0.41); // スコープ前端
    rifleGroup.add(frontLens);
    
    // スコープレンズ（後）- スコープの後端
    const rearLens = new THREE.Mesh(frontLensGeometry, frontLensMaterial);
    rearLens.position.set(0, 0.08, 0.01); // スコープ後端
    rifleGroup.add(rearLens);
    
    // レシーバー（機関部）- スコープの下
    const receiverGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.3);
    const receiver = new THREE.Mesh(receiverGeometry, lightningMainMaterial);
    receiver.position.set(0, 0, 0.05); // バレル後端
    rifleGroup.add(receiver);
    
    // トリガーガード - レシーバーの下
    const triggerGuardGeometry = new THREE.TorusGeometry(0.04, 0.005, 6, 12, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, lightningMainMaterial);
    triggerGuard.position.set(0, -0.02, 0.05);
    triggerGuard.rotation.x = Math.PI / 2;
    rifleGroup.add(triggerGuard);
    
    // ピストルグリップ - 手で握る部分（原点に配置）
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.08);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.2,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.06, 0); // 原点（手の位置）
    rifleGroup.add(grip);
    
    // ストック（肩に当てる部分）- グリップの後ろ
    const stockGeometry = new THREE.BoxGeometry(0.06, 0.04, 0.25);
    const stock = new THREE.Mesh(stockGeometry, gripMaterial);
    stock.position.set(0, 0, 0.2); // グリップの後方
    rifleGroup.add(stock);
    
    // バットプレート（ストックの後端）
    const buttGeometry = new THREE.BoxGeometry(0.08, 0.06, 0.02);
    const butt = new THREE.Mesh(buttGeometry, lightningMainMaterial);
    butt.position.set(0, 0, 0.34); // ストックの後端
    rifleGroup.add(butt);
    
    // エネルギーチャンバー（ライトニングの特徴的な発光部）
    for (let i = 0; i < 3; i++) {
      const chamberGeometry = new THREE.BoxGeometry(0.006, 0.006, 0.15);
      const chamberMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffff00,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
      });
      const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
      const angle = (i * Math.PI * 2) / 3;
      const x = Math.cos(angle) * 0.04;
      const y = Math.sin(angle) * 0.04;
      chamber.position.set(x, y, -0.25);
      rifleGroup.add(chamber);
    }
    
    return rifleGroup;
  }

  /**
   * アステロイドガンのメッシュを作成
   */
  private static createAsteroidGunMesh(): THREE.Group {
    const gunGroup = new THREE.Group();
    
    // アステロイドガンのマテリアル（暗めの金属）
    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.3
    });
    
    // バレル（短めの銃身）
    const barrelGeometry = new THREE.BoxGeometry(0.04, 0.04, 0.3);
    const barrel = new THREE.Mesh(barrelGeometry, asteroidMaterial);
    barrel.position.set(0, 0, -0.1);
    gunGroup.add(barrel);
    
    // グリップ（原点に配置）
    const gripGeometry = new THREE.BoxGeometry(0.03, 0.1, 0.06);
    const grip = new THREE.Mesh(gripGeometry, asteroidMaterial);
    grip.position.set(0, -0.05, 0);
    gunGroup.add(grip);
    
    return gunGroup;
  }
}