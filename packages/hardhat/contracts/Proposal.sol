// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "contracts/DAO.sol";
import "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract Proposal is ZamaEthereumConfig{
    DAO public dao;
    string public description;

    struct ProposalInfo {
        uint32 proposalId;
        uint32 commitEnd;
        uint32 revealEnd;
        bool executed;
        bool decrypted;
        uint64 decryptedYesVotes;
        uint64 decryptedNoVotes;
    }

    struct ExecutionData {
        address targetAddress;
        uint256 value;
        bytes executionCalldata;
    }
    
    event VoteCommitted(address committer, bytes32 commitment);
    event VoteRevealed(address revealer);
    event ProposalExecuted(address executor);

    // user commitment：proposalId => address => commitment (hash(support + salt))
    mapping(address => bytes32) public commitments;
    mapping(address => bool) public revealed;

    ProposalInfo public info;
    ExecutionData public executionData;

    euint64 encryptedYesVotes;
    euint64 encryptedNoVotes;

    constructor(
      uint32 _proposalId,
      string memory _description,
      uint32 _vtPeriod,
      address _target,
      uint256 _value,
      bytes memory _calldata
    ) {
        description = _description;

        info = ProposalInfo({
            proposalId: _proposalId,
            commitEnd: uint32(block.timestamp + _vtPeriod/2),
            revealEnd: uint32(block.timestamp + _vtPeriod),
            executed: false,
            decrypted: false,
            decryptedYesVotes: 0,
            decryptedNoVotes: 0
        });

        executionData = ExecutionData({
            targetAddress: _target,
            value: _value,
            executionCalldata: _calldata
        });

        encryptedYesVotes = FHE.asEuint64(0);
        encryptedNoVotes = FHE.asEuint64(0);
        dao = DAO(payable(msg.sender));

        FHE.allowThis(encryptedYesVotes);
        FHE.allowThis(encryptedNoVotes);
    }

    function getProposalInfo() external view returns (
        uint32 _proposalId,
        string memory _description,
        uint256 _commitEnd,
        uint256 _revealEnd,
        address _target,
        uint256 _value,
        bytes memory _calldata
    ) {
        return (
            info.proposalId,
            description,
            info.commitEnd,
            info.revealEnd,
            executionData.targetAddress,
            executionData.value,
            executionData.executionCalldata
        );
    }

    function getProposalStatus() external view returns (
        bool _canCommit,
        bool _canReveal,
        bool _executed,
        bool _decrypted,
        bool _isActived,
        bool _isApproved
    ) {
        bool canCommit = (block.timestamp <= info.commitEnd);
        bool canReveal = (block.timestamp > info.commitEnd && block.timestamp <= info.revealEnd);
        bool isActived = (block.timestamp <= info.revealEnd);
        bool isApproved = (info.decryptedYesVotes > info.decryptedNoVotes);
        return (
            canCommit,
            canReveal,
            info.executed,
            info.decrypted,
            isActived,
            isApproved
        );
    }

    function getEncryptedVotes() public view returns (euint64, euint64) {
        require(block.timestamp > info.revealEnd, "Can get encrypted data until voting ended");
        return (encryptedYesVotes, encryptedNoVotes);
    }

    // commitment：submit hash(support + salt); support => even num(dis)/odd num(agree)
    // salt: private random bytes32
    function commitVote(bytes32[] calldata proof, bytes32 commitment) external {
        require(block.timestamp <= info.revealEnd, "Proposal not active");
        require(dao.verify(proof, msg.sender), "Only member can participate");
        require(block.timestamp <= info.commitEnd, "Commit period ended");
        require(commitments[msg.sender] == bytes32(0), "Already committed");
        
        commitments[msg.sender] = commitment;
        emit VoteCommitted(msg.sender, commitment);
    }

    // reveal：submit the support and salt what you committed, and reptation be increased
    function revealVote(externalEuint8 esupport, bytes32 salt, bytes calldata attestation) external {
        require(block.timestamp > info.commitEnd, "Commit period not ended");
        require(block.timestamp <= info.revealEnd, "Proposal not active");
        require(!revealed[msg.sender], "Already revealed");
        
        euint8 support = FHE.fromExternal(esupport, attestation);
        bytes32 commitment = keccak256(abi.encodePacked(support, salt));
        require(commitments[msg.sender] == commitment, "Invalid reveal");
        
        ebool eq0 = FHE.eq(support, FHE.asEuint8(0));
        ebool gt0 = FHE.eq(support, FHE.asEuint8(1));
        uint64 weight = uint64(1 + dao.balanceOf(msg.sender));
        euint64 eweight = FHE.asEuint64(weight);
        encryptedYesVotes = FHE.select(gt0, FHE.add(encryptedYesVotes, eweight), FHE.add(encryptedYesVotes, FHE.asEuint64(0)));
        encryptedNoVotes = FHE.select(eq0, FHE.add(encryptedNoVotes, eweight), FHE.add(encryptedNoVotes, FHE.asEuint64(0)));
        
        revealed[msg.sender] = true;
        dao.addReputation(info.proposalId, msg.sender, 1);

        FHE.allowThis(encryptedYesVotes);
        FHE.allowThis(encryptedNoVotes);
        FHE.makePubliclyDecryptable(encryptedYesVotes);
        FHE.makePubliclyDecryptable(encryptedNoVotes);

        emit VoteRevealed(msg.sender);
    }

    // decrypt
    function decryptResult(
        bytes memory abiEncodedResult,
        bytes memory decryptionProof
    ) external {
        require(!info.decrypted, "Already decrypted");
        require(block.timestamp > info.revealEnd, "Voting not ended");

        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(encryptedYesVotes);
        cts[1] = FHE.toBytes32(encryptedNoVotes);

        FHE.checkSignatures(cts, abiEncodedResult, decryptionProof);
        (uint64 decodedYesVotes, uint64 decodedNoVotes) = abi.decode(
            abiEncodedResult,
            (uint64, uint64)
        );

        info.decryptedYesVotes = decodedYesVotes;
        info.decryptedNoVotes = decodedNoVotes;

        info.decrypted = true;
    }

    // proposal execution logic
    function execute() external {
        require(!info.executed, "Already executed");
        require(block.timestamp > info.revealEnd, "Voting not ended");

        require(info.decryptedYesVotes > info.decryptedNoVotes, "Proposal did not pass");
        require(address(dao).balance >= executionData.value, "DAO: insufficient ETH");

        info.executed = true;

        dao.executeProposal(info.proposalId, executionData.targetAddress, executionData.value, executionData.executionCalldata, msg.sender);
        emit ProposalExecuted(msg.sender);
    }

    // function requestDecryptVotes() internal returns (uint64, uint64) {
    //     require(block.timestamp > revealEnd, "Voting not ended");

    //     bytes32[] memory cts = new bytes32[](2);
    //     cts[0] = FHE.toBytes32(encryptedYesVotes);
    //     cts[1] = FHE.toBytes32(encryptedNoVotes);

        
    //     FHE.requestDecryption(cts, this.callbackDecryptVotes.selector);
    // }

    // function callbackDecryptVotes(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) public {
    //     FHE.checkSignatures(requestId, cleartexts, decryptionProof);

    //     (uint64 yesVotes, uint64 noVotes) = abi.decode(cleartexts, (uint64, uint64));
    //     decryptedYesVotes = yesVotes;
    //     decryptedNoVotes = noVotes;
    //     decrypted = true;
    // }
}