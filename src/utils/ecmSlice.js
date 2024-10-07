// src/features/ecmSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDataPath } from './dataSourceUtil';

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
    status: 'idle',
    error: null
  },
  reducers: {},
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

export default ecmSlice.reducer;