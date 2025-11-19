/**
 * Wagmi-like hook for wallet connection
 */
export declare function useWallet(): {
    address: string;
    isConnected: boolean;
    chainId: number;
    isConnecting: boolean;
    error: string;
    connect: () => Promise<void>;
    disconnect: () => void;
};
