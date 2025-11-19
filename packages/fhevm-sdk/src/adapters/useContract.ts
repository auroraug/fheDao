/**
 * Wagmi-like hook for contract interactions
 */

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export function useContract(address: string, abi: any[]) {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!window.ethereum || !address || !abi) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contractInstance = new ethers.Contract(address, abi, provider);
      setContract(contractInstance);
      setIsReady(true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contract setup failed');
      setIsReady(false);
    }
  }, [address, abi]);

  return {
    contract,
    isReady,
    error,
  };
}
