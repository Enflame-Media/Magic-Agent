/**
 * BrowserStack Configuration for Device Farm Testing
 *
 * Configures BrowserStack App Automate for testing the Happy Vue mobile app
 * across real iOS and Android devices in the cloud.
 *
 * Prerequisites:
 * - BrowserStack account with App Automate plan
 * - BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY environment variables
 * - App uploaded to BrowserStack (bs://app-id)
 *
 * Usage:
 *   # Upload app first
 *   curl -u "user:key" -X POST https://api-cloud.browserstack.com/app-automate/upload \
 *     -F "file=@/path/to/app.apk"
 *
 *   # Run tests
 *   BROWSERSTACK_APP_ID=bs://xxxx npx wdio browserstack.config.ts
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 * @see https://www.browserstack.com/app-automate
 */

import type { Options } from '@wdio/types';

/**
 * BrowserStack credentials from environment
 */
const username = process.env.BROWSERSTACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;
const appId = process.env.BROWSERSTACK_APP_ID;

if (!username || !accessKey) {
  console.warn('[BrowserStack] Missing credentials. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY');
}

/**
 * Common BrowserStack capabilities
 */
const bstackOptions = {
  userName: username,
  accessKey: accessKey,
  projectName: 'Happy Vue',
  buildName: `Build ${process.env.CI_BUILD_NUMBER || new Date().toISOString().split('T')[0]}`,
  sessionName: 'Mobile E2E Tests',
  debug: true,
  networkLogs: true,
  consoleLogs: 'info',
  video: true,
  deviceLogs: true,
  appiumVersion: '2.6.0',
  idleTimeout: 300,
};

/**
 * iOS device configurations to test
 *
 * Updated Q1 2026: Added iPhone 16 series with iOS 18, removed iPhone 12 (> 3 generations old)
 * @see HAP-875 - BrowserStack Device Matrix Maintenance
 */
const iosDevices = [
  // Latest flagship - iPhone 16 Pro Max (iOS 18)
  {
    'appium:deviceName': 'iPhone 16 Pro Max',
    'appium:platformVersion': '18',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPhone 16 Pro Max',
      osVersion: '18',
    },
  },
  // Current flagship - iPhone 16 Pro (iOS 18)
  {
    'appium:deviceName': 'iPhone 16 Pro',
    'appium:platformVersion': '18',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPhone 16 Pro',
      osVersion: '18',
    },
  },
  // Standard current - iPhone 16 (iOS 18)
  {
    'appium:deviceName': 'iPhone 16',
    'appium:platformVersion': '18',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPhone 16',
      osVersion: '18',
    },
  },
  // Previous generation flagship
  {
    'appium:deviceName': 'iPhone 15 Pro Max',
    'appium:platformVersion': '17',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPhone 15 Pro Max',
      osVersion: '17',
    },
  },
  // Previous generation standard
  {
    'appium:deviceName': 'iPhone 15',
    'appium:platformVersion': '17',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPhone 15',
      osVersion: '17',
    },
  },
  // Older supported device (2 generations back)
  {
    'appium:deviceName': 'iPhone 14',
    'appium:platformVersion': '18',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPhone 14',
      osVersion: '18',
    },
  },
  // iPad for tablet testing - latest iPad Pro with M4
  {
    'appium:deviceName': 'iPad Pro 13 2024',
    'appium:platformVersion': '18',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'iPad Pro 13 2024',
      osVersion: '18',
    },
  },
];

/**
 * Android device configurations to test
 *
 * Updated Q1 2026: Added Galaxy S25 and Pixel 9 with Android 15, removed Galaxy S21 (> 3 generations old)
 * @see HAP-875 - BrowserStack Device Matrix Maintenance
 */
const androidDevices = [
  // Latest flagship - Samsung Galaxy S25 Ultra (Android 15)
  {
    'appium:deviceName': 'Samsung Galaxy S25 Ultra',
    'appium:platformVersion': '15.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Samsung Galaxy S25 Ultra',
      osVersion: '15.0',
    },
  },
  // Current flagship - Samsung Galaxy S25 (Android 15)
  {
    'appium:deviceName': 'Samsung Galaxy S25',
    'appium:platformVersion': '15.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Samsung Galaxy S25',
      osVersion: '15.0',
    },
  },
  // Google Pixel 9 Pro (Android 15)
  {
    'appium:deviceName': 'Google Pixel 9 Pro',
    'appium:platformVersion': '15.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Google Pixel 9 Pro',
      osVersion: '15.0',
    },
  },
  // Google Pixel 9 (Android 15)
  {
    'appium:deviceName': 'Google Pixel 9',
    'appium:platformVersion': '15.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Google Pixel 9',
      osVersion: '15.0',
    },
  },
  // Previous generation flagship - Samsung Galaxy S24 Ultra
  {
    'appium:deviceName': 'Samsung Galaxy S24 Ultra',
    'appium:platformVersion': '14.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Samsung Galaxy S24 Ultra',
      osVersion: '14.0',
    },
  },
  // Previous generation Pixel
  {
    'appium:deviceName': 'Google Pixel 8 Pro',
    'appium:platformVersion': '14.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Google Pixel 8 Pro',
      osVersion: '14.0',
    },
  },
  // Older supported - Samsung Galaxy S23 (2 generations back)
  {
    'appium:deviceName': 'Samsung Galaxy S23',
    'appium:platformVersion': '14.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Samsung Galaxy S23',
      osVersion: '14.0',
    },
  },
  // Mid-range device - Samsung Galaxy A55 (2024 mid-range)
  {
    'appium:deviceName': 'Samsung Galaxy A55',
    'appium:platformVersion': '14.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Samsung Galaxy A55',
      osVersion: '14.0',
    },
  },
  // Tablet - Samsung Galaxy Tab S9 Ultra
  {
    'appium:deviceName': 'Samsung Galaxy Tab S9 Ultra',
    'appium:platformVersion': '14.0',
    'bstack:options': {
      ...bstackOptions,
      deviceName: 'Samsung Galaxy Tab S9 Ultra',
      osVersion: '14.0',
    },
  },
];

