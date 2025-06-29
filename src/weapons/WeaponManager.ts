import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { MeshComponent } from '../components/Mesh';
import { Trigger } from '../components/Trigger';
import { TriggerType, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';
import { WeaponFactory } from './WeaponFactory';

/**
 * 武器エンティティの管理を専門とするクラス
 * 武器の作成、削除、位置更新、表示制御を担当
 */
export class WeaponManager {
  private world: World;
  private weaponEntities: Map<number, Entity> = new Map(); // プレイヤーID -> 右手武器エンティティ
  private leftWeaponEntities: Map<number, Entity> = new Map(); // プレイヤーID -> 左手武器エンティティ

  constructor(world: World) {
    this.world = world;
  }

  /**
   * 武器の位置を更新（プレイヤーに追従）
   */
  updateWeaponPositions(): void {
    this.updateRightWeaponPositions();
    this.updateLeftWeaponPositions();
  }

  /**
   * 右手武器を作成
   */
  createRightWeapon(playerEntity: Entity, triggerType: TriggerType): void {
    console.log('WeaponManager: Creating right weapon for:', triggerType);
    
    const playerTransform = playerEntity.getComponent(Transform);
    if (!playerTransform) {
      console.log('WeaponManager: No player transform found');
      return;
    }
    
    // 既存の武器を削除
    this.removeRightWeapon(playerEntity);
    
    // 武器エンティティを作成
    const weaponEntity = this.world.createEntity();
    
    // 武器の3Dモデルを作成
    const weaponMesh = WeaponFactory.createWeaponMesh(triggerType, false);
    
    // 武器の位置を設定（プレイヤーの右手に配置）
    const weaponTransform = new Transform(
      playerTransform.position.clone(),
      playerTransform.rotation.clone(),
      new THREE.Vector3(1, 1, 1)
    );
    
    weaponEntity.addComponent(Transform, weaponTransform);
    weaponEntity.addComponent(MeshComponent, new MeshComponent(weaponMesh));
    weaponEntity.addTag('weapon');
    weaponEntity.addTag('right-weapon');
    
    // 武器エンティティを記録
    this.weaponEntities.set(playerEntity.id, weaponEntity);
    console.log('WeaponManager: Right weapon created successfully');
  }

  /**
   * 左手武器を作成
   */
  createLeftWeapon(playerEntity: Entity, triggerType: TriggerType): void {
    console.log('WeaponManager: Creating left weapon for:', triggerType);
    
    const playerTransform = playerEntity.getComponent(Transform);
    if (!playerTransform) {
      console.log('WeaponManager: No player transform found');
      return;
    }
    
    // 既存の左手武器を削除
    this.removeLeftWeapon(playerEntity);
    
    // 左手武器エンティティを作成
    const leftWeaponEntity = this.world.createEntity();
    
    // 武器の3Dモデルを作成（左手用）
    const weaponMesh = WeaponFactory.createWeaponMesh(triggerType, true);
    
    // 武器の位置を設定（プレイヤーの左手に配置）
    const weaponTransform = new Transform(
      playerTransform.position.clone(),
      playerTransform.rotation.clone(),
      new THREE.Vector3(1, 1, 1)
    );
    
    leftWeaponEntity.addComponent(Transform, weaponTransform);
    leftWeaponEntity.addComponent(MeshComponent, new MeshComponent(weaponMesh));
    leftWeaponEntity.addTag('weapon');
    leftWeaponEntity.addTag('left-weapon');
    
    // 左手武器エンティティを記録
    this.leftWeaponEntities.set(playerEntity.id, leftWeaponEntity);
    console.log('WeaponManager: Left weapon created successfully');
  }

  /**
   * 右手武器を削除
   */
  removeRightWeapon(playerEntity: Entity): void {
    const weaponEntity = this.weaponEntities.get(playerEntity.id);
    if (weaponEntity) {
      console.log('WeaponManager: Removing right weapon');
      this.world.removeEntity(weaponEntity);
      this.weaponEntities.delete(playerEntity.id);
    }
  }

  /**
   * 左手武器を削除
   */
  removeLeftWeapon(playerEntity: Entity): void {
    const leftWeaponEntity = this.leftWeaponEntities.get(playerEntity.id);
    if (leftWeaponEntity) {
      console.log('WeaponManager: Removing left weapon');
      this.world.removeEntity(leftWeaponEntity);
      this.leftWeaponEntities.delete(playerEntity.id);
    }
  }

  /**
   * すべての武器を削除
   */
  clearAllWeapons(playerEntity: Entity): void {
    this.removeRightWeapon(playerEntity);
    this.removeLeftWeapon(playerEntity);
  }

  /**
   * 右手武器を非表示にする
   */
  hideRightWeapon(playerEntity: Entity): void {
    const weaponEntity = this.weaponEntities.get(playerEntity.id);
    if (weaponEntity) {
      const meshComponent = weaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = false;
        console.log('WeaponManager: Right weapon hidden');
      }
    }
  }

  /**
   * 右手武器を表示する
   */
  showRightWeapon(playerEntity: Entity): void {
    const weaponEntity = this.weaponEntities.get(playerEntity.id);
    if (weaponEntity) {
      const meshComponent = weaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = true;
        console.log('WeaponManager: Right weapon shown');
      }
    }
  }

  /**
   * 左手武器を非表示にする
   */
  hideLeftWeapon(playerEntity: Entity): void {
    const leftWeaponEntity = this.leftWeaponEntities.get(playerEntity.id);
    if (leftWeaponEntity) {
      const meshComponent = leftWeaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = false;
        console.log('WeaponManager: Left weapon hidden');
      }
    }
  }

  /**
   * 左手武器を表示する
   */
  showLeftWeapon(playerEntity: Entity): void {
    const leftWeaponEntity = this.leftWeaponEntities.get(playerEntity.id);
    if (leftWeaponEntity) {
      const meshComponent = leftWeaponEntity.getComponent(MeshComponent);
      if (meshComponent) {
        meshComponent.mesh.visible = true;
        console.log('WeaponManager: Left weapon shown');
      }
    }
  }

  /**
   * 右手武器を取得
   */
  getRightWeapon(playerEntity: Entity): Entity | undefined {
    return this.weaponEntities.get(playerEntity.id);
  }

  /**
   * 左手武器を取得
   */
  getLeftWeapon(playerEntity: Entity): Entity | undefined {
    return this.leftWeaponEntities.get(playerEntity.id);
  }

  /**
   * 右手武器の位置を更新（プレイヤーに追従）
   */
  private updateRightWeaponPositions(): void {
    for (const [playerEntityId, weaponEntity] of this.weaponEntities) {
      const playerEntity = this.world.getEntityById(playerEntityId);
      if (!playerEntity) {
        // プレイヤーエンティティが存在しない場合は武器を削除
        this.world.removeEntity(weaponEntity);
        this.weaponEntities.delete(playerEntityId);
        continue;
      }

      const playerTransform = playerEntity.getComponent(Transform);
      const weaponTransform = weaponEntity.getComponent(Transform);
      
      if (playerTransform && weaponTransform) {
        // プレイヤーの回転を考慮した右手の位置を計算
        const rightHandOffset = new THREE.Vector3(0.35, 0.85, 0.05);
        
        // プレイヤーの回転行列を適用
        const rotatedOffset = rightHandOffset.clone();
        rotatedOffset.applyEuler(new THREE.Euler(
          playerTransform.rotation.x,
          playerTransform.rotation.y,
          playerTransform.rotation.z
        ));
        
        // 武器の位置を設定
        weaponTransform.position.copy(playerTransform.position).add(rotatedOffset);
        
        // 武器の回転をプレイヤーに合わせて調整
        this.adjustWeaponRotation(playerEntity, weaponTransform, playerTransform, false);
      }
    }
  }

  /**
   * 左手武器の位置を更新（プレイヤーに追従）
   */
  private updateLeftWeaponPositions(): void {
    for (const [playerEntityId, leftWeaponEntity] of this.leftWeaponEntities) {
      const playerEntity = this.world.getEntityById(playerEntityId);
      if (!playerEntity) {
        // プレイヤーエンティティが存在しない場合は左手武器を削除
        this.world.removeEntity(leftWeaponEntity);
        this.leftWeaponEntities.delete(playerEntityId);
        continue;
      }

      const playerTransform = playerEntity.getComponent(Transform);
      const leftWeaponTransform = leftWeaponEntity.getComponent(Transform);
      
      if (playerTransform && leftWeaponTransform) {
        // プレイヤーの回転を考慮した左手の位置を計算
        const leftHandOffset = new THREE.Vector3(-0.35, 0.85, 0.05);
        
        // プレイヤーの回転行列を適用
        const rotatedOffset = leftHandOffset.clone();
        rotatedOffset.applyEuler(new THREE.Euler(
          playerTransform.rotation.x,
          playerTransform.rotation.y,
          playerTransform.rotation.z
        ));
        
        // 左手武器の位置を設定
        leftWeaponTransform.position.copy(playerTransform.position).add(rotatedOffset);
        
        // 武器の回転をプレイヤーに合わせて調整
        this.adjustWeaponRotation(playerEntity, leftWeaponTransform, playerTransform, true);
      }
    }
  }

  /**
   * 武器の回転を調整
   */
  private adjustWeaponRotation(
    playerEntity: Entity, 
    weaponTransform: Transform, 
    playerTransform: Transform, 
    isLeftHand: boolean
  ): void {
    // 武器の回転をプレイヤーに合わせる
    weaponTransform.rotation.copy(playerTransform.rotation);
    
    // 武器の種類によって回転調整を分ける
    const triggerComponent = playerEntity.getComponent(Trigger);
    const currentTrigger = isLeftHand ? triggerComponent?.leftCurrentTrigger : triggerComponent?.currentTrigger;
    
    if (currentTrigger) {
      const definition = TRIGGER_DEFINITIONS[currentTrigger];
      const isGunType = (
        currentTrigger === TriggerType.ASTEROID_GUN || 
        currentTrigger === TriggerType.IBIS || 
        currentTrigger === TriggerType.LIGHTNING ||
        currentTrigger === TriggerType.EAGLET ||
        definition.category === 'gunner' ||
        definition.category === 'sniper'
      );
      
      if (!isGunType) {
        // 剣類のみ前方に傾ける
        const handRotationOffset = isLeftHand 
          ? new THREE.Euler(-Math.PI * 0.2, Math.PI * 0.05, 0)
          : new THREE.Euler(-Math.PI * 0.2, -Math.PI * 0.05, 0);
        
        const handQuaternion = new THREE.Quaternion();
        handQuaternion.setFromEuler(handRotationOffset);
        
        const playerQuaternion = new THREE.Quaternion();
        playerQuaternion.setFromEuler(playerTransform.rotation);
        
        const finalQuaternion = playerQuaternion.multiply(handQuaternion);
        weaponTransform.rotation.setFromQuaternion(finalQuaternion);
      }
      // 銃器類は追加回転なし（水平維持）
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // 全ての武器エンティティを削除
    for (const weaponEntity of this.weaponEntities.values()) {
      this.world.removeEntity(weaponEntity);
    }
    for (const leftWeaponEntity of this.leftWeaponEntities.values()) {
      this.world.removeEntity(leftWeaponEntity);
    }
    
    this.weaponEntities.clear();
    this.leftWeaponEntities.clear();
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): { rightWeapons: number; leftWeapons: number } {
    return {
      rightWeapons: this.weaponEntities.size,
      leftWeapons: this.leftWeaponEntities.size
    };
  }
}