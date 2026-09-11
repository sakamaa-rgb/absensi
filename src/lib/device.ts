import { safeStorage } from './storage';

const DEVICE_STORAGE_KEY = 'pplg3_device_token';

export interface DeviceData {
  deviceToken: string;
  userAgent: string;
  platform: string;
  screenResolution: string;
  language: string;
  registeredAt: string;
}

/**
 * Gets or initializes a persistent device token on this browser
 */
export function getOrCreateDeviceToken(): DeviceData {
  let token = safeStorage.getItem(DEVICE_STORAGE_KEY);
  
  if (!token) {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    token = `DEV-${randomHex}`;
    safeStorage.setItem(DEVICE_STORAGE_KEY, token);
  }

  const deviceData: DeviceData = {
    deviceToken: token,
    userAgent: navigator.userAgent,
    platform: (navigator as any).userAgentData?.platform || navigator.platform || 'Unknown OS',
    screenResolution: `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x)`,
    language: navigator.language || 'id-ID',
    registeredAt: new Date().toISOString(),
  };

  return deviceData;
}

/**
 * Validates if the current browser matches the student's registered device token
 */
export function verifyDeviceMatch(registeredToken?: string | null): {
  isValid: boolean;
  currentToken: string;
  isFirstRegistration: boolean;
} {
  const current = getOrCreateDeviceToken();

  if (!registeredToken) {
    // If student has no registered device yet, this device will be their first bound device
    return {
      isValid: true,
      currentToken: current.deviceToken,
      isFirstRegistration: true,
    };
  }

  const isMatch = current.deviceToken === registeredToken;
  return {
    isValid: isMatch,
    currentToken: current.deviceToken,
    isFirstRegistration: false,
  };
}

/**
 * Clears local device token (e.g. for testing device reset)
 */
export function clearLocalDeviceToken(): void {
  safeStorage.removeItem(DEVICE_STORAGE_KEY);
}

