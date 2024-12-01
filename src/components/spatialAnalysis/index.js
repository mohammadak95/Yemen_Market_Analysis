import SpatialAnalysis from './SpatialAnalysis';

// Feature modules
export * from './features/clusters';
export * from './features/autocorrelation';
export * from './features/flows';
export * from './features/shocks';
export * from './features/conflict';
export * from './features/seasonal';
export * from './features/health';

// Atomic components
export { default as Legend } from './atoms/Legend';
export { default as Tooltip } from './atoms/Tooltip';
export { default as MetricCard } from './atoms/MetricCard';

// Molecular components
export { default as MapControls } from './molecules/MapControls';
export { default as TimeControl } from './molecules/TimeControl';
export { default as MetricProgress } from './molecules/MetricProgress';

// Organism components
export { default as ClusterMap } from './organisms/ClusterMap';
export { default as LISAMap } from './organisms/LISAMap';
export { default as FlowMap } from './organisms/FlowMap';

// Hooks
export { default as useClusterAnalysis } from './hooks/useClusterAnalysis.js';
export { default as useSpatialAutocorrelation } from './hooks/useSpatialAutocorrelation';
export { default as useFlowAnalysis } from './hooks/useFlowAnalysis';
export { default as useShockAnalysis } from './hooks/useShockAnalysis';
export { default as useConflictAnalysis } from './hooks/useConflictAnalysis';
export { default as useSeasonalAnalysis } from './hooks/useSeasonalAnalysis';
export { default as useMarketHealth } from './hooks/useMarketHealth';

// Utilities
export { default as spatialUtils } from './utils/spatialUtils';
export { default as geoJSONProcessor } from './utils/geoJSONProcessor';
export { default as networkAnalysis } from './utils/networkAnalysis';
export { default as clusterUtils } from './utils/clusterUtils';

/**
 * Yemen Market Analysis Spatial Analysis Module
 * 
 * This module provides comprehensive spatial analysis tools for Yemen's market data:
 * 
 * Features:
 * - Market Clustering: Identify and analyze market clusters
 * - Spatial Autocorrelation: Examine spatial price dependencies
 * - Flow Analysis: Visualize and analyze market flow networks
 * - Shock Analysis: Track price shock propagation
 * - Conflict Impact: Assess conflict effects on markets
 * - Seasonal Analysis: Analyze seasonal price patterns
 * - Market Health: Monitor overall system health
 * 
 * Components:
 * - Atomic: Basic UI elements (Legend, Tooltip, MetricCard)
 * - Molecular: Common patterns (MapControls, TimeControl)
 * - Organisms: Complex visualizations (Maps, Graphs)
 * - Features: Complete analysis modules
 * 
 * Hooks:
 * - Data processing and analysis hooks for each feature
 * - Shared utilities for spatial calculations
 * 
 * Usage:
 * ```jsx
 * import { SpatialAnalysis } from './components/spatialAnalysis';
 * 
 * const App = () => (
 *   <SpatialAnalysis
 *     timeSeriesData={data}
 *     geometryData={geometry}
 *     marketIntegration={integration}
 *   />
 * );
 * ```
 * 
 * The module follows atomic design principles and provides a modular,
 * extensible architecture for spatial market analysis.
 */

export { SpatialAnalysis };
export default SpatialAnalysis;
