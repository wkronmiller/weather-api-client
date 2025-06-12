// weatherGovClient.mjs
// Minimal ESM client for the National Weather Service (weather.gov) API
// Docs: https://www.weather.gov/documentation/services-web-api
// Requires Node 18+ (global fetch) or `node-fetch` polyfill for earlier versions.

import { setTimeout as sleep } from 'node:timers/promises';

const DEFAULT_BASE = 'https://api.weather.gov';

/**
 * Simplified wrapper around the NWS weather.gov API.
 * Only GeoJSON is returned – adjust Accept if you need XML.
 */
export class WeatherGovClient {
  /**
   * @param {Object} [options]
   * @param {string} [options.userAgent] – custom User‑Agent (required by NWS)
   * @param {string} [options.baseUrl] – override API root (defaults to https://api.weather.gov)
   * @param {number} [options.retry] – number of automatic retries on 429/5xx (default 3)
   */
  constructor({ userAgent = 'weatherGovClient (you@example.com)', baseUrl = DEFAULT_BASE, retry = 3 } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.retry = retry;
    this.headers = {
      'User-Agent': userAgent,
      Accept: 'application/geo+json',
    };
  }

  /** Internal fetch with simple retry/backoff */
  async _fetch(pathOrUrl, opts = {}) {
    let tries = this.retry;
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : this.baseUrl + pathOrUrl;

    while (true) {
      const res = await fetch(url, { headers: { ...this.headers, ...opts.headers }, ...opts });
      if (res.status >= 200 && res.status < 300) return res.json();
      if (res.status === 429 || (res.status >= 500 && tries > 0)) {
        const wait = (this.retry - tries + 1) * 1000; // 1 s, 2 s, 3 s …
        tries -= 1;
        await sleep(wait);
        continue;
      }
      const text = await res.text();
      throw new Error(`Request to ${url} failed (${res.status}): ${text}`);
    }
  }

  /**
   * Fetch /points metadata for given lat/lon.
   * @param {number} lat
   * @param {number} lon
   */
  async getPoint(lat, lon) {
    return this._fetch(`/points/${lat},${lon}`);
  }

  /**
   * 7‑day / 12‑hour forecast periods for lat/lon.
   */
  async getForecast(lat, lon) {
    const point = await this.getPoint(lat, lon);
    return this._fetch(new URL(point.properties.forecast).pathname);
  }

  /**
   * Hourly forecast for next 7 days for lat/lon.
   */
  async getHourlyForecast(lat, lon) {
    const point = await this.getPoint(lat, lon);
    return this._fetch(new URL(point.properties.forecastHourly).pathname);
  }

  /**
   * Raw grid data (temperature, wind, etc.).
   */
  async getGridData(lat, lon) {
    const point = await this.getPoint(lat, lon);
    return this._fetch(new URL(point.properties.forecastGridData).pathname);
  }

  /**
   * Active alerts.
   * Example: client.getAlerts({ area: 'NY' })
   * @param {Object} params – key/value pairs are encoded into query string
   */
  async getAlerts(params = {}) {
    const usp = new URLSearchParams(params).toString();
    return this._fetch(`/alerts${usp ? '?' + usp : ''}`);
  }
}
