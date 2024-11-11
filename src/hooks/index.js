// src/hooks/index.js

// Import hooks from their respective files
import {
  useData,
  useECMData,
  usePriceDifferentialData,
  useTVMIIData
} from './dataHooks';

import {
  useDiscoveryData,
  useDiscoveryIntegration,
  useLaunchDiscovery,
  useMethodologyAccess
} from './discoveryHooks';

import {
  useWindowSize,
  useBodyScrollLock,
  useTechnicalHelp,
  useWorkerProcessor
} from './uiHooks';

// Import and alias useSpatialData for backward compatibility
import useSpatialData from './useSpatialData';

// Export useSpatialData under a backward-compatible alias
export const useSpatialDataOptimized = useSpatialData; // Alias for backward compatibility

// Export all other hooks
export {

  // Data Analysis
  useData,
  useECMData,
  usePriceDifferentialData,
  useTVMIIData,

  // Discovery & Methodology
  useDiscoveryData,
  useDiscoveryIntegration,
  useLaunchDiscovery,
  useMethodologyAccess,

  // UI & Utility
  useWindowSize,
  useBodyScrollLock,
  useTechnicalHelp,
  useWorkerProcessor,

  // Spatial Data (Primary export)
  useSpatialData,

};
