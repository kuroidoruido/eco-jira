#!/usr/bin/env node

/**
 * Main build script for eco-jira
 * Runs all build steps: icons generation, validation
 */

import { execSync } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(__dirname, '..');

async function build() {
  console.log('🚀 Starting eco-jira build...\n');
  
  try {
    // Step 1: Build icons
    console.log('📦 Step 1/2: Building icons from SVG sources...');
    execSync('node scripts/build-icons.js', { 
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    // Step 2: Run dev checks
    console.log('\n✅ Step 2/2: Validating project structure...');
    execSync('node scripts/dev.js', { 
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    console.log('\n✨ Build completed successfully!');
    console.log('\nYour extension is ready for:');
    console.log('  - Development:');
    console.log('      Chrome: Open chrome://extensions → Enable Developer mode → Load unpacked → Select this folder');
    console.log('      Firefox: Open about:debugging#/runtime/this-firefox → Load Temporary Add-on → Select any file in this folder');
    console.log('  - Production: Run npm run package to create distribution packages');
    
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
