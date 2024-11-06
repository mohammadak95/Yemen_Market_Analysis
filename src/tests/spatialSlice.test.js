// src/tests/spatialSlice.test.js

import { __testing, fetchSpatialData } from '../store/spatialSlice';
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

const { processAllData, fetchWithDeduplication, requestTracker } = __testing;

const mockStore = configureStore([thunk]);

describe('Spatial Data Loading', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      spatial: {
        geoData: null,
        status: 'idle',
        error: null
      }
    });
    requestTracker.clear();
    global.fetch = jest.fn();
  });

  it('should handle successful data loading', async () => {
    // Mock responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('geoBoundaries')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            features: [{
              properties: { shapeName: 'Test Region' }
            }]
          })
        });
      }
      // Add other mocks as needed
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });

    const selectedCommodity = 'test-commodity';
    const result = await store.dispatch(fetchSpatialData(selectedCommodity));

    expect(result.type).toBe('spatial/fetchSpatialData/fulfilled');
    expect(result.payload).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('should handle failed data loading', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const selectedCommodity = 'test-commodity';
    const result = await store.dispatch(fetchSpatialData(selectedCommodity));

    expect(result.type).toBe('spatial/fetchSpatialData/rejected');
    expect(result.error).toBeDefined();
  });

  it('should deduplicate requests', async () => {
    const url = 'test-url';
    const promise1 = fetchWithDeduplication(url);
    const promise2 = fetchWithDeduplication(url);

    expect(promise1).toBe(promise2);
    expect(requestTracker.pending.size).toBe(1);
  });
});