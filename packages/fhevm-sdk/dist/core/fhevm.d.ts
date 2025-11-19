/**
 * Universal FHEVM SDK - Consolidated Instance
 * Complete FHEVM functionality in a single file for NPX packages
 * Includes: FHEVM instance, encryption, and decryption
 * Updated for FHEVM 0.9 with RelayerSDK 0.3.0-5
 */
/**
 * Initialize FHEVM instance
 * Uses CDN for browser environments to avoid bundling issues
 * Updated for RelayerSDK 0.3.0-5 (FHEVM 0.9)
 */
export declare function initializeFheInstance(options?: {
    rpcUrl?: string;
}): Promise<any>;
export declare function getFheInstance(): any;
/**
 * Decrypt a single encrypted value using EIP-712 user decryption (matches showcase API)
 */
export declare function decryptValue(encryptedBytes: string, contractAddress: string, signer: any): Promise<number>;
/**
 * Batch decrypt multiple encrypted values using EIP-712 user decryption
 */
export declare function batchDecryptValues(handles: string[], contractAddress: string, signer: any): Promise<Record<string, number>>;
/**
 * Encrypt values using FHEVM
 *
 * 📝 BIT SIZE SUPPORT:
 * FHEVM supports different bit sizes for encrypted values. If your contract uses a different bit size
 * than the default 32-bit, you can use the appropriate method:
 * - add8(value)   - for 8-bit values (0-255)
 * - add16(value) - for 16-bit values (0-65535)
 * - add32(value) - for 32-bit values (0-4294967295) - DEFAULT
 * - add64(value) - for 64-bit values (0-18446744073709551615)
 * - add128(value) - for 128-bit values
 * - add256(value) - for 256-bit values
 *
 * Example: If your contract expects 8-bit values, replace add32() with add8()
 */
export declare function encryptValue(contractAddress: string, address: string, plainDigits: number[]): Promise<any>;
/**
 * Create encrypted input for contract interaction (matches showcase API)
 */
export declare function createEncryptedInput(contractAddress: string, userAddress: string, value: number): Promise<{
    encryptedData: any;
    proof: any;
}>;
/**
 * Public decryption for a single handle
 * Returns the decrypted number value
 * @param {string} encryptedBytes - Single handle to decrypt
 * @returns {Promise<number>} Decrypted number value
 */
export declare function publicDecrypt(encryptedBytes: string): Promise<number>;
/**
 * Request user decryption with EIP-712 signature
 */
export declare function requestUserDecryption(contractAddress: string, signer: any, ciphertextHandle: string): Promise<number>;
/**
 * Public decryption for multiple handles with proof (for contract callbacks)
 * Returns cleartexts (ABI-encoded), decryption proof, and values array
 * Note: Handles must be made publicly decryptable (via makePubliclyDecryptable) before calling this
 * @param {string} contractAddress - The contract address (kept for compatibility, not used)
 * @param {Object} signer - Ethers signer object (kept for compatibility, not used)
 * @param {string[]} handles - Array of handles to decrypt
 * @returns {Object} { cleartexts: string, decryptionProof: string, values: number[] }
 */
export declare function decryptMultipleHandles(contractAddress: string, signer: any, handles: string[]): Promise<{
    cleartexts: string;
    decryptionProof: string;
    values: number[];
}>;
/**
 * Public decryption for multiple handles (raw result)
 * Returns the raw result from relayer.publicDecrypt()
 * @param {string[]} handles - Array of handles to decrypt
 * @returns {Promise<Object>} Raw result with clearValues, abiEncodedClearValues, decryptionProof
 */
export declare function fetchPublicDecryption(handles: string[]): Promise<any>;
