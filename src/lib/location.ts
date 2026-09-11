// Geolocation & Haversine Distance Calculation Module

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface DistanceValidationResult {
  isValid: boolean;
  distanceMeters: number;
  maxRadiusMeters: number;
  accuracy: number;
  accuracyAcceptable: boolean;
  schoolLat: number;
  schoolLng: number;
  message: string;
}

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Requests browser Geolocation with high accuracy
 */
export function getCurrentPositionPromise(
  timeoutMs = 12000
): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('LOCATION_UNSUPPORTED'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('LOCATION_DENIED'));
        } else if (error.code === error.TIMEOUT) {
          reject(new Error('LOCATION_TIMEOUT'));
        } else {
          reject(new Error('LOCATION_UNAVAILABLE'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Validates user location against school coordinates and radius
 */
export function validateLocation(
  userLoc: UserLocation,
  schoolLat: number,
  schoolLng: number,
  maxRadiusMeters: number
): DistanceValidationResult {
  const distance = calculateHaversineDistance(
    userLoc.latitude,
    userLoc.longitude,
    schoolLat,
    schoolLng
  );

  const accuracyAcceptable = userLoc.accuracy <= 150; // max 150m accuracy margin
  const isWithinRadius = distance <= maxRadiusMeters;

  let message = '';
  if (!accuracyAcceptable) {
    message = `GPS kurang akurat (±${Math.round(userLoc.accuracy)}m). Silakan aktifkan GPS akurasi tinggi dan coba lagi.`;
  } else if (!isWithinRadius) {
    message = `Kamu berada di luar area absensi. Jarak kamu dari sekolah: ${distance} meter. Maksimal: ${maxRadiusMeters} meter.`;
  } else {
    message = `Lokasi valid! Jarak kamu: ${distance} meter dari sekolah (Radius: ${maxRadiusMeters}m).`;
  }

  return {
    isValid: isWithinRadius && accuracyAcceptable,
    distanceMeters: distance,
    maxRadiusMeters,
    accuracy: userLoc.accuracy,
    accuracyAcceptable,
    schoolLat,
    schoolLng,
    message,
  };
}
