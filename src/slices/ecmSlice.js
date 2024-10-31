// src/slices/ecmSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataPath } from '../utils/dataUtils';

export const fetchECMData = createAsyncThunk(
  'ecm/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(getDataPath('ecm/ecm_analysis_results.json'));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  data: null,
  status: 'idle',
  error: null
};

const ecmSlice = createSlice({
  name: 'ecm',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchECMData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchECMData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchECMData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  }
});

export default ecmSlice.reducer;