const sharp = require('sharp');

async function fixVariations() {
  const bgPlain = 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\splash_var_4_1784119387472.png';
  const bgWaves = 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\splash_var_2_1784118457383.png';
  
  const logoPath = 'Chobo-brand/logo/lockups/chobo-logo-stacked-dark.png (2).png';

  // 1. Resize the logo to a reasonable size for a portrait screen
  const resizedLogo = await sharp(logoPath)
    .resize({ width: 600, fit: 'inside' })
    .toBuffer();

  const width = 1242;
  const height = 2436;

  // 2. Process Variation 1 (Plain Pattern)
  const portraitPlain = await sharp(bgPlain)
    .resize({ width, height, fit: 'cover' })
    .toBuffer();

  await sharp(portraitPlain)
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .toFile('C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\scratch\\new_splash_plain.png');

  // 3. Process Variation 2 (Waves)
  const portraitWaves = await sharp(bgWaves)
    .resize({ width, height, fit: 'cover' })
    .toBuffer();

  await sharp(portraitWaves)
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .toFile('C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\scratch\\new_splash_waves.png');

  console.log("Successfully created perfectly aligned portrait variations!");
}

fixVariations().catch(console.error);
