# Private DAO Voting on Zama FHEVM

Privacy-preserving governance template built on Zama's FHEVM. It showcases a commit–reveal voting flow where individual votes remain private on-chain while final tallies become verifiable and public after decryption. Proposals can execute on-chain actions only when a decrypted majority approves.

## What You Get

- Privacy-first vote aggregation using FHE encrypted counters
- Two-phase commit → reveal voting with membership gating
- Reputation-weighted decisions powered by an ERC20 governance token
- Proposal factory (CREATE2) with secure post-vote execution
- React + Next.js frontend and Hardhat contracts, ready for local or Sepolia

## Key Features

- Privacy-Preserving Votes: Yes/No totals stored as `euint64` and aggregated on-chain without revealing individual votes.
- Commit–Reveal Lifecycle: Commit hashed intent, reveal encrypted support to update FHE counters, then decrypt totals after voting ends.
- Reputation Weighting: Each vote weight equals `1 + GT balance`, encouraging participation and rewarding contributors.
- Membership via Merkle Proof: Only whitelisted addresses can create proposals and commit votes.
- Secure Execution Gate: Proposals execute only if `yes > no` after decryption and the DAO holds sufficient ETH.
- Production-Ready FHEVM Primitives: Uses Zama FHEVM types and attestation verification for encrypted inputs and decryption proofs.

## Architecture

```
fheDao/
├── packages/
│   ├── hardhat/                  # Smart contracts, deploy, types, tests
│   │   ├── contracts/            # DAO.sol, Proposal.sol
│   │   ├── deploy/               # Deployment scripts
│   │   ├── deployments/          # Deployed addresses per network
│   │   └── types/                # TypeChain bindings
│   ├── nextjs/                   # React + Next.js frontend
│   └── fhevm-sdk/                # Lightweight hooks for FHEVM integration
└── scripts/                      # ABI/type generation
```

## Contracts Overview

- `DAO.sol` — governance token, membership, proposal factory, and execution gate
  - Membership and proposals are permissioned by a Merkle whitelist and a proposal map.
  - Execution is gated and rewarded via a single entrypoint:

```solidity
function executeProposal(
    uint32 _proposalId,
    address _target,
    uint256 _value,
    bytes calldata _calldata,
    address _executor
) external {
    // ... validate status
    (bool success, ) = _target.call{value: _value}(_calldata);
    // ...
    _mint(_executor, 1); // Reward executor for successful execution
}
```

- `Proposal.sol` — FHE voting and guarded execution
  - Commit: hash your intent and salt, store once during the commit window.

```solidity
function commitVote(
   bytes32[] calldata proof, // Merkle proof to verify membership
   bytes32 commitment
) external {
    // ... validate status
    commitments[msg.sender] = commitment;
}
```

  - Reveal: submit encrypted support and salt; FHE updates weighted counters.

```solidity
function revealVote(
   externalEuint8 esupport,
   bytes32 salt,
   bytes calldata attestation
) external {
    // ... validate status
    euint8 support = FHE.fromExternal(esupport, attestation);
    // ... update logic
}
```

  - Decrypt (After Voting Ends): verify oracle signatures and persist public tallies after voting ends.

```solidity
function decryptResult(
   bytes memory abiEncodedResult,
   bytes memory decryptionProof
) external {
    // ... validate voting period, decryption proof, and not already decrypted
    // ... decrypt logic
}
```

  - Execute (After Decryption): only on decrypted majority and sufficient funds via the DAO.

```solidity
function execute() external {
    // ... validate status
    dao.executeProposal(...params);
}
```

## Governance Actions

- Treasury Management and Asset Operations
  - Treasury transfers and allocations
  - Multi-protocol asset allocation strategies
  - Yield farming and liquidity provision
  - Cross-chain asset bridging and management
  - Stablecoin reserve adjustments

- Protocol Parameter Governance
  - Interest rates, fees, and collateral factors
  - Reward emissions and inflation control
  - Risk parameters and liquidation thresholds
  - Protocol fee collection and distribution

- Contracts and Infrastructure
  - Smart contract upgrades and logic changes
  - Proxy implementation updates
  - Deployment of new functional modules
  - Library and tooling integrations

- Permissions and Access Control
  - Admin role grants and revocations
  - Multisig threshold adjustments
  - Contract permission configuration
  - Key rotation and access policies

- DeFi Strategy Execution
  - Structured product allocations
  - Derivatives position management
  - Insurance policy acquisitions
  - Liquidity mining strategies

