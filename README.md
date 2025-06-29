# World Trigger 3D Battle

「ワールドトリガー」をモチーフにした3D戦闘ゲーム

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-0.168-orange.svg)

## ⚠️ 重要な注意事項

**このプロジェクトは個人学習・研究目的のみでの利用を想定しています。**

- 「ワールドトリガー」は葦原大介氏による版権作品です
- 商用利用・再配布は禁止されています
- キャラクター名・トリガー名等の設定は原作に基づいています
- 使用前に適切な権利処理を行ってください

## 🎯 機能

### ✅ 実装済み機能

- **キャラクター選択**
  - 雨取千佳（スナイパー）
  - 空閑遊真（アタッカー）
  - 迅悠一（オールラウンダー）

- **カメラシステム**
  - マウスによる視点操作（Pointer Lock API）
  - 三人称視点カメラ
  - 上下角度制限（下5°、上30°）
  - スムーズな追従とカメラ制御

- **トリガーシステム**
  - 武器切替（1-4キー）
  - 各キャラクター専用トリガー
  - クールダウン・トリオン消費
  - 攻撃アニメーション（扇形薙ぎ払い）
  - 攻撃ヒット判定とエフェクト

- **バトルシステム**
  - 1 vs AI 戦闘
  - リアルタイム3D戦闘
  - 50m四方の訓練フィールド
  - キャラクターの地面衝突判定
  - ダメージ計算とトリオン管理

- **HUDシステム**
  - トリオンゲージ
  - 装備中トリガー表示
  - FPSカウンター
  - 勝利/敗北画面
  - ゲーム再開機能

### 🔄 TODO（拡張機能）

- [ ] マルチプレイ対戦
- [ ] カスタムキャラビルド
- [ ] 原作マップ実装
- [ ] ネイバー遠征モード
- [ ] エフェクト強化
- [ ] サウンドシステム

## 🚀 クイックスタート

### 必要環境

- Node.js 18+
- npm または yarn

### インストール

```bash
# プロジェクトをクローン
git clone <repository-url>
cd world-trigger-3d-battle

# 依存関係をインストール
npm install

# アセットをダウンロード（オプション）
npm run download-assets

# 開発サーバーを起動
npm run dev
```

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

### デプロイ（Vercel）

**簡単デプロイ手順:**

1. **GitHubにプッシュ**:
```bash
git add .
git commit -m "feat: ready for Vercel deployment"
git push origin main
```

