const sharp = require('sharp');
const fs = require('fs');

async function makeFinalSplash() {
  const bgWaves = 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\splash_var_2_1784118457383.png';
  const logoPath = 'Chobo-brand/logo/lockups/chobo-logo-stacked-dark.png (2).png';
  const outPath = 'apps/mobile/assets/splash.png';

  // 1. Resize the logo a bit bigger (850px width out of 1242px screen)
  const resizedLogo = await sharp(logoPath)
    .resize({ width: 850, fit: 'inside' })
    .toBuffer();

  const width = 1242;
  const height = 2436;

  // 2. Pre-crop the background to exact portrait size
  const portraitWaves = await sharp(bgWaves)
    .resize({ width, height, fit: 'cover' })
    .toBuffer();

  // 3. Composite the bigger logo into the center
  await sharp(portraitWaves)
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .toFile(outPath);

  // Also copy to scratch to show the user
  fs.copyFileSync(outPath, 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\scratch\\final_b_bigger.png');

  console.log("Successfully created final splash screen with bigger logo!");
}

makeFinalSplash().catch(console.error);
