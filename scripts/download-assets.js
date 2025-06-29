#!/usr/bin/env node

/**
 * オープンソースのCC0アセットをダウンロードするスクリプト
 * 注意: 本スクリプトは開発用途でのプレースホルダーです
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルート
const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'public', 'assets');

// CC0 プレースホルダーアセット（実際のプロジェクトでは適切なアセットに置き換え）
const ASSETS = {
  models: {
    'character.glb': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxAnimated/glTF-Binary/BoxAnimated.glb',
    'weapon.glb': 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb'
  },
  textures: {
    'character_diffuse.jpg': 'https://picsum.photos/512/512?random=1',
    'weapon_diffuse.jpg': 'https://picsum.photos/256/256?random=2',
    'environment.jpg': 'https://picsum.photos/1024/512?random=3'
  },
  audio: {
    'attack.wav': null, // プレースホルダー
    'footstep.wav': null,
    'bgm.mp3': null
  },
  ui: {
    'crosshair.png': 'https://picsum.photos/32/32?random=4',
    'ui_button.png': 'https://picsum.photos/128/64?random=5'
  }
};

/**
 * ディレクトリを作成
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * ファイルをダウンロード
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(outputPath)}`);
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

/**
 * プレースホルダーファイルを作成
 */
function createPlaceholder(outputPath, type) {
  const content = getPlaceholderContent(type);
  fs.writeFileSync(outputPath, content);
  console.log(`Created placeholder: ${path.basename(outputPath)}`);
}

/**
 * プレースホルダーコンテンツを生成
 */
function getPlaceholderContent(type) {
  switch (type) {
    case 'audio':
      // 無音のWAVファイルのバイナリデータ（簡易版）
      const wavHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, // "RIFF"
        0x24, 0x00, 0x00, 0x00, // file size
        0x57, 0x41, 0x56, 0x45, // "WAVE"
        0x66, 0x6D, 0x74, 0x20, // "fmt "
        0x10, 0x00, 0x00, 0x00, // fmt chunk size
        0x01, 0x00, 0x01, 0x00, // PCM, mono
        0x44, 0xAC, 0x00, 0x00, // 44100 Hz
        0x88, 0x58, 0x01, 0x00, // byte rate
        0x02, 0x00, 0x10, 0x00, // block align, bits per sample
        0x64, 0x61, 0x74, 0x61, // "data"
        0x00, 0x00, 0x00, 0x00  // data size (0 = silence)
      ]);
      return wavHeader;
    default:
      return 'placeholder';
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🎯 World Trigger 3D Battle - Asset Downloader');
  console.log('======================================================');
  console.log('⚠️  注意: これは開発用のプレースホルダーアセットです');
  console.log('⚠️  実際のプロジェクトでは適切なライセンスのアセットを使用してください');
  console.log('');

  // アセットディレクトリを作成
  ensureDir(assetsDir);
  
  for (const [category, files] of Object.entries(ASSETS)) {
    const categoryDir = path.join(assetsDir, category);
    ensureDir(categoryDir);
    
    console.log(`\n📁 ${category.toUpperCase()}`);
    console.log('─'.repeat(30));
    
    for (const [filename, url] of Object.entries(files)) {
      const outputPath = path.join(categoryDir, filename);
      
      // ファイルが既に存在する場合はスキップ
      if (fs.existsSync(outputPath)) {
        console.log(`Skipped (exists): ${filename}`);
        continue;
      }
      
      try {
        if (url) {
          await downloadFile(url, outputPath);
        } else {
          // プレースホルダーを作成
          const fileExt = path.extname(filename).toLowerCase();
          const placeholderType = category === 'audio' ? 'audio' : 'text';
          createPlaceholder(outputPath, placeholderType);
        }
      } catch (error) {
        console.error(`Failed to process ${filename}:`, error.message);
        
        // フォールバックとしてプレースホルダーを作成
        try {
          const placeholderType = category === 'audio' ? 'audio' : 'text';
          createPlaceholder(outputPath, placeholderType);
        } catch (fallbackError) {
          console.error(`Failed to create placeholder for ${filename}:`, fallbackError.message);
        }
      }
    }
  }
  
  // アセット情報ファイルを作成
  const assetInfo = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    notice: '⚠️ これらはプレースホルダーアセットです。商用利用前に適切なライセンスのアセットに置き換えてください。',
    license: 'CC0 / Placeholder',
    categories: Object.keys(ASSETS),
    total_files: Object.values(ASSETS).reduce((sum, files) => sum + Object.keys(files).length, 0)
  };
  
  fs.writeFileSync(
    path.join(assetsDir, 'asset-info.json'),
    JSON.stringify(assetInfo, null, 2)
  );
  
  console.log('\n✅ アセットダウンロード完了！');
  console.log(`📊 合計 ${assetInfo.total_files} ファイル`);
  console.log(`📂 保存先: ${assetsDir}`);
  console.log('\n📋 注意事項:');
  console.log('   • 本スクリプトは開発用途です');
  console.log('   • 商用利用前に適切なライセンスのアセットに置き換えてください');
  console.log('   • ワールドトリガーは版権作品です（個人利用のみ）');
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}