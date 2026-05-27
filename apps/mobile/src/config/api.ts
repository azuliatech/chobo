/**
 * KashAm — Backend API Configuration
 *
 * TO TEST ON PHYSICAL DEVICE:
 *   Replace with your machine's current LAN IP address.
 *   Find it: Windows → run `ipconfig` → look for "IPv4 Address" under Wi-Fi.
 *   Example: http://192.168.1.105:3000
 *
 * TO TEST ON ANDROID EMULATOR:
 *   Use http://10.0.2.2:3000 (emulator routes this to host localhost)
 *
 * TO TEST ON iOS SIMULATOR:
 *   Use http://localhost:3000
 *
 * NEVER use http://localhost:3000 on a physical device — that points to the phone itself.
 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
