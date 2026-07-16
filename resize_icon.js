const sharp = require('sharp');
const fs = require('fs');

async function processIcon() {
  const iconPath = 'Chobo-brand/logo/icon/chobo-mascot-icon-1024.png.png';
  const outPathAdaptive = 'apps/mobile/assets/adaptive-icon.png';
  const outPathStandard = 'apps/mobile/assets/icon.png';

  // Resize icon to 676x676 (approx 66% of 1024)
  const resizedBuffer = await sharp(iconPath)
    .resize(676, 676, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .toBuffer();

  // Create a 1024x1024 transparent canvas and composite the resized icon in the center
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 }
    }
  })
    .composite([
      { input: resizedBuffer, gravity: 'center' }
    ])
    .toFile(outPathAdaptive);

  // For the standard icon, we can just use the same padded one, or an unpadded one.
  // Standard icon is usually 1024x1024 unpadded or padded. Expo handles standard icon well.
  // Actually, standard icon for iOS shouldn't have transparency usually, but Expo adds white bg.
  // Let's just use the padded one for consistency, or copy the original 1024 to icon.png.
  // The user complained the icon was cut off.
  await sharp(outPathAdaptive).toFile(outPathStandard);
  
  console.log("Successfully generated adaptive icons.");
}

processIcon().catch(console.error);
