# BiatecDEX CLAMM Use Cases - Complete List

This document provides a comprehensive overview of all major use cases for the Concentrated Liquidity Automated Market Maker (CLAMM) functionality in BiatecDEX.

## Executive Summary

BiatecDEX is a decentralized exchange built on Algorand blockchain utilizing Concentrated Liquidity AMM (CLAMM) algorithms. The platform enables:
- **Liquidity Providers**: Earn fees by providing liquidity in customizable price ranges
- **Traders**: Swap assets with minimal slippage through concentrated liquidity
- **Asset Management**: Complete portfolio tracking and management

## Complete Use Case Catalog

### 1. Pool Discovery and Exploration

**User Story**: As a user, I want to discover available liquidity pools and their details.

**Capabilities**:
- View all available liquidity pools across different asset pairs
- Filter pools by asset pairs (e.g., VOTE/ALGO, GoldDAO/ALGO)
- View pool metrics:
  - Total Value Locked (TVL)
  - 24h Trading Volume
  - Fee Tier (e.g., 0.01%, 0.05%, 0.3%)
  - Current Price
  - Liquidity Distribution
- View liquidity depth charts showing concentration ranges
- Navigate to specific pools for detailed information

**Test Coverage**: `01-view-explore-pools.cy.ts` (5 tests)

---

### 2. Add Liquidity - Single-Sided Deposit

**User Story**: As a liquidity provider, I want to add liquidity using only one asset.

**Capabilities**:
- Select asset pair and pool
- Set custom price range (min and max tick)
- Deposit only one asset (e.g., only VOTE or only ALGO)
- View expected liquidity position
- Preview estimated fees to be earned
- Adjust deposit amount with slider
- See real-time calculation of position value
- Confirm and execute transaction

**Key Parameters**:
- Asset pair (e.g., VOTE/ALGO)
- Pool ID (AMM app ID)
- Fee tier (lpFee: 100000 = 0.01%)
- Price range (low, high)
- Shape: "single" for single-sided

**Example URL**:
```
/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16
```

**Test Coverage**: `02-add-liquidity-single.cy.ts` (6 tests)

---

### 3. Add Liquidity - Balanced Deposit

**User Story**: As a liquidity provider, I want to add liquidity with both assets in the optimal ratio.

**Capabilities**:
- Deposit both assets in balanced ratio based on current price
- Automatic calculation of required amounts for each asset
- Adjust total deposit size while maintaining ratio
- View liquidity distribution across price range
- See position value in USD
- Respect account balance limits
- Use slider to adjust deposit proportion
- Preview expected LP tokens to receive

**Key Features**:
- Balanced ratio calculation based on:
  - Current pool price
  - Selected price range
  - Available balances
- Real-time updates as slider moves
- Clear indication of which asset is limiting factor

**Test Coverage**: `03-add-liquidity-balanced.cy.ts` (6 tests)

---

### 4. Add Liquidity - Wall Position (Concentrated)

**User Story**: As a sophisticated liquidity provider, I want to create highly concentrated liquidity at a specific price point.

**Capabilities**:
- Create "wall" position where min = max price
- Maximum capital efficiency at single price point
- Useful for:
  - Stablecoin pairs (concentrated near 1:1)
  - Market making at specific price levels
  - Defending price levels
- Higher fee generation when price is within range
- Higher impermanent loss risk if price moves away

**Key Parameters**:
- Shape: "wall"
- Low = High price (e.g., both 0.15)

**Example URL**:
```
/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=wall&low=0.15&high=0.15
```

**Use Cases**:
- Stablecoin pairs (USDC/USDT near 1.0)
- Pegged assets
- Tight market making strategies

**Test Coverage**: `04-add-liquidity-wall.cy.ts` (5 tests)

---

### 5. Remove Liquidity

**User Story**: As a liquidity provider, I want to remove my liquidity position and receive my assets back.

**Capabilities**:
- View all active liquidity positions
- Select position to remove
- Choose withdrawal percentage (0-100%)
- Preview assets to receive:
  - Base asset amount
  - Quote asset amount
  - Accrued fees
- See position P&L (profit/loss)
- Partial or full withdrawal
- Burn LP tokens and receive assets

**Process Flow**:
1. Navigate to position
2. Select withdrawal percentage (slider)
3. Preview expected assets
4. Confirm transaction
5. Receive assets + fees

**Test Coverage**: `05-remove-liquidity.cy.ts` (6 tests)

---

### 6. Swap Assets

**User Story**: As a trader, I want to swap one asset for another with minimal slippage.

**Capabilities**:
- Select from/to asset pair
- Enter swap amount
- View real-time quote:
  - Expected output amount
  - Price impact
  - Minimum received (with slippage tolerance)
  - Fee amount
  - Route (which pools used)
- Adjust swap amount with slider
- Set slippage tolerance
- Execute swap
- View transaction confirmation

**Key Metrics Shown**:
- Exchange rate
- Price impact %
- Pool liquidity
- Estimated gas/transaction fee
- Minimum received (accounting for slippage)

