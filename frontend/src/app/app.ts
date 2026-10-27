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

  protected readonly selected = signal<NearbyPlace | null>(null);
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
  return meters < 1000
    ? `${Math.round(meters / 10) * 10} m away`
    : `${(meters / 1000).toFixed(1)} km away`;
}
