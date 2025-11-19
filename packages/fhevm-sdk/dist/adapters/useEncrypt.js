/**
 * Wagmi-like hook for encryption operations
 */
import { useState, useCallback } from 'react';
import { createEncryptedInput } from '../core/index.js';
export function useEncrypt() {
    const [isEncrypting, setIsEncrypting] = useState(false);
    const [error, setError] = useState('');
    const encrypt = useCallback(async (contractAddress, userAddress, value) => {
        setIsEncrypting(true);
        setError('');
        try {
            const result = await createEncryptedInput(contractAddress, userAddress, value);
            return result;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Encryption failed');
            throw err;
        }
        finally {
            setIsEncrypting(false);
        }
    }, []);
    return {
        encrypt,
        isEncrypting,
        error,
    };
}
