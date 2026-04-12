// src/services/geocoding.js
// Google Maps Geocoding API — converts location_text → lat/lng.
// Biased toward Mumbai. Returns null gracefully if geocoding fails.

import { Client } from "@googlemaps/google-maps-services-js";
import { env } from "../config/env.js";

const mapsClient = new Client({});

const MUMBAI_BOUNDS = {
  northeast: { lat: 19.2711, lng: 72.9862 },
  southwest: { lat: 18.8916, lng: 72.7760 },
};

/**
 * Geocode a location string to lat/lng.
 * @param {string} locationText — e.g. "Dharavi, near water tank"
 * @returns {Promise<{
 *   lat: number,
 *   lng: number,
 *   formattedAddress: string,
 *   ward: string|null
 * } | null>}
 */
export async function geocodeLocation(locationText) {
  if (!locationText || locationText === "Location not specified") {
    return null;
  }

  try {
    const response = await mapsClient.geocode({
      params: {
        address: `${locationText}, Mumbai, Maharashtra, India`,
        key:     env.GOOGLE_MAPS_API_KEY,
        bounds:  MUMBAI_BOUNDS,
        region:  "in",
      },
    });

    const results = response.data.results;
    if (!results || results.length === 0) {
      console.warn(`⚠️  Geocoding: no results for "${locationText}"`);
      return null;
    }

    const result = results[0];
    const { lat, lng } = result.geometry.location;

    // Try to extract ward/sublocality from address components
    const ward = extractWard(result.address_components);

    console.log(`📍  Geocoded "${locationText}" → (${lat}, ${lng})`);

    return {
      lat,
      lng,
      formattedAddress: result.formatted_address,
      ward,
    };
  } catch (err) {
    console.error("❌  Geocoding error:", err.message);
    return null;
  }
}

/**
 * Build a PostGIS-compatible geography point string for Supabase.
 * Supabase stores geography as POINT(lng lat) — note lng comes first.
 * @param {number} lat
 * @param {number} lng
 * @returns {string} e.g. "POINT(72.8777 19.0760)"
 */
export function buildGeoPoint(lat, lng) {
  return `POINT(${lng} ${lat})`;
}

/**
 * Extract Mumbai ward name from Google Maps address components.
 * @param {Array} components
 * @returns {string|null}
 */
function extractWard(components) {
  if (!components) return null;
  const sublocality = components.find(
    (c) => c.types.includes("sublocality_level_1") || c.types.includes("sublocality")
  );
  return sublocality?.long_name ?? null;
}