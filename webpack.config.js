const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const dotenv = require('dotenv');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  const envFile = isDevelopment ? '.env.local' : '.env.production';
  const envConfig = dotenv.config({ path: path.resolve(__dirname, envFile) }).parsed || {};
  const publicPath = process.env.NODE_ENV === 'production' 
    ? '/Yemen_Market_Analysis/' 
    : '/';

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
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public', 'index.html'),
        favicon: path.resolve(__dirname, 'public', 'favicon.ico'),
      }),
      new DefinePlugin({
        'process.env': JSON.stringify({
          ...envConfig,
          PUBLIC_URL: publicPath.slice(0, -1),
        }),
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'public/data'),
            to: 'data',
            noErrorOnMissing: true,
          },
          {
            from: path.resolve(__dirname, 'results'),
            to: 'results',
            noErrorOnMissing: true,
          },
          {
            from: path.resolve(__dirname, 'public', '404.html'),
            to: path.resolve(__dirname, 'build'),
            noErrorOnMissing: true,
          },
        ],
      }),
    ],
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'public'),
      },
      compress: true,
      port: 3000,
      historyApiFallback: true,
      hot: true,
    },
    devtool: isDevelopment ? 'eval-source-map' : 'source-map',
    mode: isDevelopment ? 'development' : 'production',
    optimization: {
      splitChunks: {
        chunks: 'all',
      },
    },
  };
};