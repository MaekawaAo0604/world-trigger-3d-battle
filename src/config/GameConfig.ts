/**
 * ゲーム全体の設定値
 */
export const GAME_CONFIG = {
  // レンダリング設定
  RENDER: {
    BACKGROUND_COLOR: 0x87CEEB,
    FOG_COLOR: 0x87CEEB,
    FOG_NEAR: 10,
    FOG_FAR: 100,
    CAMERA_FOV: 75,
    CAMERA_NEAR: 0.1,
    CAMERA_FAR: 1000,
  },

  // カメラ設定
  CAMERA: {
    INITIAL_POSITION: { x: 3, y: 4, z: 5 }, // TPS標準視点
    OFFSET: { x: 1.5, y: 2, z: 5 }, // 右肩越しのオフセット
    SHOULDER_OFFSET: { x: 0.3, y: 2.0, z: 0 }, // ピボットポイント（頭上を少し高く）
    MOUSE_SENSITIVITY: 0.003,
    MAX_UP_ANGLE: Math.PI * 60 / 180, // 60度（上方向の制限を厳しく）
    MAX_DOWN_ANGLE: Math.PI * 85 / 180, // 85度（下方向の制限）
    FOLLOW_SPEED: 0.15,
  },

  // 移動設定
  MOVEMENT: {
    GRAVITY: -20,
    JUMP_FORCE: 10,
    GROUND_LEVEL: 0,
    CHARACTER_HEIGHT: 1,
    ARENA_BOUNDS: 24,
  },

  // 攻撃設定
  ATTACK: {
    FAN_SLASH: {
      SEGMENTS: 1,  // 1つの軌跡で剣の振り
      TOTAL_ANGLE: (5 * Math.PI) / 6, // 150度
      SEGMENT_SIZE: { width: 0.1, height: 0.1, depth: 2.0 },  // 細長い剣の軌跡
      ANIMATION_DURATION: 300, // 0.3秒に短縮
      SEGMENT_DELAY: 0,  // 遅延なし
    },
    VERTICAL_SLASH: {
      SEGMENTS: 1,  // 1つの軌跡で剣の振り
      TOTAL_ANGLE: (5 * Math.PI) / 6, // 150度
      SEGMENT_SIZE: { width: 0.1, height: 0.1, depth: 2.0 },  // 細長い剣の軌跡
      ANIMATION_DURATION: 300, // 0.3秒に短縮
      SEGMENT_DELAY: 0,  // 遅延なし
    },
    HIT_EFFECT: {
      SIZE: 0.3,
      DURATION: 500,
      COLOR: 0xff0000,
    },
  },

  // UI設定
  UI: {
    HUD_UPDATE_INTERVAL: 100,
    VICTORY_SCREEN_Z_INDEX: 999999,
  },
} as const;