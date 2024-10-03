// config-overrides.js
const { override, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
  // Add a rule for handling SVGs with @svgr/webpack
  addWebpackModuleRule({
    test: /\.svg$/,
    use: ['@svgr/webpack'],
  }),
  (config) => {
    // Ensure postcss-loader is updated and properly configured
    const postcssLoader = config.module.rules.find((rule) =>
      rule.oneOf && rule.oneOf.some((r) => r.use && r.use.some((u) => u.loader && u.loader.includes('postcss-loader')))
    );

    if (postcssLoader) {
      postcssLoader.oneOf.forEach((oneOfRule) => {
        if (oneOfRule.use) {
          oneOfRule.use.forEach((use) => {
            if (use.loader && use.loader.includes('postcss-loader')) {
              use.options = {
                postcssOptions: {
                  plugins: [
                    require('autoprefixer'), // Add other PostCSS plugins if needed
                  ],
                },
              };
            }
          });
        }
      });
    }

    // Update css-select and nth-check in existing rules if necessary
    // (Assuming you've addressed them via overrides)

    return config;
  }
);