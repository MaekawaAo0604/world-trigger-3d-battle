import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Shield } from '../components/Shield';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Input } from '../components/Input';
import { Trigger } from '../components/Trigger';
import { MeshComponent } from '../components/Mesh';
import { Collider, ColliderType, CollisionLayer } from '../components/Collider';
import { RenderSystem } from './RenderSystem';
import { TriggerType } from '../triggers/TriggerDefinitions';

/**
 * シールドの生成と管理を行うシステム
 */
export class ShieldSystem extends System {
  private shieldEntities: Map<number, Entity> = new Map(); // プレイヤーID -> シールドエンティティ
  private chargingPlayers: Set<number> = new Set(); // チャージ中のプレイヤーID

  requiredComponents() {
    return [Shield, Transform, Character];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const shield = entity.getComponent(Shield)!;
      const character = entity.getComponent(Character)!;
      const transform = entity.getComponent(Transform)!;
      const input = entity.getComponent(Input);
      const trigger = entity.getComponent(Trigger);

      if (!input || !trigger) continue;

      // シールドトリガーが選択されているかチェック
      const isShieldSelected = 
        trigger.currentTrigger === TriggerType.SHIELD || 
        trigger.leftCurrentTrigger === TriggerType.SHIELD;

      if (!isShieldSelected) {
        // シールドトリガーが選択されていない場合は既存のシールドを削除
        if (this.shieldEntities.has(entity.id)) {
          this.removeShield(entity.id);
          shield.deactivate();
          
          // シールド解除時に武器を再表示
          this.showWeaponAfterShield(entity);
        }
        continue;
      }

      // メインアクションの処理（右手または左手）
      const isRightShield = trigger.currentTrigger === TriggerType.SHIELD;
      const isMainAction = isRightShield ? input.mainRightAction : input.mainLeftAction;

      if (isMainAction && !shield.active) {
        // シールドチャージ開始
        shield.startCharge();
        this.chargingPlayers.add(entity.id);
      } else if (isMainAction && shield.active && this.chargingPlayers.has(entity.id)) {
        // チャージ継続
        shield.updateCharge(deltaTime);
      } else if (!isMainAction && this.chargingPlayers.has(entity.id)) {
        // チャージ終了、シールド展開
        this.chargingPlayers.delete(entity.id);
        
        // カメラの向きを取得
        const renderSystem = this.world?.getSystem(RenderSystem);
        const cameraRotation = renderSystem?.getCameraRotation() || { x: 0, y: 0 };
        
        shield.deploy(cameraRotation, transform.position);
        this.createShieldEntity(entity, shield, transform);
        
        // シールド展開時に対応する手の武器を隠す
        this.hideWeaponForShield(entity, isRightShield);
      }

      // シールドは展開後はトリオンを消費しない
      // （ダメージで破壊されるまで持続）
    }

    // シールドの位置を更新
    this.updateShieldPositions();
    
