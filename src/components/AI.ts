import * as THREE from 'three';

/**
 * AI行動タイプ
 */
export enum AIBehavior {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  RETREAT = 'retreat',
  DEFEND = 'defend'
}

/**
 * AI戦術タイプ
 */
export enum AITactics {
  AGGRESSIVE = 'aggressive',   // 積極的に攻撃
  DEFENSIVE = 'defensive',     // 防御重視
  BALANCED = 'balanced',       // バランス型
  SNIPER = 'sniper',          // 遠距離重視
  GUERRILLA = 'guerrilla'     // ヒットアンドアウェイ
}

/**
 * AIの設定
 */
export interface AIConfig {
  tactics: AITactics;
  detectionRange: number;      // 敵を検知する範囲
  attackRange: number;         // 攻撃を開始する範囲
  retreatThreshold: number;    // 撤退するトリオン残量の閾値（％）
  reactionTime: number;        // 反応時間（秒）
  accuracy: number;           // 命中精度（0-1）
}

/**
 * AIを制御するコンポーネント
 */
export class AI {
  public config: AIConfig;
  public currentBehavior: AIBehavior = AIBehavior.IDLE;
  public target: number | null = null;  // ターゲットエンティティのID
  public lastTargetPosition: THREE.Vector3 | null = null;
  public behaviorTimer: number = 0;
  public attackCooldown: number = 0;
  public patrolPoints: THREE.Vector3[] = [];
  public currentPatrolIndex: number = 0;
  public stateChangeTimer: number = 0;

  constructor(config: AIConfig) {
    this.config = { ...config };
    this.initializePatrolPoints();
  }

  /**
   * パトロールポイントを初期化
   */
  private initializePatrolPoints(): void {
    const radius = 15;
    const points = 4;
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      this.patrolPoints.push(new THREE.Vector3(x, 0, z));
    }
  }

  /**
   * 行動を変更
   */
  changeBehavior(newBehavior: AIBehavior): void {
    if (this.currentBehavior !== newBehavior) {
      this.currentBehavior = newBehavior;
      this.behaviorTimer = 0;
      this.stateChangeTimer = this.config.reactionTime;
    }
  }

  /**
   * ターゲットを設定
   */
  setTarget(targetId: number | null, position?: THREE.Vector3): void {
    this.target = targetId;
    if (position) {
      this.lastTargetPosition = position.clone();
    }
  }

  /**
   * 次のパトロールポイントを取得
   */
  getNextPatrolPoint(): THREE.Vector3 {
    const point = this.patrolPoints[this.currentPatrolIndex];
    this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    return point;
  }

  /**
   * 攻撃可能か判定
   */
  canAttack(): boolean {
    return this.attackCooldown <= 0 && this.stateChangeTimer <= 0;
  }

  /**
   * 攻撃を実行
   */
  performAttack(): void {
    this.attackCooldown = this.getAttackCooldown();
  }

  /**
   * 攻撃クールダウンを取得
   */
  private getAttackCooldown(): number {
    switch (this.config.tactics) {
      case AITactics.AGGRESSIVE:
        return 0.5;
      case AITactics.SNIPER:
        return 2.0;
      case AITactics.GUERRILLA:
        return 1.0;
      default:
        return 1.0;
    }
  }

  /**
   * タイマーを更新
   */
  updateTimers(deltaTime: number): void {
    this.behaviorTimer += deltaTime;
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
    this.stateChangeTimer = Math.max(0, this.stateChangeTimer - deltaTime);
  }

  /**
   * 戦術に基づいた理想的な戦闘距離を取得
   */
  getIdealCombatDistance(): number {
    switch (this.config.tactics) {
      case AITactics.AGGRESSIVE:
        return 5;  // 近距離
      case AITactics.SNIPER:
        return 30; // 遠距離
      case AITactics.DEFENSIVE:
        return 15; // 中距離
      case AITactics.GUERRILLA:
        return 10; // 中近距離
      default:
        return 10;
    }
  }

  /**
   * 撤退すべきか判定
   */
  shouldRetreat(trionPercentage: number): boolean {
    return trionPercentage < this.config.retreatThreshold;
  }

  /**
   * 命中判定（精度を考慮）
   */
  calculateHitChance(distance: number): number {
    const basePenalty = distance / 50; // 距離によるペナルティ
    return Math.max(0, this.config.accuracy - basePenalty);
  }
}