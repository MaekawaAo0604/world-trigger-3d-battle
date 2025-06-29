import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * 攻撃アニメーションを管理するクラス
 */
export class AttackAnimations {
  /**
   * 扇形薙ぎアニメーションを実行
   */
  static animateFanSlash(_slashEntity: Entity, slashGroup: THREE.Group): void {
    const startTime = performance.now();
    const config = GAME_CONFIG.ATTACK.FAN_SLASH;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / config.ANIMATION_DURATION, 1);
      
      // 扇形と弧を徐々に描画するアニメーション
      slashGroup.children.forEach((child) => {
        const easeProgress = AttackAnimations.easeOutCubic(progress);
        const intensity = Math.sin(progress * Math.PI);
        
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          // 扇形メッシュのアニメーション
          child.material.opacity = 0.3 * intensity;
          
          // スケールアニメーション
          const scale = 0.3 + easeProgress * 0.7;
          child.scale.set(scale, scale, 1);
        } else if (child instanceof THREE.Line && child.material instanceof THREE.LineDashedMaterial) {
          // 線の長さを徐々に表示
          const totalLength = child.geometry.attributes.position.count * 0.1; // 推定線長
          const currentLength = totalLength * easeProgress;
          
          child.material.dashSize = currentLength;
          child.material.gapSize = Math.max(0.1, totalLength - currentLength);
          child.material.needsUpdate = true;
          
          // 発光効果
          child.material.opacity = 0.9 * intensity;
        }
      });
      
      // 回転は削除（カメラが動いてしまうため）
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * 縦斬りアニメーションを実行
   */
  static animateVerticalSlash(_slashEntity: Entity, slashGroup: THREE.Group): void {
    const startTime = performance.now();
    const config = GAME_CONFIG.ATTACK.VERTICAL_SLASH;
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / config.ANIMATION_DURATION, 1);
      
      // 縦扇形と弧を徐々に描画するアニメーション
      slashGroup.children.forEach((child) => {
        const easeProgress = AttackAnimations.easeOutCubic(progress);
        const intensity = Math.sin(progress * Math.PI);
        
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          // 扇形メッシュのアニメーション
          child.material.opacity = 0.3 * intensity;
          
          // スケールアニメーション
          const scale = 0.3 + easeProgress * 0.7;
          child.scale.set(scale, scale, 1);
        } else if (child instanceof THREE.Line && child.material instanceof THREE.LineDashedMaterial) {
          // 線の長さを徐々に表示（上から下へ）
          const totalLength = child.geometry.attributes.position.count * 0.1; // 推定線長
          const currentLength = totalLength * easeProgress;
          
          child.material.dashSize = currentLength;
          child.material.gapSize = Math.max(0.1, totalLength - currentLength);
          child.material.needsUpdate = true;
          
          // 発光効果
          child.material.opacity = 0.9 * intensity;
        }
      });
      
      // 位置移動は削除（カメラが動いてしまうため）
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  /**
   * イーズアウト（3次関数）
   */
  private static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

}