const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = path.resolve(__dirname, '..');
const sourceDir = path.join(rootDir, 'images');
const outputDir = path.join(sourceDir, 'optimized');
const galleryDataFile = path.join(rootDir, 'assets', 'js', 'gallery-data.js');
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function buildGalleryData(rows) {
  const categoryMap = {
    0: 'karkara',
    1: 'birni',
    2: 'empowerment'
  };

  const locationMap = {
    karkara: 'Karkara Community',
    birni: 'Birni City',
    empowerment: 'Community Outreach'
  };

  const content = `window.galleryData = [\n${rows.map((file, index) => {
    const category = categoryMap[index % 3];
    const title = `Project ${index + 1}`;
    const date = '2026-07-01';
    return `  {\n    "id": ${index + 1},\n    "category": "${category}",\n    "title": "${title}",\n    "location": "${locationMap[category]}",\n    "date": "${date}",\n    "description": "APM Community Project",\n    "imageUrl": "images/optimized/${file}"\n  }`;
  }).join(',\n')}\n];\n`;

  fs.writeFileSync(galleryDataFile, content, 'utf8');
}

async function optimizeImages() {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source folder not found: ${sourceDir}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(sourceDir)
    .filter((file) => !fs.statSync(path.join(sourceDir, file)).isDirectory())
    .filter((file) => allowedExtensions.has(path.extname(file).toLowerCase()))
    .filter((file) => !file.startsWith('.'))
    .sort();

  const optimizedFiles = [];

  for (const file of files) {
    const inputPath = path.join(sourceDir, file);
    const ext = path.extname(file).toLowerCase();
    const outputName = `${path.basename(file, ext)}.webp`;
    const outputPath = path.join(outputDir, outputName);

    if (ext === '.webp') {
      fs.copyFileSync(inputPath, outputPath);
      optimizedFiles.push(outputName);
      continue;
    }

    await sharp(inputPath)
      .resize({ width: 1200, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);

    optimizedFiles.push(outputName);
  }

  buildGalleryData(optimizedFiles);
  console.log(`Optimized ${optimizedFiles.length} image(s) to ${outputDir}`);
}

optimizeImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Image optimization failed:', error);
    process.exit(1);
  });
