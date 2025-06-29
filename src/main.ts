import './style.css';
import * as THREE from 'three';
import { World } from './ecs';
import { 
  Transform, 
  MeshComponent, 
  Character, 
  CharacterType, 
  CHARACTER_PRESETS,
  Velocity,
  Input,
  Collider,
  COLLIDER_PRESETS
} from './components';
import { RenderSystem } from './systems/RenderSystem';
import { MovementSystem } from './systems/MovementSystem';
import { InputSystem } from './systems/InputSystem';
import { TriggerSystem } from './systems/TriggerSystem';
import { ProjectileSystem } from './systems/ProjectileSystem';
import { ShootingSystem } from './systems/ShootingSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { AISystem } from './systems/AISystem';
import { HUDSystem } from './systems/HUDSystem';
import { ShieldSystem } from './systems/ShieldSystem';
import { GrasshopperSystem } from './systems/GrasshopperSystem';
import { AnimationSystem } from './systems/AnimationSystem';
import { SwordActionSystem } from './systems/SwordActionSystem';
import { Trigger } from './components/Trigger';
import { AI, AITactics } from './components/AI';
import { Shield } from './components/Shield';
import { CrosshairUI } from './components/Crosshair';
import { CLASS_TRIGGER_SETS, TriggerSet } from './triggers/TriggerDefinitions';
import { MainMenu } from './ui/MainMenu';
import { CharacterMeshBuilder } from './utils/CharacterMeshBuilder';

/**
 * ゲームクラス
 */
class Game {
  private world: World;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private container: HTMLElement;
  private loadingScreen: HTMLElement;
  private selectedCharacterType: CharacterType = CharacterType.MIKUMO_OSAMU;
  private crosshair: CrosshairUI | null = null;
  private mainMenu: MainMenu | null = null;
  private gameStarted: boolean = false;
  private selectedTriggerSet: TriggerSet | null = null;

  constructor() {
    this.container = document.getElementById('game-container')!;
    this.loadingScreen = document.getElementById('loading-screen')!;
    this.world = new World();
  }

  /**
   * ゲームを初期化
   */
  async initialize(): Promise<void> {
    try {
      // ローディング画面を非表示
      this.loadingScreen.classList.add('hidden');

      // メインメニューを表示
      this.mainMenu = new MainMenu();
      this.mainMenu.setOnStartGame((character, triggerSet) => {
        this.selectedCharacterType = character;
        this.selectedTriggerSet = triggerSet;
        this.startGame();
      });
      
      // ESCキーでメインメニューに戻る
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.mainMenu) {
          if (!this.gameStarted) {
            this.mainMenu.handleEscape();
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize game:', error);
      this.loadingScreen.textContent = 'Failed to load game';
    }
  }


  /**
   * ゲームを開始
   */
  private startGame(): void {
    this.gameStarted = true;
    // システムを追加
    this.world.addSystem(new InputSystem());
    this.world.addSystem(new AISystem()); // AI制御システム
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new AnimationSystem()); // アニメーションシステム
    this.world.addSystem(new CollisionSystem()); // 衝突判定システム
    this.world.addSystem(new ProjectileSystem());
    this.world.addSystem(new ShootingSystem()); // 高精度射撃システム
    this.world.addSystem(new TriggerSystem());
    this.world.addSystem(new SwordActionSystem()); // 剣系特殊アクション
    this.world.addSystem(new ShieldSystem());
    this.world.addSystem(new GrasshopperSystem()); // グラスホッパーシステム
    this.world.addSystem(new HUDSystem(this.container));
    const renderSystem = new RenderSystem(this.container);
    this.world.addSystem(renderSystem);
    
    // クロスヘアを作成（デフォルトで非表示）
    this.crosshair = new CrosshairUI(this.container);
    this.crosshair.setVisible(false);

    // RenderSystemにクロスヘア制御コールバックを設定
    renderSystem.setCrosshairCallback((visible: boolean) => {
      if (this.crosshair) {
        this.crosshair.setVisible(visible);
      }
    });

    // プレイヤーキャラクターを作成
    this.createPlayerCharacter(this.selectedCharacterType);

    // テスト用のAIエネミーを作成
    this.createAIEnemy();
    
    // 複数の敵を配置
    this.createAIEnemyAt(new THREE.Vector3(10, 0, -10));
    this.createAIEnemyAt(new THREE.Vector3(-10, 0, -5));

    // ゲーム開始
    this.start();
  }

