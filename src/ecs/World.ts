import { Entity } from './Entity';
import { System } from './System';

/**
 * ワールドクラス - ECSパターンのWorld
 * エンティティとシステムを管理
 */
export class World {
  private entities: Map<number, Entity> = new Map();
  private systems: System[] = [];
  private entitiesToRemove: Set<number> = new Set();

  /**
   * エンティティを作成
   */
  createEntity(): Entity {
    const entity = new Entity();
    this.entities.set(entity.id, entity);
    return entity;
  }

  /**
   * エンティティを削除（遅延削除）
   */
  removeEntity(entity: Entity): void {
    this.entitiesToRemove.add(entity.id);
  }

  /**
   * エンティティをIDで取得
   */
  getEntityById(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  /**
   * 全エンティティを取得
   */
  getEntities(): Entity[] {
    return Array.from(this.entities.values());
  }

  /**
   * タグを持つエンティティを取得
   */
  getEntitiesWithTag(tag: string): Entity[] {
    return this.getEntities().filter(entity => entity.hasTag(tag));
  }

  /**
   * システムを追加
   */
  addSystem(system: System): void {
    system.setWorld(this);
    system.initialize();
    this.systems.push(system);
    this.systems.sort((a, b) => b.priority - a.priority);
  }

  /**
   * システムを削除
   */
  removeSystem(system: System): void {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems[index].destroy();
      this.systems.splice(index, 1);
    }
  }

  /**
   * システムを型で取得
   */
  getSystem<T extends System>(systemType: new (...args: any[]) => T): T | undefined {
    return this.systems.find(system => system instanceof systemType) as T | undefined;
  }

  /**
   * ワールドを更新
   */
  update(deltaTime: number): void {
    // システムを更新
    for (const system of this.systems) {
      if (system.isEnabled()) {
        system.update(deltaTime);
      }
    }

    // 削除予定のエンティティを削除
    for (const id of this.entitiesToRemove) {
      const entity = this.entities.get(id);
      if (entity) {
        entity.destroy();
        this.entities.delete(id);
      }
    }
    this.entitiesToRemove.clear();
  }

  /**
   * ワールドを破棄
   */
  destroy(): void {
    // 全エンティティを破棄
    for (const entity of this.entities.values()) {
      entity.destroy();
    }
    this.entities.clear();

    // 全システムを破棄
    for (const system of this.systems) {
      system.destroy();
    }
    this.systems = [];
  }

  /**
   * エンティティ数を取得
   */
  getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * システム数を取得
   */
  getSystemCount(): number {
    return this.systems.length;
  }
}