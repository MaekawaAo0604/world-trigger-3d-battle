import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';
import { Input } from '../components/Input';
import { Trigger } from '../components/Trigger';
import { Velocity } from '../components/Velocity';
import { MeshComponent } from '../components/Mesh';
import { TriggerType, TRIGGER_DEFINITIONS } from '../triggers/TriggerDefinitions';
import { RenderSystem } from './RenderSystem';

/**
 * グラスホッパー（空中移動）システム
 */
export class GrasshopperSystem extends System {
  private blinkCooldowns: Map<number, number> = new Map();
  private blinkEffects: Entity[] = [];

  requiredComponents() {
    return [Transform, Character, Input, Trigger];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const transform = entity.getComponent(Transform)!;
      const character = entity.getComponent(Character)!;
      const input = entity.getComponent(Input)!;
      const trigger = entity.getComponent(Trigger)!;

      // クールダウンを更新
      const cooldown = this.blinkCooldowns.get(entity.id) || 0;
      if (cooldown > 0) {
        this.blinkCooldowns.set(entity.id, cooldown - deltaTime);
      }

      // 右手でグラスホッパーが装備されている場合
      if (trigger.currentTrigger === TriggerType.GRASSHOPPER) {
        this.handleGrasshopperAction(entity, transform, character, input, trigger, false);
      }

      // 左手でグラスホッパーが装備されている場合
      if (trigger.leftCurrentTrigger === TriggerType.GRASSHOPPER) {
        this.handleGrasshopperAction(entity, transform, character, input, trigger, true);
      }
    }

