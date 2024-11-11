// src/slices/themeSlice.js

import { createSlice } from '@reduxjs/toolkit';

export const initialState = {
  isDarkMode: false,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
    setDarkMode: (state, action) => {
      state.isDarkMode = action.payload;
    },
  },
});

export const { toggleDarkMode, setDarkMode } = themeSlice.actions;
export const selectIsDarkMode = (state) => state.theme.isDarkMode;
export default themeSlice.reducer;