/**
 * Cloudinary unsigned upload utility for KashAm.
 * Uses an unsigned upload preset — no API secret needed on the frontend.
 */
export const uploadImageToCloudinary = async (localUri: string): Promise<string | null> => {
    try {
        const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            console.error('Cloudinary env vars missing. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to apps/mobile/.env');
            return null;
        }

        const formData = new FormData();
        formData.append('file', { uri: localUri, type: 'image/jpeg', name: 'upload.jpg' } as any);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'kasham');

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
        );
        const data = await response.json();
        if (data.secure_url) return data.secure_url;
        console.error('Cloudinary upload failed:', data);
        return null;
    } catch (error) {
        console.error('Image upload error:', error);
        return null;
    }
};
