import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Linking, Platform } from 'react-native';

/**
 * Opens a URL in the appropriate browser.
 * On native platforms, uses the in-app browser for a better UX.
 * On web, opens in a new tab.
 *
 * @param url The URL to open
 * @returns Promise that resolves when the browser is opened
 */
export async function openExternalUrl(url: string): Promise<void> {
    if (Platform.OS === 'web') {
    // On web, open in a new tab
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  } else {
    // On native, use the in-app browser for better UX
    await WebBrowser.openBrowserAsync(url);
  }
}

/**
 * ExternalLink - A Link component that opens URLs in an in-app browser on native platforms.
 *
 * This provides a better user experience than opening the default browser app,
 * as users can easily return to the app after viewing the link.
 */
export function ExternalLink(
  props: Omit<React.ComponentProps<typeof Link>, 'href'> & { href: string }
) {
  return (
    <Link
      target="_blank"
      {...props}
      href={props.href as any}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          e.preventDefault();
          // Open the link in an in-app browser.
          WebBrowser.openBrowserAsync(props.href as string);
        }
      }}
    />
  );
}
