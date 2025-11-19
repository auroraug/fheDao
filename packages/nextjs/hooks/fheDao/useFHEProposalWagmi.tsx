"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDeployedContractInfo } from "../helper";
import { useWagmiEthers } from "../wagmi/useWagmiEthers";
import { useFhevm, encryptValue } from "@fhevm-sdk";
import { ethers } from "ethers";
import type { Contract } from "~~/utils/helper/contract";
import type { AllowedChainIds } from "~~/utils/helper/networks";
import { useReadContract } from "wagmi";
import ProposalJson from "../../../hardhat/artifacts/contracts/Proposal.sol/Proposal.json";
import { merkleTreeExample } from "../../../hardhat/utils/merkleTree-example";
import { encodeUint8ArraysToString, decodeStringToUint8Arrays } from "../../../hardhat/utils/encryptedData";

const proposalAbi = ProposalJson.abi;

type RawProposalInfo = [
  number,     // _proposalId
  string,     // _description
  bigint,     // _commitEnd
  bigint,     // _revealEnd
  string,     // _target
  bigint,     // _value
  string      // _calldata
];

type RawProposalStatus = [
  boolean,    // _canCommit
  boolean,    // _canReveal
  boolean,    // _executed
  boolean,    // _decrypted
  boolean,    // _isActived
  boolean     // _isApproved
];

interface ProposalInfo {
  proposalId: number;
  description: string;
  commitEnd: bigint;
  revealEnd: bigint;
  target: string;
  value: bigint;
  calldata: string;
}

interface ProposalStatus {
  canCommit: boolean;
  canReveal: boolean;
  executed: boolean;
  decrypted: boolean;
  isActived: boolean;
  isApproved: boolean;
}

function transformProposalInfo(data: RawProposalInfo): ProposalInfo {
  return {
    proposalId: data[0],
    description: data[1],
    commitEnd: data[2],
    revealEnd: data[3],
    target: data[4],
    value: data[5],
    calldata: data[6]
  };
}

function transformProposalStatus(data: RawProposalStatus): ProposalStatus {
  return {
    canCommit: data[0],
    canReveal: data[1],
    executed: data[2],
    decrypted: data[3],
    isActived: data[4],
    isApproved: data[5]
  };
}

function uint8ArrayToBytes32(uint8Array: Uint8Array): string {
    if (uint8Array.length > 32) {
        throw new Error('Uint8Array length exceeds 32 bytes');
    }
    const hexString = ethers.hexlify(uint8Array);
    return ethers.zeroPadValue(hexString, 32);
}
/**
 * useFHECounterWagmi - Minimal FHE Counter hook for Wagmi devs
 *
 * What it does:
 * - Reads the initialized proposal status
 * - Encrypts inputs and writes commitVote/revealVote
 * - Decrypts the encrypted votes and executes the proposal
 *
 * Pass your FHEVM instance and a simple key-value storage for the decryption signature.
 * That's it. Everything else is handled for you.
 */
