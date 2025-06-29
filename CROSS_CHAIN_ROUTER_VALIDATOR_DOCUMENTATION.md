# PuckSwap v5 Cross-Chain Router Validator Documentation

## Overview

The Cross-Chain Router Validator is a comprehensive smart contract that enables secure cross-chain asset transfers between Cardano and other blockchain networks. It implements robust security measures including nonce-based replay attack prevention, bridge signature validation, and comprehensive state tracking.

## 🔒 **Core Security Features**

### **Replay Attack Prevention**
- **Nonce Sequencing**: Enforces sequential nonce progression
- **Message Hash Tracking**: Prevents duplicate message processing
- **Timestamp Validation**: Rejects old or future-dated messages
- **Bridge Signature Verification**: Cryptographic proof validation

### **State Integrity**
- **Total Volume Tracking**: Monitors all cross-chain transfers
- **Chain Connection Management**: Maintains supported blockchain connections
- **Bridge Reputation System**: Tracks bridge performance and reliability

## Key Features

### 🌉 **Cross-Chain Operations**
1. **Outbound Transfers**: Cardano → Other Chains
2. **Inbound Transfers**: Other Chains → Cardano
3. **Message Status Tracking**: Complete lifecycle management
4. **Bridge Coordination**: Multi-bridge support with failover

### 🛡️ **Security Controls**
- **Nonce Window Validation**: Prevents nonce manipulation
- **Bridge Signature Verification**: Multi-signature validation
- **Merkle Proof Validation**: Cryptographic transfer proofs
- **Daily Transfer Limits**: Risk management controls

## Data Structures

### CrossChainRouterDatum (CIP-68 Compliant)

```aiken
type CrossChainRouterDatum {
  // CIP-68 metadata structure
  metadata: CIP68Metadata,
  version: Int,
  
  // Core state tracking
  total_volume: Int,                    // Total cross-chain volume
  last_processed_nonce: Int,            // Last processed nonce (replay prevention)
  chain_connections: List<ChainConnection>, // Supported blockchain connections
  
  // Message tracking
  outbound_messages: List<OutboundMessage>,
  inbound_messages: List<InboundMessage>,
  processed_message_hashes: List<ByteArray>, // Replay attack prevention
  
  // Bridge configuration
  trusted_bridges: List<TrustedBridge>,
  bridge_operators: List<Address>,
  governance_address: Address,
  
  // Security parameters
  min_confirmations: Int,               // Minimum bridge confirmations
  max_message_age_slots: Int,          // Maximum message age
  nonce_window: Int,                   // Acceptable nonce window
  emergency_pause: Bool,               // Emergency pause state
}
```

### ChainConnection

```aiken
type ChainConnection {
  chain_id: Int,                       // Blockchain identifier (e.g., 1 for Ethereum)
  chain_name: ByteArray,               // Human-readable name
  bridge_address: ByteArray,           // Bridge contract address
  native_token_policy: PolicyId,      // Native token policy
  wrapped_token_policy: PolicyId,     // Wrapped token policy
  is_active: Bool,                     // Connection status
  last_sync_slot: Int,                 // Last synchronization
  total_locked: Int,                   // Total tokens locked
  total_minted: Int,                   // Total wrapped tokens minted
}
```

### OutboundMessage (Cardano → Other Chain)

```aiken
type OutboundMessage {
  message_id: ByteArray,               // Unique message identifier
  nonce: Int,                          // Sequential nonce (replay prevention)
  destination_chain: Int,              // Target blockchain
  recipient: ByteArray,                // Recipient address on target chain
  token_policy: PolicyId,              // Token being transferred
  token_name: AssetName,               // Token name
  amount: Int,                         // Transfer amount
  sender: Address,                     // Cardano sender address
  created_slot: Int,                   // Creation timestamp
  status: MessageStatus,               // Current status
  bridge_id: ByteArray,                // Bridge handling transfer
  confirmations: Int,                  // Bridge confirmations received
  execution_hash: ByteArray,           // Execution proof hash
}
```

## Security Validations

### 1. **Nonce Sequence Validation** 🔐

**Critical for replay attack prevention**:

```aiken
fn validate_nonce_sequence(
  new_nonce: Int,
  last_processed_nonce: Int,
  nonce_window: Int
) -> Bool {
  // Nonce must be sequential
  expect new_nonce == last_processed_nonce + 1
  
  // Nonce must be within acceptable window
  expect new_nonce <= last_processed_nonce + nonce_window
  
  True
}
```

**Security Properties**:
- ✅ Prevents nonce reuse (replay attacks)
- ✅ Enforces sequential processing
- ✅ Limits nonce advancement window

### 2. **Bridge Signature Validation** ✅

```aiken
fn validate_enhanced_bridge_signature(
  signature: BridgeSignature,
  bridge_public_key: ByteArray,
  message_data: ByteArray,
  current_slot: Int,
  max_age_slots: Int
) -> Bool
```

**Validation Steps**:
1. Signature format validation (64 bytes)
2. Signer identity verification (32 bytes)
3. Timestamp freshness check
4. Public key matching
5. Cryptographic signature verification

### 3. **Cross-Chain Proof Validation** 🔍

```aiken
fn validate_enhanced_cross_chain_proof(
  proof: CrossChainProof,
  message: InboundMessage,
  datum: CrossChainRouterDatum,
  ctx: ScriptContext
) -> Bool
```

**Components Validated**:
- **Merkle Root**: 32-byte hash validation
- **Block Hash**: Source blockchain block validation
- **Signatures**: Multi-signature verification
- **Confirmations**: Minimum confirmation requirements
- **Freshness**: Block number and timestamp validation

## Operations

