const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const dotenv = require('dotenv');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const envFile = isDevelopment ? '.env.development' : '.env.production';
  const envConfig = dotenv.config({ path: path.resolve(__dirname, envFile) }).parsed || {};
  const publicPath = isDevelopment ? '/' : '/Yemen_Market_Analysis/';

  // Process environment variables
  const processedEnv = {
    'process.env': {
      NODE_ENV: JSON.stringify(isDevelopment ? 'development' : 'production'),
      PUBLIC_URL: JSON.stringify(publicPath.slice(0, -1)),
    }
  };

  // Add all REACT_APP_ prefixed variables from .env
  Object.keys(envConfig).forEach(key => {
    if (key.startsWith('REACT_APP_')) {
      processedEnv['process.env'][key] = JSON.stringify(envConfig[key]);
    }
  });

  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isDevelopment ? '[name].js' : '[name].[contenthash:8].js',
      chunkFilename: isDevelopment ? '[name].chunk.js' : '[name].[contenthash:8].chunk.js',
      publicPath,
      clean: true,
    },

    // Resolve settings for path aliases and compatibility
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

    // Optimization settings, including SplitChunks and minimizers
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: !isDevelopment,
            },
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
        ...(isDevelopment ? [] : [new CssMinimizerPlugin()]),
      ],
      splitChunks: isDevelopment ? false : {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          reactVendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            name: 'reactVendor',
            priority: 40,
          },
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            priority: 30,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
          }
        }
      },
      minimize: !isDevelopment,
      runtimeChunk: isDevelopment ? false : 'single',
    },

    // Module rules for handling different file types
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'thread-loader',
              options: {
                workers: require('os').cpus().length - 1,
                poolTimeout: isDevelopment ? Infinity : 2000,
              },
            },
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                cacheCompression: false,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: isDevelopment,
                importLoaders: 1,
              },
            },
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
              filename: isDevelopment ? '[name].worker.js' : '[name].[contenthash:8].worker.js'
            }
          }
        }
      ],
    },

    // Plugins for enhanced functionality
    plugins: [
      new CleanWebpackPlugin(),

      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        inject: true,
        minify: !isDevelopment && {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        },
        templateParameters: {
          PUBLIC_URL: publicPath.slice(0, -1)
        }
      }),

      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public',
            to: '',
            globOptions: {
              ignore: ['**/index.html'],
            },
            transform(content, absoluteFrom) {
              if (absoluteFrom.endsWith('manifest.json')) {
                const manifestContent = content.toString();
                return Buffer.from(
                  manifestContent.replace(/%PUBLIC_URL%/g, publicPath.slice(0, -1))
                );
              }
              return content;
            },
          },
          {
            from: 'data/preprocessed_by_commodity',
            to: 'data/preprocessed_by_commodity'
          },
          {
            from: 'node_modules/leaflet/dist/images',
            to: 'static/media'
          },
        ],
      }),

      new DefinePlugin(processedEnv),

      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath,
        generate: (seed, files, entrypoints) => ({
          files: files.reduce((manifest, file) => ({
            ...manifest,
            [file.name]: file.path,
          }), seed),
          entrypoints: entrypoints.main || [],
        }),
      }),

      ...(!isDevelopment ? [
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          algorithm: 'gzip',
          compressionOptions: { level: 9 },
        }),
        new MiniCssExtractPlugin({
          filename: 'static/css/[name].[contenthash:8].css',
          chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
        }),
      ] : []),
    ].filter(Boolean),

    // Dev server configuration for local development
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
        publicPath: '/',
      },
      compress: true,
      port: 3000,
      hot: true,
      historyApiFallback: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      devMiddleware: {
        writeToDisk: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:5001', // Replace with your backend server's address
          secure: false,
          changeOrigin: true,
          logLevel: 'debug', // Optional: Useful for debugging proxy issues
        },
        '/data': {
          target: 'http://localhost:5001',
          secure: false,
          changeOrigin: true,
          logLevel: 'debug',
          pathRewrite: {
            '^/data': '/public/data'
          }
        },
        '/results': {
          target: 'http://localhost:5001', // If your results are served by the backend
          secure: false,
          changeOrigin: true,
          logLevel: 'debug',
        },
      },
    },

    // Performance settings to manage asset sizes
    performance: {
      maxAssetSize: 512000,
      maxEntrypointSize: 512000,
      hints: isDevelopment ? false : 'warning',
    },

    // Source maps for better debugging in development
    devtool: isDevelopment ? 'eval-cheap-module-source-map' : 'source-map',

    mode: isDevelopment ? 'development' : 'production',

    // Cache configuration to improve build speed
    cache: isDevelopment ? {
      type: 'filesystem',
      name: 'development-cache',
      buildDependencies: {
        config: [__filename],
      },
      compression: 'gzip',
      cacheLocation: path.resolve(__dirname, 'node_modules/.cache/webpack'),
      store: 'pack',
    } : false,

    // Minimal stats in development for cleaner console output
    stats: isDevelopment ? 'minimal' : 'normal',
  };
};
