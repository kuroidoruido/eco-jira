#!/usr/bin/env node

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(__dirname, '..');
const logoDir = path.join(rootDir, 'logo');
const iconsDir = path.join(rootDir, 'icons');

const sizes = [16, 32, 48, 128];

// SVG files for different variants
const svgFiles = {
  enabled: 'logo.svg',
  disabled: 'logo_16px_variant_disabled.svg'
};

async function buildIcons() {
  try {
    // Ensure icons directory exists
    await fs.mkdir(iconsDir, { recursive: true });
    
    // Build enabled icons (green)
    for (const size of sizes) {
      const svgPath = path.join(logoDir, svgFiles.enabled);
      const svgContent = await fs.readFile(svgPath, 'utf8');
      
      // For 16px, use the dedicated SVG
      const sourceSvg = size === 16 
        ? path.join(logoDir, 'logo_16px_variant.svg') 
        : svgPath;
      
      const sourceContent = await fs.readFile(sourceSvg, 'utf8');
      
      const outputPath = path.join(iconsDir, `icon${size}.png`);
      
      await sharp(Buffer.from(sourceContent))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Built ${outputPath}`);
    }
    
    // Build disabled icons (grey) for all sizes
    for (const size of sizes) {
      const disabledSvgPath = path.join(logoDir, svgFiles.disabled);
      const disabledContent = await fs.readFile(disabledSvgPath, 'utf8');
      const disabledOutputPath = path.join(iconsDir, `icon${size}_disabled.png`);
      
      await sharp(Buffer.from(disabledContent))
        .resize(size, size)
        .png()
        .toFile(disabledOutputPath);
      
      console.log(`Built ${disabledOutputPath}`);
    }
    
    console.log('All icons built successfully!');
  } catch (error) {
    console.error('Error building icons:', error);
    process.exit(1);
  }
}

buildIcons();
