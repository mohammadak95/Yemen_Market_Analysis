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
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const envFile = isDevelopment ? '.env.development' : '.env.production';
  const envConfig = dotenv.config({ path: path.resolve(__dirname, envFile) }).parsed || {};
  const publicPath = isDevelopment ? '/' : '/Yemen_Market_Analysis/';
  const dataPath = isDevelopment ? '/results' : '/data';

  const processedEnv = {
    'process.env': {
      NODE_ENV: JSON.stringify(isDevelopment ? 'development' : 'production'),
      PUBLIC_URL: JSON.stringify(publicPath.slice(0, -1)),
      REACT_APP_DATA_PATH: JSON.stringify(dataPath),
      ...(isDevelopment && {
        REACT_APP_API_URL: JSON.stringify(process.env.REACT_APP_API_URL || 'http://localhost:5001')
      })
    }
  };

  Object.keys(envConfig).forEach(key => {
    if (key.startsWith('REACT_APP_')) {
      processedEnv['process.env'][key] = JSON.stringify(envConfig[key]);
    }
  });

  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: 'main.js',
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'leaflet': path.resolve(__dirname, 'node_modules/leaflet'),
        'selectors': path.resolve(__dirname, 'src/selectors'),
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
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
            format: {
              comments: false,
            },
            mangle: true,
          },
          extractComments: false,
        }),
        new CssMinimizerPlugin(),
      ],
      splitChunks: isDevelopment ? false : {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 15000,
        maxSize: 244000,
        cacheGroups: {
          reactVendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/,
            name: 'reactVendor',
            priority: 40,
            enforce: true,
          },
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            priority: 30,
            enforce: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            enforce: true,
          },
          common: {
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
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
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: true,
                cacheCompression: false,
                plugins: [
                  isDevelopment && require.resolve('react-refresh/babel')
                ].filter(Boolean)
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
                importLoaders: 1
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: isDevelopment,
                postcssOptions: {
                  plugins: [
                    require('autoprefixer'),
                  ],
                },
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
          use: { loader: 'worker-loader' },
        }
      ],
    },
    plugins: [
      new CleanWebpackPlugin(),
      isDevelopment && new ReactRefreshWebpackPlugin({
        overlay: false
      }),
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
          ...(isDevelopment ? [
            {
              from: 'results',
              to: 'results',
              noErrorOnMissing: true
            }
          ] : [
            {
              from: 'data',
              to: 'data',
              noErrorOnMissing: true,
              globOptions: {
                ignore: ['**/preprocessed_by_commodity/**'],
              }
            },
            {
              from: 'data/preprocessed_by_commodity',
              to: 'data/preprocessed_by_commodity',
              noErrorOnMissing: true
            },
            {
              from: 'results',
              to: 'data',
              noErrorOnMissing: true
            }
          ]),
          {
            from: 'node_modules/leaflet/dist/images',
            to: 'static/media',
            noErrorOnMissing: true
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
      new MiniCssExtractPlugin({
        filename: isDevelopment ? '[name].css' : 'static/css/[name].[contenthash:8].css',
        chunkFilename: isDevelopment ? '[id].css' : 'static/css/[id].[contenthash:8].chunk.css',
      }),
      ...(!isDevelopment ? [
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          threshold: 8192,
          minRatio: 0.8,
          algorithm: 'gzip',
          compressionOptions: { level: 9 },
          deleteOriginalAssets: false,
        }),
      ] : []),
    ].filter(Boolean),
    devServer: {
      static: [
        {
          directory: path.join(__dirname, 'public'),
          publicPath: '/'
        },
        {
          directory: path.join(__dirname, 'results'),
          publicPath: '/results'
        }
      ],
      compress: true,
      port: parseInt(process.env.CLIENT_PORT || '3001', 10),
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
          target: `http://localhost:${process.env.SERVER_PORT || '5001'}`,
          secure: false,
          changeOrigin: true,
          logLevel: 'debug',
        },
        '/data': {
          target: `http://localhost:${process.env.SERVER_PORT || '5001'}`,
          secure: false,
          changeOrigin: true,
          logLevel: 'debug',
          pathRewrite: {
            '^/data': '/public/data'
          }
        },
        '/results': {
          target: `http://localhost:${process.env.SERVER_PORT || '5001'}`,
          secure: false,
          changeOrigin: true,
          logLevel: 'debug',
        },
      },
    },
    performance: {
      maxAssetSize: 244000,
      maxEntrypointSize: 244000,
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
      cacheLocation: path.resolve(__dirname, 'node_modules/.cache/webpack'),
      store: 'pack',
    } : false,
    stats: isDevelopment ? 'minimal' : 'normal',
  };
};
