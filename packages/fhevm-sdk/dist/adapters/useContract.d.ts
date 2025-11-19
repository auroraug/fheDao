/**
 * Wagmi-like hook for contract interactions
 */
import { ethers } from 'ethers';
export declare function useContract(address: string, abi: any[]): {
    contract: ethers.Contract | null;
    isReady: boolean;
    error: string;
};
