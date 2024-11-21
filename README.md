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
    npm run process-clusters           # Process market clusters
    npm run calculate-metrics          # Calculate cluster metrics
    ```

## 🧪 Testing

```bash
npm test                    # Run all tests
npm run test:coverage       # Run tests with coverage
npm run test:watch          # Watch mode for development
npm run test:integration    # Run integration tests
npm run test:e2e            # Run end-to-end tests
```

## 🔧 Development Tools

### Bundle Analysis

```bash
npm run build:profile      # Generate bundle stats
npm run analyze-bundle     # View bundle analysis
npm run analyze-deps       # Analyze dependencies
```

### Debug Tools

- **Redux DevTools** enabled in development
- **Performance monitoring** via `window.__REDUX_PERF__`
- **Service Worker** debugging through DevTools
- **React Profiler** for performance profiling
- **Logger Middleware** for Redux action logging

## 🚀 Deployment

1. **Deploy to GitHub Pages:**

    ```bash
    npm run deploy
    ```

2. **Test production build locally:**

    ```bash
    npm run build
    npm run serve-dist
    ```

3. **Deploy to custom server:**

    ```bash
    npm run deploy:custom
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

## 🛠️ Testing and Debugging

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

### 3. Debugging Tools

- **Redux DevTools** for state management debugging
- **Performance monitoring** via `window.__REDUX_PERF__`
- **Service Worker** debugging through DevTools

## 🚀 Deployment and CI/CD

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

Feel free to explore the project, contribute, and reach out with any questions or suggestions!

---
