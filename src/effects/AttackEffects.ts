import * as THREE from 'three';
import { Entity } from '../ecs/Entity';
import { Transform } from '../components/Transform';
import { MeshComponent } from '../components/Mesh';
import { Collider, ColliderType, CollisionLayer } from '../components/Collider';
import { Character } from '../components/Character';
import { TriggerType } from '../triggers/TriggerDefinitions';
import { GAME_CONFIG } from '../config/GameConfig';

/**
 * 攻撃エフェクトを管理するクラス
 */
export class AttackEffects {
  /**
   * 扇形薙ぎエフェクトを作成（段階的表示）
   */
  static createFanSlashEffect(
    world: any,
    transform: Transform,
    triggerType: TriggerType,
    range: number,
    attackerEntity?: Entity,
    damage?: number
  ): Entity {
    const slashGroup = new THREE.Group();
    const config = GAME_CONFIG.ATTACK.FAN_SLASH;
    
    // 攻撃判定の実際の範囲（120度）
    const actualAttackAngle = (120 * Math.PI) / 180; // 120度
    
    // エフェクト表示用の狭い扇形（1度ずつ段階的表示）
    const visualSegmentAngle = (1 * Math.PI) / 180; // 1度
    // CircleGeometryの0度は右向き（+X軸）なので、正面向き（-Z軸）にするため+90度オフセット
    const baseAngle = Math.PI / 2; // +90度（正面向き）
    
    // 120度を1度ずつに分割（120セグメント）
    const segmentCount = Math.floor(actualAttackAngle / visualSegmentAngle); // 120セグメント
    const startAngle = baseAngle - actualAttackAngle / 2; // 正面から左右60度ずつ
    const segmentAngle = visualSegmentAngle; // 各セグメントは1度
    
    const fanSegments: THREE.Mesh[] = [];
    
    // 各セグメントを作成（右手側から左手側へ）
    for (let i = 0; i < segmentCount; i++) {
      const segmentStartAngle = startAngle + (i * segmentAngle);
      const segmentGeometry = new THREE.CircleGeometry(
        range * 0.8,           // 半径
        16,                    // セグメント数（細かくして滑らかに）
        segmentStartAngle,     // このセグメントの開始角度
        segmentAngle           // このセグメントの角度範囲
      );
      
      const segmentMaterial = new THREE.MeshBasicMaterial({
        color: triggerType === TriggerType.KOGETSU ? 0x00ffff : 0x00ff00,
        transparent: true,
        opacity: 0.8, // 1度セグメントなので少し濃く
        side: THREE.DoubleSide
      });
      
      const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
      
      // 3D空間での向きを調整（水平面に配置）
      segmentMesh.rotation.set(-Math.PI / 2, 0, 0);
      
      // 初期状態では非表示
      segmentMesh.visible = false;
      
      fanSegments.push(segmentMesh);
      slashGroup.add(segmentMesh);
    }
    
    // 段階的表示のアニメーション開始（120セグメント用に調整、残影付き）
    const animationDelay = Math.max(2, config.ANIMATION_DURATION / (segmentCount * 1.5)); // 各セグメントの表示間隔（最小2ms、より高速表示）
    const activeDisplayDuration = animationDelay * 0.8; // アクティブ状態の表示時間（ダメージ判定あり）
    const trailDisplayDuration = config.ANIMATION_DURATION * 0.4; // 残影の表示時間（ダメージ判定なし）
    
    fanSegments.forEach((segment, index) => {
      const material = segment.material as THREE.MeshBasicMaterial;
      const originalOpacity = material.opacity;
      
      // 段階的表示（アクティブ状態）
      setTimeout(() => {
        segment.visible = true;
        material.opacity = originalOpacity; // 濃い表示
        (segment as any).isActive = true; // ダメージ判定フラグ
      }, index * animationDelay);
      
      // アクティブ状態終了→残影状態開始
      setTimeout(() => {
        material.opacity = originalOpacity * 0.2; // 薄い残影表示（20%）
        (segment as any).isActive = false; // ダメージ判定なし
      }, index * animationDelay + activeDisplayDuration);
      
      // 完全消去
      setTimeout(() => {
        segment.visible = false;
        (segment as any).isActive = false;
      }, index * animationDelay + trailDisplayDuration);
    });
    
    // アニメーション用のプロパティを追加
    (slashGroup as any).animationStartTime = Date.now();
    (slashGroup as any).animationDuration = config.ANIMATION_DURATION;
    
    // エンティティを作成（プレイヤーの位置そのまま、TriggerSystemで位置調整）
    const slashEntity = world.createEntity();
    
    slashEntity.addComponent(Transform, new Transform(
      transform.position.clone(),
      transform.rotation.clone(),
      new THREE.Vector3(1, 1, 1)
    ));
    slashEntity.addComponent(MeshComponent, new MeshComponent(slashGroup));
    
    // アニメーション開始時間をエンティティに記録（CollisionSystemでセグメント判定に使用）
    (slashEntity as any).animationStartTime = Date.now();
    
    // 攻撃判定用のColliderを遅延追加（エフェクト表示に合わせる）
    if (attackerEntity && damage !== undefined) {
      const attackerCharacter = attackerEntity.getComponent(Character);
      const attackerTeam = attackerCharacter ? attackerCharacter.team : 0;
      
      // 攻撃者のチームによって衝突対象を決定
      const targetLayer = attackerTeam === 0 ? CollisionLayer.ENEMY : CollisionLayer.PLAYER;
      
      // 攻撃情報をエンティティに保存
      (slashEntity as any).attackInfo = {
        damage: damage,
        attackerEntity: attackerEntity,
        attackerTeam: attackerTeam,
        attackType: 'melee'
      };
      
      // 扇形攻撃の詳細な情報を保存（実際の攻撃判定範囲）
      (slashEntity as any).fanAttackInfo = {
        range: range,
        fanAngle: actualAttackAngle, // 120度（実際の攻撃判定範囲）
        baseAngle: baseAngle, // 正面向きの基準角度
        startAngle: startAngle,
        centerPosition: transform.position.clone(),
        visualSegmentAngle: visualSegmentAngle, // エフェクトの1度セグメント
        segmentCount: segmentCount // 120セグメント
      };
      
      // 最初のセグメントが表示される少し前にColliderを追加
      const firstSegmentDelay = animationDelay * 0.5; // 最初のセグメント表示の50%の時点
      setTimeout(() => {
        // 扇形攻撃用のカスタムコリジョン
        slashEntity.addComponent(Collider, new Collider(
          ColliderType.BOX, // BOXタイプを使用（カスタム判定で上書き）
          new THREE.Vector3(range, 1, range), // 基本的な範囲
          CollisionLayer.TRIGGER, // 攻撃エフェクトのレイヤー
          targetLayer // 衝突対象（敵チーム）
        ));
        console.log(`⚔️ 扇形攻撃判定開始: ${firstSegmentDelay}ms後, 範囲=${range}, 判定角度=${(actualAttackAngle * 180 / Math.PI).toFixed(1)}度, エフェクト=${segmentCount}個×${(visualSegmentAngle * 180 / Math.PI).toFixed(1)}度`);
      }, firstSegmentDelay);
      
      // アニメーション終了時にColliderを削除
      setTimeout(() => {
        const collider = slashEntity.getComponent(Collider);
        if (collider) {
          slashEntity.removeComponent(Collider);
          console.log(`🛡️ 攻撃判定終了`);
        }
      }, config.ANIMATION_DURATION);
    }
    
    return slashEntity;
  }

