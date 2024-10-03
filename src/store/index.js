// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import ecmReducer from '../features/ecm-analysis/ecmSlice';
import priceDiffReducer from '../features/price-differential-analysis/priceDiffSlice';
import spatialReducer from '../features/spatial-analysis/spatialSlice';

export const store = configureStore({
  reducer: {
    ecm: ecmReducer,
    priceDiff: priceDiffReducer,
    spatial: spatialReducer,
  },
});