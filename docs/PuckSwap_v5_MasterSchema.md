# 🔷 PuckSwap v5 — Master Schema Reference

## 1️⃣ Datum Structures

### 🟢 PoolDatum (for AMM Swap & Liquidity Provision)
```typescript
type PoolDatum = {
  ada_reserve: Int;
  token_reserve: Int;
  fee_basis_points: Int;
  lp_token_policy: PolicyId;
  lp_token_name: TokenName;
}
```
- CIP-68 compliant structured datum
- Used by:
  - `swap_validator.aiken`
  - `liquidity_provision_validator.aiken`
  - `withdrawal_validator.aiken`

### 🟢 StakingDatum (for Liquid Staking)
```typescript
type StakingDatum = {
  total_staked: Int;
  total_pADA_minted: Int;
  stake_pool_id: ByteArray;
  last_rewards_sync_slot: Int;
}
```
- Used by:
  - `liquid_staking_validator.aiken`
  - `staking_monitor.ts`

### 🟢 GovernanceDatum (for DAO Governance)
```typescript
type GovernanceDatum = {
  proposals: List<Proposal>;
}
```

```typescript
type Proposal = {
  proposal_id: Int;
  action: GovernanceAction;
  votes_for: Int;
  votes_against: Int;
  executed: Bool;
}
```

```typescript
type GovernanceAction =
  | UpdateFee(Int)
  | TreasuryPayout(Value)
```
- Used by:
  - `governance_validator.aiken`
  - `governance_monitor.ts`

### 🟢 CrossChainRouterDatum (for Cross-Chain Router)
```typescript
type CrossChainRouterDatum = {
  total_volume: Int;
  last_processed_nonce: Int;
  chain_connections: List<ChainConnection>;
}
```

```typescript
type ChainConnection = {
  chain_id: Int;
  bridge_address: ByteArray;
}
```
- Used by:
  - `cross_chain_router_validator.aiken`
  - `crosschain_monitor.ts`

## 2️⃣ Redeemer Structures

### 🟢 SwapRedeemer
```typescript
type SwapRedeemer = {
  swap_in_token: Bool;
  amount_in: Int;
  min_out: Int;
}
```

### 🟢 StakingRedeemer
```typescript
type StakingRedeemer = {
  deposit: Option<Int>;
  withdraw: Option<Int>;
  sync: Bool;
}
```

### 🟢 CrossChainRedeemer
```typescript
type CrossChainRedeemer = {
  outbound: Bool;
  nonce: Int;
  bridge_signature: ByteArray;
}
```

## 3️⃣ Minting Policies

### 🟢 LP Minting Policy
- Controlled by: `liquidity_provision_validator.aiken`
- Mint LP tokens only during liquidity provision.

### 🟢 stADA Minting Policy
- Controlled by: `liquid_staking_validator.aiken`
- Mint stADA only during ADA staking deposit.

### 🟢 Governance Token Policy
- Optional governance token minting for DAO voting power.

## 4️⃣ Global CIP References
- ✅ CIP-20 (multi-asset support)
- ✅ CIP-25 (NFT optional for LP)
- ✅ CIP-30 (wallet integration)
- ✅ CIP-57 (serialization format)
- ✅ CIP-67 (datum schema)
- ✅ CIP-68 (reference datum model)
- ✅ CIP-95 (chained tx future expansion)

## 5️⃣ Protocol Constants

### ✅ Swap Fee (AMM)
- Fee basis points: 30
- Fee calculation:
  - Numerator: 997
  - Denominator: 1000

### ✅ Bonding Curve LP Supply
```json
{
  "initial_lp_supply": 1000000,
  "bonding_curve_slope": 0.01,
  "max_fee_basis_points": 100
}
```

## 6️⃣ Developer Reference Notes

- All datum serialization follows CIP-68 schema using Lucid Evolution's enhanced `Data.to()` and `Data.from()`.

- All contract validation logic must strictly enforce:
  - Datum state transitions
  - Redeemer consistency
  - Asset value updates
  - LP token policy consistency

- Context7 backend monitors provide live UTxO indexing for:
  - Pools
  - Registry
  - Governance
  - Liquid Staking
  - Cross-Chain Router

🔷 **End of Master Schema**


