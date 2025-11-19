/**
 * Wagmi-like hook for FHEVM instance
 */
export declare function useFhevm(): {
    instance: any;
    status: "error" | "idle" | "loading" | "ready";
    error: string;
    initialize: () => Promise<void>;
    isInitialized: boolean;
};
