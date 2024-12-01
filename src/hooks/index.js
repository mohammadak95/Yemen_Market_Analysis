import {
  useData,
  useECMData,
  usePriceDifferentialData,
  useTVMIIData,
  useRegressionAnalysis
} from './dataHooks';

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
  useRegressionAnalysis,

  // UI & Utility
  useWindowSize,
  useBodyScrollLock,
  useTechnicalHelp,
  useWorkerProcessor,
};
