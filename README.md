# Yemen Market Analysis Dashboard

This project is a comprehensive market analysis dashboard for Yemen, combining React for the frontend and Python for data analysis. It provides insights into commodity prices, conflict intensity, and market dynamics across different regions of Yemen.

## Prerequisites

- Node.js (version 20 or later)
- npm (usually comes with Node.js)
- Python 3.8+ (for running analysis scripts)

## Installation

1. Clone the repository:

git clone https://github.com/yourusername/Yemen_Market_Analysis.git
cd Yemen_Market_Analysis

2. Install JavaScript dependencies:

npm install

3. Install Python dependencies:

pip install -r requirements.txt

## Development

To run the app in development mode:

npm start

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Building for Production

To build the app for production:

npm run build

This command builds the app for production to the `build` folder.

## Deployment

The app is configured for deployment on GitHub Pages. To deploy:

1. Ensure your repository is configured for GitHub Pages in the Settings.
2. Run the deploy script:

npm run deploy

This will build the app and push it to the `gh-pages` branch of your repository.

## Running Analysis Scripts

The Python analysis scripts are located in the `project` directory. To run these scripts:

1. Activate your Python virtual environment (if you're using one):

source .venv/bin/activate  # On Unix or MacOS
.venv\Scripts\activate     # On Windows

2. Navigate to the project directory:

cd project

3. Run the desired script:

...

## Data Preparation

Before running the app, ensure that all necessary data files are in place:

1. Run the data preparation script:

npm run prepare-data

This script copies all required data files to the appropriate locations in the `build` directory.

## Testing

To run the test suite:

npm test

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

- Data sources: [List your data sources here]
- Libraries and frameworks used: React, Redux, Recharts, Leaflet, etc.
- [Any other acknowledgments]



