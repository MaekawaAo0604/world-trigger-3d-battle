import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { World } from '../ecs/World';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Trigger } from '../components/Trigger';
import { MeshComponent } from '../components/Mesh';
import { SplittingTrigger } from '../components/SplittingTrigger';
import { TriggerType, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';
import { ShootingSystem } from '../systems/ShootingSystem';
import { RenderSystem } from '../systems/RenderSystem';

/**
 * 分割トリガー（バイパー等）専用の管理システム
 * 分割キューブの生成、更新、発射を担当
 */
export class SplittingTriggerSystem {
  private world: World;
  private splittingTriggers: Map<number, SplittingTrigger> = new Map(); // エンティティID -> 分割トリガー
  private cubeEntities: Map<number, Entity[]> = new Map(); // エンティティID -> キューブエンティティ配列

  constructor(world: World) {
    this.world = world;
  }

  /**
   * 分割トリガーかどうかを判定
   */
  isSplittingTrigger(triggerType: TriggerType): boolean {
    return triggerType === TriggerType.VIPER;
  }

  /**
   * 分割トリガーキューブを生成
   */
  generateSplittingCubes(entity: Entity, trigger: Trigger, character: Character, isLeftHand: boolean): void {
    const currentTrigger = isLeftHand ? trigger.leftCurrentTrigger : trigger.currentTrigger;
    if (!currentTrigger || !this.isSplittingTrigger(currentTrigger)) return;

    // 分割トリガーコンポーネントを取得または作成
    let splittingTrigger = this.splittingTriggers.get(entity.id);
    if (!splittingTrigger) {
      splittingTrigger = new SplittingTrigger();
      this.splittingTriggers.set(entity.id, splittingTrigger);
    }

    if (splittingTrigger.isGenerated) {
      console.log('SplittingTriggerSystem: Cubes already generated');
      return;
    }

    const definition = TRIGGER_DEFINITIONS[currentTrigger];
    
    // トリオンコストをチェック
    if (character.stats.currentTrion < definition.trionCost) {
      console.log('SplittingTriggerSystem: Insufficient trion for splitting trigger');
      return; // トリオン不足
    }

    // トリオンを消費
    character.takeDamage(definition.trionCost);

    const splitCount = splittingTrigger.getSplitCount();
    const cubes: Entity[] = [];

    // グリッド状にキューブを配置
    const gridSize = Math.sqrt(splitCount);
    const spacing = 0.3; // キューブ間の間隔

    for (let i = 0; i < splitCount; i++) {
      const cubeEntity = this.world.createEntity();
      
      // キューブのメッシュを作成
      const cubeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
      const cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.8,
        emissive: 0x004422,
        emissiveIntensity: 0.3
      });
      
      const cubeMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
      
      // キューブの位置を設定（グリッド配置）
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      // 初期位置は原点付近
      const cubeTransform = new Transform(
        new THREE.Vector3(0, 0, 0),
        new THREE.Euler(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );
      
      cubeEntity.addComponent(Transform, cubeTransform);
      cubeEntity.addComponent(MeshComponent, new MeshComponent(cubeMesh));
      cubeEntity.addTag('splitting-cube');
      
      cubes.push(cubeEntity);
    }

    this.cubeEntities.set(entity.id, cubes);
    splittingTrigger.isGenerated = true;

    console.log(`SplittingTriggerSystem: Generated ${splitCount} splitting cubes`);
  }

  /**
   * 分割トリガーキューブを分割
   */
  splitTriggerCubes(entity: Entity, isLeftHand: boolean): void {
    const splittingTrigger = this.splittingTriggers.get(entity.id);
    if (!splittingTrigger || !splittingTrigger.isGenerated) {
      console.log('SplittingTriggerSystem: No splitting trigger cubes to split');
      return;
    }

    if (splittingTrigger.canSplit()) {
      const newSplitCount = splittingTrigger.split();
      console.log(`SplittingTriggerSystem: Split cubes, new count: ${newSplitCount}`);
      
      // 既存のキューブを削除
      const existingCubes = this.cubeEntities.get(entity.id);
      if (existingCubes) {
        existingCubes.forEach(cube => this.world.removeEntity(cube));
      }
      
      // 新しいキューブ数で再生成
      const trigger = entity.getComponent(Trigger);
      const character = entity.getComponent(Character);
      if (trigger && character) {
        splittingTrigger.isGenerated = false; // 再生成を許可
        this.generateSplittingCubes(entity, trigger, character, isLeftHand);
      }
    } else {
      console.log('SplittingTriggerSystem: Maximum split level reached');
    }
  }

  /**
   * 分割トリガーを発射
   */
  fireSplittingTrigger(entity: Entity, trigger: Trigger, character: Character, transform: Transform, isLeftHand: boolean): void {
    const splittingTrigger = this.splittingTriggers.get(entity.id);
    if (!splittingTrigger || !splittingTrigger.isGenerated) {
      console.log('SplittingTriggerSystem: No splitting trigger cubes to fire');
      return;
    }

    const triggerType = isLeftHand ? trigger.leftCurrentTrigger : trigger.currentTrigger;
    if (!triggerType) return;

    const definition = TRIGGER_DEFINITIONS[triggerType];
    const splitCount = splittingTrigger.getSplitCount();
    const damagePerProjectile = definition.damage * splittingTrigger.getDamageMultiplier();

    // 各キューブから弾丸を発射
    const shootingSystem = this.world.getSystem(ShootingSystem);
    if (shootingSystem) {
      const gridSize = Math.sqrt(splitCount);
      const spacing = 0.3; // キューブ間の間隔と同じ
      
      // カメラの向きを取得
      const renderSys = this.world.getSystem(RenderSystem);
      const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
      
      // プレイヤーの右方向と上方向ベクトルを計算
      const right = new THREE.Vector3(1, 0, 0);
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
      
      const up = new THREE.Vector3(0, 1, 0);
      
      // 各キューブの位置から平行に発射
      for (let i = 0; i < splitCount; i++) {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        
        // キューブの相対位置を計算（グリッド中心からのオフセット）
        const offsetRight = (col - gridSize / 2 + 0.5) * spacing;
        const offsetUp = (row - gridSize / 2 + 0.5) * spacing;
        
        // 腕の位置からのオフセット
        const armOffset = isLeftHand ? -0.8 : 0.8;
        const forwardOffset = 2.0; // キャラクターから前方2mの位置
        
        // 発射位置を計算（キューブと同じ位置から発射）
        const firePosition = transform.position.clone();
        firePosition.addScaledVector(right, armOffset + offsetRight);
        firePosition.y += 1.2 + offsetUp; // 胸の高さ
        
        // キャラクターとの干渉を避けるため、少し前方から発射
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        firePosition.addScaledVector(forward, forwardOffset);
        
        // 平行な弾道で発射（方向は同じ、位置だけ異なる）
        const tempTransform = new Transform(
          firePosition,
          transform.rotation.clone(),
          transform.scale.clone()
        );
        
        // 一時的にtransformを置き換えて発射
        const originalTransform = entity.getComponent(Transform);
        entity.removeComponent(Transform);
        entity.addComponent(Transform, tempTransform);
        
        shootingSystem.fireProjectile(entity, tempTransform, character, triggerType, isLeftHand);
        
        // 元のtransformに戻す
        entity.removeComponent(Transform);
        entity.addComponent(Transform, originalTransform);
      }
    }

    // キューブを削除
    const cubes = this.cubeEntities.get(entity.id);
    if (cubes) {
      cubes.forEach(cube => this.world.removeEntity(cube));
      this.cubeEntities.delete(entity.id);
    }

    // 分割トリガーをリセット
    splittingTrigger.resetSplit();
    splittingTrigger.isGenerated = false;
    
    console.log(`SplittingTriggerSystem: Fired ${splitCount} projectiles from splitting trigger`);
  }

  /**
   * 分割トリガーキューブの位置を更新
   */
  updateSplittingCubes(): void {
    for (const [entityId, cubes] of this.cubeEntities) {
      const playerEntity = this.world.getEntityById(entityId);
      if (!playerEntity) {
        // プレイヤーエンティティが存在しない場合はキューブを削除
        cubes.forEach(cube => this.world.removeEntity(cube));
        this.cubeEntities.delete(entityId);
        continue;
      }

      const playerTransform = playerEntity.getComponent(Transform);
      const splittingTrigger = this.splittingTriggers.get(entityId);
      
      if (playerTransform && splittingTrigger) {
        const splitCount = splittingTrigger.getSplitCount();
        const gridSize = Math.sqrt(splitCount);
        const spacing = 0.3;
        
        // カメラの向きを取得
        const renderSys = this.world.getSystem(RenderSystem);
        const cameraRotation = renderSys?.getCameraRotation() || { x: 0, y: 0 };
        
        // プレイヤーの前方ベクトルを計算
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        
        // プレイヤーの右方向ベクトルを計算
        const right = new THREE.Vector3(1, 0, 0);
        right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
        
        cubes.forEach((cube, i) => {
          const cubeTransform = cube.getComponent(Transform);
          if (cubeTransform) {
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            // 左手か右手かを判定（分割トリガーコンポーネントから）
            const trigger = playerEntity.getComponent(Trigger);
            const isLeftHand = trigger?.leftCurrentTrigger && this.isSplittingTrigger(trigger.leftCurrentTrigger) &&
                              (!trigger.currentTrigger || !this.isSplittingTrigger(trigger.currentTrigger));
            
            // 腕の位置からのオフセット
            const armOffset = isLeftHand ? -0.8 : 0.8;
            const forwardOffset = 2.0; // キャラクターから前方2mの位置
            
            // キューブの相対位置を計算
            const offsetRight = (col - gridSize / 2 + 0.5) * spacing;
            const offsetUp = (row - gridSize / 2 + 0.5) * spacing;
            
            // キューブの位置を設定
            cubeTransform.position.copy(playerTransform.position);
            cubeTransform.position.addScaledVector(right, armOffset + offsetRight);
            cubeTransform.position.y += 1.2 + offsetUp; // 胸の高さ
            cubeTransform.position.addScaledVector(forward, forwardOffset);
            
            // キューブの回転もプレイヤーに合わせる
            cubeTransform.rotation.copy(playerTransform.rotation);
          }
        });
      }
    }
  }

  /**
   * プレイヤーの分割トリガーをクリア
   */
  clearSplittingTrigger(entityId: number): void {
    // キューブを削除
    const cubes = this.cubeEntities.get(entityId);
    if (cubes) {
      cubes.forEach(cube => this.world.removeEntity(cube));
      this.cubeEntities.delete(entityId);
    }

    // 分割トリガーをリセット
    const splittingTrigger = this.splittingTriggers.get(entityId);
    if (splittingTrigger) {
      splittingTrigger.resetSplit();
      splittingTrigger.isGenerated = false;
    }

    console.log('SplittingTriggerSystem: Cleared splitting trigger for entity', entityId);
  }

  /**
   * 分割トリガーを取得
   */
  getSplittingTrigger(entityId: number): SplittingTrigger | undefined {
    return this.splittingTriggers.get(entityId);
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    // 全ての分割キューブを削除
    for (const cubes of this.cubeEntities.values()) {
      cubes.forEach(cube => this.world.removeEntity(cube));
    }
    
    this.cubeEntities.clear();
    this.splittingTriggers.clear();
    console.log('SplittingTriggerSystem: Destroyed');
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): { activeSplittingTriggers: number; totalCubes: number } {
    let totalCubes = 0;
    for (const cubes of this.cubeEntities.values()) {
      totalCubes += cubes.length;
    }
    
    return {
      activeSplittingTriggers: this.splittingTriggers.size,
      totalCubes: totalCubes
    };
  }
}