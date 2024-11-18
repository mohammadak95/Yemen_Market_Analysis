// src/utils/initializeApp.js

import { monitoringSystem } from './MonitoringSystem';
import { testDataPath } from './dataUtils';
import { config } from '../config/appConfig';

export const verifyDataPaths = async () => {
  const metric = monitoringSystem.startMetric('verify-data-paths');
  
  try {
    // Test critical data files
    const criticalFiles = [
      config.dataPaths.files.timeVaryingFlows,
      config.dataPaths.files.tvMiiResults,
      config.dataPaths.spatialWeights
    ];

    const results = await Promise.all(
      criticalFiles.map(async file => {
        const result = await testDataPath(file);
        return { file, ...result };
      })
    );

    const missingFiles = results.filter(r => !r.exists);
    
    if (missingFiles.length > 0) {
      throw new Error(
        `Missing required data files:\n${missingFiles.map(f => 
          `${f.file} (${f.path}): ${f.status || f.error}`
        ).join('\n')}`
      );
    }

    metric.finish({ status: 'success' });
    return true;

  } catch (error) {
    metric.finish({ status: 'error', error: error.message });
    throw error;
  }
};

export const initializeApp = async () => {
  const initMetric = monitoringSystem.startMetric('app-initialization');

  try {
    // First verify data paths
    await verifyDataPaths();

    // Initialize core systems if data paths are verified
    const initialState = {
      commodities: {
        commodities: [],
        status: 'idle',
        error: null
      },
      spatial: {
        ui: {
          selectedCommodity: null,
        }
      }
    };

    // Return initialization result
    return {
      success: true,
      initialState
    };

  } catch (error) {
    initMetric.finish({ status: 'error', error: error.message });
    throw error;
  }
};