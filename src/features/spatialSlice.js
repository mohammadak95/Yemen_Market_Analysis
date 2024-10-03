import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchData = createAsyncThunk(
  'spatial/fetchData',
  async () => {
    // Fetch data here
    // If you need to use thunkAPI, add it as a parameter: async (_, thunkAPI) => { ... }
  }
);

const spatialSlice = createSlice({
  name: 'spatial',
  initialState: {
    data: null,
    status: 'idle',
    error: null
  },
  reducers: {
    // Your reducers here
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message;
      });
  }
});

export const { actions } = spatialSlice;

// Export the reducer as both a named export and default export
export const spatialReducer = spatialSlice.reducer;
export default spatialSlice.reducer;