/**
 * Wagmi-like hook for decryption operations
 */
export declare function useDecrypt(): {
    decrypt: (handle: string, contractAddress: string, signer: any) => Promise<number>;
    publicDecrypt: (handle: string) => Promise<number>;
    decryptMultiple: (contractAddress: string, signer: any, handles: string[]) => Promise<{
        cleartexts: string;
        decryptionProof: string;
        values: number[];
    }>;
    isDecrypting: boolean;
    error: string;
};
