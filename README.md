
# Yemen Market Analysis Dashboard

This project is a comprehensive market analysis dashboard for Yemen, combining React for the frontend and Python for data analysis. It provides insights into commodity prices, conflict intensity, and market dynamics across different regions of Yemen.

## Features

- **Interactive Dashboard**: Multi-commodity and multi-regime selection with dynamic charts.
- **Data Visualizations**: Time series charts, choropleth maps, flow maps, and market connectivity graphs.
- **Econometric Analyses**: 
  - Error Correction Model (ECM)
  - Price Differentials Analysis
  - Spatial Analysis
- **Educational Components**: Methodology explanation and glossary of terms.
- **Dual Development Setup**: Supports both local development and GitHub Pages deployment.
- **Responsive Design**: Optimized for desktop and mobile viewing.
- **Dark Mode**: Toggle between light and dark themes.

## Getting Started

### Prerequisites

- Node.js (version 20 or later)
- Python 3.8+
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/Yemen_Market_Analysis.git
   ```
2. Install JavaScript dependencies:
   ```
   npm install
   ```
3. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

## Available Scripts

In the project directory, you can run:

### `npm start` or `npm run dev`

Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test`

Launches the test runner in interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run prepare-data`

Prepares and copies necessary data for the frontend.

### `npm run deploy`

Deploys the application to GitHub Pages.

## Dual Development and Deployment

This project supports both local development and GitHub Pages deployment:

- **Local Development**: Use `npm start` to run the app locally. Data is served from the `results/` directory.
- **GitHub Pages Deployment**: The `npm run deploy` script builds the app and deploys it to GitHub Pages. The `prepareData.js` script ensures all necessary data is copied to the `build/` directory for deployment.

## Project Structure

- `/src`: React application source code
- `/project`: Python backend for data analysis
- `/results`: Output data from various analyses
- `/public`: Static assets
- `/scripts`: Utility scripts including data preparation

## Data Analysis Components

- **ECM Analysis**: Analyzes cointegration and error correction in price data.
- **Price Differential Analysis**: Examines price differentials between markets.
- **Spatial Analysis**: Investigates spatial relationships in market data.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Data sources
- Libraries and frameworks used
- Any other contributors or inspirations
