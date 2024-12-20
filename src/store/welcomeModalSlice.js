// src/store/welcomeModalSlice.js

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  hasSeenWelcome: localStorage.getItem('hasSeenWelcome') === 'true'
};

const welcomeModalSlice = createSlice({
  name: 'welcomeModal',
  initialState,
  reducers: {
    setHasSeenWelcome: (state, action) => {
      state.hasSeenWelcome = true;
      if (action.payload) {
        localStorage.setItem('hasSeenWelcome', 'true');
      }
    }
  }
});

export const { setHasSeenWelcome } = welcomeModalSlice.actions;
export const selectHasSeenWelcome = (state) => state.welcomeModal.hasSeenWelcome;
export default welcomeModalSlice.reducer;