import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchData = createAsyncThunk(
  'priceDiff/fetchData',
  async () => {
    // Fetch data here
    // If you need to use thunkAPI, add it as a parameter: async (_, thunkAPI) => { ... }
  }
);

const priceDiffSlice = createSlice({
  name: 'priceDiff',
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

export const { actions } = priceDiffSlice;

// Export the reducer as both a named export and default export
export const priceDiffReducer = priceDiffSlice.reducer;
export default priceDiffSlice.reducer;