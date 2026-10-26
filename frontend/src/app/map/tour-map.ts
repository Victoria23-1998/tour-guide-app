import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { Position, UserLocation } from '../location/user-location';

/** OpenFreeMap vector style: free, no API key. Other options: `positron`, `bright`. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Copied from node_modules by angular.json, because the bundler does not emit MapLibre's worker. */
const WORKER_URL = 'maplibre/maplibre-gl-worker.mjs';

const ACCURACY_SOURCE = 'user-accuracy';
const STREET_ZOOM = 16;

/**
 * Full-screen MapLibre map that shows and follows the user's position.
 * MapLibre is loaded with a dynamic import, so it stays out of the initial bundle.
 */
@Component({
  selector: 'app-tour-map',
  templateUrl: './tour-map.html',
  host: { class: 'relative block size-full' },
})
export class TourMap {
  private readonly location = inject(UserLocation);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');

  /** True while the map should keep the user's position in the center. */
  protected readonly following = signal(true);
  protected readonly mapFailed = signal(false);
  protected readonly hasPosition = computed(() => this.location.position() !== null);

  private readonly mapLoaded = signal(false);
  private map?: MapLibreMap;
  private marker?: Marker;
  private destroyed = false;

  constructor() {
    afterNextRender(() => this.createMap());

    effect(() => {
      const position = this.location.position();
      if (this.mapLoaded() && position) {
        this.showPosition(position);
      }
    });

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.map?.remove();
    });
  }

  protected recenter(): void {
    const position = this.location.position();
    if (!this.map || !position) {
      return;
    }
    this.following.set(true);
    this.map.flyTo({
      center: [position.lon, position.lat],
      zoom: Math.max(this.map.getZoom(), STREET_ZOOM - 1),
    });
  }

  private async createMap(): Promise<void> {
    const maplibre = await import('maplibre-gl');
    if (this.destroyed) {
      return;
    }
    maplibre.setWorkerUrl(new URL(WORKER_URL, document.baseURI).href);

    try {
      this.map = new maplibre.Map({
        container: this.container().nativeElement,
        style: STYLE_URL,
        center: [10, 30],
        zoom: 1.5,
        attributionControl: { compact: true },
      });
    } catch {
      // Thrown when the browser has no WebGL.
      this.mapFailed.set(true);
      return;
    }

    const map = this.map;
    map.on('style.load', () => map.setProjection({ type: 'globe' }));
    map.on('load', () => {
      map.addSource(ACCURACY_SOURCE, { type: 'geojson', data: emptyFeatures() });
      map.addLayer({
        id: ACCURACY_SOURCE,
        type: 'fill',
        source: ACCURACY_SOURCE,
        paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.15 },
      });
      this.mapLoaded.set(true);
    });
    // Only a drag by the user (not our own camera animations) stops following.
    map.on('dragstart', (event) => {
      if (event.originalEvent) {
        this.following.set(false);
      }
    });

    this.marker = new maplibre.Marker({ element: createMarkerElement() });
  }

  private showPosition(position: Position): void {
    const map = this.map!;
    const marker = this.marker!;
    const center: [number, number] = [position.lon, position.lat];
    const firstFix = !marker.getElement().isConnected;

    marker.setLngLat(center);
    if (firstFix) {
      marker.addTo(map);
      map.flyTo({ center, zoom: STREET_ZOOM, pitch: 45, duration: 4000, essential: true });
    } else if (this.following()) {
      map.easeTo({ center, duration: 1000 });
    }

    map
      .getSource<GeoJSONSource>(ACCURACY_SOURCE)
      ?.setData(accuracyCircle(position.lon, position.lat, position.accuracy));
  }
}

function createMarkerElement(): HTMLElement {
  const element = document.createElement('div');
  element.className = 'relative size-5';
  element.setAttribute('aria-label', 'You are here');
  element.innerHTML = `
    <span class="absolute inset-0 animate-ping rounded-full bg-sky-400/70"></span>
    <span class="relative block size-5 rounded-full border-[3px] border-white bg-sky-500 shadow-lg shadow-sky-900/40"></span>
  `;
  return element;
}

function emptyFeatures(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

/** A polygon that approximates a circle of `radius` meters around a point. */
function accuracyCircle(lon: number, lat: number, radius: number): Feature {
  const points = 64;
  const metersPerDegree = 111_320;
  const latRadius = radius / metersPerDegree;
  const lonRadius = radius / (metersPerDegree * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    ring.push([lon + lonRadius * Math.cos(angle), lat + latRadius * Math.sin(angle)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