**Swap Directions**:
- Asset A → Asset B (e.g., VOTE → ALGO)
- Asset B → Asset A (e.g., ALGO → VOTE)

**Test Coverage**: `06-swap-assets.cy.ts` (8 tests)

---

### 7. Liquidity Provider Dashboard

**User Story**: As a liquidity provider, I want to monitor all my positions and earnings in one place.

**Capabilities**:
- View all active liquidity positions
- See position details:
  - Asset pair
  - Price range (min/max)
  - Current position value (USD)
  - Initial deposit value (USD)
  - Current P&L (USD and %)
  - Accrued fees (per asset)
  - Position age
  - In/out of range status
- Filter positions by:
  - Asset
  - Pool
  - Status (in range / out of range)
- Sort by:
  - Value
  - P&L
  - Age
  - Fees earned
- Summary metrics:
  - Total portfolio value
  - Total fees earned
  - Number of positions
  - Best performing position
- Quick actions:
  - Add more liquidity
  - Remove liquidity
  - View position details

**Dashboard Sections**:
1. Portfolio Summary (total value, P&L, fees)
2. Active Positions Table
3. Asset Allocation Chart
4. Performance History

**Test Coverage**: `07-lp-dashboard.cy.ts` (9 tests)

---

### 8. Trader Dashboard

**User Story**: As a trader, I want to monitor my asset portfolio and make trading decisions.

**Capabilities**:
- View all asset holdings:
  - Asset name and symbol
  - Amount held
  - Current USD value
  - 24h price change (%)
  - 24h value change (USD)
  - Asset allocation (% of portfolio)
- Summary metrics:
  - Total portfolio value (USD)
  - 24h portfolio change (% and USD)
  - Number of assets held
  - Largest holding
  - Daily change indicator
- Filter/search assets
- Sort by:
  - Value
  - 24h change
  - Name
  - Amount
- Quick actions:
  - Swap/Trade asset
  - Send asset
  - View asset details
  - Opt-in to new assets
- Price charts for each asset
- Transaction history

**Dashboard Sections**:
1. Portfolio Overview (value, change, stats)
2. Asset Holdings Table
3. Portfolio Allocation Chart
4. Recent Transactions

**Test Coverage**: `08-trader-dashboard.cy.ts` (9 tests)

---

### 9. Asset Opt-in

**User Story**: As an Algorand user, I want to opt-in to new ASAs (Algorand Standard Assets) to enable trading.

**Capabilities**:
- View all available assets on BiatecDEX
- See asset details:
  - Asset name
  - Asset code/symbol
  - Asset ID
  - Description
  - Decimals
  - Network (mainnet/testnet)
  - Opt-in status
- Filter assets by:
  - Network
  - Name/code
  - Opt-in status
- Search assets by name or ID
- Opt-in to assets:
  - Review asset details
  - Confirm opt-in (costs 0.1 ALGO)
  - Transaction confirmation
- View already opted-in assets
- Bulk opt-in capability

**Why Opt-in Required**:
On Algorand, accounts must explicitly opt-in to assets before receiving them. This is a security feature to prevent spam.

**Process**:
1. Browse available assets
2. Review asset information
3. Click "Opt-in"
4. Confirm transaction (0.1 ALGO fee)
5. Asset now appears in wallet

**Test Coverage**: `09-asset-opt-in.cy.ts` (8 tests)

---

### 10. Route Parameter Handling

**User Story**: As a user, I want to share links with pre-filled parameters for specific pools and settings.

**Capabilities**:
- Deep linking with URL parameters
- Parameters supported:
  - Network: `mainnet-v1.0`, `testnet-v1.0`
  - Asset pair: `vote/ALGO`, `golddao/ALGO`
  - Pool ID: `3136517663`
  - Fee tier: `lpFee=100000` (0.01%)
  - Shape: `shape=single`, `shape=wall`, `shape=balanced`
  - Price range: `low=0.14&high=0.16`
- Automatic form population from URL
- Parameter validation
- Fallback to defaults for invalid parameters
- State persistence across navigation
- Support for multiple parameter combinations

**Supported Routes**:

1. **Trade Route**:
   ```
   /trade/mainnet-v1.0/vote/ALGO
   ```

2. **Liquidity View**:
   ```
   /liquidity/mainnet-v1.0/vote/ALGO
   ```

3. **Add Liquidity**:
   ```
   /liquidity/mainnet-v1.0/vote/ALGO/3136517663/add?lpFee=100000&shape=single&low=0.14&high=0.16
   ```

4. **Remove Liquidity**:
   ```
   /liquidity/mainnet-v1.0/3136517663/remove
   ```

5. **Swap**:
   ```
   /swap/mainnet-v1.0/3136517663
   ```

**Use Cases**:
- Share specific pool setups with others
- Create bookmarks for frequently used pools
- Pre-fill forms for user convenience
- Support for marketing campaigns with preset parameters
- Documentation and tutorials with working examples

**Test Coverage**: `10-route-parameters.cy.ts` (10 tests)

---

## Additional Use Cases

### 11. Price Range Selection Strategies

