# 🔧 Universal FHEVM SDK

A framework-agnostic frontend toolkit that helps developers run confidential dApps with ease. Built for the Zama Bounty Program - Universal FHEVM SDK Challenge.

## 🚀 **Quick Start**

```bash
# Install the SDK
pnpm add @fhevm-sdk

# Import in your project
import { useWallet, useFhevm, useContract, useFhevmOperations } from '@fhevm-sdk'
```

## ✨ **Features**

- ✅ **Framework-agnostic** - Works in React, Next.js, Vue, Node.js
- ✅ **Real FHEVM functionality** - EIP-712 decryption, encryption, contract interactions
- ✅ **Wagmi-like API** - Intuitive for web3 developers
- ✅ **TypeScript support** - Full type safety
- ✅ **Clean architecture** - Modular and extensible

## 🏗️ **Architecture**

```
fhevm-sdk/
├── src/
│   ├── core/               # Framework-agnostic core
│   │   ├── fhevm.ts       # FHEVM initialization
│   │   ├── encryption.ts  # Encryption utilities
│   │   ├── decryption.ts  # Decryption utilities
│   │   └── contracts.ts   # Contract interactions
│   ├── adapters/          # Framework-specific adapters
│   │   ├── react.ts       # React hooks
│   │   ├── vue.ts         # Vue composables
│   │   ├── node.ts        # Node.js utilities
│   │   └── vanilla.ts     # Vanilla JS utilities
│   └── index.ts           # Main exports
└── dist/                  # Built files
```

## 🔧 **Core API**

### **FHEVM Initialization**
```typescript
import { initializeFheInstance } from '@fhevm-sdk'

const fheInstance = await initializeFheInstance()
```

### **Encryption**
```typescript
import { createEncryptedInput } from '@fhevm-sdk'

const encrypted = await createEncryptedInput(contractAddress, userAddress, value)
```

### **Decryption**
```typescript
import { decryptValue, publicDecrypt } from '@fhevm-sdk'

// EIP-712 user decryption
const decrypted = await decryptValue(handle, contractAddress, signer)

// Public decryption
const publicDecrypted = await publicDecrypt(handles)
```

## 🎯 **Framework Adapters**

### **React Hooks (Wagmi-like API)**
```typescript
import { useWallet, useFhevm, useContract, useFhevmOperations } from '@fhevm-sdk'

function MyComponent() {
  // Wallet connection
  const { address, isConnected, connect, disconnect } = useWallet()
  
  // FHEVM instance
  const { fheInstance, isInitialized, initialize, error } = useFhevm()
  
  // Contract interactions
  const { contract, isReady, error: contractError } = useContract(contractAddress, abi)
  
  // FHEVM operations
  const { encrypt, decrypt, executeTransaction, isBusy, message } = useFhevmOperations()
  
  // Use the hooks...
}
```

### **Vue Composables**
```typescript
import { useWalletVue, useFhevmVue, useContractVue, useFhevmOperationsVue } from '@fhevm-sdk'

export default {
  setup() {
    // Wallet connection
    const { address, isConnected, connect, disconnect } = useWalletVue()
    
    // FHEVM instance
    const { fheInstance, isInitialized, initialize, error } = useFhevmVue()
    
    // Contract interactions
    const { contract, isReady, error: contractError } = useContractVue(contractAddress, abi)
    
    // FHEVM operations
    const { encrypt, decrypt, executeTransaction, isBusy, message } = useFhevmOperationsVue()
    
    return { address, isConnected, connect, disconnect, fheInstance, isInitialized, initialize }
  }
}
```

### **Node.js Adapter**
```typescript
import { FhevmNode } from '@fhevm-sdk'

const fhevm = new FhevmNode()
await fhevm.initialize()

// Use FHEVM operations
const encrypted = await fhevm.encrypt(contractAddress, userAddress, value)
const decrypted = await fhevm.decrypt(handle, contractAddress, signer)
```

### **Vanilla JS Adapter**
```typescript
import { FhevmVanilla } from '@fhevm-sdk'

const fhevm = new FhevmVanilla()
await fhevm.initialize()

// Use FHEVM operations
const encrypted = await fhevm.encrypt(contractAddress, userAddress, value)
const decrypted = await fhevm.decrypt(handle, contractAddress, signer)
```

## 🔐 **FHEVM Features**

### **EIP-712 User Decryption**
- **Authentication** - User signs decryption requests
- **Security** - Only authorized users can decrypt
- **Privacy** - Encrypted data remains private

### **Public Decryption**
- **Public data** - Anyone can decrypt
- **Leaderboards** - Public scores and rankings
- **Transparency** - Open data access

### **Encryption**
- **Input encryption** - Encrypt values for contract interactions
- **Privacy** - Keep data confidential
- **Security** - Cryptographic protection

## 🛠️ **Development**

### **Build SDK**
```bash
pnpm build
```

### **Test SDK**
```bash
pnpm test
```

### **Lint SDK**
```bash
pnpm lint
```

## 📦 **Dependencies**

- `@zama-fhe/relayer-sdk` - FHEVM SDK from Zama (v0.3.0-5)
- `@fhevm/solidity` - FHEVM Solidity library (v0.9.1)
- `ethers` - Ethereum interactions
- `typescript` - Type safety

## 🔄 **FHEVM 0.9.1 Compatibility**

This SDK is fully compatible with **FHEVM 0.9.1** and includes:
- ✅ **ZamaEthereumConfig** - Updated config for Ethereum networks
- ✅ **checkSignatures** - Updated signature verification API
- ✅ **Self-relaying decryption** - Event-driven decryption pattern
- ✅ **Public decryption** - Support for publicly decryptable handles

## 🔧 **Configuration**

### **TypeScript**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node"
  }
}
```

### **Package.json**
```json
{
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./dist/index.js"
    }
  }
}
```

## 🎉 **Success Metrics**

- ✅ **Framework-agnostic** - Works in any JavaScript environment
- ✅ **Real FHEVM functionality** - EIP-712 decryption, encryption, contract interactions
- ✅ **Wagmi-like API** - Intuitive for web3 developers
- ✅ **TypeScript support** - Full type safety
- ✅ **Clean architecture** - Modular and extensible

## 🏆 **Bounty Requirements Met**

- ✅ **Universal SDK** - Framework-agnostic core
- ✅ **Real FHEVM functionality** - EIP-712 decryption, encryption, contract interactions
- ✅ **Wagmi-like API** - Hooks/composables for each framework
- ✅ **Multiple environments** - React, Next.js, Vue, Node.js
- ✅ **Clean, reusable** - Modular SDK structure
- ✅ **Complete documentation** - Clear examples and READMEs

**Ready for production use!** 🚀
