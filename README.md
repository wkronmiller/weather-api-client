# Weather API Client

A minimal ESM client for the National Weather Service (weather.gov) API.

## Installation

```bash
npm install @wkronmiller/weather-api-client
```

## Requirements

- Node.js 18+ (uses global fetch)

## Usage

```javascript
import { WeatherGovClient } from '@wkronmiller/weather-api-client';

const client = new WeatherGovClient({
  userAgent: 'MyApp (contact@example.com)' // Required by NWS API
});

// Get 7-day forecast for coordinates
const forecast = await client.getForecast(40.7128, -74.0060); // NYC
console.log(forecast.properties.periods);

// Get hourly forecast
const hourly = await client.getHourlyForecast(40.7128, -74.0060);

// Get raw grid data
const gridData = await client.getGridData(40.7128, -74.0060);

// Get active alerts for an area
const alerts = await client.getAlerts({ area: 'NY' });
```

## API Methods

### `getPoint(lat, lon)`
Fetch point metadata for given coordinates.

### `getForecast(lat, lon)`
Get 7-day forecast with 12-hour periods.

### `getHourlyForecast(lat, lon)`
Get hourly forecast for the next 7 days.

### `getGridData(lat, lon)`
Get raw grid data (temperature, wind, etc.).

### `getAlerts(params)`
Get active weather alerts. Parameters are encoded as query string.

## Constructor Options

```javascript
new WeatherGovClient({
  userAgent: 'MyApp (contact@example.com)', // Required by NWS
  baseUrl: 'https://api.weather.gov',       // API base URL
  retry: 3                                  // Retry attempts for 429/5xx errors
});
```

## License

ISC

## Documentation

See the [National Weather Service API documentation](https://www.weather.gov/documentation/services-web-api) for details about the API responses and parameters.