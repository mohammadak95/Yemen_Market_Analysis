// src/hooks/index.js

// Import hooks from their respective files
import { useSpatialAnalysis } from './useSpatialAnalysis';
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

// Export hooks with aliases where needed
export const useSpatialDataOptimized = useSpatialAnalysis; // Alias for backward compatibility

// Export all other hooks
export {
  // Spatial Analysis
  useSpatialAnalysis,

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
  useWorkerProcessor
};