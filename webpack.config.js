// webpack.config.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const publicPath = isDevelopment ? '/' : '/Yemen_Market_Analysis/';

  return {
    entry: path.resolve(__dirname, 'src', 'index.js'),
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'static/js/[name].[contenthash:8].js',
      publicPath: publicPath,
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: ['babel-loader'],
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff(2)?|eot|ttf|otf)$/,
          type: 'asset/inline',
        },
        {
          test: /\.(geojson|json|csv)$/,
          type: 'asset/resource',
        }
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public', 'index.html'),
        favicon: path.resolve(__dirname, 'public', 'favicon.ico'),
        publicPath: publicPath,
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public'),
            to: path.resolve(__dirname, 'build'),
            globOptions: {
              ignore: ['**/index.html', '**/favicon.ico', '**/manifest.json'],
            },
          },
          {
            from: path.resolve(__dirname, 'results'),
            to: path.resolve(__dirname, 'build/results'),
            noErrorOnMissing: true
          }
        ],
      }),
      new DefinePlugin({
        'process.env': JSON.stringify({
          PUBLIC_URL: publicPath.slice(0, -1),
          NODE_ENV: process.env.NODE_ENV || 'development'
        }),
      }),
      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: publicPath,
      }),
    ],
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },
    devServer: {
      static: [
        {
          directory: path.resolve(__dirname, 'public'),
          publicPath: '/',
        },
        {
          directory: path.resolve(__dirname, 'results'),
          publicPath: '/results',
        }
      ],
      compress: true,
      port: 3000,
      historyApiFallback: true,
      hot: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      },
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) {
          throw new Error('webpack-dev-server is not defined');
        }

        // Add CORS headers to all responses
        devServer.app.use((req, res, next) => {
          res.header('Access-Control-Allow-Origin', '*');
          res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
          res.header('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');
          next();
        });

        return middlewares;
      }
    },
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    mode: isDevelopment ? 'development' : 'production',
  };
};