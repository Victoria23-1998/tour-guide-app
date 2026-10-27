import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
  Marker,
} from 'maplibre-gl';
import type { Feature, FeatureCollection } from 'geojson';
import { Position, UserLocation } from '../location/user-location';
import { NearbyPlace } from '../places/nearby-place';

/** OpenFreeMap vector style: free, no API key. Other options: `positron`, `bright`. */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Copied from node_modules by angular.json, because the bundler does not emit MapLibre's worker. */
const WORKER_URL = 'maplibre/maplibre-gl-worker.mjs';

const ACCURACY_SOURCE = 'user-accuracy';
const PLACES_LAYER = 'places';
const PLACE_LABELS_LAYER = 'place-labels';
/** Extra pixels around a tap, so the small place dots are easy to hit with a finger. */
const TAP_TOLERANCE = 12;
const PLACE_COLOR = '#f59e0b'; // Tailwind amber-500
const SELECTED_COLOR = '#e11d48'; // Tailwind rose-600
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
  readonly places = input<NearbyPlace[]>([]);
  readonly selectedId = input<number | null>(null);
  /** Emits the tapped place, or null when the user taps the map outside any place. */
  readonly placeSelect = output<NearbyPlace | null>();

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

    effect(() => {
      const places = this.places();
      if (this.mapLoaded()) {
        this.map!.getSource<GeoJSONSource>(PLACES_LAYER)?.setData(placeFeatures(places));
      }
    });

    effect(() => {
      const selectedId = this.selectedId();
      if (this.mapLoaded()) {
        const isSelected: ExpressionSpecification = ['==', ['get', 'pageId'], selectedId ?? -1];
        this.map!.setPaintProperty(PLACES_LAYER, 'circle-radius', ['case', isSelected, 10, 7]);
        this.map!.setPaintProperty(PLACES_LAYER, 'circle-color', [
          'case',
          isSelected,
          SELECTED_COLOR,
          PLACE_COLOR,
        ]);
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
      addPlaceLayers(map);
      this.mapLoaded.set(true);
    });
    map.on('click', (event) => this.selectPlaceAt(event));
    // Only a drag by the user (not our own camera animations) stops following.
    map.on('dragstart', (event) => {
      if (event.originalEvent) {
        this.following.set(false);
      }
    });

    this.marker = new maplibre.Marker({ element: createMarkerElement() });
  }

  private selectPlaceAt(event: MapMouseEvent): void {
    const { x, y } = event.point;
    const [feature] = this.map!.queryRenderedFeatures(
      [
        [x - TAP_TOLERANCE, y - TAP_TOLERANCE],
        [x + TAP_TOLERANCE, y + TAP_TOLERANCE],
      ],
      { layers: [PLACES_LAYER, PLACE_LABELS_LAYER] },
    );
    const pageId = feature?.properties['pageId'];
    this.placeSelect.emit(this.places().find((place) => place.pageId === pageId) ?? null);
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

/** Amber dots with the place name under them; one GeoJSON source feeds both layers. */
function addPlaceLayers(map: MapLibreMap): void {
  map.addSource(PLACES_LAYER, { type: 'geojson', data: emptyFeatures() });
  map.addLayer({
    id: PLACES_LAYER,
    type: 'circle',
    source: PLACES_LAYER,
    paint: {
      'circle-radius': 7,
      'circle-color': PLACE_COLOR,
      'circle-stroke-width': 2.5,
      'circle-stroke-color': '#ffffff',
    },
  });
  map.addLayer({
    id: PLACE_LABELS_LAYER,
    type: 'symbol',
    source: PLACES_LAYER,
    layout: {
      'text-field': ['get', 'title'],
      'text-font': ['Noto Sans Bold'], // must be a font the OpenFreeMap style serves
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 0.9],
      'text-max-width': 9,
    },
    paint: { 'text-color': '#1e293b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
  });

  for (const layer of [PLACES_LAYER, PLACE_LABELS_LAYER]) {
    map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
  }
}

function placeFeatures(places: NearbyPlace[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: places.map((place) => ({
      type: 'Feature',
      properties: { pageId: place.pageId, title: place.title },
      geometry: { type: 'Point', coordinates: [place.lon, place.lat] },
    })),
  };
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
