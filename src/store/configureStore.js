// src/store/configureStore.js

import { configureStore } from '@reduxjs/toolkit';
import spatialReducer from '../slices/spatialSlice';
import themeReducer from '../slices/themeSlice';
import welcomeModalReducer from './welcomeModalSlice';
import ecmReducer from '../slices/ecmSlice';
import flowReducer from '../slices/flowSlice';
import { createBatchMiddleware } from '../middleware/batchMiddleware';
import { createSpatialMiddleware } from '../middleware/spatialMiddleware';
import { spatialHandler } from '../utils/spatialDataHandler';
import { backgroundMonitor, MetricTypes } from '../utils/backgroundMonitor';

let store = null;

export const configureAppStore = async () => {
  if (store) {
    return store;
  }

  // Start store configuration metric
  const configMetric = backgroundMonitor.startMetric(MetricTypes.SYSTEM.INIT, {
    component: 'store',
    timestamp: Date.now()
  });

  try {
    // Initialize middleware
    const spatialMiddleware = createSpatialMiddleware();
    const batchMiddleware = createBatchMiddleware();

    const ignoredPaths = {
      spatial: [
        'spatial.data.flowData',
        'spatial.data.spatialAnalysis',
        'spatial.data.cache',
        'spatial.data.geometry',
        'spatial.data.visualizationData',
        'spatial.data.regressionAnalysis',
        'spatial.data.marketClusters',
        'spatial.data.flowMaps',
        'spatial.data.marketShocks',
        'spatial.data.timeSeriesData',
        'spatial.data.spatialAutocorrelation',
        'spatial.data.seasonalAnalysis',
        'spatial.data.marketIntegration',
        'spatial.data.uniqueMonths'
      ],
      flow: [
        'flow.flows',
        'flow.byDate',
        'flow.byRegion',
        'flow.metadata'
      ],
      ecm: [
        'ecm.data.unified',
        'ecm.data.directional',
        'ecm.data.residuals',
        'ecm.data.cache'
      ]
    };

    const ignoredActions = {
      spatial: [
        'spatial/fetchAllSpatialData/fulfilled',
        'spatial/fetchFlowData/fulfilled',
        'spatial/batchUpdate',
        'spatial/updateGeometry',
        'spatial/updateData',
        'spatial/updateUI'
      ],
      flow: [
        'flow/fetchData/fulfilled',
        'flow/fetchData/pending',
        'flow/updateFlowMetrics'
      ],
      ecm: [
        'ecm/fetchECMData/fulfilled',
        'ecm/fetchECMData/pending',
        'ecm/setSelectedCommodity'
      ]
    };

    store = configureStore({
      reducer: {
        spatial: spatialReducer,
        theme: themeReducer,
        welcomeModal: welcomeModalReducer,
        ecm: ecmReducer,
        flow: flowReducer
      },
      middleware: (getDefaultMiddleware) => {
        const defaultMiddleware = getDefaultMiddleware({
          serializableCheck: {
            warnAfter: 5000,
            ignoredPaths: [...ignoredPaths.spatial, ...ignoredPaths.flow, ...ignoredPaths.ecm],
            ignoredActions: [...ignoredActions.spatial, ...ignoredActions.flow, ...ignoredActions.ecm]
          },
          immutableCheck: {
            warnAfter: 1000,
            ignoredPaths: [
              'spatial.data',
              'spatial.status',
              'spatial.ui.view',
              'spatial.data.cache',
              'spatial.data.geometry',
              'flow.flows',
              'flow.byDate',
              'flow.byRegion',
              'ecm.data',
              'ecm.status',
              'ecm.data.cache'
            ]
          },
          thunk: {
            extraArgument: {
              spatialHandler,
              backgroundMonitor,
              MetricTypes
            },
            timeout: 30000
          }
        });

        const middleware = [
          ...defaultMiddleware,
          batchMiddleware,
          spatialMiddleware
        ];

        // Add development tools
        if (process.env.NODE_ENV === 'development') {
          const { createLogger } = require('redux-logger');
          const logger = createLogger({
            collapsed: true,
            duration: true,
            timestamp: true,
            colors: {
              title: (action) => action.error ? 'red' : 'blue',
              prevState: () => '#9E9E9E',
              action: () => '#03A9F4',
              nextState: () => '#4CAF50',
              error: () => '#F20404'
            },
            predicate: (getState, action) => {
              if (!action || typeof action !== 'object' || !action.type) {
                return false;
              }
              const skippedActions = [
                'spatial/setProgress',
                'spatial/setLoadingStage',
                'spatial/updateCache',
                'spatial/updateProgress',
                'flow/updateFlowMetrics',
                'ecm/updateCache'
              ];
              return !skippedActions.includes(action.type);
            },
            actionTransformer: (action) => {
              if (!action || typeof action !== 'object') {
                return action;
              }

              const transformers = {
                'spatial/fetchAllSpatialData/fulfilled': (payload) => ({
                  type: 'SPATIAL_DATA',
                  geometry: {
                    pointCount: payload?.geometry?.points?.length,
                    polygonCount: payload?.geometry?.polygons?.length,
                    hasUnified: !!payload?.geometry?.unified
                  }
                }),
                'flow/fetchData/fulfilled': (payload) => ({
                  type: 'FLOW_DATA',
                  flowCount: payload?.flows?.length || 0,
                  dateRange: payload?.metadata?.dateRange,
                  uniqueMarkets: payload?.metadata?.uniqueMarkets
                }),
                'ecm/fetchECMData/fulfilled': (payload) => ({
                  type: 'ECM_DATA',
                  unifiedCount: payload?.unified?.length || 0,
                  directionalCount: {
                    northToSouth: payload?.directional?.northToSouth?.length || 0,
                    southToNorth: payload?.directional?.southToNorth?.length || 0
                  }
                })
              };

              if (action.type && transformers[action.type]) {
                return {
                  ...action,
                  payload: transformers[action.type](action.payload)
                };
              }
              return action;
            }
          });
          middleware.push(logger);
        }

        return middleware;
      },
      devTools: process.env.NODE_ENV === 'development' && {
        maxAge: 50,
        trace: true,
        traceLimit: 25,
        actionsBlacklist: [
          'spatial/setProgress',
          'spatial/setLoadingStage',
          'flow/updateFlowMetrics',
          'ecm/updateCache'
        ]
      }
    });

    // Add development tools
    if (process.env.NODE_ENV === 'development') {
      const monitorHealth = backgroundMonitor.checkHealth();
      
      window.__REDUX_STORE__ = store;
      window.__REDUX_DEBUGGER__ = {
        getState: () => store.getState(),
        dispatch: store.dispatch,
        spatialData: {
          getGeometry: () => store.getState().spatial.data.geometry,
          validateGeometry: () => {
            const geometry = store.getState().spatial.data.geometry;
            return {
              hasPoints: Array.isArray(geometry?.points),
              hasPolygons: Array.isArray(geometry?.polygons),
              hasUnified: Boolean(geometry?.unified),
              pointCount: geometry?.points?.length || 0,
              polygonCount: geometry?.polygons?.length || 0
            };
          }
        },
        flowData: {
          getState: () => store.getState().flow,
          validateData: () => {
            const flowState = store.getState().flow;
            return {
              hasFlows: Array.isArray(flowState?.flows),
              flowCount: flowState?.flows?.length || 0,
              uniqueMarkets: flowState?.metadata?.uniqueMarkets || 0,
              dateRange: flowState?.metadata?.dateRange,
              loadingStatus: flowState?.status?.loading,
              error: flowState?.status?.error
            };
          }
        },
        ecmData: {
          getState: () => store.getState().ecm,
          validateData: () => {
            const ecmState = store.getState().ecm;
            return {
              hasUnifiedData: Array.isArray(ecmState?.data?.unified),
              hasDirectionalData: Boolean(ecmState?.data?.directional),
              commodityCount: ecmState?.data?.commodities?.length || 0,
              loadingStatus: ecmState?.status?.loading,
              error: ecmState?.status?.error
            };
          }
        },
        monitor: {
          health: monitorHealth,
          getActionLog: () => backgroundMonitor.getMetrics(MetricTypes.SYSTEM.PERFORMANCE),
          getFlowMetrics: () => backgroundMonitor.getMetrics(MetricTypes.FLOW.DATA_LOAD),
          getSpatialMetrics: () => backgroundMonitor.getMetrics(MetricTypes.SPATIAL.DATA_LOAD),
          getErrors: () => backgroundMonitor.getErrors(),
          clearMetrics: () => backgroundMonitor.clearMetrics()
        }
      };
    }

    // Verify store initialization
    const initialState = store.getState();
    if (!initialState.spatial || !initialState.theme || !initialState.welcomeModal) {
      throw new Error('Store initialization failed: missing required reducers');
    }

    configMetric.finish({
      status: 'success',
      reducerCount: Object.keys(store.getState()).length,
      middlewareCount: store.middleware?.length || 0
    });

    return store;
  } catch (error) {
    configMetric.finish({
      status: 'error',
      error: error.message
    });
    throw error;
  }
};

// Export a function to get the store instance
export const getStore = () => {
  if (!store) {
    throw new Error('Store has not been initialized. Call configureAppStore() first.');
  }
  return store;
};

export default {
  configureAppStore,
  getStore
};
