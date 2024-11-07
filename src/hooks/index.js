// src/hooks/index.js

// Spatial Analysis Hooks
import { useSpatialData } from './useSpatialData';
export { useSpatialData as useSpatialDataOptimized };

// Data Analysis Hooks
import {
  useData,
  useECMData,
  usePriceDifferentialData,
  useTVMIIData
} from './dataHooks';

// Discovery & Methodology Hooks
import {
  useDiscoveryData,
  useDiscoveryIntegration,
  useLaunchDiscovery,
  useMethodologyAccess
} from './discoveryHooks';

// UI & Utility Hooks
import {
  useWindowSize,
  useBodyScrollLock,
  useTechnicalHelp,
  useWorkerProcessor
} from './uiHooks';

// Export all hooks
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
  useWorkerProcessor
};