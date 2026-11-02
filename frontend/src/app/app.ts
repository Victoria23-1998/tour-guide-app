import { Component, computed, inject, signal } from '@angular/core';
import { distanceMeters } from './location/distance';
import { LocationStatus, UserLocation } from './location/user-location';
import { TourMap } from './map/tour-map';
import { NearbyPlace } from './places/nearby-place';
import { NearbyPlaces } from './places/nearby-places';

interface LocationProblem {
  title: string;
  text: string;
  canRetry: boolean;
}

const PROBLEMS: Partial<Record<LocationStatus, LocationProblem>> = {
  denied: {
    title: 'Location is turned off',
    text: 'Tour Guide needs your location to show the places around you. Allow location for this site in your browser settings, then try again.',
    canRetry: true,
  },
  unavailable: {
    title: "We can't find your location",
    text: 'Your device could not get a position. Check that location services are on, or move to an open area.',
    canRetry: true,
  },
  unsupported: {
    title: 'Location is not supported',
    text: 'This browser cannot share your location. Try a recent version of Chrome, Safari or Firefox.',
    canRetry: false,
  },
};

@Component({
  imports: [TourMap],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly location = inject(UserLocation);
  protected readonly nearby = inject(NearbyPlaces);
  protected readonly problem = computed(() => PROBLEMS[this.location.status()] ?? null);

  protected readonly selectedId = signal<number | null>(null);
  /** Looked up in the current list, so the card closes when a new search no longer returns the place. */
  protected readonly selected = computed(
    () => this.nearby.places().find((place) => place.pageId === this.selectedId()) ?? null,
  );
  /** Live distance to the selected place; the API's distance gets stale while the user walks. */
  protected readonly selectedDistance = computed(() => {
    const place = this.selected();
    const position = this.location.position();
    return place && position ? formatDistance(distanceMeters(position, place)) : null;
  });

  constructor() {
    this.location.start();
  }

  protected wikipediaUrl(place: NearbyPlace): string {
    return `https://en.wikipedia.org/?curid=${place.pageId}`;
  }
}

function formatDistance(meters: number): string {
  // Round before choosing the unit, so 996 m reads "1.0 km away", not "1000 m away".
  const rounded = Math.round(meters / 10) * 10;
  return rounded < 1000 ? `${rounded} m away` : `${(meters / 1000).toFixed(1)} km away`;
}
