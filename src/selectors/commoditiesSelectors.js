// src/selectors/commoditiesSelectors.js


export const selectCommoditiesState = state => state.commodities || {};
export const selectCommoditiesStatus = state => selectCommoditiesState(state).status || 'idle';
export const selectCommodities = state => selectCommoditiesState(state).commodities || [];
export const selectCommoditiesError = state => selectCommoditiesState(state).error;