    // シールドへのダメージをチェック
    this.checkShieldDamage();
  }

  /**
   * シールドエンティティを作成
   */
  private createShieldEntity(
    playerEntity: Entity,
    shield: Shield,
    playerTransform: Transform
  ): void {
    // 既存のシールドがあれば削除
    if (this.shieldEntities.has(playerEntity.id)) {
      this.removeShield(playerEntity.id);
    }

    // シールドエンティティを作成
    const shieldEntity = this.world!.createEntity();
    
    // シールドのメッシュを作成
    const shieldMesh = this.createShieldMesh(shield);
    
    // シールドの位置を計算（展開位置に配置）
    const shieldTransform = new Transform(
      shield.deployPosition.clone(),
      shield.orientation.clone(),
      shield.getScale()
    );
    
    shieldEntity.addComponent(Transform, shieldTransform);
    shieldEntity.addComponent(MeshComponent, new MeshComponent(shieldMesh));
    shieldEntity.addTag('shield');
    shieldEntity.addTag(`shield-${playerEntity.id}`); // 所有者を識別
    
    // コライダーを追加（当たり判定用）
    const collider = new Collider(
      ColliderType.BOX,
      shield.getScale(),
      CollisionLayer.DEFAULT,
      0xFFFF,
      true  // isTrigger
    );
    shieldEntity.addComponent(Collider, collider);
    
    // シールドエンティティを記録
    this.shieldEntities.set(playerEntity.id, shieldEntity);
  }

  /**
   * シールドのメッシュを作成
   */
  private createShieldMesh(shield: Shield): THREE.Mesh {
    // 半透明の青いシールド
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // 耐久力に応じて色を変化（大きいシールドほど薄い色）
    const durabilityRatio = shield.getDurabilityPercentage() / 100;
    const opacity = 0.2 + (0.3 * durabilityRatio); // 0.2～0.5の範囲
    
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // エッジを光らせる
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ffff,
      linewidth: 2
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    mesh.add(edges);
    
    return mesh;
  }

  /**
   * シールドを削除
   */
  private removeShield(playerId: number): void {
    const shieldEntity = this.shieldEntities.get(playerId);
    if (shieldEntity) {
      this.world!.removeEntity(shieldEntity);
      this.shieldEntities.delete(playerId);
    }
  }

  /**
   * シールドの位置を更新（プレイヤーに追従）
   */
  private updateShieldPositions(): void {
    for (const [playerId, shieldEntity] of this.shieldEntities) {
      const playerEntity = this.world!.getEntityById(playerId);
      if (!playerEntity) {
        // プレイヤーが存在しない場合はシールドを削除
        this.removeShield(playerId);
        continue;
      }

      const playerTransform = playerEntity.getComponent(Transform);
      const shield = playerEntity.getComponent(Shield);
      const shieldTransform = shieldEntity.getComponent(Transform);
      
      if (playerTransform && shield && shieldTransform) {
        // キャラクターに追従（展開時の相対位置を維持）
        shieldTransform.position.copy(playerTransform.position).add(shield.deployOffset);
        
        // シールドの向きは変えない（展開時の向きを維持）
        shieldTransform.rotation.copy(shield.orientation);
        shieldTransform.scale.copy(shield.getScale());
      }
    }
  }
  
  /**
   * シールドへのダメージをチェック
   */
  private checkShieldDamage(): void {
    // すべての攻撃エンティティを取得
    const attackEntities = this.world!.getEntitiesWithTag('attack');
    
    for (const [playerId, shieldEntity] of this.shieldEntities) {
      const playerEntity = this.world!.getEntityById(playerId);
      if (!playerEntity) continue;
      
      const shield = playerEntity.getComponent(Shield);
      if (!shield) continue;
      
      // 攻撃との衝突をチェック
      for (const attackEntity of attackEntities) {
        const attackTransform = attackEntity.getComponent(Transform);
        const shieldTransform = shieldEntity.getComponent(Transform);
        
        if (attackTransform && shieldTransform) {
          // 簡易的な距離チェック
          const distance = attackTransform.position.distanceTo(shieldTransform.position);
          if (distance < 2) { // シールドの範囲内
            // ダメージを適用
            const damage = 30; // 固定ダメージ（後で攻撃タイプに応じて変更）
            const destroyed = shield.takeDamage(damage);
            
            if (destroyed) {
              // シールドが破壊された
              this.removeShield(playerId);
              console.log('Shield destroyed!');
            }
            
            // 攻撃を消去（シールドにブロックされた）
            this.world!.removeEntity(attackEntity);
          }
        }
      }
    }
  }

  /**
   * シールド展開時に対応する手の武器を隠す
   */
  private hideWeaponForShield(entity: Entity, isRightHand: boolean): void {
    // 全システムからTriggerSystemを探す
    const systems = (this.world as any).systems;
    let triggerSystem = null;
    
    for (const system of systems) {
      if (system.constructor.name === 'TriggerSystem') {
        triggerSystem = system;
        break;
      }
    }
    
    if (!triggerSystem) return;

    if (isRightHand) {
      // 右手シールド時は右手武器を隠す
      triggerSystem.hideEquippedWeapon(entity);
    } else {
      // 左手シールド時は左手武器を隠す
      triggerSystem.hideLeftEquippedWeapon(entity);
    }
    
    console.log(`Shield deployed, hiding ${isRightHand ? 'right' : 'left'} hand weapon`);
  }

  /**
   * シールド解除時に武器を再表示
   */
  private showWeaponAfterShield(entity: Entity): void {
    // 全システムからTriggerSystemを探す
    const systems = (this.world as any).systems;
    let triggerSystem = null;
    
    for (const system of systems) {
      if (system.constructor.name === 'TriggerSystem') {
        triggerSystem = system;
        break;
      }
    }
    
    if (!triggerSystem) return;

    // 両手の武器を再表示（どちらの手でシールドを使っていたか不明のため）
    triggerSystem.showEquippedWeapon(entity);
    triggerSystem.showLeftEquippedWeapon(entity);
    
    console.log('Shield deactivated, showing weapons');
  }
}