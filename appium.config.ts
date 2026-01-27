/**
 * Appium WebdriverIO Configuration for NativeScript Mobile Testing
 *
 * Configures Appium to test the Happy Vue mobile app on iOS and Android.
 * Uses WebdriverIO as the test runner with Mocha framework.
 *
 * Prerequisites:
 * - Appium installed globally: npm i -g appium
 * - Appium drivers: appium driver install xcuitest (iOS), appium driver install uiautomator2 (Android)
 * - iOS: Xcode and iOS Simulator
 * - Android: Android SDK and emulator
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import type { Options } from '@wdio/types';

/**
 * Base capabilities shared across all mobile platforms
 */
const baseCapabilities = {
  automationName: 'flutter', // Can be 'XCUITest' for iOS, 'UiAutomator2' for Android
  noReset: false,
  fullReset: false,
  newCommandTimeout: 60000,
};

/**
 * iOS-specific capabilities
 */
const iosCapabilities = {
  ...baseCapabilities,
  platformName: 'iOS',
  'appium:automationName': 'XCUITest',
  'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone 15',
  'appium:platformVersion': process.env.IOS_PLATFORM_VERSION || '17.0',
  'appium:app': process.env.IOS_APP_PATH || './platforms/ios/build/Debug-iphonesimulator/happyvue.app',
  'appium:bundleId': 'com.enflame.happyvue',
  'appium:simulatorStartupTimeout': 180000,
  'appium:wdaStartupRetries': 4,
  'appium:wdaStartupRetryInterval': 20000,
};

/**
 * Android-specific capabilities
 */
const androidCapabilities = {
  ...baseCapabilities,
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'emulator-5554',
  'appium:app': process.env.ANDROID_APP_PATH || './platforms/android/app/build/outputs/apk/debug/app-debug.apk',
  'appium:appPackage': 'com.enflame.happyvue',
  'appium:appActivity': 'com.tns.NativeScriptActivity',
  'appium:autoGrantPermissions': true,
  'appium:ensureWebviewsHavePages': true,
  'appium:nativeWebScreenshot': true,
};

/**
 * WebdriverIO configuration
 */
export const config: Options.Testrunner = {
  /**
   * Runner configuration
   */
  runner: 'local',
  tsConfigPath: './tsconfig.json',

  /**
   * Test files pattern
   */
  specs: ['./e2e/mobile/**/*.spec.ts'],
  exclude: [],

  /**
   * Capabilities for different platforms
   * Can be overridden via environment variables
   */
  capabilities: (() => {
    const platform = process.env.MOBILE_PLATFORM || 'ios';

    if (platform === 'both') {
      return [iosCapabilities, androidCapabilities];
    }

    return [platform === 'android' ? androidCapabilities : iosCapabilities];
  })(),

  /**
   * Test framework
   */
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 120000,
    require: ['ts-node/register'],
  },

  /**
   * Reporters
   */
  reporters: [
    'spec',
    ['allure', {
      outputDir: 'allure-results',
      disableWebdriverStepsReporting: true,
      disableWebdriverScreenshotsReporting: false,
    }],
  ],

  /**
   * Appium service configuration
   */
  services: [
    ['appium', {
      args: {
        address: 'localhost',
        port: 4723,
      },
      logPath: './appium-logs',
      command: 'appium',
    }],
  ],

  /**
   * Log level
   */
  logLevel: process.env.CI ? 'warn' : 'info',

  /**
   * Bail after N failures (0 = run all)
   */
  bail: 0,

  /**
   * Default timeout for WebdriverIO operations
   */
  waitforTimeout: 30000,

  /**
   * Connection retry settings
   */
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  /**
   * Hooks
   */
  before: async function (_capabilities, _specs) {
    // Set up global test utilities
    console.log('[Appium] Starting mobile test suite...');
  },

  after: async function (_result, _capabilities, _specs) {
    console.log('[Appium] Test suite completed.');
  },

  beforeTest: async function (_test) {
    // Reset app state before each test if needed
  },

  afterTest: async function (test, _context, { error }) {
    // Take screenshot on test failure
    if (error) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `./screenshots/${test.parent}-${test.title}-${timestamp}.png`;
      try {
        await browser.saveScreenshot(screenshotPath);
        console.log(`[Appium] Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('[Appium] Failed to save screenshot:', screenshotError);
      }
    }
  },
};

export default config;
