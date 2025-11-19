// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "contracts/Proposal.sol";

contract DAO is Ownable, ERC20 {
    bytes32 public merkleRoot;
    uint32 public proposalId;

    mapping(uint32 => address) public proposal;

    event MerkleRootUpdated(bytes32 newRoot);
    event ProposalCreated(address indexed creator, address proposalAddress);
    event AirdropCreated(address indexed creator, address airdropAddress);

    constructor(bytes32 _merkleRoot) ERC20("Gov Token", "GT") Ownable(msg.sender) { // name: Gov Token, Symbol: GT, decimals: 1
        merkleRoot = _merkleRoot;
        proposalId = 1;
    }

    function decimals() public view virtual override returns(uint8) {
        return 0;
    }

    function updateMerkleRoot(bytes32 _newMerkleRoot) external onlyOwner {
        merkleRoot = _newMerkleRoot;
        emit MerkleRootUpdated(_newMerkleRoot);
    }

    function verify(bytes32[] calldata proof, address account) public view returns (bool) {
        bytes32 leaf = keccak256(bytes(_toHexString(account)));
        return _verifyProof(proof, leaf, merkleRoot);
    }

    function _verifyProof(
        bytes32[] calldata proof,
        bytes32 leaf,
        bytes32 root
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == root;
    }

    function _toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            uint8 b = uint8(uint160(addr) >> (8 * (19 - i)));
            uint8 hi = b >> 4;
            uint8 lo = b & 0x0f;
            buffer[2 * i] = bytes1(hi < 10 ? hi + 0x30 : hi + 0x57);
            buffer[2 * i + 1] = bytes1(lo < 10 ? lo + 0x30 : lo + 0x57);
        }
        return string(buffer);
    }

    function createProposal(
       bytes32[] calldata proof,
       string memory _description,
       uint32 _votingPeriod,
       address _target,
       uint256 _value,
       bytes memory _calldata
    ) external returns (address) {
        require(verify(proof, msg.sender), "Not in Merkle Tree");
        address proposalAddress = deployProxy(proposalId, _description, _votingPeriod, _target, _value, _calldata);
        proposal[proposalId] = proposalAddress;
        proposalId++;
        emit ProposalCreated(msg.sender, proposalAddress);
        return proposalAddress;
    }

    function deployProxy(
       uint32 _proposalId,
       string memory _description,
       uint32 _votingPeriod,
       address _target,
       uint256 _value,
       bytes memory _calldata
    ) internal returns (address) {
        bytes memory code = abi.encodePacked(type(Proposal).creationCode, abi.encode(_proposalId, _description, _votingPeriod, _target, _value, _calldata));
        address proxy;
        assembly {
            proxy := create2(0, add(code, 0x20), mload(code), 0)
        }
        require(proxy != address(0), "Proxy deployment failed");
        return proxy;
    }

    function addReputation(uint32 _proposalId, address _receiver, uint256 _amount) external{
        require(proposal[_proposalId] == msg.sender, "Not proposal contract");
        _mint(_receiver, _amount);
    }

    // proposal execution logic
    function executeProposal(
        uint32 _proposalId,
        address _target,
        uint256 _value,
        bytes calldata _calldata,
        address _executor
    ) external {
        require(proposal[_proposalId] == msg.sender, "Not authorized proposal");
        require(address(this).balance >= _value, "DAO: insufficient ETH");

        (bool success, ) = _target.call{value: _value}(_calldata);
        require(success, "Execution failed");

        _mint(_executor, 1); // bouns
    }

    receive() external payable {}
    fallback() external payable {}
}