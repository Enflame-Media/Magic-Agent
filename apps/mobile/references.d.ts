/// <reference types="@nativescript/types" />

// NativeScript-Vue 3 type declarations
declare module 'nativescript-vue' {
  import { App, Component } from 'vue';

  export function createApp(rootComponent: Component): App;
  export function registerElement(
    name: string,
    resolver: () => unknown
  ): void;
}

// Material Components type declarations
declare module '@nativescript-community/ui-material-core' {
  export function installMixins(): void;
  export const themer: {
    setPrimaryColor(color: string): void;
    setAccentColor(color: string): void;
    setSecondaryColor(color: string): void;
  };
}

// Vue SFC declarations
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// Barcode Scanner plugin type declarations
declare module '@aspect/nativescript-barcodescanner' {
  export interface ScanOptions {
    formats?: string;
    message?: string;
    showFlipCameraButton?: boolean;
    showTorchButton?: boolean;
    beepOnScan?: boolean;
    closeCallback?: () => void;
    preferFrontCamera?: boolean;
    torchOn?: boolean;
    resultDisplayDuration?: number;
  }

  export interface ScanResult {
    text: string;
    format: string;
  }

  export class BarcodeScanner {
    available(): Promise<boolean>;
    hasCameraPermission(): Promise<boolean>;
    requestCameraPermission(): Promise<boolean>;
    scan(options?: ScanOptions): Promise<ScanResult>;
    stop(): Promise<void>;
  }
}
