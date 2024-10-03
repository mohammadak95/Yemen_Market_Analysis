// src/features/ecmSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataPath } from '../utils/dataSourceUtil';

// Async thunk to fetch ECM data
export const fetchData = createAsyncThunk(
  'ecm/fetchData',
  async (_, thunkAPI) => {
    try {
      const response = await fetch(getDataPath('ecm/ecm_analysis_results.json')); // Adjust the path as needed
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data; // Ensure the data shape matches your initialState
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const ecmSlice = createSlice({
  name: 'ecm',
  initialState: {
    data: null,
    status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    error: null
  },
  reducers: {
    // Define synchronous reducers here if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.status = 'loading';
        state.error = null; // Reset previous errors
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload; // Ensure payload matches expected data structure
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message; // Capture error message
      });
  }
});

// Export the reducer to be included in the store
export default ecmSlice.reducer;

// If you have synchronous actions, export them as well
// export const { someAction } = ecmSlice.actions;
