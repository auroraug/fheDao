/**
 * FHEVM Contract Interactions - Universal SDK
 * Simple contract wrapper using your working implementation
 */

import { ethers } from 'ethers';
import { createEncryptedInput } from './fhevm.js';

export class FhevmContract {
  private contract: ethers.Contract;
  private address: string;

  constructor(contract: ethers.Contract, address: string) {
    this.contract = contract;
    this.address = address;
  }

  /**
   * Encrypt and call contract function
   */
  async encryptAndCall(
    functionName: string,
    encryptedParams: any,
    ...additionalParams: any[]
  ): Promise<ethers.ContractTransactionResponse> {
    return this.contract[functionName](encryptedParams.encryptedData, encryptedParams.proof, ...additionalParams);
  }

  /**
   * Encrypt and call with wait
   */
  async encryptAndCallAndWait(
    functionName: string,
    encryptedParams: any,
    ...additionalParams: any[]
  ): Promise<ethers.TransactionReceipt> {
    const tx = await this.encryptAndCall(functionName, encryptedParams, ...additionalParams);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction receipt is null");
    }
    return receipt;
  }

  /**
   * Create encrypted input for contract
   */
  async createEncryptedInput(userAddress: string, value: number) {
    return createEncryptedInput(this.address, userAddress, value);
  }
}
