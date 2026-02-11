module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      production: {
        plugins: [
          // HAP-813: Strip verbose console logs in production builds
          // - Keeps console.error and console.warn for production debugging
          // - Strips console.log, console.debug, console.info
          // Note: The app uses `logger` from @/utils/logger for most logging,
          // which already uses __DEV__ checks. This plugin catches any remaining
          // raw console calls that might leak into production.
          ['transform-remove-console', { exclude: ['error', 'warn'] }],
        ],
      },
    },
    plugins: [
      'react-native-worklets/plugin',
      ['react-native-unistyles/plugin', { root: 'sources' }]
    ],
  };
};