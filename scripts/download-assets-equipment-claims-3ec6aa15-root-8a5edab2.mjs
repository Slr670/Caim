// Asset downloader for equipment-claims-3ec6aa15 root-8a5edab2
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = 'https://equipment-claims.vercel.app';

const assets = [
  { url: `${baseUrl}/images/IMG_8154_enhanced_2x.png`, dest: 'public/sites/equipment-claims-3ec6aa15/root-8a5edab2/images/IMG_8154_enhanced_2x.png' },
  { url: `${baseUrl}/images/IMG_8154_enhanced_2x.png`, dest: 'public/images/IMG_8154_enhanced_2x.png' },
  { url: `${baseUrl}/images/logo-forth-07_8-mobile.png`, dest: 'public/sites/equipment-claims-3ec6aa15/root-8a5edab2/images/logo-forth-07_8-mobile.png' },
  { url: `${baseUrl}/images/logo-forth-07_8-mobile.png`, dest: 'public/images/logo-forth-07_8-mobile.png' },
  { url: `${baseUrl}/favicon.ico`, dest: 'public/favicon.ico' },
];

async function download(url, destPath) {
  const fullDest = path.resolve(__dirname, '..', destPath);
  fs.mkdirSync(path.dirname(fullDest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(fullDest, buffer);
  console.log(`Downloaded ${url} -> ${destPath} (${buffer.length} bytes)`);
}

async function main() {
  console.log('Downloading assets for equipment-claims-3ec6aa15...');
  for (const asset of assets) {
    try {
      await download(asset.url, asset.dest);
    } catch (err) {
      console.error(`Failed: ${asset.url}:`, err.message);
    }
  }
  console.log('Done.');
}

main();