### 1. Initiate Transfer (Outbound)

**Redeemer**: `InitiateTransfer`

**Security Validations**:
1. ✅ Router not paused
2. ✅ Deadline validation
3. ✅ Amount bounds (positive, within limits)
4. ✅ Destination chain supported
5. ✅ Bridge is trusted
6. ✅ Daily transfer limits
7. ✅ **Nonce sequence validation** (replay prevention)
8. ✅ Token lock/burn validation
9. ✅ Fee payment validation

**State Updates**:
- Increment `last_processed_nonce`
- Add to `outbound_messages`
- Update `total_volume`
- Update statistics

### 2. Complete Inbound Transfer

**Redeemer**: `CompleteInboundTransfer`

**Security Validations**:
1. ✅ Router not paused
2. ✅ Message exists and confirmed
3. ✅ **Cross-chain proof validation**
4. ✅ **Replay attack prevention** (message hash check)
5. ✅ Token mint/unlock validation

**State Updates**:
- Add to `processed_message_hashes`
- Update message status
- Increment `successful_transfers`

### 3. Process Outbound Message

**Redeemer**: `ProcessOutboundMessage`

**Security Validations**:
1. ✅ Bridge operator authorization
2. ✅ Message in processing state
3. ✅ Execution hash validation
4. ✅ Confirmation requirements

### 4. Submit Inbound Message

**Redeemer**: `SubmitInboundMessage`

**Security Validations**:
1. ✅ Bridge operator authorization
2. ✅ **Replay prevention** (duplicate check)
3. ✅ Message age validation
4. ✅ Cross-chain proof validation
5. ✅ Source chain validation
6. ✅ Bridge trust validation

## Security Analysis

### Attack Scenarios Prevented

#### 1. **Replay Attacks** ❌
- **Attack**: Resubmit old valid messages
- **Prevention**: Nonce sequencing + message hash tracking
- **Result**: Transaction fails on duplicate detection

#### 2. **Nonce Manipulation** ❌
- **Attack**: Skip nonces or use out-of-order nonces
- **Prevention**: Sequential nonce validation
- **Result**: Transaction fails on invalid nonce

#### 3. **Bridge Impersonation** ❌
- **Attack**: Submit messages from untrusted bridges
- **Prevention**: Trusted bridge validation + signature verification
- **Result**: Transaction fails on unauthorized bridge

#### 4. **Stale Message Attacks** ❌
- **Attack**: Submit very old messages
- **Prevention**: Message age validation
- **Result**: Transaction fails on expired messages

#### 5. **Double Spending** ❌
- **Attack**: Process same inbound message multiple times
- **Prevention**: Processed message hash tracking
- **Result**: Transaction fails on duplicate processing

#### 6. **Amount Manipulation** ❌
- **Attack**: Modify transfer amounts
- **Prevention**: Cryptographic proof validation
- **Result**: Transaction fails on proof mismatch

### Validated Security Properties

✅ **Nonce Integrity**: Sequential nonce progression prevents replay attacks
✅ **Bridge Authentication**: Only trusted bridges can submit messages
✅ **Message Uniqueness**: Each message processed exactly once
✅ **Proof Verification**: Cryptographic validation of cross-chain proofs
✅ **State Consistency**: All state updates properly validated
✅ **Access Control**: Proper authorization for all operations

## Configuration Parameters

| Parameter | Default | Range | Purpose |
|-----------|---------|-------|---------|
| `min_confirmations` | 3 | 1-100 | Bridge confirmation requirements |
| `max_message_age_slots` | 604800 | 1-604800 | Maximum message age (7 days) |
| `nonce_window` | 10 | 1-1000 | Acceptable nonce advancement |
| `max_transfer_amount` | 1M ADA | 1-∞ | Single transfer limit |
| `daily_transfer_limit` | 10M ADA | 1-∞ | Daily volume limit |

## Integration

### Off-chain Integration

```typescript
// Example cross-chain transfer
const transferRedeemer: CrossChainRouterRedeemer = {
  InitiateTransfer: {
    destination_chain: 1, // Ethereum
    recipient: "0x742d35Cc6634C0532925a3b8D4C9db96590b5b8c",
    token_policy: adaPolicyId,
    token_name: adaAssetName,
    amount: 100_000_000n, // 100 ADA
    bridge_id: trustedBridgeId,
    deadline: currentSlot + 3600, // 1 hour
  }
};
```

### Frontend Integration

- Cross-chain transfer interface
- Bridge status monitoring
- Transfer history tracking
- Real-time confirmation updates

## Monitoring

Key metrics to monitor:
- **Nonce progression**: Ensure sequential advancement
- **Bridge performance**: Success rates and response times
- **Transfer volumes**: Daily and total volumes
- **Security events**: Failed validations and attacks
- **Message processing**: Status transitions and confirmations

## Best Practices

### For Bridge Operators
- Maintain accurate timestamps
- Provide valid cryptographic proofs
- Monitor bridge reputation scores
- Respond promptly to transfer requests

### For Users
- Verify destination addresses carefully
- Monitor transfer status regularly
- Understand bridge fees and delays
- Keep transaction records

## Emergency Procedures

### Emergency Pause
- Governance can pause all operations
- Existing transfers continue processing
- New transfers are blocked

### Emergency Withdraw
- Only available when paused
- Requires governance authorization
- Used for critical security situations

## Conclusion

The Cross-Chain Router Validator provides enterprise-grade security for cross-chain asset transfers in PuckSwap v5. Its comprehensive validation system, including nonce-based replay attack prevention and multi-signature bridge verification, ensures the integrity and security of all cross-chain operations while maintaining the flexibility needed for a multi-chain DeFi ecosystem.
