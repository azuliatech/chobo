const sharp = require('sharp');
const fs = require('fs');

async function createVariations() {
  const bg1 = 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\splash_var_1_1784118441208.png';
  const bg2 = 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\splash_var_2_1784118457383.png';
  const bg3 = 'C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\splash_var_3_1784118500419.png';
  
  const logoDarkPath = 'Chobo-brand/logo/lockups/chobo-logo-stacked-dark.png.png';

  // Resize dark logo
  const resizedDarkLogo = await sharp(logoDarkPath)
    .resize(600, null, { fit: 'inside' })
    .toBuffer();

  // Create a white version of the logo by negating it (dark green/black becomes white/light)
  // sharp negate(true) negates alpha too, so we negate without alpha and manually apply it.
  // Actually, extracting alpha, negating rgb, then combining is safer.
  const { data, info } = await sharp(resizedDarkLogo).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
      if (data[i+3] > 0) { // If not completely transparent
          // Invert colors to white (or mostly white)
          data[i] = 255;   // R
          data[i+1] = 255; // G
          data[i+2] = 255; // B
      }
  }
  const resizedWhiteLogo = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toBuffer();

  // Composite Var 1 (Light Mint + Dark Logo)
  await sharp(bg1)
    .composite([{ input: resizedDarkLogo, gravity: 'center' }])
    .toFile('C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\scratch\\splash_option_1.png');

  // Composite Var 2 (Waves + Dark Logo)
  await sharp(bg2)
    .composite([{ input: resizedDarkLogo, gravity: 'center' }])
    .toFile('C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\scratch\\splash_option_2.png');

  // Composite Var 3 (Dark Texture + White Logo)
  await sharp(bg3)
    .composite([{ input: resizedWhiteLogo, gravity: 'center' }])
    .toFile('C:\\Users\\BRIAN\\.gemini\\antigravity\\brain\\68ff718c-89c7-424e-af4d-f31b26c9c9f3\\scratch\\splash_option_3.png');

  console.log("Successfully created 3 splash variations!");
}

createVariations().catch(console.error);
