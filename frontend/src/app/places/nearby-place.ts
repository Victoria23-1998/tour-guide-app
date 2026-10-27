/** A place returned by `GET /api/places/nearby`. */
export interface NearbyPlace {
  /** Wikipedia page id. */
  pageId: number;
  title: string;
  lat: number;
  lon: number;
  /** Distance from the position sent in the request. */
  distanceMeters: number;
}