    // エフェクトの更新
    this.updateBlinkEffects(deltaTime);
  }

  /**
   * グラスホッパーのアクション処理
   */
  private handleGrasshopperAction(
    entity: Entity,
    transform: Transform,
    character: Character,
    input: Input,
    trigger: Trigger,
    isLeftHand: boolean
  ): void {
    const definition = TRIGGER_DEFINITIONS[TriggerType.GRASSHOPPER];
    const cooldown = this.blinkCooldowns.get(entity.id) || 0;

    // アクション入力をチェック
    const actionPressed = isLeftHand ? input.mainLeftAction : input.mainRightAction;

    if (actionPressed && cooldown <= 0) {
      // トリオン消費をチェック
      if (character.stats.currentTrion < definition.trionCost) {
        console.log('Insufficient trion for Grasshopper');
        return;
      }

      // ブリンク実行
      this.executeGrasshopperBlink(entity, transform, character, input, definition);

      // クールダウンを設定
      this.blinkCooldowns.set(entity.id, definition.cooldown);

      console.log('Grasshopper blink executed!');
    }
  }

  /**
   * グラスホッパーのブリンク実行
   */
  private executeGrasshopperBlink(
    entity: Entity,
    transform: Transform,
    character: Character,
    input: Input,
    definition: any
  ): void {
    // トリオンを消費
    character.takeDamage(definition.trionCost);

    // ブリンク方向を決定
    const blinkDirection = this.calculateBlinkDirection(input);
    
    // ブリンク距離（トリオン量に応じて調整）
    const trionRatio = character.stats.currentTrion / character.stats.trionCapacity;
    const blinkDistance = definition.range * (0.5 + trionRatio * 0.5); // 50%～100%の距離

    // ブリンク先の位置を計算
    const blinkTarget = transform.position.clone().add(
      blinkDirection.clone().multiplyScalar(blinkDistance)
    );

    // 地面との衝突チェック（最低高度を保つ）
    blinkTarget.y = Math.max(blinkTarget.y, 1.0);

    // 開始エフェクト
    this.createBlinkEffect(transform.position.clone(), 0x00ff88);

    // 瞬間移動実行
    transform.position.copy(blinkTarget);

    // 到着エフェクト
    this.createBlinkEffect(blinkTarget.clone(), 0x88ff00);

    // 少し浮遊させる（グラスホッパーの特徴）
    const velocity = entity.getComponent(Velocity);
    if (velocity) {
      velocity.linear.y = Math.max(velocity.linear.y, 2.0); // 上向きの速度を追加
    }

    console.log(`Grasshopper blink: distance=${blinkDistance.toFixed(2)}, direction=`, blinkDirection);
  }

  /**
   * ブリンク方向を計算
   */
  private calculateBlinkDirection(input: Input): THREE.Vector3 {
    const direction = new THREE.Vector3();

    // 入力がある場合は入力方向
    if (input.moveDirection.length() > 0.1) {
      // カメラの向きを考慮した移動方向を計算
      const renderSystem = this.world?.getSystem(RenderSystem);
      const cameraRotation = renderSystem?.getCameraRotation() || { x: 0, y: 0 };

      // 前方と右方向ベクトルを計算
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

      const right = new THREE.Vector3(1, 0, 0);
      right.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);

      // 入力に基づいて方向を合成
      direction.addScaledVector(forward, input.moveDirection.y);
      direction.addScaledVector(right, input.moveDirection.x);

      // 水平方向に正規化
      direction.y = 0;
      direction.normalize();

      // 少し上向きにする（ジャンプ感を演出）
      direction.y = 0.3;
      direction.normalize();

    } else {
      // 入力がない場合は垂直上向き
      direction.set(0, 1, 0);
    }

    return direction;
  }

  /**
   * ブリンクエフェクトを作成
   */
  private createBlinkEffect(position: THREE.Vector3, color: number): void {
    const effectEntity = this.world!.createEntity();

    // エフェクトメッシュ（光る球体）
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Transform
    const effectTransform = new Transform(
      position.clone(),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );

    effectEntity.addComponent(Transform, effectTransform);
    effectEntity.addComponent(MeshComponent, new MeshComponent(mesh));
    effectEntity.addTag('grasshopper-effect');

    // エフェクトリストに追加
    this.blinkEffects.push(effectEntity);

    // パーティクル効果（追加の光の粒）
    this.createBlinkParticles(position, color);
  }

  /**
   * ブリンクパーティクル効果を作成
   */
  private createBlinkParticles(position: THREE.Vector3, color: number): void {
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
      const particleEntity = this.world!.createEntity();

      // ランダムな方向に散らばる
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.5;
      const height = Math.random() * 1.0;

      const particlePos = position.clone();
      particlePos.x += Math.cos(angle) * radius;
      particlePos.z += Math.sin(angle) * radius;
      particlePos.y += height;

      // パーティクルメッシュ（小さな光る点）
      const geometry = new THREE.SphereGeometry(0.05, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6
      });
      const mesh = new THREE.Mesh(geometry, material);

      const particleTransform = new Transform(
        particlePos,
        new THREE.Euler(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );

      particleEntity.addComponent(Transform, particleTransform);
      particleEntity.addComponent(MeshComponent, new MeshComponent(mesh));
      particleEntity.addTag('grasshopper-particle');

      this.blinkEffects.push(particleEntity);
    }
  }

  /**
   * ブリンクエフェクトを更新
   */
  private updateBlinkEffects(deltaTime: number): void {
    const effectsToRemove: Entity[] = [];

    for (const effect of this.blinkEffects) {
      const transform = effect.getComponent(Transform);
      const meshComp = effect.getComponent(MeshComponent);

      if (transform && meshComp) {
        // エフェクトのフェードアウト
        const material = (meshComp.mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity -= deltaTime * 3; // 3秒でフェードアウト

        // パーティクルの場合は少し上昇
        if (effect.hasTag('grasshopper-particle')) {
          transform.position.y += deltaTime * 2;
          transform.scale.multiplyScalar(1 + deltaTime * 2); // 拡大
        }

        // エフェクトの場合は拡大
        if (effect.hasTag('grasshopper-effect')) {
          transform.scale.multiplyScalar(1 + deltaTime * 4);
        }

        // 透明になったら削除対象に追加
        if (material.opacity <= 0) {
          effectsToRemove.push(effect);
        }
      } else {
        effectsToRemove.push(effect);
      }
    }

    // 削除対象のエフェクトを削除
    for (const effect of effectsToRemove) {
      const index = this.blinkEffects.indexOf(effect);
      if (index !== -1) {
        this.blinkEffects.splice(index, 1);
      }
      this.world!.removeEntity(effect);
    }
  }

  /**
   * システム破棄時の処理
   */
  destroy(): void {
    this.blinkCooldowns.clear();
    
    // 残っているエフェクトを削除
    for (const effect of this.blinkEffects) {
      this.world!.removeEntity(effect);
    }
    this.blinkEffects = [];

    super.destroy();
  }
}