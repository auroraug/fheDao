"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
// import { useWallet, useFhevm, useContract } from '@fhevm-sdk'
import { ethers } from "ethers";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract } from "wagmi";
import { merkleTreeExample, defaultAddresses } from "../../../hardhat/utils/merkleTree-example";

/**
 * useFHECounterWagmi - Minimal FHE Counter hook for Wagmi devs
 *
 * What it does:
 * - Reads the current encrypted counter
 * - Decrypts the handle on-demand with useFHEDecrypt
 * - Encrypts inputs and writes increment/decrement
 *
 * Pass your FHEVM instance and a simple key-value storage for the decryption signature.
 * That's it. Everything else is handled for you.
 */
export const useFHEDaoWagmi = (parameters: {
  instance: any;
  initialSepoliaChain?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialSepoliaChain } = parameters;

  // Wagmi + ethers interop
  const { chainId, accounts, isConnected, ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialSepoliaChain);

  // Resolve deployed contract info once we know the chain
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: DAO } = useDeployedContractInfo({ contractName: "DAO", chainId: allowedChainId });

  // Simple status string for UX messages
  const [message, setMessage] = useState<string>("");

  type DAOInfo = Contract<"DAO"> & { chainId?: number };

  const isRefreshing = false as unknown as boolean; // derived from wagmi below

  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // -------------
  // Helpers
  // -------------
  const hasContract = Boolean(DAO?.address && DAO?.abi);
  const hasProvider = Boolean(ethersReadonlyProvider);
  const hasSigner = Boolean(ethersSigner);

  function generateMerkleRoot(address: string): string|null {
    let merkleRoot;
    if (!defaultAddresses.includes(address)) {
      merkleTreeExample.generateMerkleTree([...defaultAddresses, address]);
      merkleRoot = merkleTreeExample.getMerkleRoot();
    } else merkleRoot = merkleTreeExample.getMerkleRoot();
    return merkleRoot;
  }

  const getContract = (mode: "read" | "write") => {
    if (!hasContract) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      DAO!.address,
      (DAO as DAOInfo).abi,
      providerOrSigner,
    );
  };

  // Read proposal count via wagmi
  const readProposalId = useReadContract({
    address: (hasContract ? (DAO!.address as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContract ? ((DAO as DAOInfo).abi as any) : undefined) as any,
    functionName: "proposalId" as const,
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });
  const proposalCount = useMemo(() => (readProposalId.data as number), [readProposalId.data]);

  const readProposalAddress = useReadContract({
    address: (hasContract ? (DAO!.address as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContract ? ((DAO as DAOInfo).abi as any) : undefined) as any,
    functionName: "proposal" as const,
    args: [proposalCount],
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });
  const proposalAddress = useMemo(() => (readProposalAddress.data as string | undefined) ?? undefined, [readProposalAddress.data]);

  const readMerkleRoot = useReadContract({
    address: (hasContract ? (DAO!.address as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContract ? ((DAO as DAOInfo).abi as any) : undefined) as any,
    functionName: "merkleRoot" as const,
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });
  const merkleRoot = useMemo(() => (readMerkleRoot.data as string | undefined) ?? undefined, [readMerkleRoot.data]);
  
  const canGetProposalCount = Boolean(hasContract && hasProvider && !readProposalId.isFetching);

  const refreshProposalCount = useCallback(async () => {
    const res1 = await readProposalId.refetch();
    if (res1.error) setMessage("DAO.proposalId() failed: " + (res1.error as Error).message);
  }, [readProposalId]);

  const canCreateProposal = useMemo(
    () => Boolean(hasContract && instance && hasSigner && !isProcessing),
    [hasContract, instance, hasSigner, isProcessing],
  );

  const queryProposal = (proposalId: number) => useReadContract({
    address: (hasContract ? (DAO!.address as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContract ? ((DAO as DAOInfo).abi as any) : undefined) as any,
    functionName: "proposal" as const,
    args: [proposalId],
    query: {
      enabled: Boolean(hasContract && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const updateMerkleRoot = useCallback(
    async (merkleRoot: string) => {
      try {
        if (isProcessing || !canCreateProposal) return;
        setIsProcessing(true);
        setMessage(`Starting updateMerkleRoot(${merkleRoot})...`);
        const writeContract = getContract("write");
        if (!writeContract) return setMessage("Contract info or signer not available");
        const tx = await writeContract.updateMerkleRoot(merkleRoot);
        setMessage("Waiting for transaction...");
        await tx.wait();
        await readMerkleRoot.refetch();
        setMessage(`merkleRoot: ${merkleRoot} completed!`);
      } catch (e) {
        setMessage(`updateMerkleRoot failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, canCreateProposal, getContract, DAO?.address],
  );

  const createProposal = useCallback(
    async (
        callerAddress: string, 
        description: string, 
        votingPeriod: number, 
        target: string,
        value: number,
        calldata: string
    ) => {
      console.log('callerAddress',callerAddress)  
      console.log('description',description)
      console.log('votingPeriod',votingPeriod)
      console.log('target',target)
      console.log('value',value)
      calldata = calldata.slice(2) === '0x'? calldata:`0x${calldata}`;
      console.log('calldata',calldata)
      console.log('proposalId',proposalCount)

      if (isProcessing || !canCreateProposal || !ethers.isAddress(callerAddress)) return;
      setIsProcessing(true);
      setMessage(`Starting createProposal(${description})...`);
      let proof: string[] = [];
      if (!defaultAddresses.includes(callerAddress)) {
        merkleTreeExample.generateMerkleTree([...defaultAddresses, callerAddress]);
        proof = merkleTreeExample.getProof(callerAddress);
      } else proof = merkleTreeExample.getProof(callerAddress);
      try {
        const writeContract = getContract("write");
        if (!writeContract) return setMessage("Contract info or signer not available");
        // const params = buildParamsFromAbi([proof, description, votingPeriod, target, value, calldata], [...DAO!.abi] as any[], "createProposal");
        const tx = await writeContract.createProposal(...[proof, description, votingPeriod * 60, target, value, calldata]);
        setMessage("Waiting for transaction...");
        await tx.wait();
        setMessage(`proposal: (${description}) completed!`);
        refreshProposalCount();
      } catch (e) {
        setMessage(`createProposal failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, canCreateProposal, getContract, refreshProposalCount, DAO?.address],
  );

  return {
    contractAddress: DAO?.address,
    canGetProposalCount,
    canCreateProposal,
    merkleRoot,
    generateMerkleRoot,
    queryProposal,
    updateMerkleRoot,
    createProposal,
    refreshProposalCount,
    message,
    proposalCount: proposalCount? proposalCount : undefined,
    isRefreshing,
    isProcessing,
    // Wagmi-specific values
    chainId,
    accounts,
    isConnected,
    ethersSigner,
  };
};
