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
          test: /\.worker\.js$/,
          use: { loader: 'worker-loader' }
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
            from: path.resolve(__dirname, 'public', 'manifest.json'),
            to: path.resolve(__dirname, 'build', 'manifest.json'),
            transform(content) {
              const manifest = JSON.parse(content.toString());
              manifest.icons.forEach(icon => {
                icon.src = `${publicPath}${icon.src}`.replace('//', '/');
              });
              manifest.start_url = publicPath;
              return JSON.stringify(manifest, null, 2);
            },
          },
          {
            from: path.resolve(__dirname, 'public'),
            to: path.resolve(__dirname, 'build'),
            globOptions: {
              ignore: ['**/index.html', '**/favicon.ico', '**/manifest.json'],
            },
          },
        ],
      }),
      new DefinePlugin({
        'process.env': JSON.stringify({
          PUBLIC_URL: publicPath.slice(0, -1),
        }),
      }),
      new WebpackManifestPlugin({
        fileName: 'asset-manifest.json',
        publicPath: publicPath,
        generate: (seed, files, entrypoints) => {
          const manifestFiles = files.reduce((manifest, file) => {
            manifest[file.name] = file.path;
            return manifest;
          }, seed);
          const entrypointFiles = entrypoints.main.filter(
            fileName => !fileName.endsWith('.map')
          );

          return {
            files: manifestFiles,
            entrypoints: entrypointFiles,
          };
        },
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
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
      },
      devMiddleware: {
        publicPath: publicPath,
        writeToDisk: true,
      },
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