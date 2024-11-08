# Yemen Market Analysis Dashboard

A comprehensive data visualization platform for analyzing Yemen's economic resilience and market connectivity under conflict conditions. The dashboard provides interactive visualizations of commodity prices, conflict intensity, and regional economic dynamics through spatial analysis and time-series visualization.

## 🌟 Features

- **Interactive Maps**: Visualize commodity prices and conflict intensity across Yemen's regions using Leaflet
- **Time-Series Analysis**: Track commodity price trends under different exchange regimes
- **Spatial Analysis**: Examine direct and indirect effects on regional prices through spatial regression
- **Conflict Analysis**: Study socio-economic impacts by overlaying conflict intensity data
- **Advanced Visualization**: Utilizes Recharts, D3.js, and Leaflet for rich data representation
- **Progressive Web App**: Offline capabilities and optimized performance

## 📋 Table of Contents

- [🌟 Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Installation](#-installation)
- [📁 Project Structure](#-project-structure)
- [💻 Development](#-development)
- [🏗 Building for Production](#-building-for-production)
- [📊 Data Processing](#-data-processing)
- [🧪 Testing](#-testing)
- [🔧 Development Tools](#-development-tools)
- [🚀 Deployment](#-deployment)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)
- [📚 Component Documentation](#-component-documentation)
- [⚙️ Configuration](#-configuration)
- [🔄 CI/CD Pipeline](#-cicd-pipeline)
- [🛠️ Testing and Debugging](#-testing-and-debugging)

## 🛠 Tech Stack

- **Frontend**: React, Redux Toolkit, Material-UI
- **Data Visualization**: Recharts, Leaflet, D3.js
- **State Management**: Redux with middleware for action logging
- **Build Tools**: Webpack with optimization for production
- **Backend**: Express server for data processing
- **Data Processing**: Python scripts for data transformation
- **Testing**: Jest and React Testing Library
- **CI/CD**: GitHub Actions for automated deployment

## 📋 Prerequisites

- **Node.js** (v20 or later)
- **npm** (v8 or later)
- **Python** (3.8 or later)
- **Git LFS** (for large data file management)

## 🚀 Installation

1. **Clone the repository and set up Git LFS:**

    ```bash
    git lfs install
    git clone https://github.com/mohammadak95/Yemen_Market_Analysis.git
    cd Yemen_Market_Analysis
    ```

2. **Install dependencies:**

    ```bash
    npm install
    pip install -r requirements.txt
    ```

3. **Configure environment:**

    ```bash
    cp .env.example .env.development
    # Edit .env.development with your configuration
    ```

## 📁 Project Structure

```
Yemen_Market_Analysis/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── analysis/     # Analysis components
│   │   ├── documentation/# Technical documentation
│   │   ├── discovery/    # User learning tools
│   │   ├── common/       # Shared UI components
│   │   └── methodology/  # Methodology descriptions
│   ├── hooks/            # Custom React hooks
│   ├── slices/           # Redux state management
│   ├── context/          # React contexts
│   ├── utils/            # Utility functions
│   └── workers/          # Web Workers
├── server/               # Express server
├── scripts/              # Build and data scripts
├── results/              # Analysis outputs
└── webpack.config.js     # Webpack configuration
```

## 💻 Development

1. **Start development servers:**

    ```bash
    # Terminal 1: Start Express server
    npm run start:server
    
    # Terminal 2: Start React development server
    npm run start:fast
    ```

2. **Alternative development commands:**

    ```bash
    npm run dev           # Run frontend and backend concurrently
    npm run dev:debug     # Run with debug logging
    npm run lint:fix      # Fix linting issues
    npm run format        # Format code with Prettier
    npm run clear-cache   # Clear development cache
    ```

## 🏗 Building for Production

1. **Create optimized production build:**

    ```bash
    npm run build
    ```

2. **Analyze bundle size:**

    ```bash
    npm run build:analyze
    ```

## 📊 Data Processing

1. **Prepare and optimize data:**

    ```bash
    npm run prepare-data               # Process spatial data
    npm run transform-spatial-weights  # Transform weights matrix
    npm run optimize:assets            # Optimize assets
    ```

2. **Data flow:**
    - Raw data → `scripts/prepareData.js`
    - Optimization → `scripts/optimizeData.js`
    - Asset processing → `scripts/optimizeAssets.js`
    - Final outputs → `public/data/`

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:coverage       # Run tests with coverage
npm run test:watch         # Watch mode for development
```

## 🔧 Development Tools

### Bundle Analysis

```bash
npm run build:profile      # Generate bundle stats
npm run analyze-bundle     # View bundle analysis
```

### Debug Tools

- **Redux DevTools** enabled in development
- **Performance monitoring** via `window.__REDUX_PERF__`
- **Service Worker** debugging through DevTools

## 🚀 Deployment

**Deploy to GitHub Pages:**

```bash
npm run deploy
```

**Test production build locally:**

```bash
npm run build
npm run serve-dist
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create your feature branch**

    ```bash
    git checkout -b feature/AmazingFeature
    ```

3. **Commit your changes**

    ```bash
    git commit -m 'Add some AmazingFeature'
    ```

4. **Push to the branch**

    ```bash
    git push origin feature/AmazingFeature
    ```

5. **Open a Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Data sources**: Yemen Market Data Repository
- **Geographic data**: Natural Earth Data
- **Libraries**: React, Redux, Recharts, Leaflet, Material-UI

## 📚 Component Documentation

### Analysis Components

- **TVMII Analysis**: Components for Two-Variable Market Integration Index
- **Spatial Analysis**: Map-based visualizations and spatial regression tools
- **ECM Analysis**: Error Correction Model implementation
- **Price Differential**: Tools for analyzing price differences across regions

### Discovery Tools

- Interactive tutorials
- Guided exercises
- Demo modules
- Learning resources

### Documentation Components

- Technical reference materials
- Methodology explanations
- Model interpretation guides

## ⚙️ Configuration

The project uses Webpack for bundling and optimization, with different configurations for development and production environments. Key features include:

- Code splitting and lazy loading
- Asset optimization and compression
- CSS extraction and minification
- Source maps for development
- Hot module replacement
- Progressive Web App support

## 🔄 CI/CD Pipeline

GitHub Actions automates:

- Building and testing
- Data preparation and optimization
- Deployment to GitHub Pages
- Asset optimization and bundling

For the latest deployment status, check the Actions tab in the GitHub repository.

---

# Technical Documentation

## 🔍 Component Details

### Analysis Components

#### 1. TVMII (Two-Variable Market Integration Index)

```
src/components/analysis/tvmii/
├── TVMIIAnalysis.js       # Main analysis component
├── TVMIITutorial.js       # Interactive tutorial
├── TVMIIChart.js          # Visualization component
└── TVMIIInterpretation.js # Results interpretation
```

**Key Features:**

- Real-time calculation of market integration indices
- Interactive visualization of market pairs
- Statistical significance testing
- Time-series decomposition
- Regime switching analysis

**Usage Example:**

```jsx
<TVMIIAnalysis
  marketData={marketData}
  timeRange={[startDate, endDate]}
  confidenceInterval={0.95}
  regimeThreshold={0.5}
/>
```

#### 2. Spatial Analysis Components

```
src/components/analysis/spatial-analysis/
├── SpatialMap.js          # Core map component
├── MapControls.js         # Map interaction controls
├── MapLegend.js           # Dynamic legend
├── SpatialDiagnostics.js  # Diagnostic tools
└── TimeControls.js        # Temporal controls
```

**Features:**

- Leaflet integration with custom controls
- Dynamic choropleth mapping
- Spatial weight matrix visualization
- Moran's I calculation and visualization
- LISA cluster analysis
- Spatial regression diagnostics

**Implementation Details:**

```jsx
// SpatialMap.js core functionality
const SpatialMap = ({ 
  geojsonData, 
  weights, 
  timeWindow, 
  analysisType 
}) => {
  const mapRef = useRef(null);
  const [spatialStats, setSpatialStats] = useState(null);

  useEffect(() => {
    // Calculate spatial statistics
    const stats = calculateSpatialStatistics(geojsonData, weights);
    setSpatialStats(stats);
  }, [geojsonData, weights]);

  // Map rendering and interaction handlers
  // ...
};
```

#### 3. ECM (Error Correction Model)

```
src/components/analysis/ecm/
├── ECMAnalysis.js    # Main analysis component
├── ECMResults.js     # Results display
└── ECMTutorial.js    # Interactive guide
```

**Capabilities:**

- Cointegration testing
- Error correction estimation
- Residual diagnostics
- Impulse response analysis
- Forecast generation

#### 4. Price Differential Analysis

```
src/components/analysis/price-differential/
├── PriceDifferentialAnalysis.js # Main component
├── MarketPairInfo.js           # Pair analysis
├── StationarityTest.js         # Unit root testing
└── CointegrationAnalysis.js    # Integration analysis
```

### Interactive Graph Components

The `InteractiveChart` component provides advanced visualization capabilities:

```typescript
interface InteractiveChartProps {
  data: TimeSeriesData[];
  dimensions: {
    width: number;
    height: number;
  };
  options: {
    zoom: boolean;
    pan: boolean;
    tooltip: boolean;
    legend: boolean;
  };
  annotations?: ChartAnnotation[];
}
```

**Features:**

- Customizable zoom levels
- Pan and scroll navigation
- Dynamic data loading
- Responsive design
- Custom annotations
- Multiple Y-axes support

## 📊 Data Processing Pipeline

### 1. Data Ingestion

```
scripts/
├── prepareData.js        # Main data preparation
├── transformSpatial.js   # Spatial data processing
└── optimizeData.js       # Data optimization
```

**Data Flow:**

1. **Raw Data Input**
   - Market prices (CSV)
   - Spatial data (GeoJSON)
   - Conflict data (JSON)
   - Exchange rates (CSV)

2. **Validation and Cleaning**

    ```javascript
    // Example data validation
    const validateData = (data) => {
      return data.filter(row => (
        isValidDate(row.date) &&
        !isNaN(row.price) &&
        row.market_id !== null
      ));
    };
    ```

3. **Transformation**

    ```javascript
    // Data transformation example
    const transformSpatialData = async (data) => {
      // Convert coordinates
      const projectedData = await projectCoordinates(data);
      
      // Calculate centroids
      const withCentroids = calculateCentroids(projectedData);
      
      // Generate spatial weights
      const weights = generateSpatialWeights(withCentroids);
      
      return {
        projectedData,
        weights
      };
    };
    ```

### 2. Spatial Data Processing

#### Weight Matrix Generation

```javascript
const generateWeightMatrix = (points, options) => {
  const matrix = [];
  for (let i = 0; i < points.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < points.length; j++) {
      if (i !== j) {
        matrix[i][j] = calculateWeight(
          points[i],
          points[j],
          options.type,
          options.cutoff
        );
      }
    }
  }
  return normalizeMatrix(matrix);
};
```

#### Spatial Statistics

- Moran's I calculation
- LISA statistics
- Getis-Ord Gi* statistics
- Spatial regression coefficients

### 3. Time Series Processing

```javascript
const processTimeSeries = async (data) => {
  // Decompose series
  const decomposed = await decomposeSeries(data);
  
  // Test stationarity
  const stationarityResults = await testStationarity(data);
  
  // Perform seasonal adjustment
  const adjusted = await seasonalAdjustment(data);
  
  return {
    decomposed,
    stationarityResults,
    adjusted
  };
};
```

### 4. Data Optimization

```javascript
// Optimize data for frontend consumption
const optimizeForFrontend = (data) => {
  return {
    // Index data for quick lookup
    indexed: createDataIndex(data),
    
    // Generate summary statistics
    summary: calculateSummaryStats(data),
    
    // Create time-based chunks
    chunks: createTimeChunks(data),
    
    // Compress large datasets
    compressed: compressData(data)
  };
};
```

# Configuration and Deployment Guide

## ⚙️ Advanced Configuration

### 1. Webpack Configuration

The project uses a sophisticated Webpack setup for optimal development and production builds:

```javascript
// webpack.config.js key features
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor bundle optimization
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            chunks: 'all',
            priority: 30,
          },
          // Core React dependencies
          core: {
            test: /[\\/]node_modules[\\/](react|react-dom|redux)[\\/]/,
            name: 'core',
            priority: 40,
          },
          // Other libraries
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 20,
          }
        }
      },
      // Production optimizations
      minimize: !isDevelopment,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: !isDevelopment,
            },
          },
        }),
      ],
    },
    // Module rules for different file types
    module: {
      rules: [
        // JavaScript/React processing
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
            },
          },
        },
        // Asset handling
        {
          test: /\.(png|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
        // Data file handling
        {
          test: /\.(geojson|json|csv)$/,
          type: 'asset/resource',
        },
      ],
    },
    // Development server configuration
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true,
    },
  };
};
```

### 2. Environment Configuration

```bash
# .env.development
NODE_ENV=development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_ENABLE_CACHE=true
REACT_APP_DEBUG_MODE=true

# .env.production
NODE_ENV=production
REACT_APP_API_URL=https://api.example.com
REACT_APP_ENABLE_CACHE=true
REACT_APP_DEBUG_MODE=false
```

### 3. Performance Optimization

```javascript
// Performance optimization configurations
module.exports = {
  // Cache configuration
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
    compression: 'gzip',
  },
  
  // Performance budgets
  performance: {
    maxAssetSize: 512000,
    maxEntrypointSize: 512000,
    hints: 'warning',
  },
};
```

## 🚀 Comprehensive Deployment

### 1. GitHub Pages Deployment

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          lfs: true
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install Dependencies
        run: |
          npm ci
        
      - name: Prepare Data
        run: |
          npm run prepare-data
          npm run optimize-data
        
      - name: Build
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

### 2. Production Build Process

```bash
# Production build script
#!/bin/bash

# 1. Clean previous builds
npm run clean

# 2. Prepare and optimize data
npm run prepare-data
npm run optimize-data

# 3. Run tests
npm run test:coverage

# 4. Build application
NODE_ENV=production npm run build

# 5. Verify bundle size
npm run analyze-bundle

# 6. Deploy
npm run deploy
```

### 3. Server Configuration

```javascript
// server/app.js
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware configuration
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Static file serving
app.use(express.static(path.join(__dirname, '../build')));

// API routes
app.use('/api/data', require('./routes/data'));
app.use('/api/analysis', require('./routes/analysis'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
```

### 4. Monitoring and Analytics

```javascript
// Monitoring setup
const Sentry = require('@sentry/react');

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
});

// Performance monitoring
const { performance } = require('perf_hooks');
const monitor = {
  startTime: performance.now(),
  
  logPerformance: (label) => {
    const duration = performance.now() - monitor.startTime;
    console.log(`${label}: ${duration}ms`);
  },
  
  resetTimer: () => {
    monitor.startTime = performance.now();
  },
};
```

### 5. Cache Management

```javascript
// Cache configuration
const cacheConfig = {
  maxAge: 86400000, // 24 hours
  staticFileOptions: {
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
    },
  },
};

// Implementation
app.use(express.static('build', cacheConfig.staticFileOptions));
```

# 🛠️ Testing and Debugging

## 🧪 Testing Framework

### 1. Jest and React Testing Library

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### 2. Testing Best Practices

- Unit tests for components and hooks
- Integration tests for API and data processing
- Snapshot testing for UI components
- Mocking external dependencies
- Coverage thresholds for CI/CD

```javascript
// Example test suite
describe('TVMIIAnalysis', () => {
  it('renders TVMII analysis correctly', () => {
    const { getByText } = render(<TVMIIAnalysis />);
    expect(getByText('Market Integration Index')).toBeInTheDocument();
  });

  it('calculates TVMII correctly', () => {
    const data = prepareData();
    const result = calculateTVMII(data);
    expect(result).toBeGreaterThan(0.5);
  });
});
```

## 🔍 Debugging Tools

### 1. Redux DevTools

```javascript
// Redux middleware setup
import { configureStore } from '@reduxjs/toolkit';
import { createLogger } from 'redux-logger';

const logger = createLogger({
  collapsed: true,
  duration: true,
  diff: true,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logger),
});
```

### 2. Performance Monitoring

```javascript
// Performance monitoring setup
const { performance } = require('perf_hooks');
const monitor = {
  startTime: performance.now(),
  
  logPerformance: (label) => {
    const duration = performance.now() - monitor.startTime;
    console.log(`${label}: ${duration}ms`);
  },
  
  resetTimer: () => {
    monitor.startTime = performance.now();
  },
};
```

### 3. Service Worker Debugging

```javascript
// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        console.log('Service worker registered');
      })
      .catch((err) => {
        console.error('Service worker registration failed:', err);
      });
  });
}
```

# 🚀 Deployment and CI/CD

## 📦 Automated Deployment

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          lfs: true
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install Dependencies
        run: |
          npm ci
        
      - name: Prepare Data
        run: |
          npm run prepare-data
          npm run optimize-data
        
      - name: Build
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.REACT_APP_API_URL }}
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

---

Feel free to explore the project, contribute, and reach out with any questions or suggestions!

---
