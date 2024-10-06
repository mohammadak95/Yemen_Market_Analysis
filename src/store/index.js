// src/store/index.js

import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../features/themeSlice';
// Import other reducers here if you have them
// import ecmReducer from '../features/ecmSlice';
// import priceDiffReducer from '../features/priceDiffSlice';
// import spatialReducer from '../features/spatialSlice';

// Configure the Redux store
export const store = configureStore({
  reducer: {
    theme: themeReducer,
    // Add other reducers here if needed
    // ecm: ecmReducer,
    // priceDiff: priceDiffReducer,
    // spatial: spatialReducer,
  },
});

export default store;