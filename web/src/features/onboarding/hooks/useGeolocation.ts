// web/src/features/onboarding/hooks/useGeolocation.ts
import { useCallback, useState } from 'react';
import type { GeoPoint, GeolocationStatus } from '../types/location';

interface UseGeolocationResult {
  status: GeolocationStatus;
  point: GeoPoint | null;
  errorMessage: string | null;
  detect: () => void;
  reset: () => void;
}

const ERROR_MESSAGES: Record<number, string> = {
  1: 'تم رفض إذن الوصول إلى الموقع. يمكنك تحديد موقعك يدويًا على الخريطة.',
  2: 'تعذّر تحديد موقعك حاليًا. حاول مرة أخرى أو حدّده يدويًا.',
  3: 'استغرق تحديد الموقع وقتًا طويلاً. حاول مرة أخرى أو حدّده يدويًا.',
};

export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detect = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      setErrorMessage('متصفحك لا يدعم تحديد الموقع تلقائيًا.');
      return;
    }

    setStatus('locating');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus('success');
      },
      (error) => {
        setErrorMessage(ERROR_MESSAGES[error.code] ?? 'حدث خطأ أثناء تحديد موقعك.');
        setStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setPoint(null);
    setErrorMessage(null);
  }, []);

  return { status, point, errorMessage, detect, reset };
}
