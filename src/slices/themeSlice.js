// src/slices/themeSlice.js

import { createSlice } from '@reduxjs/toolkit';

/**
 * Initial state for themeSlice.
 */
const initialState = {
  isDarkMode: false,
};

/**
 * Slice for managing theme (dark/light mode).
 */
const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Toggle between dark and light mode.
     */
    toggleDarkMode(state) {
      state.isDarkMode = !state.isDarkMode;
    },
    /**
     * Set dark mode explicitly.
     */
    setDarkMode(state, action) {
      state.isDarkMode = action.payload;
    },
  },
});

/**
 * Export actions and selectors.
 */
export const { toggleDarkMode, setDarkMode } = themeSlice.actions;

export const selectIsDarkMode = (state) => state.theme.isDarkMode;

/**
 * Export the reducer.
 */
export default themeSlice.reducer;
