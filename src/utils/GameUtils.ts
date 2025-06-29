import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { Character } from '../components/Character';

/**
 * ゲーム関連のユーティリティ関数
 */
export class GameUtils {
  /**
   * エンティティがプレイヤーかどうかを判定
   */
  static isPlayer(entity: Entity): boolean {
    return entity.hasTag('player');
  }

  /**
   * エンティティがエネミーかどうかを判定
   */
  static isEnemy(entity: Entity): boolean {
    return entity.hasTag('enemy');
  }

  /**
   * エンティティが生存しているかを判定
   */
  static isAlive(entity: Entity): boolean {
    const character = entity.getComponent(Character);
    return character ? !character.isDefeated() : false;
  }

  /**
   * 2つのエンティティ間の距離を計算
   */
  static getDistanceBetween(entity1: Entity, entity2: Entity): number {
    const transform1 = entity1.getComponent(Transform);
    const transform2 = entity2.getComponent(Transform);
    
    if (!transform1 || !transform2) return Infinity;
    
    return transform1.position.distanceTo(transform2.position);
  }

  /**
   * エンティティが攻撃範囲内にいるかを判定
   */
  static isInAttackRange(
    attacker: Entity,
    target: Entity,
    range: number,
    angle: number = Math.PI
  ): boolean {
    const attackerTransform = attacker.getComponent(Transform);
    const targetTransform = target.getComponent(Transform);
    
    if (!attackerTransform || !targetTransform) return false;
    
    const distance = this.getDistanceBetween(attacker, target);
    if (distance > range) return false;
    
    // 角度チェック（前方向のみの場合）
    if (angle < Math.PI * 2) {
      const toTarget = new THREE.Vector3()
        .subVectors(targetTransform.position, attackerTransform.position)
        .normalize();
      const forward = attackerTransform.getForward();
      const dotProduct = forward.dot(toTarget);
      const angleBetween = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
      
      return angleBetween <= angle / 2;
    }
    
    return true;
  }

  /**
   * エンティティが地面にいるかを判定
   */
  static isGrounded(entity: Entity, groundLevel: number = 0, tolerance: number = 0.1): boolean {
    const transform = entity.getComponent(Transform);
    if (!transform) return false;
    
    return Math.abs(transform.position.y - groundLevel) < tolerance;
  }

  /**
   * 境界チェック（アリーナ内かどうか）
   */
  static isWithinBounds(position: THREE.Vector3, bounds: number): boolean {
    return Math.abs(position.x) <= bounds && Math.abs(position.z) <= bounds;
  }

  /**
   * ランダムな位置を生成（境界内）
   */
  static getRandomPosition(bounds: number, height: number = 0): THREE.Vector3 {
    const x = (Math.random() - 0.5) * 2 * bounds;
    const z = (Math.random() - 0.5) * 2 * bounds;
    return new THREE.Vector3(x, height, z);
  }

  /**
   * コンソールログの色付きメッセージ
   */
  static logInfo(message: string): void {
    console.log(`%c[INFO] ${message}`, 'color: #2196F3');
  }

  static logWarning(message: string): void {
    console.warn(`%c[WARNING] ${message}`, 'color: #FF9800');
  }

  static logError(message: string): void {
    console.error(`%c[ERROR] ${message}`, 'color: #F44336');
  }

  static logSuccess(message: string): void {
    console.log(`%c[SUCCESS] ${message}`, 'color: #4CAF50');
  }
}