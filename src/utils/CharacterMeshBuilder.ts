import * as THREE from 'three';

/**
 * キャラクターメッシュ作成ユーティリティ
 */
export class CharacterMeshBuilder {
  
  /**
   * プレイヤー用の人型メッシュを作成
   */
  static createPlayerMesh(): THREE.Group {
    const character = new THREE.Group();
    
    // プレイヤー色（青系）
    const primaryColor = 0x0088ff;
    const secondaryColor = 0x004488;
    const skinColor = 0xffdbac;
    
    // 頭
    const headGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.7, 0);
    head.name = 'head';
    character.add(head);
    
    // 胴体
    const torsoGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
    const torsoMaterial = new THREE.MeshLambertMaterial({ color: primaryColor });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.set(0, 1.2, 0);
    torso.name = 'torso';
    character.add(torso);
    
    // 右腕
    const rightArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshLambertMaterial({ color: secondaryColor });
    const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    rightArm.position.set(-0.35, 1.15, 0);
    rightArm.name = 'rightArm';
    character.add(rightArm);
    
    // 左腕
    const leftArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    leftArm.position.set(0.35, 1.15, 0);
    leftArm.name = 'leftArm';
    character.add(leftArm);
    
    // 右手
    const handGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const handMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(-0.35, 0.85, 0);
    rightHand.name = 'rightHand';
    character.add(rightHand);
    
    // 左手
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0.35, 0.85, 0);
    leftHand.name = 'leftHand';
    character.add(leftHand);
    
    // 腰
    const waistGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.2);
    const waistMaterial = new THREE.MeshLambertMaterial({ color: secondaryColor });
    const waist = new THREE.Mesh(waistGeometry, waistMaterial);
    waist.position.set(0, 0.8, 0);
    waist.name = 'waist';
    character.add(waist);
    
    // 右脚
    const legGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const legMaterial = new THREE.MeshLambertMaterial({ color: primaryColor });
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(-0.1, 0.3, 0);
    rightLeg.name = 'rightLeg';
    character.add(rightLeg);
    
    // 左脚
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(0.1, 0.3, 0);
    leftLeg.name = 'leftLeg';
    character.add(leftLeg);
    
    // 右足
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const footMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(-0.1, 0.05, 0.05);
    rightFoot.name = 'rightFoot';
    character.add(rightFoot);
    
    // 左足
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(0.1, 0.05, 0.05);
    leftFoot.name = 'leftFoot';
    character.add(leftFoot);
    
    // プレイヤー識別用のデータ
    character.userData.isPlayer = true;
    
    return character;
  }
  
  /**
   * 敵用の人型メッシュを作成
   */
  static createEnemyMesh(): THREE.Group {
    const character = new THREE.Group();
    
    // 敵色（赤系）
    const primaryColor = 0xff0044;
    const secondaryColor = 0x880022;
    const skinColor = 0xffdbac;
    
    // 頭
    const headGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.7, 0);
    head.name = 'head';
    character.add(head);
    
    // 胴体
    const torsoGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
    const torsoMaterial = new THREE.MeshLambertMaterial({ color: primaryColor });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.set(0, 1.2, 0);
    torso.name = 'torso';
    character.add(torso);
    
    // 右腕
    const rightArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const armMaterial = new THREE.MeshLambertMaterial({ color: secondaryColor });
    const rightArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    rightArm.position.set(-0.35, 1.15, 0);
    rightArm.name = 'rightArm';
    character.add(rightArm);
    
    // 左腕
    const leftArm = new THREE.Mesh(rightArmGeometry, armMaterial);
    leftArm.position.set(0.35, 1.15, 0);
    leftArm.name = 'leftArm';
    character.add(leftArm);
    
    // 右手
    const handGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const handMaterial = new THREE.MeshLambertMaterial({ color: skinColor });
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(-0.35, 0.85, 0);
    rightHand.name = 'rightHand';
    character.add(rightHand);
    
    // 左手
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(0.35, 0.85, 0);
    leftHand.name = 'leftHand';
    character.add(leftHand);
    
    // 腰
    const waistGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.2);
    const waistMaterial = new THREE.MeshLambertMaterial({ color: secondaryColor });
    const waist = new THREE.Mesh(waistGeometry, waistMaterial);
    waist.position.set(0, 0.8, 0);
    waist.name = 'waist';
    character.add(waist);
    
    // 右脚
    const legGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
    const legMaterial = new THREE.MeshLambertMaterial({ color: primaryColor });
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(-0.1, 0.3, 0);
    rightLeg.name = 'rightLeg';
    character.add(rightLeg);
    
    // 左脚
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(0.1, 0.3, 0);
    leftLeg.name = 'leftLeg';
    character.add(leftLeg);
    
    // 右足
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const footMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const rightFoot = new THREE.Mesh(footGeometry, footMaterial);
    rightFoot.position.set(-0.1, 0.05, 0.05);
    rightFoot.name = 'rightFoot';
    character.add(rightFoot);
    
    // 左足
    const leftFoot = new THREE.Mesh(footGeometry, footMaterial);
    leftFoot.position.set(0.1, 0.05, 0.05);
    leftFoot.name = 'leftFoot';
    character.add(leftFoot);
    
    // 敵の目印（アンテナのような物）
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6);
    const antennaMaterial = new THREE.MeshLambertMaterial({ color: 0xff4444 });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 2.0, 0);
    antenna.name = 'antenna';
    character.add(antenna);
    
    return character;
  }
  
  /**
   * キャラクタータイプに応じたメッシュを作成
   */
  static createCharacterMesh(isPlayer: boolean = true): THREE.Group {
    return isPlayer ? this.createPlayerMesh() : this.createEnemyMesh();
  }
}