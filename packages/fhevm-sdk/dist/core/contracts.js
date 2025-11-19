/**
 * FHEVM Contract Interactions - Universal SDK
 * Simple contract wrapper using your working implementation
 */
import { createEncryptedInput } from './fhevm.js';
export class FhevmContract {
    constructor(contract, address) {
        this.contract = contract;
        this.address = address;
    }
    /**
     * Encrypt and call contract function
     */
    async encryptAndCall(functionName, encryptedParams, ...additionalParams) {
        return this.contract[functionName](encryptedParams.encryptedData, encryptedParams.proof, ...additionalParams);
    }
    /**
     * Encrypt and call with wait
     */
    async encryptAndCallAndWait(functionName, encryptedParams, ...additionalParams) {
        const tx = await this.encryptAndCall(functionName, encryptedParams, ...additionalParams);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("Transaction receipt is null");
        }
        return receipt;
    }
    /**
     * Create encrypted input for contract
     */
    async createEncryptedInput(userAddress, value) {
        return createEncryptedInput(this.address, userAddress, value);
    }
}
