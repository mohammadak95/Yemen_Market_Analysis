// craco.config.js

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the appropriate .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
dotenv.config({ path: path.resolve(__dirname, envFile) });

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Use HOMEPAGE_URL from the .env file or default to "/"
      webpackConfig.output.publicPath = process.env.HOMEPAGE_URL || '/';
      return webpackConfig;
    }
  },
  babel: {
    plugins: [
      ["@babel/plugin-proposal-private-methods", { "loose": true }]
    ]
  },
  devServer: {
    // Enable history API fallback for React Router
    historyApiFallback: true,
    // Enable hot module replacement
    hot: true,
    // Allow requests from any origin during development
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    // Uncomment and configure the proxy if you have a backend server
    // proxy: {
    //   '/api': 'http://localhost:5000'
    // }
  }
};
