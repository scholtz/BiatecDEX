/* eslint-disable */
/**
 * Generate the `views.help` i18n namespace (and the header help tooltip) for
 * every locale file under src/locales.
 *
 * Run with:  node scripts/generate-help-locales.mjs
 *
 * Why a generator instead of hand-editing 10 JSON files:
 *  - Guarantees identical key structure across all 10 locales (no missing keys).
 *  - The page chrome, category labels and each use case title/summary are
 *    translated per language; the longer step-by-step bodies (intro/steps/tip)
 *    are shared from English so every locale renders fully. Replace those
 *    English bodies with real translations over time — the keys already exist.
 *
 * Keep the use-case slug list in sync with src/data/helpUseCases.ts.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesDir = resolve(__dirname, '..', 'src', 'locales')

const locales = ['en', 'sk', 'pl', 'hu', 'it', 'ru', 'zh', 'ko', 'de', 'es']

// Slug order mirrors src/data/helpUseCases.ts.
const slugs = [
  'explore-assets',
  'find-asset-by-id',
  'connect-wallet',
  'switch-language',
  'switch-theme',
  'trade-screen',
  'buy-order',
  'sell-order',
  'market-depth',
  'recent-trades',
  'pool-swap',
  'select-pair',
  'price-chart',
  'asset-info',
  'share-pair',
  'liquidity-dashboard',
  'create-pool',
  'add-liquidity-focused',
  'add-liquidity-spread',
  'add-liquidity-equal',
  'add-liquidity-single',
  'add-liquidity-wall',
  'remove-liquidity',
  'manage-liquidity',
  'review-before-sign',
  'liquidity-shapes',
  'lp-fee-tiers',
  'price-range',
  'precision-bins',
  'pool-costs-mbr',
  'trader-dashboard',
  'asset-opt-in',
  'copy-address',
  'disconnect-wallet',
  'switch-network',
  'settings-blockchain',
  'settings-swap',
  'reset-settings',
  'tx-validity',
  'localnet-dev',
  'about',
  'documentation',
  'security-best-practices',
  'help-center'
]

// ── English source of truth: full deep content ──────────────────────────────
const en = {
  chrome: {
    title: 'Help center',
    subtitle: 'Step-by-step guides for every Biatec DEX feature. Search or browse by category.',
    searchPlaceholder: 'Search help guides',
    noResults: 'No guides match your search.',
    notFound: "We couldn't find that help guide.",
    backToHelp: 'Back to help',
    stepsTitle: 'Step by step',
    tipTitle: 'Tip',
    openFeature: 'Open the feature',
    relatedTitle: 'Related guides'
  },
  tooltipHelp: 'Open the help center',
  categories: {
    gettingStarted: 'Getting started',
    trading: 'Trading',
    liquidity: 'Liquidity',
    account: 'Account & assets',
    networks: 'Networks & settings',
    info: 'Information'
  },
  useCases: {
    'explore-assets': {
      title: 'Explore assets',
      summary: 'Browse every asset listed in Biatec DEX pools with TVL, prices and pool counts.',
      intro:
        'The Explore Assets page is the home of Biatec DEX. It aggregates every asset that appears in a liquidity pool, so you can scan total value locked, current prices and how many pools back each token before you trade or provide liquidity.',
      steps: [
        'Open Explore from the top menu (it is also the landing page at /).',
        'Use the search box to filter the table by asset name, symbol or asset ID.',
        'Read the summary cards for total TVL, total pools and the number of listed assets.',
        'Sort any column - for example by Total TVL or 24h volume - to find the most active markets.',
        'Use the row actions to jump straight into trading, adding liquidity or removing liquidity for an asset.'
      ],
      tip: 'Columns like VWAP 1D/7D and Fees 1D/7D help you judge whether a market is liquid and how much fee income its pools are generating.'
    },
    'connect-wallet': {
      title: 'Connect a wallet',
      summary: 'Sign in with your Algorand wallet or an ARC-76 email/password account.',
      intro:
        'Biatec DEX is fully self-custodial - connecting a wallet only proves you control an Algorand address and lets you sign transactions. The DEX never holds your assets.',
      steps: [
        'Click Login in the top-right of the header.',
        'Choose your wallet - Pera, Defly, Lute, WalletConnect and others are supported.',
        'Alternatively use an ARC-76 email and password to derive an Algorand account in the browser.',
        'Approve the ARC-14 authentication request so the app can verify you own the address.',
        'Once connected, your shortened address appears in the header; click it to copy the full address.'
      ],
      tip: 'For the strongest security use a multisig account with hardware signers; the email/password option is the fastest but least secure.'
    },
    'switch-language': {
      title: 'Change the language',
      summary: 'Switch the interface between the 10 supported languages.',
      intro:
        'The whole interface is translated into ten languages. Your choice is stored in the browser, so the app reopens in the same language next time.',
      steps: [
        'Open the settings (cog) menu in the header.',
        'Expand the Language section.',
        'Pick your language from the list - a check mark shows the active one.',
        'The interface updates instantly without a page reload.'
      ],
      tip: 'The app also tries to match your browser language on first visit before falling back to English.'
    },
    'switch-theme': {
      title: 'Switch light / dark theme',
      summary: 'Toggle between light and dark mode from the header.',
      intro:
        'Biatec DEX ships a light and a dark theme. The preference is remembered between visits.',
      steps: [
        'Find the sun/moon button in the header next to the Login or account chip.',
        'Click it to toggle between light and dark mode.',
        'The ambient background and every component re-theme immediately.'
      ],
      tip: 'Your theme choice is saved locally, so the app reopens in your preferred mode.'
    },
    'trade-screen': {
      title: 'The trading screen',
      summary: 'Read live prices, charts, market depth and place orders for a pair.',
      intro:
        'The trading screen brings together everything you need to trade one asset against another: a price chart, the market depth, recent trades and the order entry panel. The pair is encoded in the URL so any view can be shared.',
      steps: [
        'Open a pair via Explore then Swap, or navigate to /trade/<network>/<asset>/<currency>.',
        'Use the asset and currency selectors to change either side of the pair.',
        'Watch the price chart and asset info panel for the latest price and volume.',
        'Read the market depth and recent trades to gauge liquidity.',
        'Enter a buy or sell order in the market order panel on the right.'
      ],
      tip: 'Prices are always shown as Asset/Currency (for example GD/USD); switching the order of the pair inverts the quote.'
    },
    'buy-order': {
      title: 'Place a buy order',
      summary: 'Buy an asset at the best available price through the DEX aggregator.',
      intro:
        'A buy market order spends your quote currency to acquire the base asset. Orders route through the Folks Router aggregator and the Biatec CLAMM pools to find the best execution.',
      steps: [
        'On the trading screen select the Buy tab in the market order panel.',
        'Enter the quantity of the asset you want to buy.',
        'Review the live quote, including slippage in basis points.',
        'Make sure you are authenticated and opted in to the asset.',
        'Click Buy and approve the transaction in your wallet.'
      ],
      tip: 'If the quote moves beyond your configured slippage, the order is rejected to protect you - raise the slippage in Settings only if you accept a worse price.'
    },
    'sell-order': {
      title: 'Place a sell order',
      summary: 'Sell an asset for your quote currency at the best available price.',
      intro:
        'A sell market order converts the base asset back into the quote currency. Like buys, sells route through the aggregator and CLAMM pools for the best price.',
      steps: [
        'On the trading screen select the Sell tab in the market order panel.',
        'Enter the quantity of the asset you want to sell.',
        'Check the quote and the slippage shown before confirming.',
        'Confirm you are authenticated and hold the asset.',
        'Click Sell and approve the transaction in your wallet.'
      ],
      tip: 'Watch the recent trades and market depth first - selling into thin liquidity moves the price more, increasing slippage.'
    },
    'market-depth': {
      title: 'Read the market depth',
      summary: 'See the bids, mid price and offers available for a pair.',
      intro:
        'The market depth panel shows aggregated bids and offers around the mid price, so you can see how much size the market can absorb before the price moves.',
      steps: [
        'Open any trading pair.',
        'Locate the Market depth panel.',
        'Read bids (buy side) on one side and offers (sell side) on the other.',
        'The mid price sits between the best bid and best offer.',
        'Larger rows further from the mid indicate where deeper liquidity sits.'
      ],
      tip: 'Thin depth near the mid means even small orders can move the price - size your trades accordingly.'
    },
    'recent-trades': {
      title: 'View recent trades',
      summary: 'Follow the live stream of executed trades for a pair.',
      intro:
        'The recent trades panel lists the latest executed trades for the selected pair, updating live over a SignalR connection so you always see current market activity.',
      steps: [
        'Open a trading pair.',
        'Find the Recent trades panel.',
        'Each row shows the time, side (buy/sell), asset amount, currency amount and price.',
        'New trades stream in at the top automatically.',
        'Use the refresh button if you want to reload the history manually.'
      ],
      tip: 'A steady stream of trades on both sides is a good sign of a healthy, liquid market.'
    },
    'pool-swap': {
      title: 'Swap directly at a pool',
      summary: 'Trade against a single Biatec CLAMM pool without the aggregator.',
      intro:
        'The direct AMM pool swap lets you trade against one specific Biatec concentrated-liquidity pool. It is useful when you want to interact with a known pool rather than route through the aggregator.',
      steps: [
        'Open Manage liquidity for a pair, or use a pool Swap at this pool action.',
        'In the Direct AMM pool swap panel pick the direction (A to B or B to A).',
        'Enter the amount to send; the amount to receive is quoted automatically.',
        'Authenticate and make sure you are opted in to the asset you will receive.',
        'Click Execute swap and approve in your wallet.'
      ],
      tip: 'Use Max to send your whole balance of the send asset; the quote updates as you type.'
    },
    'liquidity-dashboard': {
      title: 'Liquidity provider dashboard',
      summary: 'See all your positions, pool values and holdings in one place.',
      intro:
        'The Liquidity Provider Dashboard summarizes every pool you have liquidity in, your holdings and their USD value, so you can manage your positions across all pairs from a single screen.',
      steps: [
        'Open LP Dashboard from the top menu.',
        'Review the summary cards: portfolio value, value in pools, holdings and position counts.',
        'Pick a first and second asset to focus on a specific pair.',
        'Use the table actions to add or remove liquidity for any position.',
        'Refresh to reload balances and pool values from the blockchain.'
      ],
      tip: 'Opt in to an asset first if you want it to appear as an option when adding new liquidity.'
    },
    'create-pool': {
      title: 'Create a new pool',
      summary: 'Open a brand-new liquidity pool for any pair of Algorand assets.',
      intro:
        'If no pool exists yet for the pair you want, you can create one. You pick two Algorand assets, set the initial price and Biatec deploys the concentrated-liquidity pool contracts.',
      steps: [
        'On Explore Assets click Create pool.',
        'Choose a base asset and a quote asset (they must be different).',
        'Search by name, symbol or exact asset ID; on some networks you must enter the exact ASA ID.',
        'Click Continue to move to the add-liquidity step.',
        'Set the initial price and the liquidity shape, then confirm to deploy and seed the pool.'
      ],
      tip: 'Use the swap-assets button if you want to flip which token is the base and which is the quote before continuing.'
    },
    'add-liquidity-focused': {
      title: 'Add liquidity - focused shape',
      summary: 'Concentrate most liquidity around the current price to earn more fees.',
      intro:
        'The focused shape places the most liquidity in the current price bin and progressively less toward the edges of your range. It maximizes fee income while the price stays near the current level.',
      steps: [
        'Open Add liquidity for the pair.',
        'Select the Focused liquidity shape.',
        'Set the low and high price that bound your range.',
        'Choose the LP fee tier and the precision (number of bins).',
        'Enter the deposit amounts, review and confirm to sign.'
      ],
      tip: 'Focused works best in calm markets near the current price; if the price leaves your range your liquidity stops earning fees.'
    },
    'add-liquidity-spread': {
      title: 'Add liquidity - spread shape',
      summary: 'Place more liquidity toward the edges of a wide range.',
      intro:
        'The spread shape is the opposite of focused: it puts the least liquidity at the current price and the most toward the minimum and maximum of your range, covering a broad band of prices.',
      steps: [
        'Open Add liquidity for the pair.',
        'Select the Spread shape.',
        'Define a wide low-to-high price range.',
        'Pick the LP fee tier and precision.',
        'Enter deposits, review the bins, and confirm to sign.'
      ],
      tip: 'Spread suits volatile pairs where you expect the price to swing across a wide band.'
    },
    'add-liquidity-equal': {
      title: 'Add liquidity - equal bins',
      summary: 'Distribute the same liquidity into every price bin of your range.',
      intro:
        'The equal shape spreads identical liquidity across every bin from your minimum to your maximum price, giving uniform coverage of the whole range.',
      steps: [
        'Open Add liquidity for the pair.',
        'Select the Equal bin shape.',
        'Set the low and high price of the range.',
        'Choose the LP fee tier and precision.',
        'Enter deposits, review and confirm to sign.'
      ],
      tip: 'Equal coverage is a simple, neutral choice when you have no strong view on where the price will trade within your range.'
    },
    'add-liquidity-single': {
      title: 'Add liquidity - single bin',
      summary: 'Provide liquidity as one position between a min and max price.',
      intro:
        'The single-bin shape does not use the tick/bin system. Instead it creates one liquidity position with a defined minimum and maximum price - the classic concentrated-liquidity range.',
      steps: [
        'Open Add liquidity for the pair.',
        'Select the Single bin shape.',
        'Set the minimum and maximum price for the position.',
        'Use the portion slider to choose how much of your balance to deposit.',
        'Review and confirm to sign.'
      ],
      tip: 'Deposit amounts are matched to the pool ratio automatically; if they are too small to match, increase both amounts.'
    },
    'add-liquidity-wall': {
      title: 'Add liquidity - price wall',
      summary: 'Set a single price wall that buys below and sells above it.',
      intro:
        'A wall order defines a single price level. When the market is below it, others can buy from you at that level; when the market is above it, others sell to you. You earn whenever the price oscillates across the wall.',
      steps: [
        'Open Add liquidity for the pair.',
        'Select the Wall order shape.',
        'Enter the single Price Wall level.',
        'Enter the deposit you want to back the wall with.',
        'Review and confirm to sign.'
      ],
      tip: 'A wall is ideal when you want to accumulate or distribute an asset at a fixed price while earning on volatility around it.'
    },
    'remove-liquidity': {
      title: 'Remove liquidity',
      summary: 'Withdraw part or all of a position and claim accrued fees.',
      intro:
        'Removing liquidity returns your deposited tokens plus any fees you earned. You can withdraw a percentage of a position or exit it completely.',
      steps: [
        'Open Manage liquidity or the LP Dashboard and find the pool.',
        'Click Remove liquidity for that position.',
        'Use the percentage slider (or Max) to choose how much to withdraw.',
        'Authenticate if prompted.',
        'Click Remove liquidity and approve the transaction.'
      ],
      tip: 'Fully exiting a position also returns the LP token reserve (MBR) that was locked while you held it.'
    },
    'manage-liquidity': {
      title: 'Manage liquidity',
      summary: 'The hub for viewing pools and adding, removing or swapping at them.',
      intro:
        'The Manage liquidity page is the working area for a pair. It lists existing pools, your positions and exposes the add, remove and direct-swap actions for that pair.',
      steps: [
        'Navigate to /liquidity/<network>/<asset>/<currency> or open it from the DEX menu.',
        'Review the list of pools and their prices, balances and fees.',
        'Use Add liquidity to open a new position.',
        'Use Remove liquidity to withdraw from an existing one.',
        'Use Swap at this pool to trade directly against a pool.'
      ],
      tip: 'Be the first to create a pool for a pair if none exists yet - the page will offer the Create pool flow.'
    },
    'review-before-sign': {
      title: 'Review before you sign',
      summary: 'Understand exactly what your wallet is about to approve.',
      intro:
        'Before any add-liquidity transaction, Biatec shows a review screen that itemizes every cost and transfer. It is your last chance to verify what your wallet will be asked to sign.',
      steps: [
        'Reach the review step at the end of the Add liquidity flow.',
        'Check the deposits, ALGO costs, new-pool funding and estimated network fees.',
        'Read how many times your wallet will prompt you to sign.',
        'Work through the verification checklist (no rekey, no clawback, correct amounts, correct contract).',
        'Click Confirm & sign only when everything matches.'
      ],
      tip: 'If your wallet shows a larger ALGO payment, more prompts than stated, or any rekey/close-out, stop and do not sign.'
    },
    'trader-dashboard': {
      title: 'Trader dashboard',
      summary: 'Track your opted-in assets, balances and live USD valuations.',
      intro:
        'The Trader Dashboard is your portfolio view. It lists every asset you are opted in to, your balance, the live price and the USD value of each position.',
      steps: [
        'Open Trader from the top menu.',
        'Review the summary cards: portfolio value, asset count, largest holding and 24h change.',
        "Scan the table for each asset's balance, price and position value.",
        'Use the swap action to trade any holding.',
        'Refresh to reload balances from the blockchain.'
      ],
      tip: 'If an asset you own is missing, opt in to it from here so it appears in your portfolio.'
    },
    'asset-opt-in': {
      title: 'Opt in to an asset',
      summary: 'Register an Algorand asset to your account before receiving it.',
      intro:
        'On Algorand you must opt in to an asset (ASA) before your account can hold it. Opting in submits a zero-amount transfer of that asset to yourself.',
      steps: [
        'Open Trader then Opt in to new asset, or go to /trader/asset-opt-in.',
        'Search by asset name or exact asset ID.',
        'Select the asset from the results.',
        'Make sure you are authenticated.',
        'Click Opt in and approve the zero-amount transaction.'
      ],
      tip: 'Each opt-in locks a small amount of ALGO as minimum balance; it is returned if you later opt out of the asset.'
    },
    'switch-network': {
      title: 'Change the blockchain',
      summary: 'Switch between Mainnet, Testnet and Localnet.',
      intro:
        'Biatec DEX can run against Algorand Mainnet (live), Testnet (for testing) or a local development network. Switching network reloads assets and clears stale data for the new environment.',
      steps: [
        'Open the settings (cog) menu in the header.',
        'Expand the Environment section.',
        'Choose Algorand (Mainnet), Testnet or Localnet.',
        "The app switches networks and updates the URL's network segment.",
        'Available assets and pools reload for the selected network.'
      ],
      tip: 'Use Testnet to practice the full create-pool, add-liquidity and swap lifecycle with free testnet tokens before going to Mainnet.'
    },
    'settings-blockchain': {
      title: 'Configure the blockchain endpoint',
      summary: 'Point the app at a custom algod endpoint, port and token.',
      intro:
        'The Settings page lets you customize the blockchain connection - useful when running against Localnet or your own node - including the endpoint, port, token and the last-valid-round offset.',
      steps: [
        "Open Settings from the cog menu's Configuration item, or go to /settings.",
        'Find the Blockchain configuration section.',
        'Set the endpoint, port and token for your node.',
        'Adjust the last valid round offset if you need a longer transaction validity window (default 100).',
        'Your settings are saved locally and used for subsequent transactions.'
      ],
      tip: 'The round offset controls how many rounds a transaction stays valid after its first valid round - increase it on slow connections.'
    },
    'settings-swap': {
      title: 'Configure swap slippage',
      summary: 'Set the maximum slippage tolerance for your trades.',
      intro:
        'Slippage is the difference between the quoted price and the price you actually get. The swap configuration lets you cap it in basis points, so orders are rejected if the market moves too far.',
      steps: [
        'Open Settings from the cog menu, or go to /settings.',
        'Find the SWAP configuration section.',
        'Set the Slippage BPS value (1 bp = 0.01%).',
        'Lower values protect your price; higher values make orders more likely to fill in fast markets.',
        'The setting applies to your subsequent buy and sell orders.'
      ],
      tip: 'Stable pairs can use a tight slippage; volatile or thin markets may need a wider tolerance to execute.'
    },
    'reset-settings': {
      title: 'Reset configuration',
      summary: 'Restore all settings to their defaults.',
      intro:
        'If your local configuration gets into a bad state, the danger zone in Settings lets you reset everything to the default values in one click.',
      steps: [
        'Open Settings from the cog menu, or go to /settings.',
        'Scroll to the Default configuration section.',
        'Find the Danger zone.',
        'Click Reset configuration.',
        'The app restores default blockchain, swap and interface settings.'
      ],
      tip: 'Resetting only affects locally stored preferences - it never touches your on-chain assets or wallet.'
    },
    about: {
      title: 'About Biatec DEX',
      summary: 'Learn what Biatec DEX is, its disclaimers and listed assets.',
      intro:
        'The About page explains the project: a self-custodial concentrated-liquidity AMM on Algorand, built with support from the Algorand Foundation xGov program. It also lists the assets and important disclaimers.',
      steps: [
        'Open About from the DEX menu, or go to /about.',
        'Read the overview of the CLAMM protocol and DEX aggregator.',
        'Review the disclaimers about self-custody and beta software.',
        'Browse the table of listed assets and search it.',
        'Follow the links to documentation and source code for more detail.'
      ],
      tip: 'Always verify each transaction you sign - the contracts are still under active development and you are responsible for your own accounts.'
    },
    'find-asset-by-id': {
      title: 'Find an asset by ID',
      summary: 'Locate a token by its exact Algorand asset ID (ASA).',
      intro:
        'Every Algorand asset has a unique numeric ID. When a token name is ambiguous - or unavailable on the current network - you can find it precisely by its exact ASA ID.',
      steps: [
        'Open Explore Assets, Opt-in, or Create pool - all support ID search.',
        'Type the exact numeric asset ID into the search box.',
        'On networks where the asset index is unavailable, entering the exact ASA ID is required to add it.',
        "Confirm the matched asset's name and symbol before continuing.",
        'Proceed to trade, opt in, or add it to a pool.'
      ],
      tip: 'Asset IDs are the safest way to identify a token - names and symbols can be copied by scam tokens, but the ID is unique.'
    },
    'select-pair': {
      title: 'Switch the trading pair',
      summary: 'Change the asset or quote currency you are trading.',
      intro:
        'Each market is a pair of an asset and a quote currency. You can change either side from the selectors without leaving the trading screen.',
      steps: [
        'On the trading screen find the asset and currency selectors.',
        'Open the asset selector to pick the token you want to trade.',
        'Open the currency selector to pick the quote currency (for example USD or ALGO).',
        'The chart, market depth and trades reload for the new pair.',
        'The URL updates so the new pair can be shared or bookmarked.'
      ],
      tip: 'Prices are shown as Asset/Currency; swapping the two sides inverts the displayed price.'
    },
    'price-chart': {
      title: 'Read the price chart',
      summary: 'Track price movements and volume over different timeframes.',
      intro:
        "The price chart visualizes how the pair's price and volume have moved over time, helping you judge trend and timing before placing an order.",
      steps: [
        'Open a trading pair.',
        'Locate the price chart at the top of the screen.',
        'Switch timeframes (for example 1D, 7D, 1 Year) to zoom in or out.',
        'Compare current and previous periods shown beneath the chart.',
        'Cross-check the latest price with the asset info panel.'
      ],
      tip: 'Use a longer timeframe to see the trend and a shorter one to time your entry.'
    },
    'asset-info': {
      title: 'Read the asset info panel',
      summary: 'See latest price, volume and multi-timeframe price data.',
      intro:
        'The asset info panel summarizes the selected pair: the latest price, trading volume and price across several timeframes, with a refresh control for the freshest data.',
      steps: [
        'Open a trading pair.',
        'Find the Asset info panel.',
        'Read the latest price and the minute, 1D, 7D and yearly figures.',
        'Check the volume for the period.',
        'Use Refresh to reload the latest values.'
      ],
      tip: 'If no price data shows, the pair may have no recent trades - check market depth and recent trades for activity.'
    },
    'share-pair': {
      title: 'Share a trading pair',
      summary: 'Send anyone a direct link to a specific pair and network.',
      intro:
        'The trading screen encodes the network and both assets in the URL, so any view you are looking at can be shared as a plain link that reopens to the exact same pair.',
      steps: [
        'Open the pair you want to share on the trading screen.',
        'Copy the browser URL - it looks like /trade/<network>/<asset>/<currency>.',
        'Send the link to anyone.',
        'When they open it, the app loads the same pair on the same network.',
        'The same pattern works for liquidity links (/liquidity/...).'
      ],
      tip: 'Pair order is normalized automatically (for example ALGO is preferred as the currency), so shared links always open in a consistent orientation.'
    },
    'liquidity-shapes': {
      title: 'Compare liquidity shapes',
      summary: 'Understand focused, spread, equal, single and wall shapes.',
      intro:
        'Biatec offers several liquidity shapes that distribute your deposit across price bins in different ways. Choosing the right shape is the single biggest decision when providing liquidity.',
      steps: [
        'Open Add liquidity for a pair.',
        'Focused: most liquidity at the current price - maximum fees while price stays put.',
        'Spread: most liquidity toward the edges - good for volatile, wide-ranging pairs.',
        'Equal: the same liquidity in every bin - simple, neutral coverage.',
        'Single bin: one classic range; Wall: a single price level that buys low and sells high.'
      ],
      tip: 'Start with Focused near the current price for a calm pair, or Spread/Equal when you expect wide swings.'
    },
    'lp-fee-tiers': {
      title: 'Choose an LP fee tier',
      summary: 'Pick the trading fee you earn as a liquidity provider.',
      intro:
        'Every pool charges a trading fee that goes to its liquidity providers. The fee tier you pick (from 0.01% to 10%) balances how much you earn per trade against how attractive your pool is to traders.',
      steps: [
        'Open Add liquidity for the pair.',
        'Find the LP fee selector.',
        'Low fees (0.01%-0.1%) suit stable pairs and attract the most volume.',
        'Standard fees (0.2%-0.3%) balance earnings and attractiveness.',
        'High fees (1%-10%) suit volatile or speculative assets.'
      ],
      tip: "Match the fee to the pair's volatility - too high and traders route elsewhere, too low and you under-earn on risky pairs."
    },
    'price-range': {
      title: 'Set your price range',
      summary: 'Define the low and high price where your liquidity is active.',
      intro:
        'Concentrated liquidity only earns fees while the market price is inside your chosen range. Setting the low and high price defines where your capital works.',
      steps: [
        'Open Add liquidity and select a shape that uses a range.',
        'Enter the low price (the bottom of your range).',
        'Enter the high price (the top of your range).',
        'A narrower range concentrates fees but is left more easily by the price.',
        'Review and confirm once the range matches your expectation.'
      ],
      tip: 'If the price leaves your range your position stops earning until it returns - widen the range to stay active longer.'
    },
    'precision-bins': {
      title: 'Set precision and bins',
      summary: 'Control how many price bins your liquidity is split into.',
      intro:
        'Precision determines how many discrete bins your range is divided into. More bins give finer control and let your liquidity aggregate cleanly with other providers.',
      steps: [
        'Open Add liquidity for the pair.',
        'Choose a liquidity shape that uses bins.',
        'Adjust the precision to set the number of bins across your range.',
        'Watch the per-bin preview update as you change precision.',
        'Review and confirm to deploy across the selected bins.'
      ],
      tip: 'Each new bin can mean a new pool contract and its MBR cost - higher precision is more granular but costs more ALGO to seed.'
    },
    'pool-costs-mbr': {
      title: 'Understand pool costs (MBR)',
      summary: 'Know the ALGO you pay to fund and hold a position.',
      intro:
        'Adding liquidity has real ALGO costs beyond your deposit: each new pool contract requires a minimum balance (MBR), and your LP token reserve is locked while you hold the position.',
      steps: [
        'Proceed to the review step of Add liquidity.',
        'Read the new-pool funding line - MBR per new contract across your bins.',
        'Read the LP token reserve that is locked while you hold the position.',
        'Check the estimated network fees and total ALGO out of pocket.',
        'Confirm only if the ALGO total matches your expectation.'
      ],
      tip: 'Unused pool funding is returned, and the LP reserve comes back when you fully exit the position.'
    },
    'copy-address': {
      title: 'Copy your account address',
      summary: 'Copy your connected Algorand address to the clipboard.',
      intro:
        'Once connected, your shortened address appears in the header. You can copy the full address with a single click to receive assets or share it.',
      steps: [
        'Connect your wallet so the address chip appears in the header.',
        'Click the address chip (it shows the first and last characters).',
        'The full address is copied to your clipboard and a toast confirms it.',
        'Paste it wherever you need to receive funds.'
      ],
      tip: 'Always double-check the first and last characters of an address before sending funds to it.'
    },
    'disconnect-wallet': {
      title: 'Disconnect your wallet',
      summary: 'Log out and clear your authenticated session.',
      intro:
        'Disconnecting logs you out of the app. Because Biatec is self-custodial, this only ends the local session - your assets always remain in your own account.',
      steps: [
        'Find the Logout button in the header next to your address chip.',
        'Click Logout.',
        'Your session ends and authenticated features lock again.',
        'Reconnect any time with Login.'
      ],
      tip: 'Disconnect on shared or public computers so the next person cannot sign transactions from your session.'
    },
    'tx-validity': {
      title: 'Set transaction validity window',
      summary: 'Control how long your transactions stay valid.',
      intro:
        'Algorand transactions are valid only for a window of rounds. The last valid round offset sets how many rounds after the first valid round your transactions can still be confirmed.',
      steps: [
        'Open Settings from the cog menu, or go to /settings.',
        'Find the Blockchain configuration section.',
        'Adjust the Last valid round offset (default 100).',
        'A larger offset gives transactions more time to confirm on slow connections.',
        'The setting is saved locally and applied to new transactions.'
      ],
      tip: 'Raise the offset if transactions expire before you finish signing; lower it if you want tighter expiry.'
    },
    'localnet-dev': {
      title: 'Develop against Localnet',
      summary: 'Run the DEX against a local Algorand development network.',
      intro:
        'Localnet lets developers run Biatec DEX against a local Algorand node, with a custom endpoint, port and token - ideal for testing contracts and flows without touching public networks.',
      steps: [
        'Start your local Algorand network (for example with AlgoKit).',
        'Open the settings (cog) menu and switch the Environment to Localnet.',
        'Open Settings and set the blockchain endpoint, port and token to your node.',
        'Available assets and pools reload for Localnet.',
        'Test the full create-pool, add-liquidity and swap lifecycle locally.'
      ],
      tip: 'Localnet is the safest place to experiment - tokens and pools there have no real value.'
    },
    documentation: {
      title: 'Open the documentation',
      summary: 'Find deeper technical docs and the source code.',
      intro:
        'Beyond this in-app help, Biatec maintains external documentation and an open-source codebase for deeper technical detail about the protocol and the app.',
      steps: [
        'Open the settings (cog) menu and choose Documentation, or visit the About page.',
        'Follow the Documentation link to docs.dex.biatec.io.',
        'Use the About page links for the source code on GitHub.',
        'Refer to the docs for protocol details not covered in these guides.',
        'Return to this help center for step-by-step app walkthroughs.'
      ],
      tip: 'Use this help center for how-to walkthroughs and the external docs for protocol and contract specifics.'
    },
    'security-best-practices': {
      title: 'Security best practices',
      summary: 'Protect your funds while using a self-custodial DEX.',
      intro:
        'Biatec DEX never holds your assets, which means security is in your hands. A few habits dramatically reduce your risk when signing transactions.',
      steps: [
        'Verify every transaction in your wallet before signing - amounts, recipients and no rekey or close-out.',
        'Prefer a multisig account with hardware signers for large balances.',
        'Treat ARC-76 email/password accounts as the fastest but least secure option.',
        'Never share your mnemonic or password, and beware of look-alike scam tokens.',
        'Double-check you are on the official site before connecting your wallet.'
      ],
      tip: 'The strongest setup is a multisig with 2FA across multiple hardware devices (for example Ledgers).'
    },
    'help-center': {
      title: 'Using the help center',
      summary: 'Find guides for every Biatec DEX feature, with localized screenshots.',
      intro:
        'This help center lists every feature of Biatec DEX as a searchable guide. Each guide explains the feature step by step and shows a screenshot in your current language.',
      steps: [
        'Open Help from the question-mark icon in the header.',
        'Search or browse the categories to find a topic.',
        'Open a guide to read its description, steps and tip.',
        'Use Open the feature to jump straight to that part of the app.',
        'Follow the related guides at the bottom to keep learning.'
      ],
      tip: 'Switch the interface language first if you want the help screenshots and text in another language.'
    }
  }
}

// ── Per-language translations of the visible short strings ──────────────────
// Each entry: chrome, tooltipHelp, categories, and useCases[slug] = { title, summary }.
// The longer bodies (intro/steps/tip) are shared from English below.
const tr = {
  sk: {
    chrome: {
      title: 'Centrum pomoci',
      subtitle:
        'Podrobné návody pre každú funkciu Biatec DEX. Hľadajte alebo prechádzajte podľa kategórií.',
      searchPlaceholder: 'Hľadať návody',
      noResults: 'Vášmu hľadaniu nezodpovedajú žiadne návody.',
      notFound: 'Tento návod sa nepodarilo nájsť.',
      backToHelp: 'Späť na pomoc',
      stepsTitle: 'Krok za krokom',
      tipTitle: 'Tip',
      openFeature: 'Otvoriť funkciu',
      relatedTitle: 'Súvisiace návody'
    },
    tooltipHelp: 'Otvoriť centrum pomoci',
    categories: {
      gettingStarted: 'Začíname',
      trading: 'Obchodovanie',
      liquidity: 'Likvidita',
      account: 'Účet a aktíva',
      networks: 'Siete a nastavenia',
      info: 'Informácie'
    },
    useCases: {
      'explore-assets': {
        title: 'Preskúmať aktíva',
        summary: 'Prehliadajte všetky aktíva v pooloch Biatec DEX vrátane TVL, cien a počtu poolov.'
      },
      'connect-wallet': {
        title: 'Pripojiť peňaženku',
        summary: 'Prihláste sa peňaženkou Algorand alebo účtom ARC-76 (e-mail/heslo).'
      },
      'switch-language': {
        title: 'Zmeniť jazyk',
        summary: 'Prepnite rozhranie medzi 10 podporovanými jazykmi.'
      },
      'switch-theme': {
        title: 'Svetlý / tmavý režim',
        summary: 'Prepínajte medzi svetlým a tmavým režimom v hlavičke.'
      },
      'trade-screen': {
        title: 'Obchodná obrazovka',
        summary: 'Sledujte živé ceny, grafy, hĺbku trhu a zadávajte príkazy pre pár.'
      },
      'buy-order': {
        title: 'Zadať nákupný príkaz',
        summary: 'Kúpte aktívum za najlepšiu dostupnú cenu cez DEX agregátor.'
      },
      'sell-order': {
        title: 'Zadať predajný príkaz',
        summary: 'Predajte aktívum za kótovaciu menu za najlepšiu dostupnú cenu.'
      },
      'market-depth': {
        title: 'Čítať hĺbku trhu',
        summary: 'Pozrite si nákupy, strednú cenu a ponuky pre pár.'
      },
      'recent-trades': {
        title: 'Posledné obchody',
        summary: 'Sledujte živý tok uskutočnených obchodov pre pár.'
      },
      'pool-swap': {
        title: 'Swap priamo v poole',
        summary: 'Obchodujte proti jednému poolu Biatec CLAMM bez agregátora.'
      },
      'liquidity-dashboard': {
        title: 'Nástenka poskytovateľa likvidity',
        summary: 'Všetky vaše pozície, hodnoty poolov a zostatky na jednom mieste.'
      },
      'create-pool': {
        title: 'Vytvoriť nový pool',
        summary: 'Otvorte úplne nový pool likvidity pre ľubovoľný pár aktív Algorand.'
      },
      'add-liquidity-focused': {
        title: 'Pridať likviditu - sústredený tvar',
        summary: 'Sústreďte najviac likvidity okolo aktuálnej ceny pre vyššie poplatky.'
      },
      'add-liquidity-spread': {
        title: 'Pridať likviditu - rozložený tvar',
        summary: 'Umiestnite viac likvidity k okrajom širokého rozsahu.'
      },
      'add-liquidity-equal': {
        title: 'Pridať likviditu - rovnaké biny',
        summary: 'Rozložte rovnakú likviditu do každého cenového binu rozsahu.'
      },
      'add-liquidity-single': {
        title: 'Pridať likviditu - jeden bin',
        summary: 'Poskytnite likviditu ako jednu pozíciu medzi min a max cenou.'
      },
      'add-liquidity-wall': {
        title: 'Pridať likviditu - cenová stena',
        summary: 'Nastavte jednu cenovú stenu, ktorá pod ňou nakupuje a nad ňou predáva.'
      },
      'remove-liquidity': {
        title: 'Odobrať likviditu',
        summary: 'Vyberte časť alebo celú pozíciu a nárokujte si naakumulované poplatky.'
      },
      'manage-liquidity': {
        title: 'Spravovať likviditu',
        summary: 'Centrum pre prehľad poolov a pridávanie, odoberanie či swapy.'
      },
      'review-before-sign': {
        title: 'Skontrolovať pred podpisom',
        summary: 'Presne pochopte, čo sa chystá vaša peňaženka schváliť.'
      },
      'trader-dashboard': {
        title: 'Nástenka obchodníka',
        summary: 'Sledujte svoje aktíva, zostatky a živé ocenenie v USD.'
      },
      'asset-opt-in': {
        title: 'Opt-in na aktívum',
        summary: 'Zaregistrujte aktívum Algorand na svoj účet pred jeho prijatím.'
      },
      'switch-network': {
        title: 'Zmeniť blockchain',
        summary: 'Prepínajte medzi Mainnet, Testnet a Localnet.'
      },
      'settings-blockchain': {
        title: 'Nastaviť blockchain endpoint',
        summary: 'Nasmerujte aplikáciu na vlastný algod endpoint, port a token.'
      },
      'settings-swap': {
        title: 'Nastaviť slippage swapu',
        summary: 'Nastavte maximálnu toleranciu slippage pre vaše obchody.'
      },
      'reset-settings': {
        title: 'Obnoviť konfiguráciu',
        summary: 'Obnovte všetky nastavenia na predvolené hodnoty.'
      },
      about: {
        title: 'O Biatec DEX',
        summary: 'Zistite, čo je Biatec DEX, jeho upozornenia a zoznam aktív.'
      },
      'find-asset-by-id': {
        title: 'Nájsť aktívum podľa ID',
        summary: 'Nájdite token podľa jeho presného ID aktíva Algorand (ASA).'
      },
      'select-pair': {
        title: 'Prepnúť obchodný pár',
        summary: 'Zmeňte aktívum alebo kótovaciu menu, ktorú obchodujete.'
      },
      'price-chart': {
        title: 'Čítať cenový graf',
        summary: 'Sledujte pohyby ceny a objem v rôznych časových rámcoch.'
      },
      'asset-info': {
        title: 'Čítať panel informácií o aktíve',
        summary: 'Pozrite si poslednú cenu, objem a ceny v rôznych časových rámcoch.'
      },
      'share-pair': {
        title: 'Zdieľať obchodný pár',
        summary: 'Pošlite komukoľvek priamy odkaz na konkrétny pár a sieť.'
      },
      'liquidity-shapes': {
        title: 'Porovnať tvary likvidity',
        summary: 'Pochopte tvary sústredený, rozložený, rovnaký, jeden bin a stena.'
      },
      'lp-fee-tiers': {
        title: 'Vybrať úroveň LP poplatku',
        summary: 'Vyberte obchodný poplatok, ktorý zarábate ako poskytovateľ likvidity.'
      },
      'price-range': {
        title: 'Nastaviť cenový rozsah',
        summary: 'Definujte dolnú a hornú cenu, kde je vaša likvidita aktívna.'
      },
      'precision-bins': {
        title: 'Nastaviť presnosť a biny',
        summary: 'Určte, do koľkých cenových binov sa rozdelí vaša likvidita.'
      },
      'pool-costs-mbr': {
        title: 'Pochopiť náklady poolu (MBR)',
        summary: 'Vedzte, koľko ALGO platíte za financovanie a držanie pozície.'
      },
      'copy-address': {
        title: 'Skopírovať adresu účtu',
        summary: 'Skopírujte svoju pripojenú adresu Algorand do schránky.'
      },
      'disconnect-wallet': {
        title: 'Odpojiť peňaženku',
        summary: 'Odhláste sa a vymažte svoju overenú reláciu.'
      },
      'tx-validity': {
        title: 'Nastaviť okno platnosti transakcie',
        summary: 'Určte, ako dlho zostanú vaše transakcie platné.'
      },
      'localnet-dev': {
        title: 'Vyvíjať na Localnet',
        summary: 'Spustite DEX proti lokálnej vývojovej sieti Algorand.'
      },
      documentation: {
        title: 'Otvoriť dokumentáciu',
        summary: 'Nájdite podrobnejšiu technickú dokumentáciu a zdrojový kód.'
      },
      'security-best-practices': {
        title: 'Najlepšie bezpečnostné postupy',
        summary: 'Chráňte svoje prostriedky pri používaní samoúschovného DEX.'
      },
      'help-center': {
        title: 'Používanie centra pomoci',
        summary: 'Nájdite návody pre každú funkciu Biatec DEX s lokalizovanými snímkami.'
      }
    }
  },
  pl: {
    chrome: {
      title: 'Centrum pomocy',
      subtitle:
        'Szczegółowe przewodniki po każdej funkcji Biatec DEX. Wyszukaj lub przeglądaj według kategorii.',
      searchPlaceholder: 'Szukaj przewodników',
      noResults: 'Żaden przewodnik nie pasuje do wyszukiwania.',
      notFound: 'Nie znaleziono tego przewodnika.',
      backToHelp: 'Powrót do pomocy',
      stepsTitle: 'Krok po kroku',
      tipTitle: 'Wskazówka',
      openFeature: 'Otwórz funkcję',
      relatedTitle: 'Powiązane przewodniki'
    },
    tooltipHelp: 'Otwórz centrum pomocy',
    categories: {
      gettingStarted: 'Pierwsze kroki',
      trading: 'Handel',
      liquidity: 'Płynność',
      account: 'Konto i aktywa',
      networks: 'Sieci i ustawienia',
      info: 'Informacje'
    },
    useCases: {
      'explore-assets': {
        title: 'Przeglądaj aktywa',
        summary: 'Przeglądaj wszystkie aktywa w pulach Biatec DEX z TVL, cenami i liczbą pul.'
      },
      'connect-wallet': {
        title: 'Połącz portfel',
        summary: 'Zaloguj się portfelem Algorand lub kontem ARC-76 (e-mail/hasło).'
      },
      'switch-language': {
        title: 'Zmień język',
        summary: 'Przełączaj interfejs między 10 obsługiwanymi językami.'
      },
      'switch-theme': {
        title: 'Tryb jasny / ciemny',
        summary: 'Przełączaj tryb jasny i ciemny z nagłówka.'
      },
      'trade-screen': {
        title: 'Ekran handlu',
        summary: 'Śledź ceny na żywo, wykresy, głębokość rynku i składaj zlecenia dla pary.'
      },
      'buy-order': {
        title: 'Złóż zlecenie kupna',
        summary: 'Kup aktywo po najlepszej dostępnej cenie przez agregator DEX.'
      },
      'sell-order': {
        title: 'Złóż zlecenie sprzedaży',
        summary: 'Sprzedaj aktywo za walutę kwotowaną po najlepszej cenie.'
      },
      'market-depth': {
        title: 'Czytaj głębokość rynku',
        summary: 'Zobacz oferty kupna, cenę środkową i oferty sprzedaży dla pary.'
      },
      'recent-trades': {
        title: 'Ostatnie transakcje',
        summary: 'Śledź na żywo strumień zrealizowanych transakcji dla pary.'
      },
      'pool-swap': {
        title: 'Swap bezpośrednio w puli',
        summary: 'Handluj z jedną pulą Biatec CLAMM bez agregatora.'
      },
      'liquidity-dashboard': {
        title: 'Panel dostawcy płynności',
        summary: 'Wszystkie pozycje, wartości pul i salda w jednym miejscu.'
      },
      'create-pool': {
        title: 'Utwórz nową pulę',
        summary: 'Otwórz zupełnie nową pulę płynności dla dowolnej pary aktywów Algorand.'
      },
      'add-liquidity-focused': {
        title: 'Dodaj płynność - kształt skupiony',
        summary: 'Skup najwięcej płynności wokół bieżącej ceny, by zarobić więcej.'
      },
      'add-liquidity-spread': {
        title: 'Dodaj płynność - kształt rozproszony',
        summary: 'Umieść więcej płynności przy krawędziach szerokiego zakresu.'
      },
      'add-liquidity-equal': {
        title: 'Dodaj płynność - równe kosze',
        summary: 'Rozłóż taką samą płynność na każdy kosz cenowy zakresu.'
      },
      'add-liquidity-single': {
        title: 'Dodaj płynność - jeden kosz',
        summary: 'Zapewnij płynność jako jedną pozycję między ceną min i max.'
      },
      'add-liquidity-wall': {
        title: 'Dodaj płynność - ściana cenowa',
        summary: 'Ustaw jedną ścianę cenową, która kupuje poniżej i sprzedaje powyżej.'
      },
      'remove-liquidity': {
        title: 'Usuń płynność',
        summary: 'Wypłać część lub całość pozycji i odbierz naliczone opłaty.'
      },
      'manage-liquidity': {
        title: 'Zarządzaj płynnością',
        summary: 'Centrum do podglądu pul oraz dodawania, usuwania i swapów.'
      },
      'review-before-sign': {
        title: 'Sprawdź przed podpisem',
        summary: 'Dokładnie zrozum, co zatwierdzi Twój portfel.'
      },
      'trader-dashboard': {
        title: 'Panel tradera',
        summary: 'Śledź swoje aktywa, salda i wyceny na żywo w USD.'
      },
      'asset-opt-in': {
        title: 'Opt-in do aktywa',
        summary: 'Zarejestruj aktywo Algorand na koncie przed jego otrzymaniem.'
      },
      'switch-network': {
        title: 'Zmień blockchain',
        summary: 'Przełączaj między Mainnet, Testnet i Localnet.'
      },
      'settings-blockchain': {
        title: 'Skonfiguruj punkt blockchain',
        summary: 'Wskaż aplikacji własny endpoint algod, port i token.'
      },
      'settings-swap': {
        title: 'Skonfiguruj poślizg swapu',
        summary: 'Ustaw maksymalną tolerancję poślizgu dla transakcji.'
      },
      'reset-settings': {
        title: 'Zresetuj konfigurację',
        summary: 'Przywróć wszystkie ustawienia do wartości domyślnych.'
      },
      about: {
        title: 'O Biatec DEX',
        summary: 'Dowiedz się, czym jest Biatec DEX, jego zastrzeżenia i listę aktywów.'
      },
      'find-asset-by-id': {
        title: 'Znajdź aktywo po ID',
        summary: 'Znajdź token po jego dokładnym ID aktywa Algorand (ASA).'
      },
      'select-pair': {
        title: 'Zmień parę handlową',
        summary: 'Zmień aktywo lub walutę kwotowaną, którą handlujesz.'
      },
      'price-chart': {
        title: 'Czytaj wykres ceny',
        summary: 'Śledź ruchy ceny i wolumen w różnych ramach czasowych.'
      },
      'asset-info': {
        title: 'Czytaj panel informacji o aktywie',
        summary: 'Zobacz ostatnią cenę, wolumen i ceny w wielu ramach czasowych.'
      },
      'share-pair': {
        title: 'Udostępnij parę handlową',
        summary: 'Wyślij komukolwiek bezpośredni link do konkretnej pary i sieci.'
      },
      'liquidity-shapes': {
        title: 'Porównaj kształty płynności',
        summary: 'Zrozum kształty skupiony, rozproszony, równy, jeden kosz i ściana.'
      },
      'lp-fee-tiers': {
        title: 'Wybierz poziom opłaty LP',
        summary: 'Wybierz opłatę handlową, którą zarabiasz jako dostawca płynności.'
      },
      'price-range': {
        title: 'Ustaw zakres cenowy',
        summary: 'Określ dolną i górną cenę, gdzie Twoja płynność jest aktywna.'
      },
      'precision-bins': {
        title: 'Ustaw precyzję i kosze',
        summary: 'Określ, na ile koszy cenowych dzieli się Twoja płynność.'
      },
      'pool-costs-mbr': {
        title: 'Zrozum koszty puli (MBR)',
        summary: 'Wiedz, ile ALGO płacisz za sfinansowanie i utrzymanie pozycji.'
      },
      'copy-address': {
        title: 'Skopiuj adres konta',
        summary: 'Skopiuj swój podłączony adres Algorand do schowka.'
      },
      'disconnect-wallet': {
        title: 'Odłącz portfel',
        summary: 'Wyloguj się i wyczyść swoją uwierzytelnioną sesję.'
      },
      'tx-validity': {
        title: 'Ustaw okno ważności transakcji',
        summary: 'Określ, jak długo Twoje transakcje pozostają ważne.'
      },
      'localnet-dev': {
        title: 'Twórz na Localnet',
        summary: 'Uruchom DEX na lokalnej sieci deweloperskiej Algorand.'
      },
      documentation: {
        title: 'Otwórz dokumentację',
        summary: 'Znajdź szczegółową dokumentację techniczną i kod źródłowy.'
      },
      'security-best-practices': {
        title: 'Najlepsze praktyki bezpieczeństwa',
        summary: 'Chroń swoje środki podczas korzystania z samoobsługowego DEX.'
      },
      'help-center': {
        title: 'Korzystanie z centrum pomocy',
        summary: 'Znajdź przewodniki po każdej funkcji Biatec DEX z lokalnymi zrzutami.'
      }
    }
  },
  hu: {
    chrome: {
      title: 'Súgóközpont',
      subtitle:
        'Lépésről lépésre útmutatók a Biatec DEX minden funkciójához. Keressen vagy böngésszen kategóriák szerint.',
      searchPlaceholder: 'Útmutatók keresése',
      noResults: 'Nincs a keresésnek megfelelő útmutató.',
      notFound: 'Ez az útmutató nem található.',
      backToHelp: 'Vissza a súgóhoz',
      stepsTitle: 'Lépésről lépésre',
      tipTitle: 'Tipp',
      openFeature: 'Funkció megnyitása',
      relatedTitle: 'Kapcsolódó útmutatók'
    },
    tooltipHelp: 'Súgóközpont megnyitása',
    categories: {
      gettingStarted: 'Első lépések',
      trading: 'Kereskedés',
      liquidity: 'Likviditás',
      account: 'Fiók és eszközök',
      networks: 'Hálózatok és beállítások',
      info: 'Információ'
    },
    useCases: {
      'explore-assets': {
        title: 'Eszközök felfedezése',
        summary: 'Böngéssz minden eszközt a Biatec DEX poolokban TVL-lel, árakkal és poolszámmal.'
      },
      'connect-wallet': {
        title: 'Tárca csatlakoztatása',
        summary: 'Jelentkezz be Algorand tárcával vagy ARC-76 e-mail/jelszó fiókkal.'
      },
      'switch-language': {
        title: 'Nyelv módosítása',
        summary: 'Váltson a felület 10 támogatott nyelve között.'
      },
      'switch-theme': {
        title: 'Világos / sötét téma',
        summary: 'Váltson világos és sötét mód között a fejlécből.'
      },
      'trade-screen': {
        title: 'Kereskedési képernyő',
        summary: 'Élő árak, grafikonok, piaci mélység és megbízások egy párhoz.'
      },
      'buy-order': {
        title: 'Vételi megbízás',
        summary: 'Vásárolj eszközt a legjobb elérhető áron a DEX aggregátoron át.'
      },
      'sell-order': {
        title: 'Eladási megbízás',
        summary: 'Adj el eszközt a jegyzett devizáért a legjobb áron.'
      },
      'market-depth': {
        title: 'Piaci mélység olvasása',
        summary: 'Lásd a vételi, a középárat és az eladási ajánlatokat egy párhoz.'
      },
      'recent-trades': {
        title: 'Legutóbbi ügyletek',
        summary: 'Kövesd élőben a pár végrehajtott ügyleteit.'
      },
      'pool-swap': {
        title: 'Swap közvetlenül a poolban',
        summary: 'Kereskedj egyetlen Biatec CLAMM poollal, aggregátor nélkül.'
      },
      'liquidity-dashboard': {
        title: 'Likviditásszolgáltatói irányítópult',
        summary: 'Minden pozíciód, poolérték és egyenleg egy helyen.'
      },
      'create-pool': {
        title: 'Új pool létrehozása',
        summary: 'Nyiss teljesen új likviditási poolt bármely Algorand eszközpárhoz.'
      },
      'add-liquidity-focused': {
        title: 'Likviditás hozzáadása - fókuszált forma',
        summary: 'A legtöbb likviditást az aktuális ár köré összpontosítja a több díjért.'
      },
      'add-liquidity-spread': {
        title: 'Likviditás hozzáadása - szórt forma',
        summary: 'Több likviditást helyez a széles tartomány széleire.'
      },
      'add-liquidity-equal': {
        title: 'Likviditás hozzáadása - egyenlő rekeszek',
        summary: 'Ugyanannyi likviditást oszt el a tartomány minden árrekeszébe.'
      },
      'add-liquidity-single': {
        title: 'Likviditás hozzáadása - egy rekesz',
        summary: 'Likviditás egyetlen pozícióként egy min és max ár között.'
      },
      'add-liquidity-wall': {
        title: 'Likviditás hozzáadása - árfal',
        summary: 'Egyetlen árfal, amely alatta vásárol és felette ad el.'
      },
      'remove-liquidity': {
        title: 'Likviditás eltávolítása',
        summary: 'Vedd ki a pozíció egy részét vagy egészét a felhalmozott díjakkal.'
      },
      'manage-liquidity': {
        title: 'Likviditás kezelése',
        summary: 'Központ a poolok megtekintéséhez, hozzáadáshoz, eltávolításhoz, swaphoz.'
      },
      'review-before-sign': {
        title: 'Ellenőrzés aláírás előtt',
        summary: 'Pontosan értsd meg, mit készül jóváhagyni a tárcád.'
      },
      'trader-dashboard': {
        title: 'Kereskedői irányítópult',
        summary: 'Kövesd eszközeidet, egyenlegeidet és élő USD-értékeidet.'
      },
      'asset-opt-in': {
        title: 'Eszköz opt-in',
        summary: 'Regisztrálj egy Algorand eszközt a fiókodra a fogadás előtt.'
      },
      'switch-network': {
        title: 'Blokklánc váltása',
        summary: 'Válts a Mainnet, Testnet és Localnet között.'
      },
      'settings-blockchain': {
        title: 'Blokklánc végpont beállítása',
        summary: 'Mutass az alkalmazásnak saját algod végpontot, portot és tokent.'
      },
      'settings-swap': {
        title: 'Swap csúszás beállítása',
        summary: 'Állítsd be a kereskedéseid maximális csúszástűrését.'
      },
      'reset-settings': {
        title: 'Konfiguráció visszaállítása',
        summary: 'Állítsd vissza minden beállítást az alapértékekre.'
      },
      about: {
        title: 'A Biatec DEX-ről',
        summary: 'Tudd meg, mi a Biatec DEX, a jognyilatkozatai és eszközei.'
      },
      'find-asset-by-id': {
        title: 'Eszköz keresése azonosító alapján',
        summary: 'Találj meg egy tokent a pontos Algorand eszközazonosító (ASA) alapján.'
      },
      'select-pair': {
        title: 'Kereskedési pár váltása',
        summary: 'Változtasd meg a kereskedett eszközt vagy a jegyzett devizát.'
      },
      'price-chart': {
        title: 'Árgrafikon olvasása',
        summary: 'Kövesd az ármozgásokat és a forgalmat különböző időtávokon.'
      },
      'asset-info': {
        title: 'Eszközinformációs panel olvasása',
        summary: 'Lásd a legutóbbi árat, a forgalmat és a több időtávú árakat.'
      },
      'share-pair': {
        title: 'Kereskedési pár megosztása',
        summary: 'Küldj bárkinek közvetlen linket egy adott párhoz és hálózathoz.'
      },
      'liquidity-shapes': {
        title: 'Likviditási formák összehasonlítása',
        summary: 'Értsd meg a fókuszált, szórt, egyenlő, egy rekeszes és fal formákat.'
      },
      'lp-fee-tiers': {
        title: 'LP díjszint kiválasztása',
        summary: 'Válaszd ki a kereskedési díjat, amit likviditásszolgáltatóként keresel.'
      },
      'price-range': {
        title: 'Ártartomány beállítása',
        summary: 'Add meg az alsó és felső árat, ahol a likviditásod aktív.'
      },
      'precision-bins': {
        title: 'Pontosság és rekeszek beállítása',
        summary: 'Határozd meg, hány árrekeszre oszlik a likviditásod.'
      },
      'pool-costs-mbr': {
        title: 'Pool költségek megértése (MBR)',
        summary: 'Tudd meg, mennyi ALGO-t fizetsz a pozíció finanszírozásáért és tartásáért.'
      },
      'copy-address': {
        title: 'Fiókcím másolása',
        summary: 'Másold a csatlakoztatott Algorand címedet a vágólapra.'
      },
      'disconnect-wallet': {
        title: 'Tárca leválasztása',
        summary: 'Jelentkezz ki és töröld a hitelesített munkamenetet.'
      },
      'tx-validity': {
        title: 'Tranzakció érvényességi ablakának beállítása',
        summary: 'Határozd meg, meddig maradnak érvényesek a tranzakcióid.'
      },
      'localnet-dev': {
        title: 'Fejlesztés Localneten',
        summary: 'Futtasd a DEX-et helyi Algorand fejlesztői hálózaton.'
      },
      documentation: {
        title: 'Dokumentáció megnyitása',
        summary: 'Találj részletesebb technikai dokumentációt és forráskódot.'
      },
      'security-best-practices': {
        title: 'Biztonsági ajánlások',
        summary: 'Védd a pénzed egy önkusztodiális DEX használata közben.'
      },
      'help-center': {
        title: 'A súgóközpont használata',
        summary: 'Találj útmutatókat a Biatec DEX minden funkciójához lokalizált képekkel.'
      }
    }
  },
  it: {
    chrome: {
      title: 'Centro assistenza',
      subtitle: 'Guide passo passo per ogni funzione di Biatec DEX. Cerca o sfoglia per categoria.',
      searchPlaceholder: 'Cerca nelle guide',
      noResults: 'Nessuna guida corrisponde alla ricerca.',
      notFound: 'Impossibile trovare questa guida.',
      backToHelp: "Torna all'assistenza",
      stepsTitle: 'Passo dopo passo',
      tipTitle: 'Consiglio',
      openFeature: 'Apri la funzione',
      relatedTitle: 'Guide correlate'
    },
    tooltipHelp: 'Apri il centro assistenza',
    categories: {
      gettingStarted: 'Per iniziare',
      trading: 'Trading',
      liquidity: 'Liquidità',
      account: 'Account e asset',
      networks: 'Reti e impostazioni',
      info: 'Informazioni'
    },
    useCases: {
      'explore-assets': {
        title: 'Esplora gli asset',
        summary:
          'Sfoglia tutti gli asset nelle pool di Biatec DEX con TVL, prezzi e numero di pool.'
      },
      'connect-wallet': {
        title: 'Collega un wallet',
        summary: 'Accedi con il tuo wallet Algorand o un account ARC-76 (email/password).'
      },
      'switch-language': {
        title: 'Cambia lingua',
        summary: "Cambia l'interfaccia tra le 10 lingue supportate."
      },
      'switch-theme': {
        title: 'Tema chiaro / scuro',
        summary: "Alterna tra modalità chiara e scura dall'intestazione."
      },
      'trade-screen': {
        title: 'La schermata di trading',
        summary: 'Prezzi live, grafici, profondità di mercato e ordini per una coppia.'
      },
      'buy-order': {
        title: "Inserisci un ordine d'acquisto",
        summary: "Compra un asset al miglior prezzo tramite l'aggregatore DEX."
      },
      'sell-order': {
        title: 'Inserisci un ordine di vendita',
        summary: 'Vendi un asset per la valuta di quotazione al miglior prezzo.'
      },
      'market-depth': {
        title: 'Leggi la profondità di mercato',
        summary: 'Vedi bid, prezzo medio e offerte disponibili per una coppia.'
      },
      'recent-trades': {
        title: 'Operazioni recenti',
        summary: 'Segui in tempo reale le operazioni eseguite per una coppia.'
      },
      'pool-swap': {
        title: 'Swap diretto su una pool',
        summary: 'Opera contro una singola pool Biatec CLAMM senza aggregatore.'
      },
      'liquidity-dashboard': {
        title: 'Dashboard del fornitore di liquidità',
        summary: 'Tutte le tue posizioni, i valori delle pool e i saldi in un unico posto.'
      },
      'create-pool': {
        title: 'Crea una nuova pool',
        summary: 'Apri una pool di liquidità nuova per qualsiasi coppia di asset Algorand.'
      },
      'add-liquidity-focused': {
        title: 'Aggiungi liquidità - forma focalizzata',
        summary: 'Concentra più liquidità intorno al prezzo attuale per più commissioni.'
      },
      'add-liquidity-spread': {
        title: 'Aggiungi liquidità - forma distribuita',
        summary: 'Metti più liquidità verso i bordi di un ampio intervallo.'
      },
      'add-liquidity-equal': {
        title: 'Aggiungi liquidità - bin uguali',
        summary: "Distribuisci la stessa liquidità in ogni bin di prezzo dell'intervallo."
      },
      'add-liquidity-single': {
        title: 'Aggiungi liquidità - bin singolo',
        summary: 'Fornisci liquidità come una posizione tra prezzo min e max.'
      },
      'add-liquidity-wall': {
        title: 'Aggiungi liquidità - muro di prezzo',
        summary: 'Imposta un muro di prezzo che compra sotto e vende sopra.'
      },
      'remove-liquidity': {
        title: 'Rimuovi liquidità',
        summary: 'Preleva parte o tutta una posizione e riscuoti le commissioni maturate.'
      },
      'manage-liquidity': {
        title: 'Gestisci la liquidità',
        summary: 'Il centro per vedere le pool e aggiungere, rimuovere o fare swap.'
      },
      'review-before-sign': {
        title: 'Controlla prima di firmare',
        summary: 'Capisci esattamente cosa sta per approvare il tuo wallet.'
      },
      'trader-dashboard': {
        title: 'Dashboard del trader',
        summary: 'Monitora i tuoi asset, saldi e valutazioni live in USD.'
      },
      'asset-opt-in': {
        title: 'Opt-in a un asset',
        summary: 'Registra un asset Algorand sul tuo account prima di riceverlo.'
      },
      'switch-network': {
        title: 'Cambia la blockchain',
        summary: 'Passa tra Mainnet, Testnet e Localnet.'
      },
      'settings-blockchain': {
        title: "Configura l'endpoint blockchain",
        summary: "Punta l'app a un endpoint algod, porta e token personalizzati."
      },
      'settings-swap': {
        title: 'Configura lo slippage dello swap',
        summary: 'Imposta la tolleranza massima di slippage per le operazioni.'
      },
      'reset-settings': {
        title: 'Reimposta la configurazione',
        summary: 'Ripristina tutte le impostazioni ai valori predefiniti.'
      },
      about: {
        title: 'Informazioni su Biatec DEX',
        summary: "Scopri cos'è Biatec DEX, le sue avvertenze e gli asset elencati."
      },
      'find-asset-by-id': {
        title: 'Trova un asset tramite ID',
        summary: 'Individua un token tramite il suo ID asset Algorand esatto (ASA).'
      },
      'select-pair': {
        title: 'Cambia la coppia di trading',
        summary: "Cambia l'asset o la valuta di quotazione che stai negoziando."
      },
      'price-chart': {
        title: 'Leggi il grafico dei prezzi',
        summary: 'Segui i movimenti di prezzo e il volume su diversi intervalli.'
      },
      'asset-info': {
        title: 'Leggi il pannello info asset',
        summary: 'Vedi ultimo prezzo, volume e prezzi su più intervalli.'
      },
      'share-pair': {
        title: 'Condividi una coppia di trading',
        summary: 'Invia a chiunque un link diretto a una coppia e rete specifiche.'
      },
      'liquidity-shapes': {
        title: 'Confronta le forme di liquidità',
        summary: 'Capisci le forme focalizzata, distribuita, uguale, singola e muro.'
      },
      'lp-fee-tiers': {
        title: 'Scegli un livello di commissione LP',
        summary: 'Scegli la commissione di trading che guadagni come fornitore di liquidità.'
      },
      'price-range': {
        title: "Imposta l'intervallo di prezzo",
        summary: 'Definisci il prezzo minimo e massimo in cui la tua liquidità è attiva.'
      },
      'precision-bins': {
        title: 'Imposta precisione e bin',
        summary: 'Controlla in quanti bin di prezzo viene divisa la tua liquidità.'
      },
      'pool-costs-mbr': {
        title: 'Capisci i costi della pool (MBR)',
        summary: 'Sai quanti ALGO paghi per finanziare e mantenere una posizione.'
      },
      'copy-address': {
        title: "Copia l'indirizzo del tuo account",
        summary: 'Copia il tuo indirizzo Algorand connesso negli appunti.'
      },
      'disconnect-wallet': {
        title: 'Disconnetti il wallet',
        summary: 'Esci e cancella la tua sessione autenticata.'
      },
      'tx-validity': {
        title: 'Imposta la finestra di validità delle transazioni',
        summary: 'Controlla per quanto tempo le tue transazioni restano valide.'
      },
      'localnet-dev': {
        title: 'Sviluppa su Localnet',
        summary: 'Esegui il DEX su una rete di sviluppo Algorand locale.'
      },
      documentation: {
        title: 'Apri la documentazione',
        summary: 'Trova documentazione tecnica più approfondita e il codice sorgente.'
      },
      'security-best-practices': {
        title: 'Buone pratiche di sicurezza',
        summary: 'Proteggi i tuoi fondi usando un DEX self-custodial.'
      },
      'help-center': {
        title: 'Usare il centro assistenza',
        summary: 'Trova guide per ogni funzione di Biatec DEX con screenshot localizzati.'
      }
    }
  },
  ru: {
    chrome: {
      title: 'Центр помощи',
      subtitle:
        'Пошаговые руководства по каждой функции Biatec DEX. Ищите или просматривайте по категориям.',
      searchPlaceholder: 'Поиск по руководствам',
      noResults: 'Нет руководств, соответствующих запросу.',
      notFound: 'Не удалось найти это руководство.',
      backToHelp: 'Назад к помощи',
      stepsTitle: 'Пошагово',
      tipTitle: 'Совет',
      openFeature: 'Открыть функцию',
      relatedTitle: 'Похожие руководства'
    },
    tooltipHelp: 'Открыть центр помощи',
    categories: {
      gettingStarted: 'Начало работы',
      trading: 'Торговля',
      liquidity: 'Ликвидность',
      account: 'Аккаунт и активы',
      networks: 'Сети и настройки',
      info: 'Информация'
    },
    useCases: {
      'explore-assets': {
        title: 'Обзор активов',
        summary: 'Просматривайте все активы в пулах Biatec DEX с TVL, ценами и числом пулов.'
      },
      'connect-wallet': {
        title: 'Подключить кошелёк',
        summary: 'Войдите с кошельком Algorand или аккаунтом ARC-76 (email/пароль).'
      },
      'switch-language': {
        title: 'Сменить язык',
        summary: 'Переключайте интерфейс между 10 поддерживаемыми языками.'
      },
      'switch-theme': {
        title: 'Светлая / тёмная тема',
        summary: 'Переключайте светлый и тёмный режим в шапке.'
      },
      'trade-screen': {
        title: 'Экран торговли',
        summary: 'Живые цены, графики, глубина рынка и заявки для пары.'
      },
      'buy-order': {
        title: 'Заявка на покупку',
        summary: 'Купите актив по лучшей доступной цене через агрегатор DEX.'
      },
      'sell-order': {
        title: 'Заявка на продажу',
        summary: 'Продайте актив за котируемую валюту по лучшей цене.'
      },
      'market-depth': {
        title: 'Чтение глубины рынка',
        summary: 'Смотрите биды, среднюю цену и оферы для пары.'
      },
      'recent-trades': {
        title: 'Последние сделки',
        summary: 'Следите за живым потоком исполненных сделок по паре.'
      },
      'pool-swap': {
        title: 'Своп напрямую в пуле',
        summary: 'Торгуйте против одного пула Biatec CLAMM без агрегатора.'
      },
      'liquidity-dashboard': {
        title: 'Панель поставщика ликвидности',
        summary: 'Все ваши позиции, стоимость пулов и остатки в одном месте.'
      },
      'create-pool': {
        title: 'Создать новый пул',
        summary: 'Откройте совершенно новый пул ликвидности для любой пары активов Algorand.'
      },
      'add-liquidity-focused': {
        title: 'Добавить ликвидность - сфокусированная форма',
        summary: 'Сконцентрируйте ликвидность у текущей цены для большего дохода.'
      },
      'add-liquidity-spread': {
        title: 'Добавить ликвидность - распределённая форма',
        summary: 'Разместите больше ликвидности у краёв широкого диапазона.'
      },
      'add-liquidity-equal': {
        title: 'Добавить ликвидность - равные корзины',
        summary: 'Распределите равную ликвидность по каждой ценовой корзине.'
      },
      'add-liquidity-single': {
        title: 'Добавить ликвидность - одна корзина',
        summary: 'Дайте ликвидность одной позицией между мин и макс ценой.'
      },
      'add-liquidity-wall': {
        title: 'Добавить ликвидность - ценовая стена',
        summary: 'Задайте одну ценовую стену: покупка ниже и продажа выше неё.'
      },
      'remove-liquidity': {
        title: 'Убрать ликвидность',
        summary: 'Выведите часть или всю позицию и заберите накопленные комиссии.'
      },
      'manage-liquidity': {
        title: 'Управление ликвидностью',
        summary: 'Центр для просмотра пулов и добавления, вывода и свопов.'
      },
      'review-before-sign': {
        title: 'Проверка перед подписью',
        summary: 'Точно поймите, что собирается одобрить ваш кошелёк.'
      },
      'trader-dashboard': {
        title: 'Панель трейдера',
        summary: 'Отслеживайте активы, остатки и оценку в USD в реальном времени.'
      },
      'asset-opt-in': {
        title: 'Opt-in к активу',
        summary: 'Зарегистрируйте актив Algorand на счёте перед его получением.'
      },
      'switch-network': {
        title: 'Сменить блокчейн',
        summary: 'Переключайтесь между Mainnet, Testnet и Localnet.'
      },
      'settings-blockchain': {
        title: 'Настроить эндпоинт блокчейна',
        summary: 'Укажите приложению свой эндпоинт algod, порт и токен.'
      },
      'settings-swap': {
        title: 'Настроить проскальзывание свопа',
        summary: 'Задайте максимальный допуск проскальзывания для сделок.'
      },
      'reset-settings': {
        title: 'Сбросить конфигурацию',
        summary: 'Верните все настройки к значениям по умолчанию.'
      },
      about: {
        title: 'О Biatec DEX',
        summary: 'Узнайте, что такое Biatec DEX, его оговорки и список активов.'
      },
      'find-asset-by-id': {
        title: 'Найти актив по ID',
        summary: 'Найдите токен по его точному ID актива Algorand (ASA).'
      },
      'select-pair': {
        title: 'Сменить торговую пару',
        summary: 'Измените актив или котируемую валюту, которой торгуете.'
      },
      'price-chart': {
        title: 'Чтение графика цены',
        summary: 'Отслеживайте движение цены и объём на разных таймфреймах.'
      },
      'asset-info': {
        title: 'Чтение панели информации об активе',
        summary: 'Смотрите последнюю цену, объём и цены на разных таймфреймах.'
      },
      'share-pair': {
        title: 'Поделиться торговой парой',
        summary: 'Отправьте кому угодно прямую ссылку на конкретную пару и сеть.'
      },
      'liquidity-shapes': {
        title: 'Сравнить формы ликвидности',
        summary:
          'Разберитесь в формах: сфокусированная, распределённая, равная, одна корзина и стена.'
      },
      'lp-fee-tiers': {
        title: 'Выбрать уровень комиссии LP',
        summary: 'Выберите торговую комиссию, которую вы зарабатываете как поставщик ликвидности.'
      },
      'price-range': {
        title: 'Задать ценовой диапазон',
        summary: 'Определите нижнюю и верхнюю цену, где ваша ликвидность активна.'
      },
      'precision-bins': {
        title: 'Задать точность и корзины',
        summary: 'Определите, на сколько ценовых корзин делится ваша ликвидность.'
      },
      'pool-costs-mbr': {
        title: 'Понять расходы пула (MBR)',
        summary: 'Знайте, сколько ALGO вы платите за создание и удержание позиции.'
      },
      'copy-address': {
        title: 'Скопировать адрес аккаунта',
        summary: 'Скопируйте подключённый адрес Algorand в буфер обмена.'
      },
      'disconnect-wallet': {
        title: 'Отключить кошелёк',
        summary: 'Выйдите и очистите вашу авторизованную сессию.'
      },
      'tx-validity': {
        title: 'Задать окно действия транзакции',
        summary: 'Определите, как долго ваши транзакции остаются действительными.'
      },
      'localnet-dev': {
        title: 'Разработка на Localnet',
        summary: 'Запустите DEX на локальной сети разработки Algorand.'
      },
      documentation: {
        title: 'Открыть документацию',
        summary: 'Найдите подробную техническую документацию и исходный код.'
      },
      'security-best-practices': {
        title: 'Лучшие практики безопасности',
        summary: 'Защитите свои средства при использовании DEX с самостоятельным хранением.'
      },
      'help-center': {
        title: 'Использование центра помощи',
        summary: 'Найдите руководства по каждой функции Biatec DEX с локализованными снимками.'
      }
    }
  },
  zh: {
    chrome: {
      title: '帮助中心',
      subtitle: 'Biatec DEX 每项功能的分步指南。可搜索或按类别浏览。',
      searchPlaceholder: '搜索帮助指南',
      noResults: '没有符合搜索的指南。',
      notFound: '找不到该帮助指南。',
      backToHelp: '返回帮助',
      stepsTitle: '分步操作',
      tipTitle: '提示',
      openFeature: '打开该功能',
      relatedTitle: '相关指南'
    },
    tooltipHelp: '打开帮助中心',
    categories: {
      gettingStarted: '入门',
      trading: '交易',
      liquidity: '流动性',
      account: '账户与资产',
      networks: '网络与设置',
      info: '信息'
    },
    useCases: {
      'explore-assets': {
        title: '浏览资产',
        summary: '浏览 Biatec DEX 池中的所有资产，含 TVL、价格和池数量。'
      },
      'connect-wallet': {
        title: '连接钱包',
        summary: '使用 Algorand 钱包或 ARC-76 邮箱/密码账户登录。'
      },
      'switch-language': { title: '切换语言', summary: '在 10 种支持的语言间切换界面。' },
      'switch-theme': { title: '切换浅色/深色主题', summary: '从页眉切换浅色和深色模式。' },
      'trade-screen': {
        title: '交易界面',
        summary: '查看实时价格、图表、市场深度并为交易对下单。'
      },
      'buy-order': { title: '下买单', summary: '通过 DEX 聚合器以最优价格买入资产。' },
      'sell-order': { title: '下卖单', summary: '以最优价格将资产卖出换取计价货币。' },
      'market-depth': { title: '查看市场深度', summary: '查看交易对的买盘、中间价和卖盘。' },
      'recent-trades': { title: '查看最近成交', summary: '实时跟踪交易对的成交记录流。' },
      'pool-swap': {
        title: '在池中直接兑换',
        summary: '不经聚合器，直接与单个 Biatec CLAMM 池交易。'
      },
      'liquidity-dashboard': {
        title: '流动性提供者仪表板',
        summary: '在一个页面查看所有头寸、池价值和持仓。'
      },
      'create-pool': { title: '创建新池', summary: '为任意 Algorand 资产对开设全新的流动性池。' },
      'add-liquidity-focused': {
        title: '添加流动性 - 聚焦形态',
        summary: '将大部分流动性集中在当前价格附近以赚取更多手续费。'
      },
      'add-liquidity-spread': {
        title: '添加流动性 - 分散形态',
        summary: '将更多流动性放在宽区间的两端。'
      },
      'add-liquidity-equal': {
        title: '添加流动性 - 等额分箱',
        summary: '在区间的每个价格箱中分配相同的流动性。'
      },
      'add-liquidity-single': {
        title: '添加流动性 - 单一分箱',
        summary: '以介于最低与最高价之间的单一头寸提供流动性。'
      },
      'add-liquidity-wall': {
        title: '添加流动性 - 价格墙',
        summary: '设置一道价格墙，低于则买入、高于则卖出。'
      },
      'remove-liquidity': {
        title: '移除流动性',
        summary: '提取部分或全部头寸并领取已累积的手续费。'
      },
      'manage-liquidity': { title: '管理流动性', summary: '查看池并进行添加、移除或兑换的中枢。' },
      'review-before-sign': { title: '签名前审核', summary: '准确了解你的钱包即将批准的内容。' },
      'trader-dashboard': {
        title: '交易者仪表板',
        summary: '跟踪已选入的资产、余额和实时美元估值。'
      },
      'asset-opt-in': {
        title: '选入资产',
        summary: '在接收前，将某个 Algorand 资产注册到你的账户。'
      },
      'switch-network': {
        title: '切换区块链',
        summary: '在 Mainnet、Testnet 和 Localnet 之间切换。'
      },
      'settings-blockchain': {
        title: '配置区块链端点',
        summary: '让应用指向自定义的 algod 端点、端口和令牌。'
      },
      'settings-swap': { title: '配置兑换滑点', summary: '为你的交易设置最大滑点容忍度。' },
      'reset-settings': { title: '重置配置', summary: '将所有设置恢复为默认值。' },
      about: {
        title: '关于 Biatec DEX',
        summary: '了解 Biatec DEX 是什么、其免责声明和上架资产。'
      },
      'find-asset-by-id': {
        title: '按 ID 查找资产',
        summary: '通过精确的 Algorand 资产 ID（ASA）定位代币。'
      },
      'select-pair': { title: '切换交易对', summary: '更改你正在交易的资产或计价货币。' },
      'price-chart': { title: '查看价格图表', summary: '在不同时间周期上跟踪价格走势和成交量。' },
      'asset-info': {
        title: '查看资产信息面板',
        summary: '查看最新价格、成交量和多周期价格数据。'
      },
      'share-pair': {
        title: '分享交易对',
        summary: '向任何人发送指向特定交易对和网络的直接链接。'
      },
      'liquidity-shapes': {
        title: '比较流动性形态',
        summary: '了解聚焦、分散、等额、单一和价格墙形态。'
      },
      'lp-fee-tiers': {
        title: '选择 LP 费率档',
        summary: '选择你作为流动性提供者赚取的交易手续费。'
      },
      'price-range': { title: '设置价格区间', summary: '定义你的流动性生效的最低和最高价格。' },
      'precision-bins': { title: '设置精度和分箱', summary: '控制你的流动性被分成多少个价格箱。' },
      'pool-costs-mbr': {
        title: '了解池成本（MBR）',
        summary: '了解你为注资和持有头寸所支付的 ALGO。'
      },
      'copy-address': {
        title: '复制你的账户地址',
        summary: '将已连接的 Algorand 地址复制到剪贴板。'
      },
      'disconnect-wallet': { title: '断开钱包连接', summary: '退出登录并清除已认证的会话。' },
      'tx-validity': { title: '设置交易有效期窗口', summary: '控制你的交易保持有效的时长。' },
      'localnet-dev': {
        title: '在 Localnet 上开发',
        summary: '在本地 Algorand 开发网络上运行 DEX。'
      },
      documentation: { title: '打开文档', summary: '查找更深入的技术文档和源代码。' },
      'security-best-practices': {
        title: '安全最佳实践',
        summary: '在使用自托管 DEX 时保护你的资金。'
      },
      'help-center': {
        title: '使用帮助中心',
        summary: '查找 Biatec DEX 每项功能的指南，并附本地化截图。'
      }
    }
  },
  ko: {
    chrome: {
      title: '도움말 센터',
      subtitle: 'Biatec DEX의 모든 기능에 대한 단계별 안내. 검색하거나 카테고리별로 살펴보세요.',
      searchPlaceholder: '도움말 검색',
      noResults: '검색과 일치하는 안내가 없습니다.',
      notFound: '해당 도움말을 찾을 수 없습니다.',
      backToHelp: '도움말로 돌아가기',
      stepsTitle: '단계별 안내',
      tipTitle: '팁',
      openFeature: '기능 열기',
      relatedTitle: '관련 안내'
    },
    tooltipHelp: '도움말 센터 열기',
    categories: {
      gettingStarted: '시작하기',
      trading: '거래',
      liquidity: '유동성',
      account: '계정 및 자산',
      networks: '네트워크 및 설정',
      info: '정보'
    },
    useCases: {
      'explore-assets': {
        title: '자산 탐색',
        summary: 'Biatec DEX 풀의 모든 자산을 TVL, 가격, 풀 수와 함께 살펴보세요.'
      },
      'connect-wallet': {
        title: '지갑 연결',
        summary: 'Algorand 지갑 또는 ARC-76 이메일/비밀번호 계정으로 로그인하세요.'
      },
      'switch-language': {
        title: '언어 변경',
        summary: '인터페이스를 지원되는 10개 언어로 전환하세요.'
      },
      'switch-theme': {
        title: '라이트/다크 테마 전환',
        summary: '헤더에서 라이트와 다크 모드를 전환하세요.'
      },
      'trade-screen': {
        title: '거래 화면',
        summary: '실시간 가격, 차트, 시장 심도를 보고 페어에 주문하세요.'
      },
      'buy-order': {
        title: '매수 주문',
        summary: 'DEX 애그리게이터를 통해 최적가로 자산을 매수하세요.'
      },
      'sell-order': { title: '매도 주문', summary: '최적가로 자산을 견적 통화로 매도하세요.' },
      'market-depth': {
        title: '시장 심도 읽기',
        summary: '페어의 매수 호가, 중간가, 매도 호가를 확인하세요.'
      },
      'recent-trades': {
        title: '최근 거래 보기',
        summary: '페어의 체결 거래 실시간 스트림을 확인하세요.'
      },
      'pool-swap': {
        title: '풀에서 직접 스왑',
        summary: '애그리게이터 없이 단일 Biatec CLAMM 풀과 거래하세요.'
      },
      'liquidity-dashboard': {
        title: '유동성 공급자 대시보드',
        summary: '모든 포지션, 풀 가치, 보유 자산을 한곳에서 확인하세요.'
      },
      'create-pool': {
        title: '새 풀 생성',
        summary: '임의의 Algorand 자산 페어로 완전히 새로운 유동성 풀을 여세요.'
      },
      'add-liquidity-focused': {
        title: '유동성 추가 - 집중형',
        summary: '수수료를 더 벌도록 현재가 주변에 유동성을 집중하세요.'
      },
      'add-liquidity-spread': {
        title: '유동성 추가 - 분산형',
        summary: '넓은 범위의 양 끝에 더 많은 유동성을 배치하세요.'
      },
      'add-liquidity-equal': {
        title: '유동성 추가 - 균등 빈',
        summary: '범위의 모든 가격 빈에 동일한 유동성을 분배하세요.'
      },
      'add-liquidity-single': {
        title: '유동성 추가 - 단일 빈',
        summary: '최저가와 최고가 사이의 단일 포지션으로 유동성을 공급하세요.'
      },
      'add-liquidity-wall': {
        title: '유동성 추가 - 가격 벽',
        summary: '아래에서는 매수, 위에서는 매도하는 단일 가격 벽을 설정하세요.'
      },
      'remove-liquidity': {
        title: '유동성 제거',
        summary: '포지션의 일부 또는 전부를 인출하고 누적 수수료를 받으세요.'
      },
      'manage-liquidity': {
        title: '유동성 관리',
        summary: '풀을 보고 추가, 제거, 스왑하는 허브입니다.'
      },
      'review-before-sign': {
        title: '서명 전 검토',
        summary: '지갑이 승인하려는 내용을 정확히 이해하세요.'
      },
      'trader-dashboard': {
        title: '트레이더 대시보드',
        summary: '옵트인한 자산, 잔액, 실시간 USD 평가액을 추적하세요.'
      },
      'asset-opt-in': {
        title: '자산 옵트인',
        summary: '받기 전에 Algorand 자산을 계정에 등록하세요.'
      },
      'switch-network': {
        title: '블록체인 변경',
        summary: 'Mainnet, Testnet, Localnet 간에 전환하세요.'
      },
      'settings-blockchain': {
        title: '블록체인 엔드포인트 설정',
        summary: '앱을 사용자 지정 algod 엔드포인트, 포트, 토큰으로 지정하세요.'
      },
      'settings-swap': {
        title: '스왑 슬리피지 설정',
        summary: '거래의 최대 슬리피지 허용치를 설정하세요.'
      },
      'reset-settings': { title: '구성 재설정', summary: '모든 설정을 기본값으로 복원하세요.' },
      about: {
        title: 'Biatec DEX 소개',
        summary: 'Biatec DEX가 무엇인지, 면책 조항과 상장 자산을 알아보세요.'
      },
      'find-asset-by-id': {
        title: 'ID로 자산 찾기',
        summary: '정확한 Algorand 자산 ID(ASA)로 토큰을 찾으세요.'
      },
      'select-pair': {
        title: '거래 페어 전환',
        summary: '거래 중인 자산 또는 견적 통화를 변경하세요.'
      },
      'price-chart': {
        title: '가격 차트 읽기',
        summary: '여러 기간에 걸쳐 가격 변동과 거래량을 추적하세요.'
      },
      'asset-info': {
        title: '자산 정보 패널 읽기',
        summary: '최신 가격, 거래량, 여러 기간의 가격 데이터를 확인하세요.'
      },
      'share-pair': {
        title: '거래 페어 공유',
        summary: '특정 페어와 네트워크로 가는 직접 링크를 누구에게나 보내세요.'
      },
      'liquidity-shapes': {
        title: '유동성 형태 비교',
        summary: '집중형, 분산형, 균등형, 단일 빈, 가격 벽 형태를 이해하세요.'
      },
      'lp-fee-tiers': {
        title: 'LP 수수료 등급 선택',
        summary: '유동성 공급자로서 받을 거래 수수료를 선택하세요.'
      },
      'price-range': {
        title: '가격 범위 설정',
        summary: '유동성이 활성화되는 최저가와 최고가를 정의하세요.'
      },
      'precision-bins': {
        title: '정밀도와 빈 설정',
        summary: '유동성을 몇 개의 가격 빈으로 나눌지 제어하세요.'
      },
      'pool-costs-mbr': {
        title: '풀 비용 이해 (MBR)',
        summary: '포지션 자금 조달과 유지에 지불하는 ALGO를 파악하세요.'
      },
      'copy-address': {
        title: '계정 주소 복사',
        summary: '연결된 Algorand 주소를 클립보드에 복사하세요.'
      },
      'disconnect-wallet': {
        title: '지갑 연결 해제',
        summary: '로그아웃하고 인증된 세션을 지우세요.'
      },
      'tx-validity': {
        title: '트랜잭션 유효 기간 설정',
        summary: '트랜잭션이 유효하게 유지되는 기간을 제어하세요.'
      },
      'localnet-dev': {
        title: 'Localnet에서 개발',
        summary: '로컬 Algorand 개발 네트워크에서 DEX를 실행하세요.'
      },
      documentation: { title: '문서 열기', summary: '더 깊은 기술 문서와 소스 코드를 찾으세요.' },
      'security-best-practices': {
        title: '보안 모범 사례',
        summary: '자가 수탁형 DEX를 사용할 때 자금을 보호하세요.'
      },
      'help-center': {
        title: '도움말 센터 사용',
        summary: 'Biatec DEX의 모든 기능 안내를 현지화된 스크린샷과 함께 찾으세요.'
      }
    }
  },
  de: {
    chrome: {
      title: 'Hilfecenter',
      subtitle:
        'Schritt-für-Schritt-Anleitungen für jede Funktion von Biatec DEX. Suchen oder nach Kategorie stöbern.',
      searchPlaceholder: 'Anleitungen durchsuchen',
      noResults: 'Keine Anleitung passt zu deiner Suche.',
      notFound: 'Diese Anleitung wurde nicht gefunden.',
      backToHelp: 'Zurück zur Hilfe',
      stepsTitle: 'Schritt für Schritt',
      tipTitle: 'Tipp',
      openFeature: 'Funktion öffnen',
      relatedTitle: 'Verwandte Anleitungen'
    },
    tooltipHelp: 'Hilfecenter öffnen',
    categories: {
      gettingStarted: 'Erste Schritte',
      trading: 'Trading',
      liquidity: 'Liquidität',
      account: 'Konto & Assets',
      networks: 'Netzwerke & Einstellungen',
      info: 'Informationen'
    },
    useCases: {
      'explore-assets': {
        title: 'Assets erkunden',
        summary: 'Durchsuche alle Assets in Biatec-DEX-Pools mit TVL, Preisen und Poolanzahl.'
      },
      'connect-wallet': {
        title: 'Wallet verbinden',
        summary: 'Melde dich mit deiner Algorand-Wallet oder einem ARC-76-E-Mail/Passwort-Konto an.'
      },
      'switch-language': {
        title: 'Sprache ändern',
        summary: 'Wechsle die Oberfläche zwischen den 10 unterstützten Sprachen.'
      },
      'switch-theme': {
        title: 'Helles / dunkles Thema',
        summary: 'Wechsle im Header zwischen hellem und dunklem Modus.'
      },
      'trade-screen': {
        title: 'Der Trading-Bildschirm',
        summary: 'Live-Preise, Charts, Markttiefe und Orders für ein Paar.'
      },
      'buy-order': {
        title: 'Kauforder aufgeben',
        summary: 'Kaufe ein Asset zum besten Preis über den DEX-Aggregator.'
      },
      'sell-order': {
        title: 'Verkaufsorder aufgeben',
        summary: 'Verkaufe ein Asset zum besten Preis gegen die Quote-Währung.'
      },
      'market-depth': {
        title: 'Markttiefe lesen',
        summary: 'Sieh Bids, Mittelkurs und Offers für ein Paar.'
      },
      'recent-trades': {
        title: 'Letzte Trades ansehen',
        summary: 'Verfolge den Live-Stream ausgeführter Trades eines Paares.'
      },
      'pool-swap': {
        title: 'Direkt am Pool swappen',
        summary: 'Handle gegen einen einzelnen Biatec-CLAMM-Pool ohne Aggregator.'
      },
      'liquidity-dashboard': {
        title: 'Liquiditätsanbieter-Dashboard',
        summary: 'Alle Positionen, Poolwerte und Bestände an einem Ort.'
      },
      'create-pool': {
        title: 'Neuen Pool erstellen',
        summary: 'Eröffne einen brandneuen Liquiditätspool für jedes Algorand-Asset-Paar.'
      },
      'add-liquidity-focused': {
        title: 'Liquidität hinzufügen - fokussierte Form',
        summary: 'Konzentriere Liquidität um den aktuellen Preis für mehr Gebühren.'
      },
      'add-liquidity-spread': {
        title: 'Liquidität hinzufügen - verteilte Form',
        summary: 'Platziere mehr Liquidität an den Rändern einer breiten Spanne.'
      },
      'add-liquidity-equal': {
        title: 'Liquidität hinzufügen - gleiche Bins',
        summary: 'Verteile gleiche Liquidität auf jeden Preis-Bin der Spanne.'
      },
      'add-liquidity-single': {
        title: 'Liquidität hinzufügen - einzelner Bin',
        summary: 'Stelle Liquidität als eine Position zwischen Min- und Max-Preis bereit.'
      },
      'add-liquidity-wall': {
        title: 'Liquidität hinzufügen - Preismauer',
        summary: 'Setze eine Preismauer, die darunter kauft und darüber verkauft.'
      },
      'remove-liquidity': {
        title: 'Liquidität entfernen',
        summary: 'Entnimm einen Teil oder die ganze Position samt aufgelaufener Gebühren.'
      },
      'manage-liquidity': {
        title: 'Liquidität verwalten',
        summary: 'Die Zentrale zum Ansehen von Pools und Hinzufügen, Entfernen, Swappen.'
      },
      'review-before-sign': {
        title: 'Vor dem Signieren prüfen',
        summary: 'Verstehe genau, was deine Wallet gleich genehmigen soll.'
      },
      'trader-dashboard': {
        title: 'Trader-Dashboard',
        summary: 'Verfolge deine Assets, Salden und Live-USD-Bewertungen.'
      },
      'asset-opt-in': {
        title: 'Asset-Opt-in',
        summary: 'Registriere ein Algorand-Asset auf deinem Konto, bevor du es erhältst.'
      },
      'switch-network': {
        title: 'Blockchain wechseln',
        summary: 'Wechsle zwischen Mainnet, Testnet und Localnet.'
      },
      'settings-blockchain': {
        title: 'Blockchain-Endpunkt konfigurieren',
        summary: 'Richte die App auf einen eigenen algod-Endpunkt, Port und Token.'
      },
      'settings-swap': {
        title: 'Swap-Slippage konfigurieren',
        summary: 'Lege die maximale Slippage-Toleranz für deine Trades fest.'
      },
      'reset-settings': {
        title: 'Konfiguration zurücksetzen',
        summary: 'Setze alle Einstellungen auf die Standardwerte zurück.'
      },
      about: {
        title: 'Über Biatec DEX',
        summary: 'Erfahre, was Biatec DEX ist, seine Hinweise und gelisteten Assets.'
      },
      'find-asset-by-id': {
        title: 'Asset per ID finden',
        summary: 'Finde einen Token über seine exakte Algorand-Asset-ID (ASA).'
      },
      'select-pair': {
        title: 'Handelspaar wechseln',
        summary: 'Ändere das Asset oder die Quote-Währung, die du handelst.'
      },
      'price-chart': {
        title: 'Preischart lesen',
        summary: 'Verfolge Preisbewegungen und Volumen über verschiedene Zeiträume.'
      },
      'asset-info': {
        title: 'Asset-Info-Panel lesen',
        summary: 'Sieh letzten Preis, Volumen und Preisdaten über mehrere Zeiträume.'
      },
      'share-pair': {
        title: 'Handelspaar teilen',
        summary: 'Sende jedem einen direkten Link zu einem bestimmten Paar und Netzwerk.'
      },
      'liquidity-shapes': {
        title: 'Liquiditätsformen vergleichen',
        summary: 'Verstehe fokussierte, verteilte, gleiche, einzelne und Mauer-Formen.'
      },
      'lp-fee-tiers': {
        title: 'LP-Gebührenstufe wählen',
        summary: 'Wähle die Handelsgebühr, die du als Liquiditätsanbieter verdienst.'
      },
      'price-range': {
        title: 'Preisspanne festlegen',
        summary: 'Lege den unteren und oberen Preis fest, in dem deine Liquidität aktiv ist.'
      },
      'precision-bins': {
        title: 'Präzision und Bins festlegen',
        summary: 'Steuere, in wie viele Preis-Bins deine Liquidität aufgeteilt wird.'
      },
      'pool-costs-mbr': {
        title: 'Pool-Kosten verstehen (MBR)',
        summary: 'Wisse, wie viel ALGO du zum Finanzieren und Halten einer Position zahlst.'
      },
      'copy-address': {
        title: 'Kontoadresse kopieren',
        summary: 'Kopiere deine verbundene Algorand-Adresse in die Zwischenablage.'
      },
      'disconnect-wallet': {
        title: 'Wallet trennen',
        summary: 'Melde dich ab und beende deine authentifizierte Sitzung.'
      },
      'tx-validity': {
        title: 'Transaktions-Gültigkeitsfenster festlegen',
        summary: 'Steuere, wie lange deine Transaktionen gültig bleiben.'
      },
      'localnet-dev': {
        title: 'Auf Localnet entwickeln',
        summary: 'Betreibe die DEX gegen ein lokales Algorand-Entwicklungsnetz.'
      },
      documentation: {
        title: 'Dokumentation öffnen',
        summary: 'Finde tiefergehende technische Doku und den Quellcode.'
      },
      'security-best-practices': {
        title: 'Sicherheits-Best-Practices',
        summary: 'Schütze dein Guthaben bei der Nutzung einer selbstverwahrenden DEX.'
      },
      'help-center': {
        title: 'Das Hilfecenter nutzen',
        summary: 'Finde Anleitungen zu jeder Biatec-DEX-Funktion mit lokalisierten Screenshots.'
      }
    }
  },
  es: {
    chrome: {
      title: 'Centro de ayuda',
      subtitle: 'Guías paso a paso para cada función de Biatec DEX. Busca o navega por categoría.',
      searchPlaceholder: 'Buscar guías de ayuda',
      noResults: 'Ninguna guía coincide con tu búsqueda.',
      notFound: 'No se encontró esa guía de ayuda.',
      backToHelp: 'Volver a la ayuda',
      stepsTitle: 'Paso a paso',
      tipTitle: 'Consejo',
      openFeature: 'Abrir la función',
      relatedTitle: 'Guías relacionadas'
    },
    tooltipHelp: 'Abrir el centro de ayuda',
    categories: {
      gettingStarted: 'Primeros pasos',
      trading: 'Trading',
      liquidity: 'Liquidez',
      account: 'Cuenta y activos',
      networks: 'Redes y ajustes',
      info: 'Información'
    },
    useCases: {
      'explore-assets': {
        title: 'Explorar activos',
        summary:
          'Explora todos los activos en las pools de Biatec DEX con TVL, precios y número de pools.'
      },
      'connect-wallet': {
        title: 'Conectar una wallet',
        summary: 'Inicia sesión con tu wallet de Algorand o una cuenta ARC-76 (correo/contraseña).'
      },
      'switch-language': {
        title: 'Cambiar el idioma',
        summary: 'Cambia la interfaz entre los 10 idiomas admitidos.'
      },
      'switch-theme': {
        title: 'Tema claro / oscuro',
        summary: 'Alterna entre modo claro y oscuro desde la cabecera.'
      },
      'trade-screen': {
        title: 'La pantalla de trading',
        summary: 'Precios en vivo, gráficos, profundidad de mercado y órdenes para un par.'
      },
      'buy-order': {
        title: 'Crear una orden de compra',
        summary: 'Compra un activo al mejor precio mediante el agregador DEX.'
      },
      'sell-order': {
        title: 'Crear una orden de venta',
        summary: 'Vende un activo por la moneda de cotización al mejor precio.'
      },
      'market-depth': {
        title: 'Leer la profundidad de mercado',
        summary: 'Mira las pujas, el precio medio y las ofertas de un par.'
      },
      'recent-trades': {
        title: 'Ver operaciones recientes',
        summary: 'Sigue en vivo el flujo de operaciones ejecutadas de un par.'
      },
      'pool-swap': {
        title: 'Swap directo en una pool',
        summary: 'Opera contra una sola pool de Biatec CLAMM sin el agregador.'
      },
      'liquidity-dashboard': {
        title: 'Panel del proveedor de liquidez',
        summary: 'Todas tus posiciones, valores de pools y saldos en un solo lugar.'
      },
      'create-pool': {
        title: 'Crear una nueva pool',
        summary:
          'Abre una pool de liquidez totalmente nueva para cualquier par de activos de Algorand.'
      },
      'add-liquidity-focused': {
        title: 'Añadir liquidez - forma enfocada',
        summary: 'Concentra más liquidez alrededor del precio actual para ganar más comisiones.'
      },
      'add-liquidity-spread': {
        title: 'Añadir liquidez - forma dispersa',
        summary: 'Coloca más liquidez hacia los extremos de un rango amplio.'
      },
      'add-liquidity-equal': {
        title: 'Añadir liquidez - bins iguales',
        summary: 'Distribuye la misma liquidez en cada bin de precio del rango.'
      },
      'add-liquidity-single': {
        title: 'Añadir liquidez - bin único',
        summary: 'Aporta liquidez como una posición entre un precio mín y máx.'
      },
      'add-liquidity-wall': {
        title: 'Añadir liquidez - muro de precio',
        summary: 'Define un muro de precio que compra por debajo y vende por encima.'
      },
      'remove-liquidity': {
        title: 'Retirar liquidez',
        summary: 'Retira parte o toda una posición y reclama las comisiones acumuladas.'
      },
      'manage-liquidity': {
        title: 'Gestionar la liquidez',
        summary: 'El centro para ver pools y añadir, retirar o hacer swaps.'
      },
      'review-before-sign': {
        title: 'Revisar antes de firmar',
        summary: 'Comprende exactamente lo que tu wallet va a aprobar.'
      },
      'trader-dashboard': {
        title: 'Panel del trader',
        summary: 'Sigue tus activos, saldos y valoraciones en vivo en USD.'
      },
      'asset-opt-in': {
        title: 'Opt-in a un activo',
        summary: 'Registra un activo de Algorand en tu cuenta antes de recibirlo.'
      },
      'switch-network': {
        title: 'Cambiar la blockchain',
        summary: 'Cambia entre Mainnet, Testnet y Localnet.'
      },
      'settings-blockchain': {
        title: 'Configurar el endpoint de blockchain',
        summary: 'Apunta la app a un endpoint algod, puerto y token propios.'
      },
      'settings-swap': {
        title: 'Configurar el slippage del swap',
        summary: 'Define la tolerancia máxima de slippage para tus operaciones.'
      },
      'reset-settings': {
        title: 'Restablecer la configuración',
        summary: 'Restaura todos los ajustes a sus valores predeterminados.'
      },
      about: {
        title: 'Acerca de Biatec DEX',
        summary: 'Conoce qué es Biatec DEX, sus avisos y los activos listados.'
      },
      'find-asset-by-id': {
        title: 'Buscar un activo por ID',
        summary: 'Localiza un token por su ID de activo de Algorand exacto (ASA).'
      },
      'select-pair': {
        title: 'Cambiar el par de trading',
        summary: 'Cambia el activo o la moneda de cotización que operas.'
      },
      'price-chart': {
        title: 'Leer el gráfico de precios',
        summary: 'Sigue los movimientos de precio y el volumen en distintos marcos temporales.'
      },
      'asset-info': {
        title: 'Leer el panel de info del activo',
        summary: 'Consulta el último precio, el volumen y precios en varios marcos temporales.'
      },
      'share-pair': {
        title: 'Compartir un par de trading',
        summary: 'Envía a cualquiera un enlace directo a un par y red específicos.'
      },
      'liquidity-shapes': {
        title: 'Comparar formas de liquidez',
        summary: 'Entiende las formas enfocada, dispersa, igual, única y muro.'
      },
      'lp-fee-tiers': {
        title: 'Elegir un nivel de comisión LP',
        summary: 'Elige la comisión de trading que ganas como proveedor de liquidez.'
      },
      'price-range': {
        title: 'Definir tu rango de precios',
        summary: 'Define el precio mínimo y máximo donde tu liquidez está activa.'
      },
      'precision-bins': {
        title: 'Definir precisión y bins',
        summary: 'Controla en cuántos bins de precio se divide tu liquidez.'
      },
      'pool-costs-mbr': {
        title: 'Entender los costes de la pool (MBR)',
        summary: 'Conoce los ALGO que pagas para financiar y mantener una posición.'
      },
      'copy-address': {
        title: 'Copiar la dirección de tu cuenta',
        summary: 'Copia tu dirección de Algorand conectada al portapapeles.'
      },
      'disconnect-wallet': {
        title: 'Desconectar tu wallet',
        summary: 'Cierra sesión y borra tu sesión autenticada.'
      },
      'tx-validity': {
        title: 'Definir la ventana de validez de transacciones',
        summary: 'Controla cuánto tiempo permanecen válidas tus transacciones.'
      },
      'localnet-dev': {
        title: 'Desarrollar en Localnet',
        summary: 'Ejecuta el DEX en una red de desarrollo local de Algorand.'
      },
      documentation: {
        title: 'Abrir la documentación',
        summary: 'Encuentra documentación técnica más detallada y el código fuente.'
      },
      'security-best-practices': {
        title: 'Buenas prácticas de seguridad',
        summary: 'Protege tus fondos al usar un DEX de autocustodia.'
      },
      'help-center': {
        title: 'Usar el centro de ayuda',
        summary: 'Encuentra guías de cada función de Biatec DEX con capturas localizadas.'
      }
    }
  }
}

// ── Build the `views.help` object for one locale ────────────────────────────
function buildHelp(locale) {
  const t = locale === 'en' ? null : tr[locale]
  const chrome = t ? t.chrome : en.chrome
  const categories = t ? t.categories : en.categories

  const useCases = {}
  for (const slug of slugs) {
    const base = en.useCases[slug]
    const local = t ? t.useCases[slug] : null
    useCases[slug] = {
      title: local ? local.title : base.title,
      summary: local ? local.summary : base.summary,
      // Bodies are shared from English so every locale renders fully.
      intro: base.intro,
      steps: base.steps.join('\n'),
      tip: base.tip
    }
  }

  return {
    title: chrome.title,
    subtitle: chrome.subtitle,
    searchPlaceholder: chrome.searchPlaceholder,
    noResults: chrome.noResults,
    notFound: chrome.notFound,
    backToHelp: chrome.backToHelp,
    stepsTitle: chrome.stepsTitle,
    tipTitle: chrome.tipTitle,
    openFeature: chrome.openFeature,
    relatedTitle: chrome.relatedTitle,
    categories,
    useCases
  }
}

// ── Write into each locale file ─────────────────────────────────────────────
for (const locale of locales) {
  const file = resolve(localesDir, `${locale}.json`)
  const data = JSON.parse(readFileSync(file, 'utf8'))

  data.views = data.views ?? {}
  data.views.help = buildHelp(locale)

  data.tooltips = data.tooltips ?? {}
  data.tooltips.header = data.tooltips.header ?? {}
  data.tooltips.header.help = (locale === 'en' ? en : tr[locale]).tooltipHelp

  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8')
  console.log(`updated ${locale}.json`)
}

console.log(`\nDone. Wrote views.help (${slugs.length} use cases) into ${locales.length} locales.`)
