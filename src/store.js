// src/store.js

import { configureStore } from '@reduxjs/toolkit';
import spatialReducer from './slices/spatialSlice';
// Import other reducers if any

const store = configureStore({
  reducer: {
    spatial: spatialReducer,
    // Add other reducers here
  },
});

export default store;
