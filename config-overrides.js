const { override, addWebpackModuleRule, addWebpackPlugin, adjustStyleLoaders } = require('customize-cra');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the appropriate .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
dotenv.config({ path: path.resolve(__dirname, envFile) });

module.exports = override(
  // SVG handling with @svgr/webpack
  addWebpackModuleRule({
    test: /\.svg$/,
    use: ['@svgr/webpack'],
  }),

  // Handle Leaflet assets and other static files
  addWebpackPlugin(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/leaflet/dist/images',
          to: 'static/images',
        },
        // Add other static assets if needed
      ],
    })
  ),

  // Configure style loaders with source maps
  adjustStyleLoaders(({ use: [, css, postcss, resolve, processor] }) => {
    // Enable source maps for all style loaders
    if (css) {
      css.options.sourceMap = true;
    }
    if (postcss) {
      postcss.options.sourceMap = true;
    }
    if (processor && processor.loader.includes('sass-loader')) {
      processor.options.sourceMap = true;
    }
  }),

  // Update webpack config with additional customizations
  (config) => {
    // Find and update PostCSS loader configuration
    const postcssLoader = config.module.rules.find(
      (rule) =>
        rule.oneOf &&
        rule.oneOf.some(
          (r) => r.use && r.use.some((u) => u.loader && u.loader.includes('postcss-loader'))
        )
    );

    if (postcssLoader) {
      postcssLoader.oneOf.forEach((oneOfRule) => {
        if (oneOfRule.use) {
          oneOfRule.use.forEach((use) => {
            if (use.loader && use.loader.includes('postcss-loader')) {
              use.options = {
                postcssOptions: {
                  plugins: [
                    'postcss-flexbugs-fixes',
                    [
                      'postcss-preset-env',
                      {
                        autoprefixer: {
                          flexbox: 'no-2009',
                        },
                        stage: 3,
                      },
                    ],
                    'autoprefixer',
                  ],
                },
                sourceMap: true,
              };
            }
          });
        }
      });
    }

    // Update resolve aliases for better module resolution
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      },
      alias: {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, 'src'),
        'leaflet': path.resolve(__dirname, 'node_modules/leaflet'),
        'assets': path.resolve(__dirname, 'src/assets'),
        'utils': path.resolve(__dirname, 'src/utils'),
        'components': path.resolve(__dirname, 'src/components'),
        'hooks': path.resolve(__dirname, 'src/hooks'),
        'slices': path.resolve(__dirname, 'src/slices'),
      },
    };

    // Configure output publicPath for GitHub Pages
    if (process.env.PUBLIC_URL) {
      config.output.publicPath = process.env.PUBLIC_URL + '/';
    }

    // Add support for source maps in development
    if (process.env.NODE_ENV === 'development') {
      config.devtool = 'source-map';
    }

    // Optimize chunks for better loading performance
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        name: false,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            reuseExistingChunk: true,
          },
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    };

    // Add rule for handling Leaflet marker images
    config.module.rules.push({
      test: /\.(png|jpe?g|gif)$/i,
      include: /node_modules\/leaflet/,
      use: [
        {
          loader: 'file-loader',
          options: {
            name: 'static/media/[name].[hash:8].[ext]',
          },
        },
      ],
    });

    return config;
  }
);