/**
 * Select devices based on environment variable
 */
function getCapabilities(): object[] {
  const platform = process.env.MOBILE_PLATFORM || 'both';

  const baseCapability = {
    'appium:app': appId,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 300,
  };

  let devices: object[];

  if (platform === 'ios') {
    devices = iosDevices.map((device) => ({
      ...baseCapability,
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      ...device,
    }));
  } else if (platform === 'android') {
    devices = androidDevices.map((device) => ({
      ...baseCapability,
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      ...device,
    }));
  } else {
    // Both platforms
    const ios = iosDevices.map((device) => ({
      ...baseCapability,
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      ...device,
    }));

    const android = androidDevices.map((device) => ({
      ...baseCapability,
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      ...device,
    }));

    devices = [...ios, ...android];
  }

  // Limit devices in CI to control costs
  // Total available: 7 iOS + 9 Android = 16 devices
  // Default to 6 for balanced coverage across platforms
  const maxDevices = parseInt(process.env.MAX_DEVICES || '6', 10);
  return devices.slice(0, maxDevices);
}

/**
 * WebdriverIO BrowserStack configuration
 */
export const config: Options.Testrunner = {
  /**
   * BrowserStack cloud execution
   */
  user: username,
  key: accessKey,
  hostname: 'hub.browserstack.com',
  port: 443,
  path: '/wd/hub',

  /**
   * Test specs
   */
  specs: ['./e2e/mobile/**/*.spec.ts'],
  exclude: [],

  /**
   * Device matrix
   */
  capabilities: getCapabilities(),

  /**
   * Max concurrent sessions (depends on BrowserStack plan)
   */
  maxInstances: parseInt(process.env.MAX_PARALLEL || '5', 10),

  /**
   * Framework
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
    ['junit', {
      outputDir: './test-results/browserstack',
      outputFileFormat: function(options) {
        return `results-${options.cid}.${options.capabilities['bstack:options']?.deviceName || 'device'}.xml`;
      },
    }],
  ],

  /**
   * BrowserStack service
   */
  services: [
    ['browserstack', {
      testObservability: true,
      testObservabilityOptions: {
        projectName: 'Happy Vue Mobile',
        buildName: bstackOptions.buildName,
      },
    }],
  ],

  /**
   * Log level
   */
  logLevel: 'info',

  /**
   * Connection settings
   */
  waitforTimeout: 30000,
  connectionRetryTimeout: 90000,
  connectionRetryCount: 3,

  /**
   * Hooks
   */
  before: async function (_capabilities, _specs) {
    console.log('[BrowserStack] Starting device farm tests...');
    console.log(`[BrowserStack] Build: ${bstackOptions.buildName}`);
  },

  beforeTest: async function (test) {
    console.log(`[BrowserStack] Running: ${test.title}`);
  },

  afterTest: async function (test, _context, { error, passed }) {
    // Mark test status in BrowserStack
    const status = passed ? 'passed' : 'failed';
    const reason = error ? error.message : '';

    try {
      await browser.executeScript(
        `browserstack_executor: {"action": "setSessionStatus", "arguments": {"status": "${status}", "reason": "${reason}"}}`
      );
    } catch {
      // BrowserStack executor may not be available in all contexts
    }

    // Take screenshot on failure
    if (error) {
      try {
        await browser.saveScreenshot(`./screenshots/browserstack-${test.title.replace(/\s+/g, '-')}.png`);
      } catch {
        console.log('[BrowserStack] Could not save screenshot');
      }
    }
  },

  after: async function (_result, _capabilities, _specs) {
    console.log('[BrowserStack] Test suite completed');
    console.log(`[BrowserStack] View results at: https://app-automate.browserstack.com/builds`);
  },
};

export default config;
