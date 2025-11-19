/**
 * Wagmi-like hook for decryption operations
 */
import { useState, useCallback } from 'react';
import { decryptValue, publicDecrypt, decryptMultipleHandles } from '../core/index.js';
export function useDecrypt() {
    const [isDecrypting, setIsDecrypting] = useState(false);
    const [error, setError] = useState('');
    const decrypt = useCallback(async (handle, contractAddress, signer) => {
        setIsDecrypting(true);
        setError('');
        try {
            const result = await decryptValue(handle, contractAddress, signer);
            return result;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Decryption failed');
            throw err;
        }
        finally {
            setIsDecrypting(false);
        }
    }, []);
    const publicDecryptValue = useCallback(async (handle) => {
        setIsDecrypting(true);
        setError('');
        try {
            const result = await publicDecrypt(handle);
            return result;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Public decryption failed');
            throw err;
        }
        finally {
            setIsDecrypting(false);
        }
    }, []);
    const decryptMultiple = useCallback(async (contractAddress, signer, handles) => {
        setIsDecrypting(true);
        setError('');
        try {
            const result = await decryptMultipleHandles(contractAddress, signer, handles);
            return result;
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Multiple decryption failed');
            throw err;
        }
        finally {
            setIsDecrypting(false);
        }
    }, []);
    return {
        decrypt,
        publicDecrypt: publicDecryptValue,
        decryptMultiple,
        isDecrypting,
        error,
    };
}
