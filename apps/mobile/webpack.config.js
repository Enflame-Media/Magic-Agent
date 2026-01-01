const webpack = require('@nativescript/webpack');

/**
 * NativeScript Webpack configuration for Happy Vue mobile app.
 *
 * @see https://docs.nativescript.org/webpack
 */
module.exports = (env) => {
  webpack.init(env);

  // Apply Vue 3 preset
  webpack.useConfig('vue');

  // Enable Vue devtools in development
  if (env.vueDevtools) {
    webpack.chainWebpack((config) => {
      config.plugin('DefinePlugin').tap((args) => {
        args[0] = {
          ...args[0],
          __VUE_PROD_DEVTOOLS__: true,
        };
        return args;
      });
    });
  }

  // Add path aliases
  webpack.chainWebpack((config) => {
    config.resolve.alias.set('@', `${__dirname}/src`);
    config.resolve.alias.set('~', `${__dirname}/src`);
  });

  return webpack.resolveConfig();
};
