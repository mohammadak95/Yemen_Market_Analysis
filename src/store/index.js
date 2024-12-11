import { configureAppStore } from './createStore';
import { initialState as themeInitialState } from '../slices/themeSlice';

const preloadedState = {
  theme: themeInitialState
};

const store = configureAppStore(preloadedState);

// Lazy load reducers
export const loadSpatialReducer = async () => {
  if (!store.reducerManager.getReducerMap().spatial) {
    await store.injectReducer('spatial', () => import('../slices/spatialSlice'));
  }
};

export const loadEcmReducer = async () => {
  if (!store.reducerManager.getReducerMap().ecm) {
    await store.injectReducer('ecm', () => import('../slices/ecmSlice'));
  }
};

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.__REDUX_STORE__ = store;
}

export default store;
