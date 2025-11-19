"use client";

import { useEffect, useMemo, useState } from "react";
import { useFhevm } from "@fhevm-sdk";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/helper/RainbowKitCustomConnectButton";
import { useFHEDaoWagmi } from "~~/hooks/fheDao/useFHEDaoWagmi";
import { useFHEProposalWagmi } from "~~/hooks/fheDao/useFHEProposalWagmi";

function timestampToUTC(timestamp: bigint | number): string {
  if (typeof timestamp === 'bigint') {
    return new Date(Number(timestamp) * 1000).toUTCString().split(',')[1];
  } else {
    return new Date(timestamp * 1000).toUTCString().split(',')[1];
  }
}
/*
 * Main FHECounter React component with 3 buttons
 *  - "Decrypt" button: allows you to decrypt the current FHECounter count handle.
 *  - "Increment" button: allows you to increment the FHECounter count handle using FHE operations.
 *  - "Decrement" button: allows you to decrement the FHECounter count handle using FHE operations.
 */
export const FHEDaoDemo = () => {
  const { address, isConnected, chain } = useAccount();
  const chainId = chain?.id;

  // Create EIP-1193 provider from wagmi for FHEVM
  const provider = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    // Get the wallet provider from window.ethereum
    return (window as any).ethereum;
  }, []);

  const initialMockChains = { 31337: "http://localhost:8545" };
  const initialSepoliaChain = { 11155111: "https://ethereum-sepolia-rpc.publicnode.com" };

  const {
    instance: fhevmInstance,
    initialize: initializeFhevm,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm();

    // Create Proposal form state
  const [createForm, setCreateForm] = useState({
    description: '',
    votingPeriod: 0,
    target: '',
    value: '',
    calldata: '',
  });
  const [merkleRoot, setMerkleRoot] = useState('');
  const [merkleRootRes, setMerkleRootRes] = useState('');
  const [proposalAddress, setProposalAddress] = useState('');
  const [commitValue, setCommitValue] = useState<number>(0);
  const [revealValue, setRevealValue] = useState<string>('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Create Proposal:', createForm);
    console.log('Caller:', address);
    
    // TODO: Backend integration
    if (!isConnected || !address) return;
    const formattedValue = Number(createForm.value) * 1e18;
    fheDAO.createProposal(
      address,
      createForm.description,
      createForm.votingPeriod,
      createForm.target,
      formattedValue,
      createForm.calldata,
    );
  };

  const handleGenerateMerkleRoot = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Address:', address);
    // TODO: Backend integration
    if (!isConnected || !address) return;
    const merkleRoot = fheDAO.generateMerkleRoot(address);
    if (!merkleRoot) return;
    setMerkleRootRes(merkleRoot);
  };

  const handleMerkleRootSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Merkle Root:', merkleRoot);
    console.log('Caller:', address);
    // TODO: Backend integration
    if (!isConnected || !address) return;
    fheDAO.updateMerkleRoot(merkleRoot);
  };

  const handleProposalCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Commit:', commitValue);
    console.log('Caller:', address);
    // TODO: Backend integration
    if (!isConnected || !address) return;
    fheProposal.commitVote(commitValue);
  };

  const handleProposalReveal = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Reveal:', revealValue);
    console.log('Caller:', address);
    // TODO: Backend integration
    if (!isConnected || !address) return;
    if (Number(revealValue) === 0 || Number(revealValue) === 1) {
      fheProposal.revealVote(Number(revealValue));
    } else {
      fheProposal.revealVote(revealValue);
    }
  };

  const handleProposalDecrypt = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Decrypt Proposal:', proposalAddress);
    console.log('Caller:', address);
    // TODO: Backend integration
    if (!isConnected || !address) return;
    fheProposal.decryptResult();
  };

  const handleProposalExecute = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Execute Proposal:', proposalAddress);
    console.log('Caller:', address);
    // TODO: Backend integration
    if (!isConnected || !address) return;
    fheProposal.executeProposal();
  };

  const refreshProposalContractAddress = () => {
    // const contractAddress = await fheDAO.queryProposal(proposalId).data as string;
    fheProposal.refreshProposal(proposalAddress);
    // console.log('Proposal Address:', fheProposal.proposalAddress);
    // console.log('Proposal ID:', fheProposal.proposalId);
    // console.log('Description:', fheProposal.description);
  };
  //////////////////////////////////////////////////////////////////////////////
  // useFHECounter is a custom hook containing all the FHECounter logic, including
  // - calling the FHECounter contract
  // - encrypting FHE inputs
  // - decrypting FHE handles
  //////////////////////////////////////////////////////////////////////////////

  const fheDAO = useFHEDaoWagmi({
    instance: fhevmInstance,
    initialSepoliaChain,
  });

  const fheProposal = useFHEProposalWagmi({
    instance: fhevmInstance,
    initialSepoliaChain,
  });

  useEffect(() => {
    if (isConnected && fhevmStatus === 'idle') {
      initializeFhevm();
    }
  }, [isConnected, fhevmStatus, initializeFhevm]);
  //////////////////////////////////////////////////////////////////////////////
  // UI Stuff:
  // --------
  // A basic page containing
  // - A bunch of debug values allowing you to better visualize the React state
  // - 1x "Decrypt" button (to decrypt the latest FHECounter count handle)
  // - 1x "Increment" button (to increment the FHECounter)
  // - 1x "Decrement" button (to decrement the FHECounter)
  //////////////////////////////////////////////////////////////////////////////

  const buttonClass =
    "inline-flex items-center justify-center px-6 py-3 font-semibold shadow-lg " +
    "transition-all duration-200 hover:scale-105 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

  // Primary (accent) button — #FFD208 with dark text and warm hover #A38025
  const primaryButtonClass =
    buttonClass +
    " bg-[#FFD208] text-[#2D2D2D] hover:bg-[#A38025] focus-visible:ring-[#2D2D2D]  cursor-pointer";

  // Secondary (neutral dark) button — #2D2D2D with light text and accent focus
  const secondaryButtonClass =
    buttonClass +
    " bg-black text-[#F4F4F4] hover:bg-[#1F1F1F] focus-visible:ring-[#FFD208] cursor-pointer";

  // Success/confirmed state — deeper gold #A38025 with dark text
  const successButtonClass =
    buttonClass +
    " bg-[#A38025] text-[#2D2D2D] hover:bg-[#8F6E1E] focus-visible:ring-[#2D2D2D]";

  const titleClass = "font-bold text-gray-900 text-xl mb-4 border-b-1 border-gray-700 pb-2";
  const sectionClass = "bg-[#f4f4f4] shadow-lg p-6 mb-6 text-gray-900";

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-gray-900">
        <div className="flex items-center justify-center">
          <div className="bg-white bordershadow-xl p-8 text-center">
            <div className="mb-4">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-900/30 text-amber-400 text-3xl">
                ⚠️
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Wallet not connected</h2>
            <p className="text-gray-700 mb-6">Connect your wallet to use the FHE Counter demo.</p>
            <div className="flex items-center justify-center">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 text-gray-900">
      {/* Header */}
      <div className="text-center mb-8 text-black">
        <h1 className="text-3xl font-bold mb-2">FHEDao Demo (Sepolia)</h1>
        <p className="text-gray-600">Interact with the Fully Homomorphic Encryption Dao and Proposal contract</p>
      </div>

      {/* Messages */}
      {fheDAO.message && (
        <div className={sectionClass}>
          <h3 className={titleClass}>💬 Messages</h3>
          <div className="border bg-white border-gray-200 p-4 break-words">
            <p className="text-gray-800 text-sm">{fheProposal.proposalMessage}</p>
          </div>
        </div>
      )}

      {/* Count Handle Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionClass}>
          {/* <button
            className={secondaryButtonClass}
            onClick={initializeFhevm}
          >initial
          </button> */}
            <button
            className={primaryButtonClass}
            disabled={!fheDAO.canCreateProposal}
            onClick={handleCreateSubmit}
          >
            {fheDAO.canCreateProposal
              ? "➕ Create Proposal"
              : fheDAO.isProcessing
                ? "⏳ Processing..."
                : "❌ Cannot create proposal"}
          </button>
          <h3 className={titleClass}></h3>
          <form onSubmit={handleCreateSubmit} className="space-y-6">

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-semibold">
                Description
              </label>
              <textarea
                id="description"
                placeholder="Describe the proposal and its intended outcome..."
                value={createForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCreateForm({ ...createForm, description: e.target.value })
                }
                className="min-h-[100px] bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 w-full rounded-md p-2"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="votingPeriod" className="text-sm font-semibold">
                  Voting Period (minutes)
                </label>
                <p className="text-xs text-muted-foreground">Duration in minutes</p>
                <input
                  id="votingPeriod"
                  type="number"
                  placeholder="2"
                  value={createForm.votingPeriod}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm({ ...createForm, votingPeriod: Number(e.target.value) })
                  }
                  className="bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 rounded-md p-2"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="value" className="text-sm font-semibold">
                  Value (Ether)
                </label>
                <p className="text-xs text-muted-foreground">ETH value to send</p>
                <input
                  id="value"
                  type="text"
                  placeholder="0"
                  value={createForm.value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm({ ...createForm, value: e.target.value })
                  }
                  className="bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 rounded-md p-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="target" className="text-sm font-semibold">
                Target (evm address)
              </label>
              <input
                id="target"
                placeholder="0x1234567890abcdef1234567890abcdef12345678"
                value={createForm.target}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm({ ...createForm, target: e.target.value })
                }
                className="w-full font-mono text-sm bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 rounded-md p-2"
              />
              <p className="text-xs text-muted-foreground">Destination address to call</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="calldata" className="text-sm font-semibold">
                Calldata (bytes)
              </label>
              <textarea
                id="calldata"
                placeholder="0x..."
                value={createForm.calldata}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCreateForm({ ...createForm, calldata: e.target.value })
                }
                className="font-mono text-sm min-h-[80px] bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 w-full rounded-md p-2"
              />
              <p className="text-xs text-muted-foreground">Encoded function call data</p>
            </div>
          </form>
          <h3 className={titleClass}></h3>
          <div className="space-y-3">
            <label htmlFor="merkleRoot" className="text-sm font-semibold">
                Merkle Root:
              </label>
            <p className="text-xs text-muted-foreground text-gray-900 bg-gray-100 px-2 py-1 border border-gray-300 w-full break-all">{fheDAO.merkleRoot}</p>
          </div>
          <textarea
              id="merkleRoot"
              placeholder="0x..."
              value={merkleRoot}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setMerkleRoot(e.target.value)
              }
              className="font-mono text-sm min-h-[80px] bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 w-full rounded-md p-2"
            />
          <button
            className={primaryButtonClass}
            disabled={!fheDAO.canCreateProposal}
            onClick={handleMerkleRootSubmit}
          > Update Merkle Root
          </button>
          <p className="text-xs text-muted-foreground"></p>
          <h3 className={titleClass}></h3>
          <div className="space-y-3">
            <label htmlFor="merkleRoot" className="text-sm font-semibold">
                Merkle Tree Tool
              </label>
            <p className="text-xs text-muted-foreground">Generate Merkle Root from connected address</p>
              <button
                className={primaryButtonClass}
                onClick={handleGenerateMerkleRoot}
              > Generate Merkle Root
              </button>
            <p className="text-xs text-muted-foreground"></p>

              <label htmlFor="merkleRoot" className="text-sm font-semibold">
                Result:
              </label>
              <p className="text-xs text-muted-foreground text-gray-900 bg-gray-100 px-2 py-1 border border-gray-300 w-full break-all">{merkleRootRes}</p>
          </div>
        </div>
        <div className={sectionClass}>
          <h3 className={titleClass}>Proposal Count: {fheDAO.proposalCount !== undefined ? fheDAO.proposalCount-1 : "undefined"}</h3>
          <div className="space-y-3">
            {/* {printProperty("Total Proposal created", )} */}
          </div>
          <p className="text-xs text-muted-foreground">Enter Index of Proposal[Index start from 1] or Address to search</p>
          <div className="flex items-center gap-2">
            <input
              id="proposalAddress"
              type="text"
              placeholder="0x..."
              value={proposalAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setProposalAddress(e.target.value)
              }
              className="flex-1 bg-muted/30 border border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 rounded-md p-2"
            />
            <button
              className={secondaryButtonClass}
              onClick={refreshProposalContractAddress}
            >
              Query Proposal
            </button>
          </div>
          <p className="text-xs text-muted-foreground"></p>
          <h3 className={titleClass}>Proposal Status</h3>
          <div className="space-y-2 flex flex-wrap justify-between">
            {printBooleanProperty("Processing", fheProposal.isProcessing)}
            {printBooleanProperty("IsActived", fheProposal.proposalStatus?.isActived)}
            {printBooleanProperty("Can Commit", fheProposal.proposalStatus?.canCommit)}
            {printBooleanProperty("Can Reveal", fheProposal.proposalStatus?.canReveal)}
            {printBooleanProperty("Approved", fheProposal.proposalStatus?.isApproved)}
            {printBooleanProperty("Executed", fheProposal.proposalStatus?.executed)}
            {printBooleanProperty("Decrypted", fheProposal.proposalStatus?.decrypted)}
            {printProperty("Proposal Id", fheProposal.proposalInfo?.proposalId)}
            {printProperty("Description", fheProposal.proposalInfo?.description)}
            {printProperty("Commit End", fheProposal.proposalInfo?.commitEnd ? timestampToUTC(fheProposal.proposalInfo.commitEnd) : fheProposal.proposalInfo?.commitEnd)}
            {printProperty("Reveal End", fheProposal.proposalInfo?.revealEnd ? timestampToUTC(fheProposal.proposalInfo.revealEnd) : fheProposal.proposalInfo?.revealEnd)}
            {printProperty("Target", fheProposal.proposalInfo?.target)}
            {printProperty("Value", fheProposal.proposalInfo?.value ? `${Number(fheProposal.proposalInfo.value)/1e18} ether` : fheProposal.proposalInfo?.value)}
            {printProperty("Calldata", fheProposal.proposalInfo?.calldata)}
            {/* {printProperty("Can Modify", fheProposal.canCreateProposal)} */}
          </div>
          <p className="text-xs text-muted-foreground"></p>
          <h3 className={titleClass}>Proposal Interaction</h3>
          <p className="text-xs text-muted-foreground">Enter 0 or 1 (0: Against, 1: For)</p>
          {/* */}
          <div className="flex items-center gap-3">
            <input
              id="commit"
              type="number"
              placeholder="0"
              value={commitValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setCommitValue(Number(e.target.value))
              }
              className="bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 rounded-md p-2"
            />
            <button
              className={secondaryButtonClass}
              disabled={!fheProposal.proposalStatus?.canCommit || !fheProposal.proposalStatus?.isActived}
              onClick={handleProposalCommit}
            >
              Commit
            </button>
            <button
              className={secondaryButtonClass}
              disabled={
                fheProposal.proposalStatus?.isActived === undefined ||
                fheProposal.proposalStatus?.isActived === true ||
                fheProposal.proposalStatus?.executed ||
                fheProposal.proposalStatus?.decrypted
              }
              onClick={handleProposalDecrypt}
            >
              Decrypt
            </button>
          </div>
          <p className="text-xs text-muted-foreground"></p>
          <p className="text-xs text-muted-foreground">Enter 0 or 1 (0: Against, 1: For) or reveal data</p>
          {/*  */}
          <div className="flex items-center gap-3">
            <input
              id="reveal"
              type="text"
              placeholder="0"
              value={revealValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRevealValue(e.target.value)
              }
              className="bg-muted/30 border-1 border-solid border-[#000] focus:border-primary/50 focus:ring-primary/50 rounded-md p-2"
            />
            <button
              className={secondaryButtonClass}
              disabled={!fheProposal.proposalStatus?.canReveal}
              onClick={handleProposalReveal}
            > Reveal
            </button>
            {/* <p className="text-xs text-muted-foreground">Decrypt Proposal Result</p> */}
            {/* <button
              className={secondaryButtonClass}
              disabled={fheProposal.proposalStatus?.isActived === undefined || fheProposal.proposalStatus?.isActived === true || fheProposal.proposalStatus?.executed || fheProposal.proposalStatus?.decrypted}
              onClick={handleProposalDecrypt}
            > Decrypt
            </button> */}
            {/* <p className="text-xs text-muted-foreground">Execute Proposal</p> */}
            <button
              className={secondaryButtonClass}
              disabled={fheProposal.proposalStatus?.isActived === undefined || fheProposal.proposalStatus?.isActived === true || !fheProposal.proposalStatus?.isApproved || fheProposal.proposalStatus?.executed || !fheProposal.proposalStatus?.decrypted}
              onClick={handleProposalExecute}
            > Execute
            </button>
          </div>
        </div>

      </div>
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-black">
        {/* <button
          className={fheCounter.isDecrypted ? successButtonClass : primaryButtonClass}
          disabled={!fheCounter.canDecrypt}
          onClick={fheCounter.decryptCountHandle}
        >
          {fheCounter.canDecrypt
            ? "🔓 Decrypt Counter"
            : fheCounter.isDecrypted
              ? `✅ Decrypted: ${fheCounter.clear}`
              : fheCounter.isDecrypting
                ? "⏳ Decrypting..."
                : "❌ Nothing to decrypt"}
        </button> */}

