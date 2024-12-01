# Spatial Autocorrelation Analysis

## Overview

Advanced spatial autocorrelation analysis for Yemen's market data, featuring LISA statistics, interactive visualizations, and performance optimization.

## Features

### Core Analysis
- Global Moran's I calculation
- Local Indicators of Spatial Association (LISA)
- Cluster identification and classification
- Statistical significance testing

### Visualizations
- Interactive LISA Map
- Moran Scatter Plot
- Cluster Matrix
- Statistical Analysis Panel

### Performance Optimization
- Memoized calculations
- Data transformation caching
- Performance monitoring
- Optimization suggestions

### Error Handling
- Comprehensive error boundaries
- Fallback components
- Loading states
- Development tools

## Implementation

### Component Structure
```
autocorrelation/
├── components/
│   ├── SpatialAnalysisErrorBoundary.js
│   ├── SpatialAnalysisOptimizer.js
│   └── PerformanceMonitorPanel.js
├── hooks/
│   └── useSpatialAutocorrelation.js
├── selectors/
│   └── autocorrelationSelectors.js
├── utils/
│   ├── spatialCalculations.js
│   ├── performanceMonitor.js
│   └── __tests__/
│       └── spatialCalculations.test.js
├── types.ts
├── types.js
└── index.js
```

### Core Components

#### SpatialAutocorrelationAnalysis
Main component orchestrating the analysis and visualization:
```jsx
import { SpatialAutocorrelationAnalysis } from './features/autocorrelation';

function YourComponent() {
  return <SpatialAutocorrelationAnalysis />;
}
```

#### LISAMap
Interactive choropleth map showing spatial clusters:
```jsx
import { OptimizedLISAMap } from './features/autocorrelation';

function YourComponent() {
  return (
    <OptimizedLISAMap
      localStats={local}
      geometry={geometry}
      selectedRegion={selectedRegion}
      onRegionSelect={setSelectedRegion}
    />
  );
}
```

#### MoranScatterPlot
Statistical visualization of spatial relationships:
```jsx
import { OptimizedMoranScatterPlot } from './features/autocorrelation';

function YourComponent() {
  return (
    <OptimizedMoranScatterPlot
      data={local}
      globalMoranI={global.moran_i}
      selectedRegion={selectedRegion}
      onPointSelect={setSelectedRegion}
    />
  );
}
```

### Performance Features

#### Optimization Wrapper
```jsx
import { withSpatialOptimization } from './features/autocorrelation';

const OptimizedComponent = withSpatialOptimization(YourComponent, {
  transformData: true,
  cacheKey: 'unique-key'
});
```

#### Performance Monitoring
```jsx
import { PerformanceMonitorPanel } from './features/autocorrelation';

function YourComponent() {
  return (
    <PerformanceMonitorPanel
      refreshInterval={5000}
      showSuggestions={true}
    />
  );
}
```

### Error Handling

#### Error Boundary
```jsx
import { SpatialAnalysisErrorBoundary } from './features/autocorrelation';

function YourComponent() {
  return (
    <SpatialAnalysisErrorBoundary fallback={<ErrorFallback />}>
      {/* Component content */}
    </SpatialAnalysisErrorBoundary>
  );
}
```

## Usage

### Basic Implementation
```jsx
import { SpatialAutocorrelationAnalysis } from './features/autocorrelation';

function YourComponent() {
  return <SpatialAutocorrelationAnalysis />;
}
```

### With Custom Configuration
```jsx
import { 
  SpatialAutocorrelationAnalysis, 
  featureConfig 
} from './features/autocorrelation';

const customConfig = {
  visualization: {
    map: {
      center: [15.5527, 48.5164],
      zoom: 6
    }
  }
};

function YourComponent() {
  return (
    <SpatialAutocorrelationAnalysis
      config={customConfig}
    />
  );
}
```

## Performance Optimization

### Data Transformation
- Memoized calculations using useMemo
- Cached results with SpatialAnalysisOptimizer
- Optimized rendering with React.memo
- Performance tracking with PerformanceMonitorPanel

### Monitoring
- Real-time performance metrics
- Optimization suggestions
- Memory usage tracking
- Render time analysis

## Development Tools

### Performance Monitor
Development-only performance monitoring panel:
```jsx
{process.env.NODE_ENV === 'development' && (
  <PerformanceMonitorPanel
    refreshInterval={5000}
    showSuggestions={true}
  />
)}
```

### Error Handling
Comprehensive error boundary with development details:
```jsx
<SpatialAnalysisErrorBoundary>
  {process.env.NODE_ENV === 'development' && (
    <ErrorDetails error={error} />
  )}
</SpatialAnalysisErrorBoundary>
```

## Testing

### Unit Tests
```bash
npm test src/components/spatialAnalysis/features/autocorrelation
```

### Test Coverage
- Statistical calculations
- Component rendering
- Error handling
- Performance optimization

## Dependencies
- React
- Material-UI
- D3.js
- Leaflet
- Redux Toolkit

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Considerations

### Optimization Techniques
1. Memoization of heavy calculations
2. Efficient spatial weight matrix storage
3. Progressive loading of large datasets
4. WebWorker support for calculations

### Caching Strategy
- Spatial weights are cached
- LISA statistics are memoized
- Visualization data is preprocessed

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies
3. Run tests
4. Start development server

### Code Style
- Follow existing patterns
- Use TypeScript definitions
- Add unit tests
- Document changes

### Performance Guidelines
1. Use memoization for expensive calculations
2. Implement proper error boundaries
3. Add performance monitoring
4. Optimize render cycles

## License
MIT License
