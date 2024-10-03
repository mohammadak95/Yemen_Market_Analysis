// src/features/ecmSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataPath } from '../utils/dataSourceUtil';

// Async thunk to fetch ECM data
export const fetchData = createAsyncThunk(
  'ecm/fetchData',
  async (_, thunkAPI) => {
    try {
      const response = await fetch(getDataPath('ecm/ecm_analysis_results.json'));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
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
        state.error = null;
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  }
});

// Export the actions
export const { actions } = ecmSlice;

// Export the reducer as a named export
export const ecmReducer = ecmSlice.reducer;

// Export the reducer as the default export
export default ecmSlice.reducer;