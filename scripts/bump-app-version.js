#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 플래그 확인
const skipBump = process.argv.includes('--skip-bump') || process.argv.includes('--no-bump');

if (skipBump) {
  console.log('⏭️  Skipping version bump (--skip-bump flag detected)');
  process.exit(0);
}

const appJsonPath = path.join(__dirname, '..', 'app.json');
const versionFilePath = path.join(__dirname, '..', 'src', 'constants', 'version.ts');

// app.json 읽기
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 현재 version 확인 (3자리: 1.0.0)
const currentVersion = appJson.expo.version || '1.0.0';
const versionParts = currentVersion.split('.').map(Number);

// patch 버전 증가 (1.0.0 -> 1.0.1)
versionParts[2] = (versionParts[2] || 0) + 1;
const newVersion = versionParts.join('.');

// app.json 업데이트
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

// BUILD_NUMBER를 0으로 리셋
const versionFileContent = fs.readFileSync(versionFilePath, 'utf8');
const newContent = versionFileContent.replace(
  /export const BUILD_NUMBER = \d+;/,
  'export const BUILD_NUMBER = 0;'
);
fs.writeFileSync(versionFilePath, newContent);

console.log(`✅ App version updated for new build:`);
console.log(`   App version: ${currentVersion} -> ${newVersion}`);
console.log(`   BUILD_NUMBER: reset to 0`);
