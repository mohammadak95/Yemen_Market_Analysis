// webpack.config.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  // Load the appropriate .env file
  const envFile = isDevelopment ? '.env.development' : '.env.production';
  const envConfig = dotenv.config({ path: path.resolve(__dirname, envFile) }).parsed || {};

  const publicPath = isDevelopment ? '/' : '/Yemen_Market_Analysis/';
  const definePluginConfig = {
    'process.env': {
      NODE_ENV: JSON.stringify(isDevelopment ? 'development' : 'production'),
      PUBLIC_URL: JSON.stringify(publicPath.slice(0, -1)),
      API_URL: JSON.stringify(envConfig.API_URL || ''),
      BASE_PATH: JSON.stringify(envConfig.BASE_PATH || ''),
      DEBUG: JSON.stringify(envConfig.DEBUG === 'true'),
      ...Object.keys(envConfig).reduce((acc, key) => {
        acc[key] = JSON.stringify(envConfig[key]);
        return acc;
      }, {})
    }
  };

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
        'leaflet': path.resolve(__dirname, 'node_modules/leaflet'),
        'assets': path.resolve(__dirname, 'src/assets'),
        'utils': path.resolve(__dirname, 'src/utils'),
        'components': path.resolve(__dirname, 'src/components'),
        'hooks': path.resolve(__dirname, 'src/hooks'),
        'slices': path.resolve(__dirname, 'src/slices'),
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
          test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
          type: 'asset/resource',
          generator: {
            filename: 'static/media/[name].[hash:8][ext]'
          }
        },
        {
          test: /\.(geojson|json|csv)$/,
          type: 'asset/resource',
          generator: {
            filename: 'static/data/[name].[hash:8][ext]'
          }
        }
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public', 'index.html'),
        favicon: path.resolve(__dirname, 'public', 'favicon.ico'),
        publicPath: publicPath,
        env: isDevelopment ? 'development' : 'production'
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public'),
            to: path.resolve(__dirname, 'build'),
            globOptions: {
              ignore: ['**/index.html', '**/favicon.ico'],
            },
          },
          {
            from: path.resolve(__dirname, 'results'),
            to: path.resolve(__dirname, 'build/results'),
            noErrorOnMissing: true
          },
          {
            from: path.resolve(__dirname, 'node_modules/leaflet/dist/images'),
            to: path.resolve(__dirname, 'build/static/media')
          }
        ],
      }),
      new DefinePlugin(definePluginConfig),
      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: publicPath,
      }),
    ],
    optimization: {
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              )[1];
              return `vendor.${packageName.replace('@', '')}`;
            },
          },
        },
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
          watch: true
        },
        {
          directory: path.resolve(__dirname, 'node_modules/leaflet/dist/images'),
          publicPath: '/static/media',
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
      devMiddleware: {
        writeToDisk: true
      },
      watchFiles: {
        paths: ['src/**/*', 'public/**/*', 'results/**/*'],
        options: {
          usePolling: false,
        },
      },
    },
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    mode: isDevelopment ? 'development' : 'production',
  };
};