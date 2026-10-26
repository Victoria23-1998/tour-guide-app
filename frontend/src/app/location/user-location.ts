import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export interface Position {
  lat: number;
  lon: number;
  /** Accuracy radius in meters. */
  accuracy: number;
}

export type LocationStatus =
  'idle' | 'locating' | 'tracking' | 'denied' | 'unavailable' | 'unsupported';

/** `GeolocationPositionError.PERMISSION_DENIED`, which jsdom does not define. */
const PERMISSION_DENIED = 1;

/**
 * Watches the user's position with the browser Geolocation API.
 * Coordinates are personal data, so they are never logged.
 */
@Injectable({ providedIn: 'root' })
export class UserLocation {
  readonly position = signal<Position | null>(null);
  readonly status = signal<LocationStatus>('idle');

  private watch: { geolocation: Geolocation; id: number } | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(): void {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.status.set('unsupported');
      return;
    }

    this.stop();
    this.status.set('locating');
    const geolocation = navigator.geolocation;
    const id = geolocation.watchPosition(
      ({ coords }) => {
        this.position.set({
          lat: coords.latitude,
          lon: coords.longitude,
          accuracy: coords.accuracy,
        });
        this.status.set('tracking');
      },
      (error) => {
        if (error.code === PERMISSION_DENIED) {
          this.status.set('denied');
          this.stop();
        } else if (!this.position()) {
          // Keep showing the last known position if a later update times out.
          this.status.set('unavailable');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    );
    this.watch = { geolocation, id };
  }

  stop(): void {
    this.watch?.geolocation.clearWatch(this.watch.id);
    this.watch = null;
  }
}
