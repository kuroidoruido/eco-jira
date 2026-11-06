#!/usr/bin/env node

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(__dirname, '..');

async function devBuild() {
  try {
    console.log('Building eco-jira in development mode...\n');
    
    // Build icons
    console.log('1. Building icons...');
    execSync('node scripts/build-icons.js', { cwd: rootDir, stdio: 'inherit' });
    
    console.log('\n2. Checking project structure...');
    const requiredFiles = [
      'manifest.json',
      'src/popup/popup.html',
      'src/popup/popup.css',
      'src/popup/popup.js',
      'src/background/background.js',
      'src/content/content.js',
      'src/utils/storage.js',
      'icons/icon16.png',
      'icons/icon32.png',
      'icons/icon48.png',
      'icons/icon128.png'
    ];
    
    let allFilesExist = true;
    for (const file of requiredFiles) {
      const filePath = path.join(rootDir, file);
      if (!existsSync(filePath)) {
        console.log(`  ❌ Missing: ${file}`);
        allFilesExist = false;
      } else {
        console.log(`  ✅ Found: ${file}`);
      }
    }
    
    if (!allFilesExist) {
      console.log('\n⚠️  Some required files are missing!');
      process.exit(1);
    }
    
    console.log('\n3. Development build complete!');
    console.log('\nTo test the extension:');
    console.log('  - Chrome: Go to chrome://extensions, enable "Developer mode", click "Load unpacked" and select this folder');
    console.log('  - Firefox: Go to about:debugging, click "Load Temporary Add-on" and select any file in this folder');
    console.log('\nTo build for production:');
    console.log('  npm run package');
    
  } catch (error) {
    console.error('Error during dev build:', error);
    process.exit(1);
  }
}

devBuild();