  /**
   * 縦斬りエフェクトを作成（段階的表示）
   */
  static createVerticalSlashEffect(
    world: any,
    transform: Transform,
    triggerType: TriggerType,
    range: number,
    attackerEntity?: Entity,
    damage?: number
  ): Entity {
    const slashGroup = new THREE.Group();
    const config = GAME_CONFIG.ATTACK.VERTICAL_SLASH;
    
    // 縦攻撃判定の実際の範囲（120度）
    const actualVerticalAttackAngle = (120 * Math.PI) / 180; // 120度
    
    // エフェクト表示用の狭い扇形（1度ずつ段階的表示）
    const visualVerticalSegmentAngle = (1 * Math.PI) / 180; // 1度
    // 縦斬りは上向き（+Y軸）を中心とする（0度基準）
    const verticalBaseAngle = 0; // 0度（右向き基準）から上向きへ
    const verticalStartAngle = verticalBaseAngle - actualVerticalAttackAngle / 2; // 上向きから左右60度ずつ
    
    // 120度を1度ずつに分割（120セグメント）
    const segmentCount = Math.floor(actualVerticalAttackAngle / visualVerticalSegmentAngle); // 120セグメント
    const segmentAngle = visualVerticalSegmentAngle; // 各セグメントは1度
    
    const fanSegments: THREE.Mesh[] = [];
    
    // 各セグメントを作成（上から下へ）
    for (let i = 0; i < segmentCount; i++) {
      const segmentStartAngle = verticalStartAngle + (i * segmentAngle);
      const segmentGeometry = new THREE.CircleGeometry(
        range * 0.8,           // 半径
        16,                    // セグメント数（細かくして滑らかに）
        segmentStartAngle,     // このセグメントの開始角度
        segmentAngle           // このセグメントの角度範囲
      );
      
      const segmentMaterial = new THREE.MeshBasicMaterial({
        color: triggerType === TriggerType.KOGETSU ? 0xff4444 : 0x44ff44,
        transparent: true,
        opacity: 0.8, // 1度セグメントなので少し濃く
        side: THREE.DoubleSide
      });
      
      const segmentMesh = new THREE.Mesh(segmentGeometry, segmentMaterial);
      
      // 3D空間での向きを調整（水平面に配置）
      segmentMesh.rotation.set(-Math.PI / 2, 0, 0);
      
      // 初期状態では非表示
      segmentMesh.visible = false;
      
      fanSegments.push(segmentMesh);
      slashGroup.add(segmentMesh);
    }
    
    // 段階的表示のアニメーション開始（120セグメント用に調整、残影付き）
    const animationDelay = Math.max(2, config.ANIMATION_DURATION / (segmentCount * 1.5)); // 各セグメントの表示間隔（最小2ms、より高速表示）
    const activeDisplayDuration = animationDelay * 0.8; // アクティブ状態の表示時間（ダメージ判定あり）
    const trailDisplayDuration = config.ANIMATION_DURATION * 0.4; // 残影の表示時間（ダメージ判定なし）
    
    fanSegments.forEach((segment, index) => {
      const material = segment.material as THREE.MeshBasicMaterial;
      const originalOpacity = material.opacity;
      
      // 段階的表示（アクティブ状態）
      setTimeout(() => {
        segment.visible = true;
        material.opacity = originalOpacity; // 濃い表示
        (segment as any).isActive = true; // ダメージ判定フラグ
      }, index * animationDelay);
      
      // アクティブ状態終了→残影状態開始
      setTimeout(() => {
        material.opacity = originalOpacity * 0.2; // 薄い残影表示（20%）
        (segment as any).isActive = false; // ダメージ判定なし
      }, index * animationDelay + activeDisplayDuration);
      
      // 完全消去
      setTimeout(() => {
        segment.visible = false;
        (segment as any).isActive = false;
      }, index * animationDelay + trailDisplayDuration);
    });
    
    // アニメーション用のプロパティを追加
    (slashGroup as any).animationStartTime = Date.now();
    (slashGroup as any).animationDuration = config.ANIMATION_DURATION;
    
    // エンティティを作成（プレイヤーの位置そのまま、TriggerSystemで位置調整）
    const slashEntity = world.createEntity();
    
    slashEntity.addComponent(Transform, new Transform(
      transform.position.clone(),
      transform.rotation.clone(),
      new THREE.Vector3(1, 1, 1)
    ));
    slashEntity.addComponent(MeshComponent, new MeshComponent(slashGroup));
    
    // アニメーション開始時間をエンティティに記録（CollisionSystemでセグメント判定に使用）
    (slashEntity as any).animationStartTime = Date.now();
    
    // 攻撃判定用のColliderを遅延追加（エフェクト表示に合わせる）
    if (attackerEntity && damage !== undefined) {
      const attackerCharacter = attackerEntity.getComponent(Character);
      const attackerTeam = attackerCharacter ? attackerCharacter.team : 0;
      
      // 攻撃者のチームによって衝突対象を決定
      const targetLayer = attackerTeam === 0 ? CollisionLayer.ENEMY : CollisionLayer.PLAYER;
      
      // 攻撃情報をエンティティに保存
      (slashEntity as any).attackInfo = {
        damage: damage,
        attackerEntity: attackerEntity,
        attackerTeam: attackerTeam,
        attackType: 'melee'
      };
      
      // 扇形攻撃の詳細な情報を保存（実際の攻撃判定範囲）
      (slashEntity as any).fanAttackInfo = {
        range: range,
        fanAngle: actualVerticalAttackAngle, // 120度（実際の攻撃判定範囲）
        baseAngle: verticalBaseAngle, // 縦斬りの基準角度
        startAngle: verticalStartAngle,
        centerPosition: transform.position.clone(),
        visualSegmentAngle: visualVerticalSegmentAngle, // エフェクトの1度セグメント
        segmentCount: segmentCount // 120セグメント
      };
      
      // 最初のセグメントが表示される少し前にColliderを追加
      const firstSegmentDelay = animationDelay * 0.5; // 最初のセグメント表示の50%の時点
      setTimeout(() => {
        // 扇形攻撃用のカスタムコリジョン
        slashEntity.addComponent(Collider, new Collider(
          ColliderType.BOX, // BOXタイプを使用（カスタム判定で上書き）
          new THREE.Vector3(range, 1, range), // 基本的な範囲
          CollisionLayer.TRIGGER, // 攻撃エフェクトのレイヤー
          targetLayer // 衝突対象（敵チーム）
        ));
        console.log(`⚔️ 縦斬り攻撃判定開始: ${firstSegmentDelay}ms後, 範囲=${range}, 判定角度=${(actualVerticalAttackAngle * 180 / Math.PI).toFixed(1)}度, エフェクト=${segmentCount}個×${(visualVerticalSegmentAngle * 180 / Math.PI).toFixed(1)}度`);
      }, firstSegmentDelay);
      
      // アニメーション終了時にColliderを削除
      setTimeout(() => {
        const collider = slashEntity.getComponent(Collider);
        if (collider) {
          slashEntity.removeComponent(Collider);
          console.log(`🛡️ 縦斬り攻撃判定終了`);
        }
      }, config.ANIMATION_DURATION);
    }
    
    return slashEntity;
  }

  /**
   * ヒットエフェクトを作成
   */
  static createHitEffect(scene: THREE.Scene, position: THREE.Vector3): void {
    const config = GAME_CONFIG.ATTACK.HIT_EFFECT;
    
    const geometry = new THREE.SphereGeometry(config.SIZE, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: config.COLOR, 
      transparent: true, 
      opacity: 0.8 
    });
    const effect = new THREE.Mesh(geometry, material);
    effect.position.copy(position);
    scene.add(effect);
    
    // 指定時間後にエフェクトを削除
    setTimeout(() => {
      scene.remove(effect);
      geometry.dispose();
      material.dispose();
    }, config.DURATION);
  }
}