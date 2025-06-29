import * as THREE from 'three';
import { System } from '../ecs/System';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { MeshComponent } from '../components/Mesh';
import { Velocity } from '../components/Velocity';
import { Input } from '../components/Input';
import { Character } from '../components/Character';

/**
 * アニメーション状態
 */
export enum AnimationState {
  IDLE = 'idle',
  RUNNING = 'running',
  ATTACKING = 'attacking',
  SWORD_SWING = 'sword_swing'
}

/**
 * アニメーション情報
 */
interface AnimationInfo {
  state: AnimationState;
  startTime: number;
  duration: number;
  loop: boolean;
}

/**
 * キャラクターアニメーションシステム
 */
export class AnimationSystem extends System {
  private animations: Map<number, AnimationInfo> = new Map();
  private originalPositions: Map<number, Map<string, THREE.Vector3>> = new Map();

  requiredComponents() {
    return [Transform, MeshComponent];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const mesh = entity.getComponent(MeshComponent)!;
      const velocity = entity.getComponent(Velocity);
      const input = entity.getComponent(Input);
      const character = entity.getComponent(Character);

      // 初期位置を保存
      if (!this.originalPositions.has(entity.id)) {
        this.saveOriginalPositions(entity.id, mesh.mesh);
      }

      // アニメーション状態を決定
      const newState = this.determineAnimationState(velocity, input, character);
      const currentAnimation = this.animations.get(entity.id);

      // 状態が変わったか、アニメーションが終了した場合
      if (!currentAnimation || 
          currentAnimation.state !== newState ||
          (!currentAnimation.loop && Date.now() - currentAnimation.startTime > currentAnimation.duration)) {
        this.startAnimation(entity.id, newState);
      }

      // アニメーションを実行
      this.updateAnimation(entity.id, mesh.mesh);
    }
  }

  /**
   * アニメーション状態を決定
   */
  private determineAnimationState(velocity?: Velocity, input?: Input, character?: Character): AnimationState {
    // 攻撃中かチェック（より敏感に）
    if (input && (input.primaryAttack || input.secondaryAttack)) {
      console.log('Attack detected - switching to sword swing animation');
      return AnimationState.SWORD_SWING;
    }

    // 移動中かチェック
    if (velocity && velocity.linear && velocity.linear.length() > 0.1) {
      return AnimationState.RUNNING;
    }

    return AnimationState.IDLE;
  }

  /**
   * アニメーションを開始
   */
  private startAnimation(entityId: number, state: AnimationState): void {
    const animationInfo: AnimationInfo = {
      state,
      startTime: Date.now(),
      duration: this.getAnimationDuration(state),
      loop: this.isLoopAnimation(state)
    };

    console.log(`Starting animation: ${state} for entity ${entityId}`);
    this.animations.set(entityId, animationInfo);
  }

  /**
   * アニメーションの継続時間を取得
   */
  private getAnimationDuration(state: AnimationState): number {
    switch (state) {
      case AnimationState.SWORD_SWING:
        return 400; // 0.4秒
      case AnimationState.RUNNING:
        return 1000; // 1秒（ループ）
      case AnimationState.IDLE:
        return 2000; // 2秒（ループ）
      default:
        return 1000;
    }
  }

  /**
   * ループアニメーションかどうか
   */
  private isLoopAnimation(state: AnimationState): boolean {
    return state === AnimationState.RUNNING || state === AnimationState.IDLE;
  }

  /**
   * 初期位置を保存
   */
  private saveOriginalPositions(entityId: number, mesh: THREE.Object3D): void {
    const positions = new Map<string, THREE.Vector3>();
    
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        positions.set(child.name, child.position.clone());
      }
    });

    this.originalPositions.set(entityId, positions);
  }

  /**
   * アニメーションを更新
   */
  private updateAnimation(entityId: number, mesh: THREE.Object3D): void {
    const animation = this.animations.get(entityId);
    if (!animation) return;

    const elapsed = Date.now() - animation.startTime;
    let progress = elapsed / animation.duration;

    // ループアニメーションの場合
    if (animation.loop) {
      progress = progress % 1;
    } else {
      progress = Math.min(progress, 1);
    }

    // アニメーション開始時に元の状態にリセット
    if (elapsed < 50) { // 最初の50ms以内
      this.resetToOriginalPositions(entityId, mesh);
    }

    // アニメーション状態に応じて更新
    switch (animation.state) {
      case AnimationState.RUNNING:
        this.updateRunningAnimation(mesh, progress);
        break;
      case AnimationState.SWORD_SWING:
        this.updateSwordSwingAnimation(mesh, progress);
        break;
      case AnimationState.IDLE:
        this.updateIdleAnimation(mesh, progress);
        break;
    }
  }

  /**
   * 走りアニメーション
   */
  private updateRunningAnimation(mesh: THREE.Object3D, progress: number): void {
    const rightLeg = mesh.getObjectByName('rightLeg');
    const leftLeg = mesh.getObjectByName('leftLeg');
    const rightArm = mesh.getObjectByName('rightArm');
    const leftArm = mesh.getObjectByName('leftArm');
    const rightFoot = mesh.getObjectByName('rightFoot');
    const leftFoot = mesh.getObjectByName('leftFoot');

    if (rightLeg && leftLeg) {
      // 脚の前後移動（交互、より大きく）
      const legSwing = Math.sin(progress * Math.PI * 4) * 0.8;
      rightLeg.rotation.x = legSwing;
      leftLeg.rotation.x = -legSwing;
    }

    // 靴も脚と一緒に動かす（回転のみ、位置は固定）
    if (rightFoot && leftFoot) {
      const footSwing = Math.sin(progress * Math.PI * 4) * 0.8;
      rightFoot.rotation.x = footSwing;
      leftFoot.rotation.x = -footSwing;
    }

    if (rightArm && leftArm) {
      // 腕の前後移動（脚と逆、より大きく）
      const armSwing = Math.sin(progress * Math.PI * 4) * 0.6;
      rightArm.rotation.x = -armSwing;
      leftArm.rotation.x = armSwing;
    }
  }

  /**
   * 剣振りアニメーション（横薪ぎ）
   */
  private updateSwordSwingAnimation(mesh: THREE.Object3D, progress: number): void {
    console.log(`Sword swing animation progress: ${progress}`);
    
    const rightArm = mesh.getObjectByName('rightArm');
    const rightHand = mesh.getObjectByName('rightHand');
    const leftArm = mesh.getObjectByName('leftArm');
    const torso = mesh.getObjectByName('torso');

    if (rightArm) {
      console.log('Updating right arm animation - horizontal sweep');
      // 横薪ぎモーション：右から左に薪ぐ
      if (progress < 0.2) {
        // 準備：右側に大きく構える
        const prepProgress = progress / 0.2;
        rightArm.rotation.y = Math.PI * 0.8 * prepProgress; // 右側に大きく回転
        rightArm.rotation.z = -Math.PI * 0.3 * prepProgress; // 腕を上げる
        rightArm.rotation.x = -Math.PI * 0.2 * prepProgress; // 少し後ろに
      } else if (progress < 0.6) {
        // 薪ぎ：右から左に素早く振る
        const swingProgress = (progress - 0.2) / 0.4;
        rightArm.rotation.y = Math.PI * 0.8 - Math.PI * 1.6 * swingProgress; // 左側に大きく振る
        rightArm.rotation.z = -Math.PI * 0.3 + Math.PI * 0.6 * swingProgress; // 腕を下げる
        rightArm.rotation.x = -Math.PI * 0.2 + Math.PI * 0.4 * swingProgress; // 前に出す
      } else {
        // フォロースルー：ゆっくり止める
        const followProgress = (progress - 0.6) / 0.4;
        const currentY = -Math.PI * 0.8;
        const currentZ = Math.PI * 0.3;
        const currentX = Math.PI * 0.2;
        rightArm.rotation.y = currentY + currentY * followProgress * 0.5; // ゆっくり戻す
        rightArm.rotation.z = currentZ - currentZ * followProgress;
        rightArm.rotation.x = currentX - currentX * followProgress;
      }
    }

    if (leftArm) {
      // 左腕はバランスを取るために逆方向に動かす
      const leftArmMotion = -Math.sin(progress * Math.PI) * 0.5;
      leftArm.rotation.y = leftArmMotion;
      leftArm.rotation.z = Math.sin(progress * Math.PI) * 0.3;
      leftArm.rotation.x = Math.sin(progress * Math.PI) * 0.2;
    }

    if (torso) {
      // 胴体を大きく捻って迫力を出す
      const torsoTwist = Math.sin(progress * Math.PI) * 0.4; // より大きな捻り
      torso.rotation.y = torsoTwist;
    }

    if (rightHand) {
      // 手首の動き（横薪ぎに合わせて）
      const handRotation = Math.sin(progress * Math.PI) * 0.6;
      rightHand.rotation.x = handRotation;
      rightHand.rotation.y = Math.sin(progress * Math.PI * 2) * 0.3;
    }
  }

  /**
   * アイドルアニメーション
   */
  private updateIdleAnimation(mesh: THREE.Object3D, progress: number): void {
    // 軽い浮遊感（より大きく）
    const bobAmount = Math.sin(progress * Math.PI * 2) * 0.05;
    mesh.position.y += bobAmount;

    // 腕の軽い揺れ（より大きく）
    const rightArm = mesh.getObjectByName('rightArm');
    const leftArm = mesh.getObjectByName('leftArm');
    const head = mesh.getObjectByName('head');

    if (rightArm && leftArm) {
      const armSway = Math.sin(progress * Math.PI * 2) * 0.2;
      rightArm.rotation.z = armSway;
      leftArm.rotation.z = -armSway;
      
      // 腕の前後の動き
      const armSwing = Math.sin(progress * Math.PI * 2 + Math.PI/2) * 0.1;
      rightArm.rotation.x = armSwing;
      leftArm.rotation.x = -armSwing;
    }

    if (head) {
      // 頭の軽い揺れ
      const headBob = Math.sin(progress * Math.PI * 2 + Math.PI/4) * 0.05;
      head.rotation.y = headBob;
    }

    // アイドル時は靴は動かさない（地面に固定）
  }

  /**
   * アニメーションをリセット
   */
  private resetToOriginalPositions(entityId: number, mesh: THREE.Object3D): void {
    const originalPositions = this.originalPositions.get(entityId);
    if (!originalPositions) return;

    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        const originalPos = originalPositions.get(child.name);
        if (originalPos) {
          child.position.copy(originalPos);
          child.rotation.set(0, 0, 0);
        }
      }
    });
    
    // メッシュ全体の位置もリセット
    mesh.position.y = 0;
    mesh.rotation.set(0, 0, 0);
  }

  /**
   * 特定のアニメーションを強制開始
   */
  public forceAnimation(entityId: number, state: AnimationState): void {
    this.startAnimation(entityId, state);
  }

  /**
   * アニメーションを停止
   */
  public stopAnimation(entityId: number): void {
    this.animations.delete(entityId);
    const entities = this.getEntities();
    const entity = entities.find(e => e.id === entityId);
    if (entity) {
      const mesh = entity.getComponent(MeshComponent);
      if (mesh) {
        this.resetToOriginalPositions(entityId, mesh.mesh);
      }
    }
  }
}