// src/store/rootReducer.js

import { combineReducers } from '@reduxjs/toolkit';
import spatialReducer from '../slices/spatialSlice';
import themeReducer from '../slices/themeSlice';
import geometriesReducer from '../slices/geometriesSlice';
import priceDiffReducer from '../slices/priceDiffSlice';
import ecmReducer from '../slices/ecmSlice';
import tvmiiReducer from '../slices/tvmiiSlice';
import commoditiesReducer from '../slices/commoditiesSlice';
import marketsReducer from '../slices/marketsSlice';
import analysisReducer from '../slices/analysisSlice';

const createRootReducer = () => {
  const rootReducer = combineReducers({
    spatial: spatialReducer,
    theme: themeReducer,
    geometries: geometriesReducer,
    priceDiff: priceDiffReducer,
    ecm: ecmReducer,
    tvmii: tvmiiReducer,
    commodities: commoditiesReducer,
    markets: marketsReducer,
    analysis: analysisReducer
  });

  // Add a reset action that clears all state
  return (state, action) => {
    if (action.type === 'RESET_STATE') {
      state = undefined;
    }
    return rootReducer(state, action);
  };
};

export default createRootReducer;