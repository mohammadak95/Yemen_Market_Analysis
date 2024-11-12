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
};