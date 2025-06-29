import { Entity } from './Entity';
import { World } from './World';

/**
 * システムの基底クラス - ECSパターンのSystem
 * 特定のコンポーネントを持つエンティティを処理
 */
export abstract class System {
  protected world: World | null = null;
  protected enabled: boolean = true;
  public priority: number = 0;

  /**
   * このシステムが処理対象とするコンポーネントの型を返す
   */
  abstract requiredComponents(): Array<new (...args: any[]) => any>;

  /**
   * エンティティがこのシステムの処理対象か判定
   */
  entityMatches(entity: Entity): boolean {
    const required = this.requiredComponents();
    return required.every(componentType => entity.hasComponent(componentType));
  }

  /**
   * ワールドを設定
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * システムの初期化
   */
  initialize(): void {
    // オーバーライドして使用
  }

  /**
   * システムの更新
   */
  abstract update(deltaTime: number): void;

  /**
   * 対象エンティティを取得
   */
  protected getEntities(): Entity[] {
    if (!this.world) return [];
    return this.world.getEntities().filter(entity => 
      entity.active && this.entityMatches(entity)
    );
  }

  /**
   * システムの有効/無効を切り替え
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * システムが有効か確認
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * システムの破棄
   */
  destroy(): void {
    this.world = null;
  }
}