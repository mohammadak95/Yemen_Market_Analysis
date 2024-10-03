import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../features/themeSlice';
import ecmReducer from '../features/ecmSlice';
import priceDiffReducer from '../features/priceDiffSlice';
import spatialReducer from '../features/spatialSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    ecm: ecmReducer,
    priceDiff: priceDiffReducer,
    spatial: spatialReducer,
  },
});