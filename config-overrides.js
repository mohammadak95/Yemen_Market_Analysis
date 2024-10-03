const { override, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
  addWebpackModuleRule({
    test: /\.svg$/,
    use: ['@svgr/webpack']
  }),
  (config) => {
    // Find and replace the postcss loader
    const postcssLoader = config.module.rules.find(rule => rule.loader && rule.loader.includes('postcss-loader'));
    if (postcssLoader) {
      postcssLoader.loader = require.resolve('postcss-loader');
    }

    // Update css-select and nth-check in existing rules
    config.module.rules.forEach(rule => {
      if (rule.oneOf) {
        rule.oneOf.forEach(oneOfRule => {
          if (oneOfRule.use) {
            oneOfRule.use.forEach(use => {
              if (use.loader && use.loader.includes('css-loader')) {
                use.options = {
                  ...use.options,
                  modules: {
                    ...use.options.modules,
                    getLocalIdent: (context, localIdentName, localName) => {
                      // Your custom getLocalIdent function here
                      return localName;
                    }
                  }
                };
              }
            });
          }
        });
      }
    });

    return config;
  }
);