## Reputation & Incentives

- Reveal-Only Rewards
  - Voters earn reputation (governance token) only when they complete the reveal step.
  - On reveal, the proposal calls the DAO to mint reputation to the revealer:

```solidity
// Proposal.sol
revealed[msg.sender] = true;
dao.addReputation(info.proposalId, msg.sender, 1);
```

- No Reward for Commit-Only
  - Submitting a commit without revealing grants no reward. Compared to active revealers, commit-only participants fall behind in reputation growth, which acts as a soft penalty.

- Vote Weight Compounds with Reputation
  - Each vote is weighted by `1 + GT balance`, so active participation compounds future influence:

```solidity
// Proposal.sol
uint64 weight = uint64(1 + dao.balanceOf(msg.sender));
euint64 eweight = FHE.asEuint64(weight);
encryptedYesVotes = FHE.select(gt0, FHE.add(encryptedYesVotes, eweight), encryptedYesVotes);
encryptedNoVotes = FHE.select(eq0, FHE.add(encryptedNoVotes, eweight), encryptedNoVotes);
```

- Execution Bonus
  - Successful proposal execution mints a small bonus to the executor, rewarding operational work:

```solidity
// DAO.sol
require(proposal[_proposalId] == msg.sender, "Not authorized proposal");
require(address(this).balance >= _value, "DAO: insufficient ETH");
(bool success, ) = _target.call{value: _value}(_calldata);
require(success, "Execution failed");
_mint(_executor, 1);
```

## Voting Lifecycle

- Propose: Member calls `DAO.createProposal` with description, durations, and execution payload.
- Commit: During `commitEnd`, voters submit commitments without revealing support.
- Reveal: During `revealEnd`, voters reveal encrypted support plus salt; FHE counters update with weight `1 + GT balance`.
- Decrypt: After `revealEnd`, anyone submits oracle decryption result; contract verifies and persists plain totals.
- Execute: If `yes > no`, proposal triggers payload via DAO and rewards executor.

## Quick Start

### Prerequisites

- Node.js v20+ (required by the workspace engines; FHEVM SDK works best on 20+)
- pnpm
- MetaMask

### Setup

```bash
git clone <repository-url>
cd fheDao
pnpm install
```

### Environment

- Set `MNEMONIC` and any RPC keys as needed following Zama's Hardhat setup guide.

### Run Locally

```bash
# Terminal 1: start local chain
pnpm chain

# Terminal 2: deploy contracts and generate types
pnpm deploy:localhost

# Terminal 3: start the frontend
pnpm start
```

Local RPC: `http://127.0.0.1:8545` | Chain ID: `31337`

### Deploy to Sepolia

```bash
pnpm deploy:sepolia
pnpm start
```

### Fastest Start (Sepolia Demo)

- Prepare
  - Node.js v20+, pnpm, MetaMask
  - Switch MetaMask to the Sepolia network
  - Optional: import a demo private key from the whitelist to interact; never reuse or fund outside demo
- Install
  - `pnpm install`
- Run
  - `pnpm start`

No redeploy required for the demo. To redeploy your own instance with a custom whitelist, run `pnpm deploy:sepolia` and update frontend config as needed.

### Useful Scripts

- Compile: `pnpm compile`
- Test (contracts): `pnpm test`
- Lint: `pnpm lint`
- Typecheck: `pnpm next:check-types` and `pnpm hardhat:check-types`

## Frontend Notes

- Connect MetaMask and switch to the appropriate network.
- Update deployed addresses in `packages/hardhat/deployments/*/DAO.json` and ensure the frontend reads them.
- For production on Sepolia, set `NEXT_PUBLIC_ALCHEMY_API_KEY` and optional `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`.

### Demo Whitelist

- The demo DAO is initialized with a whitelist of 10 addresses derived from Hardhat default accounts (test keys), suitable for demonstrations only. If you want different participants, regenerate your Merkle root and redeploy.

## Troubleshooting

- MetaMask nonce/cache issues are common when restarting Hardhat. Clear MetaMask activity or restart the browser to flush cached results.

## Resources

- Zama FHEVM Docs: https://docs.zama.ai/protocol/solidity-guides/
- Hardhat Guide: https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat
- Relayer & Oracle Decryption: https://docs.zama.ai/protocol/relayer-sdk-guides/

## License

BSD-3-Clause-Clear. See `LICENSE`.
