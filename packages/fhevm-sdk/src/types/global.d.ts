// Global type declarations for the SDK

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      isConnected?: () => boolean;
    };
  }
}

// SDK module declarations
declare module '@zama-fhe/relayer-sdk/bundle' {
  export function initSDK(): Promise<void>;
  export function createInstance(config: any): Promise<any>;
  export const SepoliaConfig: any;
}

// Vue module declaration (optional)
declare module 'vue' {
  export function ref<T>(value: T): { value: T };
  export function computed<T>(fn: () => T): { value: T };
  export function onUnmounted(fn: () => void): void;
  export function watch<T>(source: () => T, callback: (newValue: T, oldValue: T) => void, options?: any): void;
}

export {};
