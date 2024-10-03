// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { DefinePlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: path.resolve(__dirname, 'src', 'index.js'), // Adjust as needed
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'static/js/bundle.[contenthash:8].js',
    publicPath: '/',
    clean: true, // Cleans the output directory before emit
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    alias: {
      // Add aliases if needed
      '@': path.resolve(__dirname, 'src'),
    },
  },
  module: {
    rules: [
      // JavaScript and JSX Files
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      // CSS Files
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      // Images and Assets
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
      // Fonts
      {
        test: /\.(woff(2)?|eot|ttf|otf)$/,
        type: 'asset/inline',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public', 'index.html'),
      favicon: path.resolve(__dirname, 'public', 'favicon.ico'), // If you have a favicon
    }),
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].[contenthash:8].css',
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    historyApiFallback: true, // For React Router
    hot: true,
    open: true,
  },
  devtool: 'source-map', // Useful for debugging
  mode: process.env.NODE_ENV || 'development',
};