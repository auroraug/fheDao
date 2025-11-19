/**
 * Wagmi-like hook for FHEVM instance
 */
import { useState, useCallback } from 'react';
import { initializeFheInstance } from '../core/index.js';
export function useFhevm() {
    const [instance, setInstance] = useState(null);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const initialize = useCallback(async () => {
        setStatus('loading');
        setError('');
        try {
            console.log('Initializing FHEVM instance...');
            const fheInstance = await initializeFheInstance();
            setInstance(fheInstance);
            setStatus('ready');
            console.log('✅ FHEVM initialized');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setStatus('error');
            console.error('❌ FHEVM initialization failed:', err);
        }
    }, []);
    return {
        instance,
        status,
        error,
        initialize,
        isInitialized: status === 'ready',
    };
}
