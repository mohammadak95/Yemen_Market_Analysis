// src/__tests__/redux/spatialSlice.test.js
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import {
 fetchAllSpatialData,
 fetchFlowData,
 initialState,
 spatialReducer
} from '../../slices/spatialSlice';

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('Spatial Redux Integration', () => {
 let store;

 beforeEach(() => {
   store = mockStore({ spatial: initialState });
 });

 test('fetchAllSpatialData success', async () => {
   const mockData = {
     timeSeriesData: [],
     flowMaps: [],
     marketClusters: []
   };

   jest.spyOn(spatialHandler, 'getSpatialData')
     .mockResolvedValue(mockData);

   await store.dispatch(fetchAllSpatialData({ 
     commodity: 'test', 
     date: '2023-01-01' 
   }));

   const actions = store.getActions();
   expect(actions[0].type).toBe('spatial/fetchAllSpatialData/pending');
   expect(actions[1].type).toBe('spatial/fetchAllSpatialData/fulfilled');
   expect(actions[1].payload).toEqual(expect.objectContaining(mockData));
 });

 test('fetchFlowData success', async () => {
   const mockFlowData = [{
     source: 'A',
     target: 'B',
     value: 100
   }];

   jest.spyOn(spatialHandler, 'loadFlowDataWithRecovery')
     .mockResolvedValue(mockFlowData);

   await store.dispatch(fetchFlowData({ 
     commodity: 'test' 
   }));

   const actions = store.getActions();
   expect(actions[0].type).toBe('spatial/fetchFlowData/pending');
   expect(actions[1].type).toBe('spatial/fetchFlowData/fulfilled');
   expect(actions[1].payload).toEqual(mockFlowData);
 });

 test('reducer handles loading states', () => {
   let state = spatialReducer(undefined, {
     type: 'spatial/fetchAllSpatialData/pending'
   });
   expect(state.status.loading).toBe(true);

   state = spatialReducer(state, {
     type: 'spatial/fetchAllSpatialData/fulfilled',
     payload: { timeSeriesData: [] }
   });
   expect(state.status.loading).toBe(false);
 });

 test('reducer handles error states', () => {
   const error = new Error('Test error');
   const state = spatialReducer(undefined, {
     type: 'spatial/fetchAllSpatialData/rejected',
     payload: error
   });
   expect(state.status.error).toBe(error);
 });
});