export const useFHEProposalWagmi = (parameters: {
  instance: any;
  initialSepoliaChain?: Readonly<Record<number, string>>;
}) => {
  const { instance, initialSepoliaChain } = parameters;
  
  const [contractAddress, setContractAddress] = useState<string>();
  // Wagmi + ethers interop
  const { chainId, accounts, isConnected, ethersProvider ,ethersReadonlyProvider, ethersSigner } = useWagmiEthers(initialSepoliaChain);

  // Resolve deployed contract info once we know the chain
  const allowedChainId = typeof chainId === "number" ? (chainId as AllowedChainIds) : undefined;
  const { data: DAO } = useDeployedContractInfo({ contractName: "DAO", chainId: allowedChainId });

  // Simple status string for UX messages
  const [proposalMessage, setProposalMessage] = useState<string>("");

  type DAOInfo = Contract<"DAO"> & { chainId?: number };

  const isRefreshing = false as unknown as boolean; // derived from wagmi below
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [encryptedInput, setEncryptedInput] = useState<any>();

  // -------------
  // Helpers
  // -------------
  const hasContractAbi = Boolean(proposalAbi);
  const hasProvider = Boolean(ethersReadonlyProvider);
  const hasSigner = Boolean(ethersSigner);

  const getContract = (mode: "read" | "write") => {
    if (!hasContractAbi || !contractAddress) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      contractAddress,
      proposalAbi,
      providerOrSigner,
    );
  };

  const getDaoContract = (mode: "read" | "write") => {
    if (!DAO?.address || !DAO?.abi || !hasProvider) return undefined;
    const providerOrSigner = mode === "read" ? ethersReadonlyProvider : ethersSigner;
    if (!providerOrSigner) return undefined;
    return new ethers.Contract(
      DAO.address,
      (DAO as DAOInfo).abi,
      providerOrSigner,
    );
  };

  // Read count handle via wagmi
  const readProposalInfo = useReadContract({
    address: (hasContractAbi ? (contractAddress as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContractAbi ? (proposalAbi as any) : undefined) as any,
    functionName: "getProposalInfo" as const,
    query: {
      enabled: Boolean(hasContractAbi && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const readProposalStatus = useReadContract({
    address: (hasContractAbi ? (contractAddress as unknown as `0x${string}`) : undefined) as
      | `0x${string}`
      | undefined,
    abi: (hasContractAbi ? (proposalAbi as any) : undefined) as any,
    functionName: "getProposalStatus" as const,
    query: {
      enabled: Boolean(hasContractAbi && hasProvider),
      refetchOnWindowFocus: false,
    },
  });

  const proposalInfo = useMemo(() => {
    if (!readProposalInfo.data) return undefined;
    return transformProposalInfo(readProposalInfo.data as RawProposalInfo);
  }, [readProposalInfo.data]);

  const proposalStatus = useMemo(() => {
    if (!readProposalStatus.data) return undefined;
    return transformProposalStatus(readProposalStatus.data as RawProposalStatus);
  }, [readProposalStatus.data]);

  const refreshProposal  = useCallback(async (contractAddressOrId: string) => {
    if (!DAO || !hasProvider) return;
    console.log('Dao address',DAO.address)
    try {
      setIsProcessing(true);
      if (contractAddressOrId.startsWith("0x")) {
        setContractAddress(contractAddressOrId);
      } else {
        const readContract = getDaoContract("read");
        const contractAddress = await readContract.proposal(...[Number(contractAddressOrId)]);
        setContractAddress(contractAddress);
      }
      const res1 = await readProposalInfo.refetch();
      const res2 = await readProposalStatus.refetch();
      console.log(res1)
      console.log(res2)
      if (res1.error) setProposalMessage("Proposal.getProposalInfo() failed: " + (res1.error as Error).message);
      if (res2.error) setProposalMessage("Proposal.getProposalStatus() failed: " + (res2.error as Error).message);
    } catch (e) {
      setProposalMessage("Proposal.proposalId() failed: " + (e as Error).message);
    } finally {
      setIsProcessing(false);
    }
  }, [readProposalInfo, readProposalStatus, contractAddress]);
  // derive isRefreshing from wagmi
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _derivedIsRefreshing = readProposalInfo.isFetching;

//   useEffect(() => {
//     if (decMsg) setMessage(decMsg);
//   }, [decMsg]);

  const commitVote = useCallback(
    async (value: number) => {
      console.log('value', value)
      console.log('isProcessing', isProcessing)
      console.log('ethersSigner', ethersSigner)
      if (isProcessing|| !(value === 0 || value === 1) || !contractAddress || !hasSigner) return;
      setIsProcessing(true);
      setProposalMessage(`Starting commitVote(${value})...`);
      try {
        const ciphertextBlob = await encryptValue(contractAddress, ethersSigner.address, [value]);
        console.log('ciphertextBlob', ciphertextBlob)
        setEncryptedInput(ciphertextBlob)
        const salt = ethers.keccak256(ethers.toUtf8Bytes(ethersSigner.address));
        const commitment = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(ciphertextBlob.handles[0]), salt]);
        const proof = merkleTreeExample.getProof(ethersSigner.address);
        console.log('commitment', commitment)
        
        const writeContract = getContract("write");
        if (!writeContract) return setProposalMessage("Contract info or signer not available");

        const tx = await writeContract.commitVote(...[proof, commitment]);
        setProposalMessage("Waiting for transaction...");
        await tx.wait();
        setProposalMessage(`commitVote(${value}) completed! Please Save your Reveal data before the Page refresh: ${encodeUint8ArraysToString(ciphertextBlob.handles[0], ciphertextBlob.inputProof)}`);
        readProposalStatus.refetch();
      } catch (e) {
        setProposalMessage(`commitVote(${value}) failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, contractAddress, proposalMessage, encryptedInput, proposalAbi, instance, readProposalStatus],
  );

  const revealVote = useCallback(
    async (value: number | string) => {
      if (isProcessing || !contractAddress || !hasSigner) return;
      setIsProcessing(true);
      setProposalMessage(`Starting revealVote(${value})...`);
      try {
        const input = encryptedInput;
        console.log('input', input)
        const externalUint32Value = (!input && typeof value === 'string') ? decodeStringToUint8Arrays(value)[0] : input.handles[0];
        const inputProof = (!input && typeof value === 'string') ? decodeStringToUint8Arrays(value)[0] : input.inputProof; 
        const salt = ethers.keccak256(ethers.toUtf8Bytes(ethersSigner.address));

        const writeContract = getContract("write");
        if (!writeContract) return setProposalMessage("Contract info or signer not available");
        const tx = await writeContract.revealVote(...[uint8ArrayToBytes32(externalUint32Value), salt, inputProof]);
        setProposalMessage("Waiting for transaction...");
        await tx.wait();
        setProposalMessage(`revealVote(${uint8ArrayToBytes32(externalUint32Value)}) completed!`);
        readProposalStatus.refetch();
      } catch (e) {
        setProposalMessage(`revealVote(${value}) failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, contractAddress, proposalMessage, encryptedInput, proposalAbi, readProposalStatus],
  );

  const decryptResult = useCallback(
    async () => {
      if (isProcessing || !contractAddress || !hasSigner) return;
        
      setIsProcessing(true);
      setProposalMessage(`Starting decryptResult()...`);
      try {
        const readContract = getContract("read");
        const data = await readContract.getEncryptedVotes();
        const encryptedYesVotes = data[0];
        const encryptedNoVotes = data[1];
        console.log('encryptedYesVotes', encryptedYesVotes)
        console.log('encryptedNoVotes', encryptedNoVotes)

        const publicDecryptResults = await instance.publicDecrypt([encryptedYesVotes, encryptedNoVotes]);
        const abiEncodedResult = publicDecryptResults.abiEncodedClearValues;
        const decryptionProof = publicDecryptResults.decryptionProof;
        
        const writeContract = getContract("write");
        if (!writeContract) return setProposalMessage("Contract info or signer not available");

        // const params = buildParamsFromAbi(enc, [...fheCounter!.abi] as any[], op);
        const tx = await writeContract.decryptResult(...[abiEncodedResult, decryptionProof]);
        setProposalMessage("Waiting for transaction...");
        await tx.wait();
        setProposalMessage(`decryptResult() completed!`);
        readProposalStatus.refetch();
      } catch (e) {
        setProposalMessage(`decryptResult() failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, contractAddress, proposalMessage, proposalAbi, instance, readProposalStatus],
  );

  const executeProposal = useCallback(
    async () => {
      if (isProcessing || !contractAddress || !hasSigner) return;
        
      setIsProcessing(true);
      setProposalMessage(`Starting executeProposal()...`);
      try {
        const writeContract = getContract("write");
        const tx = await writeContract.execute();
        setProposalMessage("Waiting for transaction...");
        await tx.wait();
        setProposalMessage(`executeProposal() completed!`);
        readProposalStatus.refetch();
      } catch (e) {
        setProposalMessage(`executeProposal() failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, contractAddress, proposalMessage, proposalAbi, readProposalStatus],
  );

  return {
    contractAddress,
    proposalInfo,
    proposalStatus,
    commitVote,
    revealVote,
    refreshProposal,
    decryptResult,
    executeProposal,
    proposalMessage,
    
    isRefreshing,
    isProcessing,
    // Wagmi-specific values
    chainId,
    accounts,
    isConnected,
    ethersSigner,
  };
};
