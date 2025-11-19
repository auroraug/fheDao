/**
 * Node.js Adapter - Universal FHEVM SDK
 * Real server-side FHEVM operations with RPC and private key support
 */
import { ethers } from 'ethers';
export interface FhevmNodeOptions {
    rpcUrl?: string;
    privateKey?: string;
    chainId?: number;
}
/**
 * Enhanced Node.js FHEVM manager with server-side capabilities
 */
export declare class FhevmNode {
    private instance;
    private isReady;
    private provider;
    private wallet;
    private options;
    constructor(options?: FhevmNodeOptions);
    initialize(): Promise<void>;
    encrypt(contractAddress: string, userAddress: string, value: number): Promise<{
        encryptedData: any;
        proof: any;
    }>;
    decrypt(handle: string, contractAddress: string, signer?: any): Promise<number>;
    publicDecrypt(handle: string): Promise<number>;
    decryptMultiple(contractAddress: string, handles: string[], signer?: any): Promise<{
        cleartexts: string;
        decryptionProof: string;
        values: number[];
    }>;
    /**
     * Create a contract instance for server-side interactions
     */
    createContract(address: string, abi: any[]): ethers.Contract;
    /**
     * Execute encrypted transaction
     * Supports both old format (encryptedData, proof) and new FHEVM 0.9.0 format (handles, inputProof)
     */
    executeEncryptedTransaction(contract: ethers.Contract, methodName: string, encryptedData: any, ...additionalParams: any[]): Promise<any>;
    /**
     * Get wallet address
     */
    getAddress(): Promise<string | null>;
    /**
     * Get provider
     */
    getProvider(): ethers.JsonRpcProvider | null;
    /**
     * Get wallet
     */
    getWallet(): ethers.Wallet | null;
    getInstance(): any;
    getStatus(): "idle" | "ready";
    /**
     * Get configuration info
     */
    getConfig(): {
        rpcUrl: string | undefined;
        chainId: number | undefined;
        hasWallet: boolean;
        hasProvider: boolean;
        isReady: boolean;
    };
}
