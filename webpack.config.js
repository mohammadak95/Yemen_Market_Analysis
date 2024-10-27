// webpack.config.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin, HotModuleReplacementPlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  // Load appropriate .env file based on environment
  const isDevelopment = argv.mode === 'development';
  const envFile = isDevelopment ? '.env.local' : '.env.production';
  const envConfig = dotenv.config({ path: path.resolve(__dirname, envFile) }).parsed || {};

  return {
    entry: [
      isDevelopment && 'webpack-dev-server/client?http://localhost:3000',
      isDevelopment && 'webpack/hot/only-dev-server',
      path.resolve(__dirname, 'src', 'index.js'),
    ].filter(Boolean),
    output: {
      path: path.resolve(__dirname, 'build'),
      filename: isDevelopment ? 'static/js/[name].js' : 'static/js/[name].[contenthash:8].js',
      publicPath: isDevelopment ? '/' : '/Yemen_Market_Analysis/',
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
          test: /\.worker\.js$/,
          use: {
            loader: 'workerize-loader',
            options: { inline: true }
          }
        },
        {
          test: /\.css$/i,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                modules: {
                  auto: true,
                },
              },
            },
            {
              loader: 'postcss-loader',
              options: {
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
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
        },
        {
          test: /\.(woff(2)?|eot|ttf|otf)$/,
          type: 'asset/inline',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public', 'index.html'),
        favicon: path.resolve(__dirname, 'public', 'favicon.ico'),
        manifest: false,
      }),
      new DefinePlugin({
        'process.env': JSON.stringify({
          ...envConfig,
          PUBLIC_URL: '',
        }),
      }),
      !isDevelopment && new MiniCssExtractPlugin({
        filename: 'static/css/[name].[contenthash:8].css',
      }),
      isDevelopment && new HotModuleReplacementPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public/data'),
            to: 'data',
            noErrorOnMissing: true,
          },
          {
            from: path.resolve(__dirname, 'results'),
            to: 'data',
            noErrorOnMissing: true,
          },
        ],
      }),
    ].filter(Boolean),
    devServer: {
      static: [
        {
          directory: path.resolve(__dirname, 'public'),
          publicPath: '/',
        },
        {
          directory: path.resolve(__dirname, 'public/data'),
          publicPath: '/data',
        },
        {
          directory: path.resolve(__dirname, 'results'),
          publicPath: '/data',
        },
      ],
      compress: true,
      port: 3000,
      historyApiFallback: true,
      hot: true,
      open: true,
      client: {
        overlay: true,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    mode: isDevelopment ? 'development' : 'production',
  };
};