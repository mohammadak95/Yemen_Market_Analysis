// src/slices/priceDiffSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataPath } from '../utils/dataPath';

export const fetchPriceDiffData = createAsyncThunk(
  'priceDiff/fetchData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(getDataPath('price_diff_results/price_differential_results.json'));
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

const priceDiffSlice = createSlice({
  name: 'priceDiff',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPriceDiffData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPriceDiffData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchPriceDiffData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message;
      });
  }
});

export default priceDiffSlice.reducer;