# Requirements Document

## Introduction

The Stablecoin Yield Monitor is a production-ready React application that provides real-time monitoring of stablecoin yields and looping spreads across multiple blockchain networks and DeFi protocols. The application focuses exclusively on top 10 major stablecoins and integrates with key protocols like Aave v3, Curve, Convex, MakerDAO DSR, and Pendle to provide comprehensive yield analytics, loop calculations, and alerting capabilities.

## Requirements

### Requirement 1

**User Story:** As a DeFi yield farmer, I want to monitor stablecoin yields across multiple networks and protocols in a single dashboard, so that I can identify the best opportunities without manually checking each protocol.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a dashboard with yield data from Ethereum mainnet, Arbitrum One, Optimism, and Polygon PoS
2. WHEN I select specific chains THEN the system SHALL filter and display data only for the selected networks
3. WHEN I apply stablecoin filters THEN the system SHALL show data only for USDC, USDT, and DAI tokens
4. WHEN yield data is available THEN the system SHALL display cards showing best Aave stable supply APY, borrow APY, spread, top boosted Curve APY, and DSR
5. WHEN utilization exceeds 90% OR caps exceed 95% THEN the system SHALL display health warning badges

### Requirement 2

**User Story:** As a DeFi strategist, I want to view detailed loop monitoring data in a table format, so that I can analyze supply/borrow spreads and assess borrowing capacity across different assets.

#### Acceptance Criteria

1. WHEN viewing the loop monitor table THEN the system SHALL display supply asset, borrow asset, supply APY, borrow APY, net spread, utilization, caps percentage, E-Mode LTV/LT, and borrowable status
2. WHEN calculating net spread THEN the system SHALL compute (supply_borrowed - borrow) APY accurately
3. WHEN E-Mode parameters are available THEN the system SHALL display LTV and liquidation threshold values
4. WHEN an asset is not borrowable THEN the system SHALL clearly indicate "no" in the borrowable column
5. WHEN displaying boosted LP data THEN the system SHALL show pool name, base APY, boosted APY, TVL, and peg deviation with red highlighting if deviation exceeds 0.3%

### Requirement 3

**User Story:** As a yield farmer, I want to calculate potential returns from leveraged stablecoin loops, so that I can determine optimal leverage ratios and assess profitability before executing strategies.

#### Acceptance Criteria

1. WHEN I select chain, deposit asset, borrow asset, and loop parameters THEN the system SHALL calculate total supplied, total borrowed, current LTV, net APY, and annual dollar profit
2. WHEN I adjust the number of loops (1-5) THEN the system SHALL recalculate all metrics using geometric series formulas
3. WHEN I set target LTV via slider THEN the system SHALL update leverage calculations in real-time
4. WHEN I input target leverage (1-5x) THEN the system SHALL compute the corresponding LTV and loop parameters
5. WHEN borrow APY exceeds resupply APY THEN the system SHALL display "Negative spread" warning
6. WHEN I adjust depeg stress sliders (±0.5%/±1%) THEN the system SHALL show updated health factor and liquidation risk bands

### Requirement 4

**User Story:** As a DeFi user, I want to set custom alerts for yield opportunities and risk thresholds, so that I can be notified when market conditions meet my criteria without constant monitoring.

#### Acceptance Criteria

1. WHEN I create an alert rule THEN the system SHALL allow me to set thresholds for supply-borrow spreads, boosted APY levels, and DSR changes
2. WHEN alert conditions are met THEN the system SHALL display local toast notifications and badge indicators
3. WHEN I set a spread threshold THEN the system SHALL monitor "Supply(APY_borrowed) - Borrow(APY) ≥ X%" conditions
4. WHEN I set boosted APY alerts THEN the system SHALL monitor "Curve boosted APY ≥ Y%" conditions
5. WHEN I set DSR change alerts THEN the system SHALL monitor "DSR changes by ≥ Z bps" conditions

### Requirement 5

**User Story:** As a protocol researcher, I want to access detailed reserve information and historical data, so that I can analyze protocol parameters and rate trends over time.

