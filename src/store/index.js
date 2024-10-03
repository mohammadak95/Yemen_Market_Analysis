import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../features/themeSlice';
import { reducer as ecmReducer } from '../features/ecmSlice';
import { reducer as priceDiffReducer } from '../features/priceDiffSlice';
import { reducer as spatialReducer } from '../features/spatialSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    ecm: ecmReducer,
    priceDiff: priceDiffReducer,
    spatial: spatialReducer,
  },
});