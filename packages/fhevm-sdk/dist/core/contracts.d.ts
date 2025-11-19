/**
 * FHEVM Contract Interactions - Universal SDK
 * Simple contract wrapper using your working implementation
 */
import { ethers } from 'ethers';
export declare class FhevmContract {
    private contract;
    private address;
    constructor(contract: ethers.Contract, address: string);
    /**
     * Encrypt and call contract function
     */
    encryptAndCall(functionName: string, encryptedParams: any, ...additionalParams: any[]): Promise<ethers.ContractTransactionResponse>;
    /**
     * Encrypt and call with wait
     */
    encryptAndCallAndWait(functionName: string, encryptedParams: any, ...additionalParams: any[]): Promise<ethers.TransactionReceipt>;
    /**
     * Create encrypted input for contract
     */
    createEncryptedInput(userAddress: string, value: number): Promise<{
        encryptedData: any;
        proof: any;
    }>;
}