2. **Vercelでデプロイ**:
   - [Vercel](https://vercel.com)にアクセス
   - GitHubでサインイン
   - "New Project" → リポジトリを選択
   - 自動的に設定が検出されてデプロイ開始

**または CLI で:**
```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# プロダクションデプロイ
vercel --prod
```

**Vercel設定ファイル**:
- `vercel.json` で自動設定済み
- Build Command: `npm run build`  
- Output Directory: `dist`
- Framework: Vite

## 🎮 操作方法

### 基本操作

| キー | 機能 |
|------|------|
| **W/A/S/D** | 移動 |
| **Shift** | ダッシュ |
| **Space** | ジャンプ |
| **マウス移動** | 視点・照準（Pointer Lock） |
| **Escape** | Pointer Lock解除 |
| **Canvas Click** | Pointer Lock開始 |

### 戦闘操作

| キー | 機能 |
|------|------|
| **左クリック** | 攻撃（扇形薙ぎ払い） |
| **右クリック** | ガード（レイガストのみ） |
| **1-4** | トリガー切替 |

### トリガー一覧

#### アタッカー
- **弧月**: 高威力の近接武器（扇形薙ぎ払い攻撃）
- **レイガスト**: 攻守バランス型（ガード可能）

#### シューター
- **アステロイド**: 標準射撃弾
- **メテオラ**: 爆発弾

#### スナイパー
- **アイビス**: 超高威力狙撃
- **ライトニング**: 高速弾狙撃

## 🏗️ アーキテクチャ

### ECS（Entity-Component-System）

```
Entity: ゲームオブジェクトの基本単位
├── Transform: 位置・回転・スケール
├── Character: キャラクター情報
├── Trigger: トリガー管理
├── AI: AI制御
├── Velocity: 移動・物理
├── Collider: 衝突判定
├── MeshComponent: 3Dメッシュ
└── Input: 入力管理
```

### システム構成

```
InputSystem → AISystem → MovementSystem → TriggerSystem → HUDSystem → RenderSystem
```

### モジュール構成

```
Core Systems:
├── InputSystem: 入力処理とPointer Lock管理
├── MovementSystem: カメラ相対移動と地面衝突
├── RenderSystem: 三人称カメラと視点制御
├── TriggerSystem: 攻撃処理とアニメーション
├── AISystem: エネミーAI制御
└── HUDSystem: UI管理とゲーム状態

Effects & Animations:
├── AttackEffects: 攻撃エフェクト生成
└── AttackAnimations: 扇形薙ぎアニメーション

Configuration:
└── GameConfig: 統一設定管理

Utilities:
├── MathUtils: 数学計算ユーティリティ
└── GameUtils: ゲーム関連ユーティリティ
```

## 📁 プロジェクト構造

```
src/
├── ecs/                    # ECSコア
│   ├── Entity.ts          # エンティティ管理
│   ├── System.ts          # システム基底クラス
│   └── World.ts           # ワールド管理
├── components/             # コンポーネント
│   ├── Transform.ts       # 位置・回転・スケール
│   ├── Character.ts       # キャラクター情報
│   ├── Trigger.ts         # トリガー管理
│   ├── AI.ts             # AI制御
│   ├── Velocity.ts       # 移動・物理
│   ├── Collider.ts       # 衝突判定
│   ├── Mesh.ts           # 3Dメッシュ
│   ├── Input.ts          # 入力管理
│   └── index.ts          # コンポーネント統合
├── systems/                # システム
│   ├── InputSystem.ts     # 入力処理
│   ├── MovementSystem.ts  # 移動制御
│   ├── RenderSystem.ts    # 描画・カメラ
│   ├── TriggerSystem.ts   # トリガー処理
│   ├── AISystem.ts        # AI制御
│   └── HUDSystem.ts       # UI管理
├── config/                 # 設定
│   └── GameConfig.ts      # ゲーム設定統合
├── effects/                # エフェクト
│   └── AttackEffects.ts   # 攻撃エフェクト
├── animation/              # アニメーション
│   └── AttackAnimations.ts # 攻撃アニメーション
├── utils/                  # ユーティリティ
│   ├── MathUtils.ts       # 数学計算
│   └── GameUtils.ts       # ゲームユーティリティ
├── triggers/               # トリガー定義
│   └── TriggerDefinitions.ts # トリガー設定
├── scenes/                 # シーン管理
│   └── CharacterSelectScene.ts # キャラ選択
├── ui/                     # UI・HUD
│   └── HUD.ts             # HUD管理
├── entities/               # エンティティファクトリ
├── types/                  # 型定義
├── main.ts                 # エントリーポイント
└── style.css              # スタイル

scripts/
└── download-assets.js      # アセット取得

public/
└── assets/                 # ゲームアセット
```

## 🔧 設定とカスタマイズ

### GameConfig.ts - 統一設定管理

```typescript
// カメラ設定
CAMERA: {
  OFFSET: { x: 0, y: 5, z: 8 },
  MOUSE_SENSITIVITY: 0.003,
  MAX_UP_ANGLE: 0.52, // 30度
  MAX_DOWN_ANGLE: 0.087, // 5度
  FOLLOW_SPEED: 0.1
}

// 移動設定
MOVEMENT: {
  GRAVITY: -9.81,
  JUMP_FORCE: 5,
  CHARACTER_HEIGHT: 1,
  ARENA_BOUNDS: 25
}

// 攻撃設定
ATTACK: {
  FAN_SLASH: {
    SEGMENTS: 12,
    TOTAL_ANGLE: 2.2, // 126度
    ANIMATION_DURATION: 300
  }
}
```

## 🛠️ 開発

### 型チェック

```bash
npm run typecheck
```

### リント

```bash
npm run lint
```

### Git使用時の推奨ワークフロー

```bash
# feat: 新機能
git commit -m "feat: add multiplayer support"

# fix: バグ修正
git commit -m "fix: trigger cooldown calculation"

# refactor: リファクタリング
git commit -m "refactor: improve ECS performance"
```

## 🎨 カスタマイズ

### 新キャラクター追加

1. `src/components/Character.ts`にキャラクタータイプを追加
2. `CHARACTER_PRESETS`にステータスを定義
3. `src/triggers/TriggerDefinitions.ts`にトリガーセットを追加

### 新トリガー追加

1. `src/triggers/TriggerDefinitions.ts`にトリガー定義を追加
2. `src/systems/TriggerSystem.ts`に処理ロジックを実装
3. 必要に応じて`src/effects/AttackEffects.ts`にエフェクトを追加

### カメラ設定調整

`src/config/GameConfig.ts`の`CAMERA`セクションで調整可能：
- `OFFSET`: カメラの相対位置
- `MOUSE_SENSITIVITY`: マウス感度
- `MAX_UP_ANGLE`/`MAX_DOWN_ANGLE`: 視点角度制限
- `FOLLOW_SPEED`: カメラ追従速度

### 攻撃アニメーション調整

`src/config/GameConfig.ts`の`ATTACK.FAN_SLASH`で調整可能：
- `SEGMENTS`: 扇形の分割数（滑らかさ）
- `TOTAL_ANGLE`: 攻撃範囲角度
- `ANIMATION_DURATION`: アニメーション時間

## 🚀 パフォーマンス最適化

### 設定されている最適化

- **オブジェクトプール**: 発射物の再利用
- **バウンディングボックス**: 効率的な衝突判定前処理
- **LOD（Level of Detail）**: 距離に応じた描画品質調整
- **シャドウマップ最適化**: 2048x2048 PCF Soft Shadow
- **カメラカリング**: 視野外オブジェクトの描画スキップ

### さらなる最適化のヒント

```typescript
// ガベージコレクション削減
const tempVector = new THREE.Vector3();
// 毎フレーム new Vector3() を避ける

// バッチング
const geometry = new THREE.InstancedBufferGeometry();
// 同じジオメトリの複数インスタンス描画
```

## 🐛 既知の問題

- [ ] 衝突判定の精度向上が必要
- [ ] 大量の発射物でのパフォーマンス低下
- [ ] AIの行動パターンの多様化
- [x] ~~キャラクターが地面に埋まる問題~~ → 修正済み
- [x] ~~攻撃の当たり判定が機能しない問題~~ → 修正済み
- [x] ~~カメラ操作が不安定な問題~~ → 修正済み

## 📊 デバッグ機能

### コンソールログ

```typescript
// GameUtils.ts - 色付きログ
GameUtils.logInfo("情報メッセージ");
GameUtils.logWarning("警告メッセージ"); 
GameUtils.logError("エラーメッセージ");
GameUtils.logSuccess("成功メッセージ");
```

### HUDデバッグ情報

- FPSカウンター
- トリオン残量
- アクティブトリガー
- 攻撃ヒット情報（コンソール）

## 📄 ライセンス

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 🙏 クレジット

- **原作**: 「ワールドトリガー」葦原大介（集英社）
- **3Dエンジン**: Three.js
- **開発フレームワーク**: Vite + TypeScript
- **プレースホルダーアセット**: CC0ライセンス

---

**注意**: このプロジェクトは「ワールドトリガー」の二次創作です。商用利用は禁止されており、個人利用のみに限定されます。