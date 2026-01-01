import type { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'com.enflamemedia.happy',
  appPath: 'src',
  appResourcesPath: 'App_Resources',
  android: {
    id: 'com.enflamemedia.happy',
    v8Flags: '--expose_gc',
    markingMode: 'none',
    // Minimum SDK version (Android 8.0 Oreo)
    minSdkVersion: '26',
  },
  ios: {
    id: 'com.enflamemedia.happy',
    discardUncaughtJsExceptions: true,
  },
  // CLI hooks configuration
  hooks: [],
  // Webpack configuration file
  webpackConfigPath: './webpack.config.js',
} as NativeScriptConfig;
