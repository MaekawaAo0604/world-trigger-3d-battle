import * as THREE from 'three';
import { System } from '../ecs/System';
import { Transform } from '../components/Transform';
import { Velocity } from '../components/Velocity';
import { Character } from '../components/Character';
import { Input } from '../components/Input';
import { Projectile } from '../components/Projectile';
import { RenderSystem } from './RenderSystem';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * 移動を管理するシステム
 */
export class MovementSystem extends System {
  private gravity: number = GAME_CONFIG.MOVEMENT.GRAVITY;
  private jumpForce: number = GAME_CONFIG.MOVEMENT.JUMP_FORCE;
  private groundLevel: number = GAME_CONFIG.MOVEMENT.GROUND_LEVEL;
  private characterHeight: number = GAME_CONFIG.MOVEMENT.CHARACTER_HEIGHT;

  requiredComponents() {
    return [Transform, Velocity];
  }

  update(deltaTime: number): void {
    const entities = this.getEntities();

    for (const entity of entities) {
      const transform = entity.getComponent(Transform)!;
      const velocity = entity.getComponent(Velocity)!;
      const character = entity.getComponent(Character);
      const input = entity.getComponent(Input);
      const projectile = entity.getComponent(Projectile);

      // 入力による移動処理
      if (input && character) {
        this.handleInput(input, velocity, transform, character);
      }

      // 重力を適用（弾丸以外で地面にいない場合）
      if (!projectile && transform.position.y > this.groundLevel + 0.1) {
        velocity.linear.y += this.gravity * deltaTime;
      }

      // 速度を位置に適用
      const displacement = velocity.linear.clone().multiplyScalar(deltaTime);
      transform.position.add(displacement);

      // 回転を適用
      transform.rotation.x += velocity.angular.x * deltaTime;
      transform.rotation.y += velocity.angular.y * deltaTime;
      transform.rotation.z += velocity.angular.z * deltaTime;

      // 地面との衝突判定（弾丸以外のキャラクターの足元基準）
      if (!projectile && transform.position.y < this.groundLevel) {
        transform.position.y = this.groundLevel;
        velocity.linear.y = Math.max(0, velocity.linear.y);
      }

      // アリーナの境界チェック（弾丸以外）
      if (!projectile) {
        this.checkArenaBounds(transform);
      }

      // 速度減衰を適用（弾丸以外）
      if (!projectile) {
        velocity.applyDamping(deltaTime);
      }
    }
  }

  private handleInput(
    input: Input,
    velocity: Velocity,
    transform: Transform,
    character: Character
  ): void {
    // 移動入力がある場合のみ処理
    if (input.hasMovement()) {
      // 移動速度を計算
      let moveSpeed = input.dash ? 
        character.getDashSpeed() : 
        character.getMoveSpeed();

      // カメラ相対の移動方向を計算
      const renderSystem = this.world?.getSystem(RenderSystem);
      const cameraRotation = renderSystem?.getCameraRotation() || { x: 0, y: 0 };

      // エイミングモード時は移動速度を60%に減少
      if (renderSystem?.isAimingModeActive()) {
        moveSpeed *= 0.6;
      }

      // スコープモード時は移動速度を40%に減少（より大きな制限）
      if (renderSystem?.isScopeModeActive()) {
        moveSpeed *= 0.4;
      }
      
      // カメラの向きをベースに移動方向を計算
      const cameraForward = new THREE.Vector3(0, 0, -1); // カメラの前方向
      const cameraRight = new THREE.Vector3(1, 0, 0);    // カメラの右方向
      
      // カメラのY軸回転を適用
      cameraForward.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
      cameraRight.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraRotation.y);
      
      // 入力に基づいて移動方向を計算
      const moveDirection = new THREE.Vector3();
      moveDirection.add(cameraForward.multiplyScalar(input.moveDirection.y));  // W/S
      moveDirection.add(cameraRight.multiplyScalar(input.moveDirection.x));    // A/D
      
      if (moveDirection.lengthSq() > 0) {
        moveDirection.normalize();
      }

      // 速度を設定
      velocity.linear.x = moveDirection.x * moveSpeed;
      velocity.linear.z = moveDirection.z * moveSpeed;
    } else {
      // 移動入力がない場合は水平方向の速度を0にする
      velocity.linear.x = 0;
      velocity.linear.z = 0;
    }

    // ジャンプ処理
    if (input.jump && this.isGrounded(transform)) {
      velocity.linear.y = this.jumpForce;
    }

    // プレイヤーをカメラの水平方向に向ける（垂直方向は除外）
    const renderSystem = this.world?.getSystem(RenderSystem);
    if (renderSystem) {
      const cameraRotation = renderSystem.getCameraRotation();
      transform.rotation.y = cameraRotation.y;
    }
  }

  private isGrounded(transform: Transform): boolean {
    return Math.abs(transform.position.y - this.groundLevel) < 0.1;
  }

  private checkArenaBounds(transform: Transform): void {
    const bounds = GAME_CONFIG.MOVEMENT.ARENA_BOUNDS;
    
    // X軸の境界
    if (Math.abs(transform.position.x) > bounds) {
      transform.position.x = Math.sign(transform.position.x) * bounds;
    }
    
    // Z軸の境界
    if (Math.abs(transform.position.z) > bounds) {
      transform.position.z = Math.sign(transform.position.z) * bounds;
    }
  }
}