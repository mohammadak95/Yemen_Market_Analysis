# Yemen Market Analysis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description

The Yemen Market Analysis Platform is an interactive web application for analyzing market integration patterns and price transmission across Yemen's commodity markets. It combines advanced econometric analysis with spatial visualization to provide insights into market dynamics in conflict-affected regions.

## Features

- 📊 Interactive time series visualization of commodity prices
- 🗺️ Spatial analysis of market relationships
- 📈 Advanced econometric modeling (ECM, Price Differential, TVMII)
- 🌐 Multi-regime market comparison
- 📱 Responsive design for all devices

## Live Demo

Visit the live application at: https://mohammadak95.github.io/Yemen_Market_Analysis

## Prerequisites

- Node.js (>=14.0.0)
- npm (>=6.0.0)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/mohammadak95/Yemen_Market_Analysis2.git
cd Yemen_Market_Analysis2
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Building for Production

```bash
npm run build
```

## Deployment

Deploy to GitHub Pages:
```bash
npm run deploy
```

## Project Structure

```
├── src/
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── store/            # Redux store configuration
│   ├── slices/           # Redux slices
│   └── workers/          # Web Workers
├── public/               # Static assets
├── data/                 # Data files
└── project/              # Analysis scripts
```

## Key Technologies

- **Frontend**: React 18, Material-UI
- **State Management**: Redux Toolkit
- **Data Visualization**: Chart.js, Leaflet, D3.js
- **Analysis**: Custom econometric models
- **Performance**: Web Workers, Code Splitting

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run deploy` - Deploy to GitHub Pages
- `npm test` - Run tests
- `npm run dev` - Run development server with hot reload

## Analysis Capabilities

1. **Error Correction Models (ECM)**
   - Long-run equilibrium analysis
   - Short-term price adjustments

2. **Price Differential Analysis**
   - Market price gap examination
   - Transaction cost analysis

3. **Spatial Analysis**
   - Geographic price dependencies
   - Market connectivity patterns

4. **Time-Varying Market Integration Index**
   - Dynamic integration assessment
   - Regime-specific analysis

## Data Sources

The platform utilizes data from:
- World Food Programme (WFP)
- Central Bank of Yemen
- ACAPS Yemen Analysis Hub
- Armed Conflict Location & Event Data Project (ACLED)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Mohammad al Akkaoui - [GitHub](https://github.com/mohammadak95)

## Acknowledgments

- World Food Programme for data provision
- ACAPS Yemen Analysis Hub for geographic data
- Academic advisors and research partners

## Citation

If you use this platform in your research, please cite:

```bibtex
@software{yemen_market_analysis,
  author = {al Akkaoui, Mohammad},
  title = {Yemen Market Analysis Platform},
  year = {2024},
  url = {https://github.com/mohammadak95/Yemen_Market_Analysis2}
}
