import { Component, computed, inject } from '@angular/core';
import { LocationStatus, UserLocation } from './location/user-location';
import { TourMap } from './map/tour-map';

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
  protected readonly problem = computed(() => PROBLEMS[this.location.status()] ?? null);

  constructor() {
    this.location.start();
  }
}
