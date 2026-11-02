import { httpResource } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { distanceMeters } from '../location/distance';
import { Position, UserLocation } from '../location/user-location';
import { NearbyPlace } from './nearby-place';

/** Load places again only after the user has moved this far from the last search. */
export const RELOAD_DISTANCE_METERS = 200;

export type PlacesStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

/** Loads the places around the user's position from the backend. */
@Injectable({ providedIn: 'root' })
export class NearbyPlaces {
  private readonly location = inject(UserLocation);

  // The custom `equal` keeps the old center while the user stays within RELOAD_DISTANCE_METERS,
  // so a new request is sent only after a real move, not on every GPS update.
  private readonly searchCenter = computed(() => this.location.position(), {
    equal: (a, b) => isNear(a, b),
  });

  private readonly resource = httpResource<NearbyPlace[]>(() => {
    const center = this.searchCenter();
    return center
      ? { url: '/api/places/nearby', params: { lat: center.lat, lon: center.lon } }
      : undefined;
  });

  private readonly lastPlaces = signal<NearbyPlace[]>([]);

  /** The latest places. Keeps the previous list while a new one loads, so markers don't blink. */
  readonly places = this.lastPlaces.asReadonly();

  readonly status = computed<PlacesStatus>(() => {
    if (!this.searchCenter()) {
      return 'idle';
    }
    if (this.resource.error()) {
      return 'error';
    }
    if (this.resource.isLoading()) {
      return 'loading';
    }
    return this.places().length > 0 ? 'ready' : 'empty';
  });

  constructor() {
    // The resource clears its value when a new search starts, so remember the last result.
    // An effect (not linkedSignal) because it must run even when nobody reads `places`.
    effect(() => {
      if (this.resource.hasValue()) {
        this.lastPlaces.set(this.resource.value());
      }
    });
  }

  reload(): void {
    this.resource.reload();
  }
}

function isNear(a: Position | null, b: Position | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return distanceMeters(a, b) < RELOAD_DISTANCE_METERS;
}