{/* 
        <button
          className={secondaryButtonClass}
          disabled={!fheCounter.canUpdateCounter}
          onClick={() => fheCounter.updateCounter(-1)}
        >
          {fheCounter.canUpdateCounter
            ? "➖ Decrement -1"
            : fheCounter.isProcessing
              ? "⏳ Processing..."
              : "❌ Cannot decrement"}
        </button> */}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionClass}>
          <h3 className={titleClass}>🔧 FHEVM Instance</h3>
          <div className="space-y-3">
            {printProperty("Instance Status", fhevmInstance ? "✅ Connected" : "❌ Disconnected")}
            {printProperty("Status", fhevmStatus)}
            {printProperty("Error", fhevmError ?? "No errors")}
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={titleClass}>📊 Dao Status</h3>
          <div className="flex flex-wrap justify-between gap-2">
            {printBooleanProperty("Refreshing", fheDAO.isRefreshing)}
            {printBooleanProperty("Processing", fheDAO.isProcessing)}
            {printBooleanProperty("Get ProposalCount", fheDAO.canGetProposalCount)}
            {printBooleanProperty("Create proposal", fheDAO.canCreateProposal)}
            {/* {printProperty("Can Modify", fheDAO.canCreateProposal)} */}
          </div>
        </div>
      </div>
    </div>
  );
};

function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 w-full">
      <span className="text-gray-800 font-medium text-sm">{name}</span>
      <span className="ml-2 font-mono text-xs font-semibold text-gray-900 bg-gray-100 px-2 py-1 border border-gray-300">
        {displayValue}
      </span>
    </div>
  );
}

function printBooleanProperty(name: string, value: boolean | undefined) {
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 w-[220px]">
      <span className="text-gray-700 font-medium text-sm">{name}</span>
      <span
        className={`font-mono text-xs font-semibold px-2 py-1 border ${
          value
            ? "text-green-800 bg-green-100 border-green-300"
            : "text-red-800 bg-red-100 border-red-300"
        }`}
      >
        {value ? "✓ true" : "✗ false"}
      </span>
    </div>
  );
}
