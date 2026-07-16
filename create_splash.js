const sharp = require('sharp');

async function createSplash() {
  const bgPath = 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\chobo_splash_bg_1784117643539.png';
  const logoPath = 'Chobo-brand/logo/lockups/chobo-logo-horizontal-white.png.png';
  const outPath = 'apps/mobile/assets/splash.png';

  // Resize logo to fit nicely on the mobile screen (approx width 800)
  const resizedLogo = await sharp(logoPath)
    .resize(800, null, { fit: 'inside' })
    .toBuffer();

  // Composite the logo over the AI-generated background
  await sharp(bgPath)
    .composite([
      { input: resizedLogo, gravity: 'center' }
    ])
    .toFile(outPath);

  console.log("Successfully created splash screen!");
}

createSplash().catch(console.error);
