from PIL import Image

# Load the original mascot icon
img = Image.open('Chobo-brand/logo/icon/chobo-mascot-icon-1024.png.png').convert("RGBA")

# Resize it to 66% (676x676) so it fits perfectly inside Android's safe zone
new_size = (676, 676)
img = img.resize(new_size, Image.Resampling.LANCZOS)

# Create a new transparent 1024x1024 canvas
canvas = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))

# Paste the resized icon into the center of the canvas
offset = ((1024 - new_size[0]) // 2, (1024 - new_size[1]) // 2)
canvas.paste(img, offset, img)

# Save as adaptive-icon.png and standard icon.png
canvas.save('apps/mobile/assets/adaptive-icon.png')
canvas.save('apps/mobile/assets/icon.png')

print("Successfully generated padded Adaptive Icons!")
