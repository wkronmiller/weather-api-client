import { jest } from '@jest/globals';
import { WeatherGovClient } from './index.mjs';

// Mock global fetch
global.fetch = jest.fn();

describe('WeatherGovClient', () => {
  let client;

  beforeEach(() => {
    client = new WeatherGovClient({
      userAgent: 'test-agent',
      retry: 2
    });
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should set default options', () => {
      const defaultClient = new WeatherGovClient();
      expect(defaultClient.baseUrl).toBe('https://api.weather.gov');
      expect(defaultClient.retry).toBe(3);
      expect(defaultClient.headers['User-Agent']).toBe('weatherGovClient (you@example.com)');
    });

    it('should accept custom options', () => {
      const customClient = new WeatherGovClient({
        userAgent: 'custom-agent',
        baseUrl: 'https://custom.api.com/',
        retry: 1
      });
      expect(customClient.baseUrl).toBe('https://custom.api.com');
      expect(customClient.retry).toBe(1);
      expect(customClient.headers['User-Agent']).toBe('custom-agent');
    });
  });

  describe('_fetch', () => {
    it('should make successful request', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client._fetch('/test');
      
      expect(fetch).toHaveBeenCalledWith('https://api.weather.gov/test', {
        headers: {
          'User-Agent': 'test-agent',
          Accept: 'application/geo+json'
        }
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle full URLs', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      await client._fetch('https://example.com/test');
      
      expect(fetch).toHaveBeenCalledWith('https://example.com/test', expect.any(Object));
    });

    it('should retry on 429 status', async () => {
      fetch
        .mockResolvedValueOnce({
          status: 429,
          text: () => Promise.resolve('Rate limited')
        })
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ success: true })
        });

      const result = await client._fetch('/test');
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should retry on 5xx status', async () => {
      fetch
        .mockResolvedValueOnce({
          status: 500,
          text: () => Promise.resolve('Server error')
        })
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve({ success: true })
        });

      const result = await client._fetch('/test');
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ success: true });
    });

    it('should throw error after retries exhausted', async () => {
      fetch.mockResolvedValue({
        status: 500,
        text: () => Promise.resolve('Server error')
      });

      await expect(client._fetch('/test')).rejects.toThrow(
        'Request to https://api.weather.gov/test failed (500): Server error'
      );
      
      expect(fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should throw error on 4xx status (no retry)', async () => {
      fetch.mockResolvedValueOnce({
        status: 404,
        text: () => Promise.resolve('Not found')
      });

      await expect(client._fetch('/test')).rejects.toThrow(
        'Request to https://api.weather.gov/test failed (404): Not found'
      );
      
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPoint', () => {
    it('should fetch point data for coordinates', async () => {
      const mockPoint = { properties: { forecast: 'http://example.com/forecast' } };
      fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockPoint)
      });

      const result = await client.getPoint(40.7128, -74.0060);
      
      expect(fetch).toHaveBeenCalledWith('https://api.weather.gov/points/40.7128,-74.006', expect.any(Object));
      expect(result).toEqual(mockPoint);
    });
  });

  describe('getForecast', () => {
    it('should fetch forecast using point data', async () => {
      const mockPoint = { 
        properties: { 
          forecast: 'https://api.weather.gov/gridpoints/NYC/33,37/forecast' 
        } 
      };
      const mockForecast = { properties: { periods: [] } };
      
      fetch
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve(mockPoint)
        })
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve(mockForecast)
        });

      const result = await client.getForecast(40.7128, -74.0060);
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.weather.gov/points/40.7128,-74.006', expect.any(Object));
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.weather.gov/gridpoints/NYC/33,37/forecast', expect.any(Object));
      expect(result).toEqual(mockForecast);
    });
  });

  describe('getHourlyForecast', () => {
    it('should fetch hourly forecast using point data', async () => {
      const mockPoint = { 
        properties: { 
          forecastHourly: 'https://api.weather.gov/gridpoints/NYC/33,37/forecast/hourly' 
        } 
      };
      const mockHourlyForecast = { properties: { periods: [] } };
      
      fetch
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve(mockPoint)
        })
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve(mockHourlyForecast)
        });

      const result = await client.getHourlyForecast(40.7128, -74.0060);
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.weather.gov/gridpoints/NYC/33,37/forecast/hourly', expect.any(Object));
      expect(result).toEqual(mockHourlyForecast);
    });
  });

  describe('getGridData', () => {
    it('should fetch grid data using point data', async () => {
      const mockPoint = { 
        properties: { 
          forecastGridData: 'https://api.weather.gov/gridpoints/NYC/33,37' 
        } 
      };
      const mockGridData = { properties: { temperature: {} } };
      
      fetch
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve(mockPoint)
        })
        .mockResolvedValueOnce({
          status: 200,
          json: () => Promise.resolve(mockGridData)
        });

      const result = await client.getGridData(40.7128, -74.0060);
      
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.weather.gov/gridpoints/NYC/33,37', expect.any(Object));
      expect(result).toEqual(mockGridData);
    });
  });

  describe('getAlerts', () => {
    it('should fetch alerts without parameters', async () => {
      const mockAlerts = { features: [] };
      fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockAlerts)
      });

      const result = await client.getAlerts();
      
      expect(fetch).toHaveBeenCalledWith('https://api.weather.gov/alerts', expect.any(Object));
      expect(result).toEqual(mockAlerts);
    });

    it('should fetch alerts with parameters', async () => {
      const mockAlerts = { features: [] };
      fetch.mockResolvedValueOnce({
        status: 200,
        json: () => Promise.resolve(mockAlerts)
      });

      const result = await client.getAlerts({ area: 'NY', severity: 'severe' });
      
      expect(fetch).toHaveBeenCalledWith('https://api.weather.gov/alerts?area=NY&severity=severe', expect.any(Object));
      expect(result).toEqual(mockAlerts);
    });
  });
});