  /**
   * プレイヤーキャラクターを作成
   */
  private createPlayerCharacter(characterType: CharacterType): void {
    const preset = CHARACTER_PRESETS[characterType];
    const player = this.world.createEntity();

    // Transform
    const transform = new Transform(
      new THREE.Vector3(0, 0, 5),
      new THREE.Euler(0, 0, 0),
      new THREE.Vector3(1, 1, 1)
    );
    player.addComponent(Transform, transform);

    // 人型メッシュ
    const characterMesh = CharacterMeshBuilder.createPlayerMesh();
    player.addComponent(MeshComponent, new MeshComponent(characterMesh));

    // キャラクター
    const character = new Character(
      preset.name,
      characterType,
      preset.class,
      preset.stats,
      0 // プレイヤーチーム
    );
    player.addComponent(Character, character);

    // 速度
    player.addComponent(Velocity, new Velocity());

    // 入力
    player.addComponent(Input, new Input());

    // コライダー
    player.addComponent(Collider, COLLIDER_PRESETS.character);

    // トリガー（選択されたセットを使用、コスト適用済み）
    const triggerSet = this.selectedTriggerSet || CLASS_TRIGGER_SETS[preset.class];
    const trigger = new Trigger(triggerSet, character);
    player.addComponent(Trigger, trigger);

    // シールド
    player.addComponent(Shield, new Shield());

    // タグ
    player.addTag('player');
  }

  /**
   * AIエネミーを作成
   */
  private createAIEnemy(): void {
    const preset = CHARACTER_PRESETS[CharacterType.AI_ENEMY];
    const enemy = this.world.createEntity();

    // Transform
    const transform = new Transform(
      new THREE.Vector3(0, 0, -5),
      new THREE.Euler(0, Math.PI, 0),
      new THREE.Vector3(1, 1, 1)
    );
    enemy.addComponent(Transform, transform);

    // 敵用人型メッシュ
    const enemyMesh = CharacterMeshBuilder.createEnemyMesh();
    enemy.addComponent(MeshComponent, new MeshComponent(enemyMesh));

    // キャラクター
    const character = new Character(
      preset.name,
      CharacterType.AI_ENEMY,
      preset.class,
      preset.stats,
      1 // 敵チーム
    );
    enemy.addComponent(Character, character);

    // 速度
    enemy.addComponent(Velocity, new Velocity());

    // コライダー
    enemy.addComponent(Collider, COLLIDER_PRESETS.enemy);

    // トリガー
    const enemyTriggerSet = CLASS_TRIGGER_SETS[preset.class];
    enemy.addComponent(Trigger, new Trigger(enemyTriggerSet));

    // シールド
    enemy.addComponent(Shield, new Shield());

    // 入力（AIが制御）
    enemy.addComponent(Input, new Input());

    // AI
    const aiConfig = {
      tactics: AITactics.BALANCED,
      detectionRange: 20,
      attackRange: 15,
      retreatThreshold: 20,
      reactionTime: 0.5,
      accuracy: 0.7
    };
    enemy.addComponent(AI, new AI(aiConfig));

    // タグ
    enemy.addTag('enemy');
  }

  /**
   * 指定位置にAIエネミーを作成
   */
  private createAIEnemyAt(position: THREE.Vector3): void {
    const preset = CHARACTER_PRESETS[CharacterType.AI_ENEMY];
    const enemy = this.world.createEntity();

    // Transform
    const transform = new Transform(
      position.clone(),
      new THREE.Euler(0, Math.PI, 0),
      new THREE.Vector3(1, 1, 1)
    );
    enemy.addComponent(Transform, transform);

    // 敵用人型メッシュ
    const enemyMesh = CharacterMeshBuilder.createEnemyMesh();
    enemy.addComponent(MeshComponent, new MeshComponent(enemyMesh));

    // キャラクター
    const character = new Character(
      preset.name,
      CharacterType.AI_ENEMY,
      preset.class,
      preset.stats,
      1 // 敵チーム
    );
    enemy.addComponent(Character, character);

    // 速度
    enemy.addComponent(Velocity, new Velocity());

    // コライダー
    enemy.addComponent(Collider, COLLIDER_PRESETS.enemy);

    // トリガー
    const enemyTriggerSet = CLASS_TRIGGER_SETS[preset.class];
    enemy.addComponent(Trigger, new Trigger(enemyTriggerSet));

    // シールド
    enemy.addComponent(Shield, new Shield());

    // 入力（AIが制御）
    enemy.addComponent(Input, new Input());

    // AI
    const aiConfig = {
      tactics: AITactics.BALANCED,
      detectionRange: 20,
      attackRange: 15,
      retreatThreshold: 20,
      reactionTime: 0.5,
      accuracy: 0.7
    };
    enemy.addComponent(AI, new AI(aiConfig));

    // タグ
    enemy.addTag('enemy');
  }

  /**
   * ゲームを開始
   */
  private start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  /**
   * ゲームループ
   */
  private gameLoop(currentTime: number): void {
    if (!this.isRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // FPSが極端に低い場合はスキップ
    if (deltaTime > 0.1) {
      requestAnimationFrame(this.gameLoop.bind(this));
      return;
    }

    // ワールドを更新
    this.world.update(deltaTime);

    // 次のフレーム
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  /**
   * ゲームを停止
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * ゲームを破棄
   */
  destroy(): void {
    this.stop();
    this.world.destroy();
    if (this.crosshair) {
      this.crosshair.destroy();
    }
    if (this.mainMenu) {
      this.mainMenu.destroy();
    }
  }
}

// ゲームを開始
const game = new Game();
(window as any).gameInstance = game; // グローバルアクセス用
game.initialize();