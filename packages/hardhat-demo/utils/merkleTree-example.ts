/*
 * @dev Returns the Merkle root of a given array of leaf nodes.
 * @param leaves The array of leaf nodes.
 * @return The Merkle root.
 * 
 * Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (10000 ETH)
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a

Account #3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (10000 ETH)
Private Key: 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6

Account #4: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (10000 ETH)
Private Key: 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a

Account #5: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc (10000 ETH)
Private Key: 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba

Account #6: 0x976EA74026E726554dB657fA54763abd0C3a0aa9 (10000 ETH)
Private Key: 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e

Account #7: 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 (10000 ETH)
Private Key: 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356

Account #8: 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f (10000 ETH)
Private Key: 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97

Account #9: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 (10000 ETH)
Private Key: 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6
 */
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

export let defaultAddresses = [
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
    '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
    '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
    '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
    '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
    '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
];

export class merkleTree {
  private merkleTree: MerkleTree | null = null;
  private merkleRoot: string | null = '';

  constructor(params: string[]) {
    // Initialize empty Merkle tree
    this.merkleTree = new MerkleTree([], keccak256, { sort: true });
    this.generateMerkleTree(params);
  }

  async generateMerkleTree(params: string[]): Promise<void> {
    try {
      // generated Merkle tree with 10 accounts from Hardhat local network
      
      // Create leaves by hashing each address
      const leaves = params.map(address => 
        keccak256(address.toLowerCase().replace('0x',''))
      );

      // Create Merkle tree
      this.merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      this.merkleRoot = this.merkleTree.getHexRoot();
    } catch (error) {
      console.error('Error generating Merkle tree:', error);
      this.merkleTree = null;
      this.merkleRoot = null;
    }
  }

  getMerkleRoot(): string | null {
    return this.merkleRoot;
  }

  getMerkleTree(): MerkleTree | null {
    return this.merkleTree;
  }

  getProof(address: string): string[] {
    if (!this.merkleTree) {
      return [];
    }

    try {
      const leaf = keccak256(address.toLowerCase().replace('0x',''));
      return this.merkleTree.getHexProof(leaf);
    } catch (error) {
      console.error('Error generating proof for address:', address, error);
      return [];
    }
  }

  verifyProof(address: string, proof: string[]): boolean {
    if (!this.merkleTree || !this.merkleRoot) {
      return false;
    }

    try {
      const leaf = keccak256(address.toLowerCase().replace('0x',''));
      const root = this.merkleTree.getHexRoot()
      
      return this.merkleTree.verify(
        proof,
        leaf,
        root
      );
    } catch (error) {
      console.error('Error verifying proof for address:', address, error);
      return false;
    }
  }

  async refreshMerkleTree(params: string[]): Promise<void> {
    await this.generateMerkleTree(params);
  }

  getTreeInfo() {
    if (!this.merkleTree) {
      return {
        root: this.merkleRoot,
        leafCount: 0,
        treeDepth: 0,
        leaves: []
      };
    }

    return {
      root: this.merkleRoot,
      leafCount: this.merkleTree.getLeafCount(),
      treeDepth: this.merkleTree.getDepth(),
      leaves: this.merkleTree.getLeaves().map(leaf => '0x' + leaf.toString('hex'))
    };
  }
}

// Create singleton instance
export const whitelistMerkleTree = new merkleTree(defaultAddresses);
export const memberMerkleTree = new merkleTree(defaultAddresses);
export const merkleTreeExample = new merkleTree(defaultAddresses);

export default { whitelistMerkleTree, memberMerkleTree, merkleTreeExample };