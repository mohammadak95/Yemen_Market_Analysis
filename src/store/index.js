// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import ecmReducer from '../features/ecmSlice';
import themeReducer from '../features/themeSlice';

// Import other reducers here if you have them
// import ecmReducer from '../features/ecmSlice';
// import priceDiffReducer from '../features/priceDiffSlice';
// import spatialReducer from '../features/spatialSlice';

export const store = configureStore({
  reducer: {
    ecm: ecmReducer,
    theme: themeReducer,
    // Add other reducers here if needed
    // ecm: ecmReducer,
    // priceDiff: priceDiffReducer,
    // spatial: spatialReducer,
  },
});

export default store;