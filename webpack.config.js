const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const dotenv = require('dotenv');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const envFile = isDevelopment ? '.env.development' : '.env.production';
  const envConfig = dotenv.config({ path: path.resolve(__dirname, envFile) }).parsed || {};
  const publicPath = isDevelopment ? '/' : '/Yemen_Market_Analysis/';

  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isDevelopment ? '[name].js' : '[name].[contenthash:8].js',
      chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash:8].chunk.js',
      publicPath,
      clean: true,
    },

    resolve: {
      extensions: ['.js', '.jsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'leaflet': path.resolve(__dirname, 'node_modules/leaflet'),
      },
      fallback: {
        'path': require.resolve('path-browserify'),
        'fs': false,
        'crypto': false
      }
    },

    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: !isDevelopment,
            },
          },
        }),
      ],
      splitChunks: isDevelopment ? false : {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          defaultVendors: false,
          default: false,
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            chunks: 'all',
            priority: 30,
          },
          core: {
            test: /[\\/]node_modules[\\/](react|react-dom|redux|react-redux)[\\/]/,
            name: 'core',
            chunks: 'all',
            priority: 40,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            chunks: 'all',
            priority: 20,
          }
        }
      },
      minimize: !isDevelopment,
      runtimeChunk: isDevelopment ? false : 'single',
    },

    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              cacheCompression: false,
            },
          },
        },
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/media/[name].[hash:8][ext]'
          }
        },
        {
          test: /\.svg$/,
          use: ['@svgr/webpack'],
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'static/fonts/[name].[hash:8][ext]'
          }
        },
        {
          test: /\.(geojson|json|csv)$/,
          type: 'asset/resource',
          generator: {
            filename: 'static/data/[name].[hash:8][ext]'
          }
        },
        {
          test: /\.worker\.js$/,
          use: {
            loader: 'worker-loader',
            options: {
              filename: '[name].[contenthash:8].worker.js'
            }
          }
        }
      ],
    },

    plugins: [
      new CleanWebpackPlugin(),

      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        inject: true,
        minify: !isDevelopment,
      }),

      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '',
            globOptions: {
              ignore: ['**/index.html'],
            },
          },
          {
            from: 'node_modules/leaflet/dist/images',
            to: 'static/media'
          },
        ],
      }),

      new DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(isDevelopment ? 'development' : 'production'),
          PUBLIC_URL: JSON.stringify(publicPath.slice(0, -1)),
          ...Object.keys(envConfig).reduce((acc, key) => {
            acc[key] = JSON.stringify(envConfig[key]);
            return acc;
          }, {})
        },
      }),

      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
      }),

      ...(!isDevelopment ? [
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
        }),
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        }),
      ] : []),
    ].filter(Boolean),

    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      client: {
        overlay: {
          errors: true,
          warnings: false,
        },
      },
    },

    performance: {
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
      hints: isDevelopment ? false : 'warning',
    },

    devtool: isDevelopment ? 'eval-cheap-module-source-map' : false,
    mode: isDevelopment ? 'development' : 'production',

    cache: isDevelopment ? {
      type: 'filesystem',
      name: 'development-cache',
      buildDependencies: {
        config: [__filename],
      },
      compression: 'gzip',
    } : false,
  };
};