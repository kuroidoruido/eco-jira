#!/usr/bin/env node

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

async function packageExtension() {
  try {
    // Ensure dist directory exists
    await fs.mkdir(distDir, { recursive: true });
    
    // Build icons first
    console.log('Building icons...');
    execSync('node scripts/build-icons.js', { cwd: rootDir, stdio: 'inherit' });
    
    // Copy all source files to dist
    console.log('Copying source files...');
    
    const filesToCopy = [
      'manifest.json',
      'package.json',
      'LICENCE',
      'README.md'
    ];
    
    for (const file of filesToCopy) {
      const srcPath = path.join(rootDir, file);
      const destPath = path.join(distDir, file);
      
      if (existsSync(srcPath)) {
        await fs.copyFile(srcPath, destPath);
        console.log(`Copied: ${file}`);
      }
    }
    
    // Copy directories recursively
    const dirsToCopy = ['src', 'icons'];
    
    for (const dir of dirsToCopy) {
      const srcDir = path.join(rootDir, dir);
      const destDir = path.join(distDir, dir);
      
      if (existsSync(srcDir)) {
        await copyDirRecursive(srcDir, destDir);
        console.log(`Copied directory: ${dir}`);
      }
    }
    
    // Create zip files for Chrome and Firefox
    console.log('Creating zip packages...');
    
    // Chrome package
    const chromeZipPath = path.join(rootDir, 'eco-jira-chrome.zip');
    execSync(`cd ${distDir} && zip -r ../eco-jira-chrome.zip .`, { stdio: 'inherit' });
    console.log(`Created Chrome package: ${chromeZipPath}`);
    
    // Firefox package (same for now)
    const firefoxZipPath = path.join(rootDir, 'eco-jira-firefox.zip');
    execSync(`cd ${distDir} && zip -r ../eco-jira-firefox.zip .`, { stdio: 'inherit' });
    console.log(`Created Firefox package: ${firefoxZipPath}`);
    
    console.log('\nPackaging complete!');
    console.log(`- Chrome: ${chromeZipPath}`);
    console.log(`- Firefox: ${firefoxZipPath}`);
    console.log(`- Dist folder: ${distDir}`);
    
    console.log('\n📦 To load the extension in your browser:');
    console.log('\n  Chrome:');
    console.log('    1. Open chrome://extensions');
    console.log('    2. Enable "Developer mode" (toggle in top-right)');
    console.log(`    3. Click "Load unpacked" and select: ${distDir}`);
    console.log('    OR drag & drop the chrome zip file onto chrome://extensions');
    
    console.log('\n  Firefox:');
    console.log('    1. Open about:debugging#/runtime/this-firefox');
    console.log('    2. Click "Load Temporary Add-on..."');
    console.log(`    3. Select any file from: ${distDir}`);
    console.log('    OR use the firefox zip file with "Install Add-on From File"');
    
    console.log('\n💡 For production distribution:');
    console.log('  - Chrome Web Store: Upload eco-jira-chrome.zip to developer dashboard');
    console.log('  - Firefox AMO: Upload eco-jira-firefox.zip to addons.mozilla.org');
    
  } catch (error) {
    console.error('Error during packaging:', error);
    process.exit(1);
  }
}

// Recursively copy directory
async function copyDirRecursive(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirRecursive(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

packageExtension();
