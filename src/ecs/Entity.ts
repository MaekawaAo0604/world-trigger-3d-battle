/**
 * エンティティクラス - ECSパターンのEntity
 * コンポーネントのコンテナとして機能
 */
export class Entity {
  private static nextId = 0;
  public readonly id: number;
  private components: Map<string, any> = new Map();
  private tags: Set<string> = new Set();
  public active: boolean = true;

  constructor() {
    this.id = Entity.nextId++;
  }

  /**
   * コンポーネントを追加
   */
  addComponent<T>(componentType: new (...args: any[]) => T, component: T): this {
    this.components.set(componentType.name, component);
    return this;
  }

  /**
   * コンポーネントを取得
   */
  getComponent<T>(componentType: new (...args: any[]) => T): T | undefined {
    return this.components.get(componentType.name) as T | undefined;
  }

  /**
   * コンポーネントを持っているか確認
   */
  hasComponent<T>(componentType: new (...args: any[]) => T): boolean {
    return this.components.has(componentType.name);
  }

  /**
   * コンポーネントを削除
   */
  removeComponent<T>(componentType: new (...args: any[]) => T): boolean {
    return this.components.delete(componentType.name);
  }

  /**
   * 全コンポーネントを取得
   */
  getAllComponents(): Map<string, any> {
    return new Map(this.components);
  }

  /**
   * タグを追加
   */
  addTag(tag: string): this {
    this.tags.add(tag);
    return this;
  }

  /**
   * タグを持っているか確認
   */
  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  /**
   * タグを削除
   */
  removeTag(tag: string): boolean {
    return this.tags.delete(tag);
  }

  /**
   * エンティティを破棄
   */
  destroy(): void {
    this.components.clear();
    this.tags.clear();
    this.active = false;
  }
}