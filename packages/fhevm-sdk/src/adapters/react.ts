/**
 * React Adapter - Universal FHEVM SDK
 * Wagmi-like React hooks for FHEVM operations
 * 
 * This file re-exports all React hooks from individual files for a clean structure.
 */

// Import and re-export all individual hooks
export { useWallet } from './useWallet.js';
export { useFhevm } from './useFhevm.js';
export { useContract } from './useContract.js';
export { useDecrypt } from './useDecrypt.js';
export { useEncrypt } from './useEncrypt.js';
