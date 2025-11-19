import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import * as hre from "hardhat";
import {MerkleTree} from 'merkletreejs';
import { DAO, DAO__factory, Proposal } from "../types";
import keccak256 = require('keccak256');

type Signers = {
    owner: HardhatEthersSigner;
    alice: HardhatEthersSigner;
    bob: HardhatEthersSigner;
    james: HardhatEthersSigner;
    jordan: HardhatEthersSigner;
    kobe: HardhatEthersSigner;
}

type Proof = {
    owner: string[],
    bob: string[],
    alice: string[],
    james: string[],
    jordan: string[],
    kobe: string[]
}

function getProof(address: String, merkleTree: MerkleTree) {
  const leaf = keccak256(address.toLowerCase().replace('0x', ''));
  return merkleTree.getHexProof(leaf);
}

function findAddress(receipt: any) {
    let address = ''
    for(const log of receipt.logs) {
        if(log.data && log.data !== '0x') {
            const data = log.data
            address = "0x" + data.slice(-40)
            break;
        }
    }
    return address;
}

function uint8ArrayToBytes32(uint8Array: Uint8Array): string {
    if (uint8Array.length > 32) {
        throw new Error('Uint8Array length exceeds 32 bytes');
    }
    const hexString = ethers.hexlify(uint8Array);
    return ethers.zeroPadValue(hexString, 32);
}