**User Story**: As a liquidity provider, I want guidance on selecting optimal price ranges.

**Strategies**:

1. **Wide Range** (e.g., 0.10 - 0.20):
   - Lower capital efficiency
   - Less frequent rebalancing needed
   - Lower impermanent loss risk
   - Suitable for: Volatile pairs, passive LPs

2. **Narrow Range** (e.g., 0.14 - 0.16):
   - Higher capital efficiency
   - More frequent rebalancing needed
   - Higher impermanent loss risk
   - Higher fees (when in range)
   - Suitable for: Stable pairs, active LPs

3. **Wall Position** (e.g., 0.15 - 0.15):
   - Maximum capital efficiency
   - Only earns when price exactly at level
   - Highest impermanent loss risk
   - Suitable for: Market making, defending levels

### 12. Fee Tier Selection

**User Story**: As a liquidity provider, I want to choose the appropriate fee tier.

**Fee Tiers**:
- **0.01%**: Stablecoin pairs (USDC/USDT)
- **0.05%**: Correlated pairs (ETH/wBTC)
- **0.3%**: Exotic pairs (most altcoins)
- **1%**: Very volatile pairs

**Considerations**:
- Higher fees = more earnings per trade
- Lower fees = more trading volume
- Optimal tier depends on pair volatility

### 13. Position Monitoring

**User Story**: As a liquidity provider, I want to monitor if my position is in range.

**Monitoring**:
- Current price indicator
- Position range visualization
- In/out of range status
- Alerts when price exits range
- Historical performance
- Fee accumulation rate

### 14. Impermanent Loss Tracking

**User Story**: As a liquidity provider, I want to understand my impermanent loss.

**Metrics**:
- Current position value vs. HODL value
- IL in USD and %
- IL calculator with hypothetical prices
- Historical IL chart
- Fees earned vs. IL comparison

### 15. Multi-pool Strategies

**User Story**: As an advanced LP, I want to manage liquidity across multiple pools.

**Capabilities**:
- View all positions aggregated
- Rebalance across pools
- Compare pool performance
- Allocate capital optimally
- Risk diversification

---

## Technical Implementation Details

### Smart Contract Architecture

**CLAMM Contracts**:
- Pool creation
- Liquidity addition
- Liquidity removal
- Swap execution
- Fee distribution

**Key Functions**:
```typescript
// Add liquidity
clammAddLiquiditySender(...)

// Remove liquidity
clammRemoveLiquiditySender(...)

// Swap
clammSwapSender(...)

// Bootstrap pool
clammBootstrapSender(...)

// Create pool
clammCreateSender(...)
```

### State Management

**Global State**:
- Network selection (mainnet/testnet)
- Asset pair selection
- Pool selection
- User authentication
- Price data cache

**Component State**:
- Form inputs
- Slider values
- Loading states
- Error messages
- Transaction status

### API Integration

**Endpoints**:
- `/pools` - Get all pools
- `/pools/{poolId}` - Get pool details
- `/assets` - Get asset list
- `/prices` - Get price data
- `/positions` - Get user positions

---

## Test Coverage Summary

| Use Case | Test File | Tests | Status |
|----------|-----------|-------|--------|
| Pool Exploration | 01-view-explore-pools.cy.ts | 5 | ✅ Created |
| Add Liquidity (Single) | 02-add-liquidity-single.cy.ts | 6 | ✅ Created |
| Add Liquidity (Balanced) | 03-add-liquidity-balanced.cy.ts | 6 | ✅ Created |
| Add Liquidity (Wall) | 04-add-liquidity-wall.cy.ts | 5 | ✅ Created |
| Remove Liquidity | 05-remove-liquidity.cy.ts | 6 | ✅ Created |
| Swap Assets | 06-swap-assets.cy.ts | 8 | ✅ Created |
| LP Dashboard | 07-lp-dashboard.cy.ts | 9 | ✅ Created |
| Trader Dashboard | 08-trader-dashboard.cy.ts | 9 | ✅ Created |
| Asset Opt-in | 09-asset-opt-in.cy.ts | 8 | ✅ Created |
| Route Parameters | 10-route-parameters.cy.ts | 10 | ✅ Created |
| **Total** | **10 files** | **72 tests** | ✅ **Complete** |

---

## Running All Tests

```bash
# Setup environment
cp .env.example .env
# Edit .env with test credentials

# Build project
npm run build

# Run all CLAMM tests
npm run test:e2e -- --spec "cypress/e2e/clamm/**/*.cy.ts"

# Run specific test suite
npm run cy:run -- cypress/e2e/clamm/02-add-liquidity-single.cy.ts

# Run with Cypress UI (interactive)
npm run cypress:open
```

---

## Conclusion

This comprehensive test suite covers all major CLAMM use cases in BiatecDEX, ensuring:
- ✅ Complete functionality coverage
- ✅ Real-world scenarios tested
- ✅ User workflows validated
- ✅ Edge cases handled
- ✅ Documentation provided
- ✅ Maintainable test structure

The test suite provides confidence that all critical user journeys work as expected and helps prevent regressions as the platform evolves.