#### Acceptance Criteria

1. WHEN I click on a reserve THEN the system SHALL display detailed information including rates history, caps, E-Mode eligibility, and oracle source
2. WHEN viewing rates history THEN the system SHALL show sparkline charts for APY trends
3. WHEN reserve data is available THEN the system SHALL display current caps, utilization rates, and reserve factors
4. WHEN E-Mode is supported THEN the system SHALL show eligibility status and parameters
5. WHEN viewing reserve details THEN the system SHALL provide quick links to official protocol documentation

### Requirement 6

**User Story:** As a user, I want the application to connect to my wallet and read on-chain data accurately, so that I can trust the yield information and potentially execute transactions.

#### Acceptance Criteria

1. WHEN I click connect wallet THEN the system SHALL integrate with RainbowKit to support multiple wallet providers
2. WHEN connected to a wallet THEN the system SHALL use viem for all on-chain data reads
3. WHEN reading Aave data THEN the system SHALL use UiPoolDataProviderV3 and AaveProtocolDataProvider contracts with proper ABI typings
4. WHEN Alchemy RPC is configured THEN the system SHALL use network-specific endpoints from environment variables
5. WHEN contract calls fail THEN the system SHALL gracefully fallback to alternative data sources where available

### Requirement 7

**User Story:** As a user, I want a responsive, accessible interface with dark mode support, so that I can use the application comfortably across different devices and lighting conditions.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL display a responsive interface built with Tailwind CSS and shadcn/ui components
2. WHEN I toggle dark mode THEN the system SHALL switch between light and dark themes seamlessly
3. WHEN viewing on mobile devices THEN the system SHALL maintain full functionality with appropriate responsive layouts
4. WHEN using charts THEN the system SHALL display data using Recharts with proper theming support
5. WHEN errors occur THEN the system SHALL display user-friendly error messages through proper error boundaries

### Requirement 8

**User Story:** As a developer, I want the codebase to follow best practices and be maintainable, so that the application can be extended and debugged efficiently.

#### Acceptance Criteria

1. WHEN writing code THEN the system SHALL use TypeScript with strict mode enabled
2. WHEN organizing imports THEN the system SHALL use absolute import paths for better maintainability
3. WHEN formatting code THEN the system SHALL enforce ESLint and Prettier rules consistently
4. WHEN managing state THEN the system SHALL use React Query for server state and Zustand for UI preferences
5. WHEN testing core functionality THEN the system SHALL include Vitest and React Testing Library tests for calculation hooks

### Requirement 9

**User Story:** As a user, I want accurate yield calculations that reflect real protocol mechanics, so that I can make informed decisions based on reliable data.

#### Acceptance Criteria

1. WHEN calculating supply APY THEN the system SHALL use liquidityRate / 1e27 formula for ray to decimal conversion
2. WHEN calculating borrow APY THEN the system SHALL use variableBorrowRate / 1e27 formula
3. WHEN calculating utilization THEN the system SHALL use totalDebt / totalSupply formula
4. WHEN calculating multi-loop APY THEN the system SHALL apply geometric series using per-loop LTV with proper normalization
5. WHEN displaying health factors THEN the system SHALL estimate values using E-Mode LT/LTV and liquidation bonus parameters

### Requirement 10

**User Story:** As a user, I want the application to support all major networks where stablecoins operate, so that I can monitor opportunities across the entire DeFi ecosystem.

#### Acceptance Criteria

1. WHEN the application initializes THEN the system SHALL support Ethereum mainnet, Arbitrum One, Optimism, and Polygon PoS networks
2. WHEN switching networks THEN the system SHALL use appropriate Alchemy RPC endpoints configured via environment variables
3. WHEN making multicall requests THEN the system SHALL use network-specific multicall contract addresses
4. WHEN exporting chain configuration THEN the system SHALL provide a central chains.ts file with viem chain objects and RPC URLs
5. WHEN a network is unavailable THEN the system SHALL gracefully handle errors and continue operating on available networks