describe("DAO and Proposal", function () {
   const provider = ethers.provider;
   let signers: Signers;
   let leaves, newLeaves;
   let merkleTree: MerkleTree, newMerkleTree: MerkleTree;
   let root: string, newRoot: string;
   let proofs: Proof, newProofs: Proof;
   let dao: DAO;
   let daoContractAddress: string;
   let DAO, Proposal;

  beforeEach(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
        owner: ethSigners[0],
        bob: ethSigners[1],
        alice: ethSigners[2],
        james: ethSigners[3],
        jordan: ethSigners[4],
        kobe: ethSigners[5]
    }
    // leaves without james jordan kobe
    const leavesAddr1 = [
      signers.owner.address,
      signers.bob.address,
      signers.alice.address,
    ]
    const leavesAddr2 = [
      signers.owner.address,
      signers.bob.address,
      signers.alice.address,
      signers.james.address,
      signers.jordan.address,
      signers.kobe.address,
    ]
    // Compute simple Merkle tree for member1 and member2
    leaves = leavesAddr1.map(addr => keccak256(addr.toLowerCase().replace('0x', '')));
    newLeaves = leavesAddr2.map(addr => keccak256(addr.toLowerCase().replace('0x', '')));
    merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    newMerkleTree = new MerkleTree(newLeaves, keccak256, { sortPairs: true });
    root = merkleTree.getHexRoot();
    newRoot = newMerkleTree.getHexRoot();
    // Deploy DAO with merkleRoot
    const factory = (await ethers.getContractFactory("DAO")) as DAO__factory;
    dao = (await factory.deploy(root)) as DAO;
    daoContractAddress = await dao.getAddress();

    // compute proofs
    proofs = {
      owner: getProof(signers.owner.address, merkleTree),
      bob: getProof(signers.bob.address, merkleTree),
      alice: getProof(signers.alice.address, merkleTree),
      james: getProof(signers.james.address, merkleTree),
      jordan: getProof(signers.jordan.address, merkleTree),
      kobe: getProof(signers.kobe.address, merkleTree)
    };
    newProofs = {
      owner: getProof(signers.owner.address, newMerkleTree),
      bob: getProof(signers.bob.address, newMerkleTree),
      alice: getProof(signers.alice.address, newMerkleTree),
      james: getProof(signers.james.address, newMerkleTree),
      jordan: getProof(signers.jordan.address, newMerkleTree),
      kobe: getProof(signers.kobe.address, newMerkleTree)
    };
  });

  it("Should deploy DAO correctly and verify Merkle proofs", async function () {
    expect(await dao.merkleRoot()).to.equal(root);
    expect(await dao.name()).to.equal("Gov Token");
    expect(await dao.symbol()).to.equal("GT");
    expect(await dao.decimals()).to.equal(0); // Assuming override fix

    // Verify members
    expect(await dao.verify(proofs.owner, signers.owner.address)).to.be.true;
    expect(await dao.verify(proofs.bob, signers.bob.address)).to.be.true;
    expect(await dao.verify(proofs.james, signers.james.address)).to.be.false; //Invalid proof
  });

  it("Should allow owner to update Merkle root", async function () {
    await expect(await dao.updateMerkleRoot(newRoot))
      .to.emit(dao, "MerkleRootUpdated")
      .withArgs(newRoot);
    expect(await dao.merkleRoot()).to.equal(newRoot);

    // Non-owner cannot update
    await expect(dao.connect(signers.bob).updateMerkleRoot(newRoot)).to.be.reverted;
  });

  it("Should create a proposal and emit event", async function () {
    const description = "Test Proposal";
    const votingPeriod = 86400; // 1 day in seconds
    const target = signers.kobe.address; // Send ETH to this address
    const value = ethers.parseEther("1.0");
    const executionCalldata = "0x"; // Empty for simple ETH transfer

    // Fund DAO
    await signers.owner.sendTransaction({ to: daoContractAddress, value: ethers.parseEther("2.0") });

    // Create proposal as member1
    await expect(await dao.connect(signers.owner).createProposal(proofs.owner, description, votingPeriod, target, value, executionCalldata))
      .to.emit(dao, "ProposalCreated")
      .withArgs(signers.owner.address, await dao.proposal(1));

    const proposalAddress = await dao.proposal(1);
    const proposal = await ethers.getContractAt("Proposal", proposalAddress);

    expect(await proposal.description()).to.equal(description);
    expect((await proposal.getProposalInfo())._target).to.equal(target);
    expect((await proposal.getProposalInfo())._value).to.equal(value);
    expect((await proposal.getProposalInfo())._calldata).to.equal(executionCalldata);
    expect(await proposal.dao()).to.equal(daoContractAddress);
  });

  it("Should handle full voting process: commit, reveal, and count votes", async function () {
    const description = "Voting Test";
    const votingPeriod = 3600; // 1 hour
    const target = signers.kobe.address; // No-op
    const value = 0;
    const executionCalldata = "0x";

    // Create proposal
    await dao.connect(signers.owner).createProposal(proofs.owner, description, votingPeriod, target, value, executionCalldata);
    const proposalAddress = await dao.proposal(1);
    const proposal = await ethers.getContractAt("Proposal", proposalAddress);

    // Advance time to start
    await ethers.provider.send("evm_increaseTime", [10]);
    await ethers.provider.send("evm_mine");

    // Commit votes (support: 1=yes/odd, 0=no/even)
    const salt1 = ethers.keccak256(ethers.toUtf8Bytes("salt1"));

    // encrypted support (1) by owner
    console.log('owner commit with yes support "1"')
    const ownerInput = hre.fhevm.createEncryptedInput(proposalAddress, signers.owner.address);
    ownerInput.add8(1)
    const encryptedOwnerInputs = await ownerInput.encrypt();
    const ownerExternalUint32Value = encryptedOwnerInputs.handles[0];
    const ownerInputProof = encryptedOwnerInputs.inputProof;
    const commitment1 = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(ownerExternalUint32Value), salt1]); // Yes
    await expect(await proposal.connect(signers.owner).commitVote(proofs.owner, commitment1))
      .to.emit(proposal, "VoteCommitted")
      .withArgs(signers.owner.address, commitment1);

    // encrypted support (0) by bob
    console.log('bob commit with no support "0"')
    const bobInput = hre.fhevm.createEncryptedInput(proposalAddress, signers.bob.address);
    bobInput.add8(0)
    const encryptedBobInputs = await bobInput.encrypt();
    const bobExternalUint32Value = encryptedBobInputs.handles[0];
    const bobInputProof = encryptedBobInputs.inputProof;  
    const salt2 = ethers.keccak256(ethers.toUtf8Bytes("salt2"));
    const commitment2 = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(bobExternalUint32Value), salt2]); // No
    await expect(await proposal.connect(signers.bob).commitVote(proofs.bob, commitment2))
      .to.emit(proposal, "VoteCommitted")
      .withArgs(signers.bob.address, commitment2);

    // encrypted support (0) by alice
    const aliceInput = hre.fhevm.createEncryptedInput(proposalAddress, signers.alice.address);
    aliceInput.add8(0)
    const encryptedAliceInputs = await aliceInput.encrypt();
    const aliceExternalUint32Value = encryptedAliceInputs.handles[0];
    const aliceInputProof = encryptedAliceInputs.inputProof; 
    const salt3 = ethers.keccak256(ethers.toUtf8Bytes("salt3"));
    const commitment3 = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(aliceExternalUint32Value), salt3]); // No  

    // Non-member cannot commit
    await expect(proposal.connect(signers.james).commitVote([], commitment1)).to.be.revertedWith("Only member can participate");

    // Already committed cannot recommit
    await expect(proposal.connect(signers.owner).commitVote(proofs.owner, commitment1)).to.be.revertedWith("Already committed");

    // Advance time past commitEnd (half period)
    // const currentBlock = await provider.getBlock("latest");
    // const currentTimestamp = currentBlock?.timestamp;
    // console.log(`current timestamp is ${currentTimestamp}`)
    await network.provider.send("evm_increaseTime", [votingPeriod / 2 + 10]);
    await network.provider.send("evm_mine");
    // const newBlock = await provider.getBlock("latest");
    // const newTimestamp = newBlock?.timestamp
    // console.log(`new timestamp is ${newTimestamp}`)
    // console.log(`commit end at ${await proposal.commitEnd()}`)
    // console.log(`reveal end at ${await proposal.revealEnd()}`)

    // Cannot commit after commitEnd
    await expect(proposal.connect(signers.alice).commitVote(proofs.alice, commitment3)).to.be.revertedWith("Commit period ended");

    // Reveal votes
    console.log('\nowner calls revealVote()')
    await expect(await proposal.connect(signers.owner).revealVote(uint8ArrayToBytes32(ownerExternalUint32Value), salt1, ownerInputProof))
      .to.emit(proposal, "VoteRevealed")
      .withArgs(signers.owner.address);
    expect(await dao.balanceOf(signers.owner.address)).to.equal(1); //Reputation added

    console.log('bob calls revealVote()')
    await expect(await proposal.connect(signers.bob).revealVote(uint8ArrayToBytes32(bobExternalUint32Value), salt2, bobInputProof))
      .to.emit(proposal, "VoteRevealed")
      .withArgs(signers.bob.address);
    expect(await dao.balanceOf(signers.bob.address)).to.equal(1);

    // // Check vote counts (weight = 1 + balance; balance=0 initially, +1 after reveal, but counted before add?)
    // // Note: Since addReputation after _countVote, weight=1 (initial 0 +1 base)
    // const ownerClearUint64Value = await hre.fhevm.userDecryptEuint(
    //   FhevmType.euint64, 
    //   await proposal.getYesVotes(), 
    //   proposalAddress,
    //   signers.owner,
    // );

    // const bobClearUint64Value = await hre.fhevm.userDecryptEuint(
    //   FhevmType.euint64, // Encrypted type (must match the Solidity type)
    //   await proposal.getNoVotes(), // bytes32 handle Alice wants to decrypt
    //   proposalAddress, // Target contract address
    //   signers.bob, // Alice’s wallet
    // );
    // expect(ownerClearUint64Value).to.equal(1n); // member1 yes
    // expect(bobClearUint64Value).to.equal(1n); // member2 no

    // Invalid reveal
    await expect(proposal.connect(signers.owner).revealVote(uint8ArrayToBytes32(ownerExternalUint32Value), salt1, ownerInputProof)).to.be.revertedWith("Already revealed");
    await expect(proposal.connect(signers.alice).revealVote(uint8ArrayToBytes32(aliceExternalUint32Value), salt1, aliceInputProof)).to.be.revertedWith("Invalid reveal");

    // Advance past revealEnd
    await network.provider.send("evm_increaseTime", [votingPeriod / 2 + 10]);
    await network.provider.send("evm_mine");

    // Cannot reveal after revealEnd
    await expect(proposal.connect(signers.alice).revealVote(uint8ArrayToBytes32(aliceExternalUint32Value), salt3, aliceInputProof)).to.be.revertedWith("Proposal not active");

    // // Decrypt votes
    // console.log('\nExecute Votes Decryption...')
    // const tx = await proposal.connect(signers.jordan).requestDecryptVotes()
    // await tx.wait()
    // await hre.fhevm.awaitDecryptionOracle()
    // await hre.fhevm.publicDecrypt

    // expect(await proposal.decryptedYesVotes()).to.eq(1n)
    // expect(await proposal.decryptedNoVotes()).to.eq(1n)
    // console.log(`yesVotes: ${await proposal.decryptedYesVotes()}`)
    // console.log(`noVotes: ${await proposal.decryptedNoVotes()}`)
  });

  it("Should execute proposal if passed, mint bonus, and handle failures", async function () {
    const description = "Execution Test";
    const votingPeriod = 3600;
    const target = signers.bob.address; // Send ETH to member2
    const value = ethers.parseEther("1.0");
    const executionCalldata = "0x";
    console.log('bob\'s address as target address, value is 1 ether')

    // Fund DAO
    await signers.owner.sendTransaction({ to: daoContractAddress, value: ethers.parseEther("2.0") });
    console.log(`fund DAO with 2 ether, balance of DAO: ${Number(await provider.getBalance(daoContractAddress))/1e18} ether\n`)

    // Create proposal
    await dao.connect(signers.owner).createProposal(proofs.owner, description, votingPeriod, target, value, executionCalldata);
    const proposalAddress = await dao.proposal(1);
    const proposal = await ethers.getContractAt("Proposal", proposalAddress);

    // Commit and reveal yes vote from member1 (to pass: yes=1 > no=0)
    const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));
    const ownerInput = hre.fhevm.createEncryptedInput(proposalAddress, signers.owner.address);
    ownerInput.add8(1)
    const encryptedOwnerInputs = await ownerInput.encrypt();
    const ownerExternalUint32Value = encryptedOwnerInputs.handles[0];
    const ownerInputProof = encryptedOwnerInputs.inputProof;  
    const commitment = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(ownerExternalUint32Value), salt]);
    await proposal.connect(signers.owner).commitVote(proofs.owner, commitment);

    // Advance to reveal phase
    await network.provider.send("evm_increaseTime", [votingPeriod / 2 + 10]);
    await network.provider.send("evm_mine");

    await proposal.connect(signers.owner).revealVote(uint8ArrayToBytes32(ownerExternalUint32Value), salt, ownerInputProof);
    expect(await dao.balanceOf(signers.owner.address)).to.equal(1);
    // expect(await proposal.noVotes()).to.equal(0);

    // Advance past voting
    await ethers.provider.send("evm_increaseTime", [votingPeriod / 2 + 10]);
    await ethers.provider.send("evm_mine");

    // decryption votes
    // let tx = await proposal.requestDecryptVotes();
    // await tx.wait();
    // await hre.fhevm.awaitDecryptionOracle();
    // console.log('Execute Votes decryption...')
    // console.log(`yesVotes: ${await proposal.decryptedYesVotes()} noVotes: ${await proposal.decryptedNoVotes()}\n`)
    // expect(await proposal.decrypted()).to.eq(true)

    // Execute (by anyone, but calls dao.executeProposal)
    const initialBalance = await provider.getBalance(signers.bob.address);
    console.log(`bob's initial balance: ${Number(initialBalance)/1e18} ether`)

    const encryptedVotes = await proposal.getEncryptedVotes()
    const encryptedYesVotes = encryptedVotes[0]
    const encryptedNoVotes = encryptedVotes[1]
    const publicDecryptResults = await hre.fhevm.publicDecrypt([encryptedYesVotes, encryptedNoVotes]);
    const abiEncodedResult = publicDecryptResults.abiEncodedClearValues;
    const decryptionProof = publicDecryptResults.decryptionProof;

    await proposal.connect(signers.james).decryptResult(abiEncodedResult, decryptionProof)
    expect(await proposal.connect(signers.kobe).execute())
      .to.emit(proposal, "ProposalExecuted") // Assuming owner executes
    console.log('Execute proposal...')
    expect(await provider.getBalance(signers.bob.address)).to.equal(initialBalance + value); // ETH sent
    console.log(`bob's current balance: ${Number(await provider.getBalance(signers.bob.address))/1e18} ether`)
    console.log(`balance of DAO: ${Number(await provider.getBalance(daoContractAddress))/1e18} ether`)
    expect(await dao.balanceOf(signers.kobe.address)).to.equal(1); //Executor bonus mint
    expect((await proposal.getProposalStatus())._executed).to.be.true;

    // Cannot re-execute
    await expect(proposal.execute()).to.be.revertedWith("Already executed");

    // Test failure: insufficient votes (new proposal)
    await dao.connect(signers.owner).createProposal(proofs.owner, "Fail Test", votingPeriod, target, value, executionCalldata);
    const failProposalAddr = await dao.proposal(2);
    const failProposal = await ethers.getContractAt("Proposal", failProposalAddr);

    // No votes: yes=0 == no=1, should fail
    // Commit and reveal yes vote from member1 (to not pass: no=1 > yes=0)
    const _ownerInput = hre.fhevm.createEncryptedInput(failProposalAddr, signers.owner.address);
    _ownerInput.add8(0)
    const _encryptedOwnerInputs = await _ownerInput.encrypt();
    const _ownerExternalUint32Value = _encryptedOwnerInputs.handles[0];
    const _ownerInputProof = _encryptedOwnerInputs.inputProof;  
    const _commitment = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(_ownerExternalUint32Value), salt]);
    await failProposal.connect(signers.owner).commitVote(proofs.owner, _commitment)

    await ethers.provider.send("evm_increaseTime", [votingPeriod/2 + 10]);
    await ethers.provider.send("evm_mine");

    await failProposal.connect(signers.owner).revealVote(uint8ArrayToBytes32(_ownerExternalUint32Value), salt, _ownerInputProof);

    await ethers.provider.send("evm_increaseTime", [votingPeriod/2]);
    await ethers.provider.send("evm_mine");

    const _publicDecryptResults = await hre.fhevm.publicDecrypt([...(await failProposal.getEncryptedVotes())]);
    const _abiEncodedResult = _publicDecryptResults.abiEncodedClearValues;
    const _decryptionProof = _publicDecryptResults.decryptionProof;
    await failProposal.decryptResult(_abiEncodedResult, _decryptionProof)
    await expect(failProposal.execute()).to.be.revertedWith("Proposal did not pass");

    // Test insufficient ETH
    await dao.connect(signers.owner).createProposal(proofs.owner, "ETH Fail", votingPeriod, target, ethers.parseEther("10.0"), executionCalldata);
    const ethFailAddr = await dao.proposal(3);
    const ethFail = await ethers.getContractAt("Proposal", ethFailAddr);

    // new encrypt input
    const input = hre.fhevm.createEncryptedInput(ethFailAddr, signers.owner.address);
    input.add8(1)
    const encryptedInputs = await input.encrypt();
    const externalUint32Value = encryptedInputs.handles[0];
    const inputProof = encryptedInputs.inputProof;  
    const newCommitment = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(externalUint32Value), salt]);

    // Simulate pass with vote
    await ethFail.connect(signers.owner).commitVote(proofs.owner, newCommitment);
    await ethers.provider.send("evm_increaseTime", [votingPeriod / 2 + 10]);
    await ethers.provider.send("evm_mine");
    await ethFail.connect(signers.owner).revealVote(uint8ArrayToBytes32(externalUint32Value), salt, inputProof);
    await ethers.provider.send("evm_increaseTime", [votingPeriod / 2 + 10]);
    await ethers.provider.send("evm_mine");

    // decryption votes
    // tx = await ethFail.requestDecryptVotes();
    // await tx.wait();
    // await hre.fhevm.awaitDecryptionOracle();
    const decryptResults = await hre.fhevm.publicDecrypt([...(await ethFail.getEncryptedVotes())]);
    const encodedResult = decryptResults.abiEncodedClearValues;
    const ethFailDecryptionProof = decryptResults.decryptionProof;

    await ethFail.decryptResult(encodedResult, ethFailDecryptionProof)
    await expect(ethFail.execute()).to.be.revertedWith("DAO: insufficient ETH");
  });

  it("Should handle reputation minting via addReputation", async function () {
    // Reputation added on reveal (tested above), here test indirect via proposal call
    // Since addReputation only callable by proposal, it's covered in voting tests
    expect(await dao.balanceOf(signers.owner.address)).to.equal(0); // Initial

    // Create and vote to mint
    const description = "Rep Test";
    const votingPeriod = 3600;
    const target = signers.bob.address;
    const value = 0;
    const executionCalldata = "0x";

    await dao.connect(signers.owner).createProposal(proofs.owner, description, votingPeriod, target, value, executionCalldata);
    const proposalAddress = await dao.proposal(1);
    const proposal = await ethers.getContractAt("Proposal", proposalAddress);

    const salt = ethers.keccak256(ethers.toUtf8Bytes("salt"));

    const input = hre.fhevm.createEncryptedInput(proposalAddress, signers.owner.address);
    input.add8(1)
    const encryptedInputs = await input.encrypt();
    const externalUint32Value = encryptedInputs.handles[0];
    const inputProof = encryptedInputs.inputProof;  
    const commitment = ethers.solidityPackedKeccak256(["bytes32","bytes32"], [uint8ArrayToBytes32(externalUint32Value), salt]);

    await proposal.connect(signers.owner).commitVote(proofs.owner, commitment);

    await network.provider.send("evm_increaseTime", [votingPeriod / 2 + 10]);
    await network.provider.send("evm_mine");

    await proposal.connect(signers.owner).revealVote(uint8ArrayToBytes32(externalUint32Value), salt, inputProof);
    expect(await dao.balanceOf(signers.owner.address)).to.equal(1); //Minted via addReputation

    // Non-proposal cannot mint
    await expect(dao.connect(signers.kobe).addReputation(1, signers.kobe.address, 10)).to.be.revertedWith("Not proposal contract");
  });

  it("Should reject actions during inactive proposal", async function () {
    const description = "Inactive Test";
    const votingPeriod = 3600;
    const target = signers.bob.address;
    const value = 0;
    const executionCalldata = "0x";

    await dao.connect(signers.owner).createProposal(proofs.owner, description, votingPeriod, target, value, executionCalldata);
    const proposalAddress = await dao.proposal(1);
    const proposal = await ethers.getContractAt("Proposal", proposalAddress);

    // Advance past revealEnd
    await ethers.provider.send("evm_increaseTime", [votingPeriod + 10]);
    await ethers.provider.send("evm_mine");

    expect((await proposal.getProposalStatus())._isActived).to.be.false;

    // Cannot commit or reveal when inactive
    const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint8","bytes32"], [1, ethers.keccak256(ethers.toUtf8Bytes("salt"))]));
    await expect(proposal.connect(signers.owner).commitVote(proofs.owner, commitment)).to.be.revertedWith("Proposal not active");
    await expect(proposal.connect(signers.owner).revealVote(
      "0xa05e334153147e75f3f416139b5109d1179cb56fef6a4ecb4c4cbc92a7c37b70",
      ethers.keccak256(ethers.toUtf8Bytes("salt")), 
      "0xa05e334153147e75f3f416139b5109d1179cb56fef6a4ecb4c4cbc92a7c37b70")).to.be.revertedWith("Proposal not active");
  });
});