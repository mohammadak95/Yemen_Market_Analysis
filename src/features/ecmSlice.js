import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchData = createAsyncThunk(
  'ecm/fetchData',
  async (arg, thunkAPI) => {
    // Fetch data here
  }
);

const ecmSlice = createSlice({
  name: 'ecm',
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

export const { actions, reducer } = ecmSlice;