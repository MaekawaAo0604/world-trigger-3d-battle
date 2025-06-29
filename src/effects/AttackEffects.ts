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
    
    // 扇形を複数のセグメントに分割（正面中心の150度扇形）
    const fanAngle = (5 * Math.PI) / 6; // 150度
    // CircleGeometryの0度は右向き（+X軸）なので、正面向き（-Z軸）にするため+90度オフセット
    const baseAngle = Math.PI / 2; // +90度（正面向き）
    const startAngle = baseAngle - fanAngle / 2; // 正面から左右75度ずつ
    const segmentCount = 8; // 8つのセグメントに分割
    const segmentAngle = fanAngle / segmentCount;
    
    const fanSegments: THREE.Mesh[] = [];
    
    // 各セグメントを作成（右手側から左手側へ）
    for (let i = 0; i < segmentCount; i++) {
      const segmentStartAngle = startAngle + (i * segmentAngle);
      const segmentGeometry = new THREE.CircleGeometry(
        range * 0.8,           // 半径
        8,                     // セグメント数（少なくして軽量化）
        segmentStartAngle,     // このセグメントの開始角度
        segmentAngle           // このセグメントの角度範囲
      );
      
      const segmentMaterial = new THREE.MeshBasicMaterial({
        color: triggerType === TriggerType.KOGETSU ? 0x00ffff : 0x00ff00,
        transparent: true,
        opacity: 0.3,
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
    
    // 段階的表示のアニメーション開始
    const animationDelay = config.ANIMATION_DURATION / segmentCount; // 各セグメントの表示間隔
    const segmentDisplayDuration = config.ANIMATION_DURATION * 0.3; // 各セグメントの表示時間（全体の30%）
    
    fanSegments.forEach((segment, index) => {
      // 段階的表示
      setTimeout(() => {
        segment.visible = true;
      }, index * animationDelay);
      
      // 段階的消去
      setTimeout(() => {
        segment.visible = false;
      }, index * animationDelay + segmentDisplayDuration);
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
      
      // 最初のセグメントが表示される少し前にColliderを追加
      const firstSegmentDelay = animationDelay * 0.5; // 最初のセグメント表示の50%の時点
      setTimeout(() => {
        slashEntity.addComponent(Collider, new Collider(
          ColliderType.SPHERE,
          new THREE.Vector3(range, 1, range), // 扇形攻撃の範囲
          CollisionLayer.TRIGGER, // 攻撃エフェクトのレイヤー
          targetLayer // 衝突対象（敵チーム）
        ));
        console.log(`⚔️ 攻撃判定開始: ${firstSegmentDelay}ms後`);
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
    
    // 縦扇形を複数のセグメントに分割（上から下へ順次表示）
    const verticalFanAngle = (5 * Math.PI) / 6; // 150度
    // 縦斬りは上向き（+Y軸）を中心とする（0度基準）
    const verticalBaseAngle = 0; // 0度（右向き基準）から上向きへ
    const verticalStartAngle = verticalBaseAngle - verticalFanAngle / 2; // 上向きから左右75度ずつ
    const segmentCount = 8; // 8つのセグメントに分割
    const segmentAngle = verticalFanAngle / segmentCount;
    
    const fanSegments: THREE.Mesh[] = [];
    
    // 各セグメントを作成（上から下へ）
    for (let i = 0; i < segmentCount; i++) {
      const segmentStartAngle = verticalStartAngle + (i * segmentAngle);
      const segmentGeometry = new THREE.CircleGeometry(
        range * 0.8,           // 半径
        8,                     // セグメント数（少なくして軽量化）
        segmentStartAngle,     // このセグメントの開始角度
        segmentAngle           // このセグメントの角度範囲
      );
      
      const segmentMaterial = new THREE.MeshBasicMaterial({
        color: triggerType === TriggerType.KOGETSU ? 0xff4444 : 0x44ff44,
        transparent: true,
        opacity: 0.3,
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
    
    // 段階的表示のアニメーション開始（上から下へ）
    const animationDelay = config.ANIMATION_DURATION / segmentCount; // 各セグメントの表示間隔
    const segmentDisplayDuration = config.ANIMATION_DURATION * 0.3; // 各セグメントの表示時間（全体の30%）
    
    fanSegments.forEach((segment, index) => {
      // 段階的表示
      setTimeout(() => {
        segment.visible = true;
      }, index * animationDelay);
      
      // 段階的消去
      setTimeout(() => {
        segment.visible = false;
      }, index * animationDelay + segmentDisplayDuration);
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
      
      // 最初のセグメントが表示される少し前にColliderを追加
      const firstSegmentDelay = animationDelay * 0.5; // 最初のセグメント表示の50%の時点
      setTimeout(() => {
        slashEntity.addComponent(Collider, new Collider(
          ColliderType.SPHERE,
          new THREE.Vector3(range, range, 1), // 縦攻撃の範囲
          CollisionLayer.TRIGGER, // 攻撃エフェクトのレイヤー
          targetLayer // 衝突対象（敵チーム）
        ));
        console.log(`⚔️ 縦斬り攻撃判定開始: ${firstSegmentDelay}ms後`);
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