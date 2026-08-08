import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
  HttpTransportType
} from '@microsoft/signalr'
import type { AMMLiquidity, AMMTrade } from '../types/algorand'
import { getAuthToken as getArc14AuthToken } from './authService'
import type { AMMAggregatedPool } from '../types/AMMAggregatedPool'
import type { BiatecBlock } from '../types/BiatecBlock'
import type { AggregatedPool, BiatecAsset, Pool } from '../api/models'
import type { SubscriptionFilter } from '../types/SubscriptionFilter'
import type { AssetStat } from '../api/models'
let callbacksTrades: ((trade: AMMTrade) => void)[] = []
let callbacksLiquidity: ((liquidity: AMMLiquidity) => void)[] = []
let callbacksPools: ((pool: Pool) => void)[] = []
let callbacksAggregatedPools: ((pool: AMMAggregatedPool) => void)[] = []
let callbacksBlocks: ((block: BiatecBlock) => void)[] = []
let callbacksAssets: ((block: BiatecAsset) => void)[] = []
let callbacksAssetStats: ((assetStat: AssetStat) => void)[] = []

let currentSubscription: SubscriptionFilter | null = null

// ---------------------------------------------------------------------------
// Per-network SignalR hub configuration, mirroring tradeApi.ts's
// TRADE_API_BY_NETWORK - same AVMTradeReporter deployments, just the live
// WebSocket feed instead of the REST endpoints. Other networks have no hub by
// default (see tradeApi.ts for why we must not fall back to another network's
// endpoint).
// ---------------------------------------------------------------------------
const HUB_URL_BY_NETWORK: Record<string, string | undefined> = {
  'mainnet-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_MAINNET ||
    'https://api.algorand.scan.biatec.io',
  'testnet-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_TESTNET ||
    'https://api.testnet.scan.biatec.io',
  'voimain-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_VOIMAIN ||
    undefined,
  'aramidmain-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_ARAMID ||
    undefined,
  'dockernet-v1':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_LOCALNET ||
    undefined
}

let currentNetwork = 'mainnet-v1.0'

// Filters registered per component; the union of all of them is what gets
// subscribed on the single hub connection (the server keeps one filter per client).
const registeredFilters = new Map<string, SubscriptionFilter>()

const mergeFilters = (filters: SubscriptionFilter[]): SubscriptionFilter | null => {
  if (filters.length === 0) return null
  const merged: SubscriptionFilter = {
    RecentBlocks: false,
    RecentTrades: false,
    RecentLiquidity: false,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: false,
    RecentAssetStats: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: []
  }
  const poolsAddresses = new Set<string>()
  const aggregatedPoolsIds = new Set<string>()
  const assetIds = new Set<string>()
  for (const filter of filters) {
    merged.RecentBlocks = merged.RecentBlocks || filter.RecentBlocks
    merged.RecentTrades = merged.RecentTrades || filter.RecentTrades
    merged.RecentLiquidity = merged.RecentLiquidity || filter.RecentLiquidity
    merged.RecentPool = merged.RecentPool || filter.RecentPool
    merged.RecentAggregatedPool = merged.RecentAggregatedPool || filter.RecentAggregatedPool
    merged.RecentAssets = merged.RecentAssets || filter.RecentAssets
    merged.RecentAssetStats = merged.RecentAssetStats || filter.RecentAssetStats
    merged.MainAggregatedPools = merged.MainAggregatedPools || filter.MainAggregatedPools
    filter.PoolsAddresses.forEach((address) => poolsAddresses.add(address))
    filter.AggregatedPoolsIds.forEach((id) => aggregatedPoolsIds.add(id))
    filter.AssetIds.forEach((id) => assetIds.add(id))
  }
  merged.PoolsAddresses = Array.from(poolsAddresses)
  merged.AggregatedPoolsIds = Array.from(aggregatedPoolsIds)
  merged.AssetIds = Array.from(assetIds)
  return merged
}

class SignalRService {
  private connection: HubConnection | null = null
  private isConnected = false
  private reconnectInterval: number | null = null
  async getAuthToken(): Promise<string> {
    return await getArc14AuthToken()
  }

  /**
   * Switch which network's hub subsequent connect()/subscribe() calls target. Mirrors
   * tradeApi.ts's per-network trade API selection. If already connected and the network
   * actually changed, tears down the current connection so the next subscribe() call
   * reconnects to the new network's hub; the caller's existing filter re-subscribes
   * automatically via the normal connect-then-subscribe flow.
   */
  async setNetwork(env: string): Promise<void> {
    if (env === currentNetwork) return
    currentNetwork = env
    if (this.connection) {
      await this.disconnect()
      if (currentSubscription !== null) {
        await this.subscribe(currentSubscription)
      }
    }
  }

  async connect(): Promise<void> {
    const hubBaseUrl = HUB_URL_BY_NETWORK[currentNetwork]
    if (!hubBaseUrl) {
      console.log(`SignalR not connecting: no hub configured for network '${currentNetwork}'`)
      return
    }
    try {
      // const headers = {
      //   authorization: await this.getAuthToken(),
      // };
      this.connection = new HubConnectionBuilder()
        .withUrl(`${hubBaseUrl}/biatecScanHub`, {
          //.withUrl("https://localhost:44390/biatecScanHub", {
          //headers: headers,
          withCredentials: true,
          transport: HttpTransportType.WebSockets, // Use WebSockets for real-time updates
          accessTokenFactory: async () => await this.getAuthToken()
        }) // Biatec scan API SignalR endpoint
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build()

      this.connection.onreconnecting(() => {
        console.log('SignalR reconnecting...')
        this.isConnected = false
      })

      this.connection.onreconnected(() => {
        console.log('SignalR reconnected')
        this.isConnected = true
        // Re-subscribe after reconnection
        if (currentSubscription !== null) {
          this.subscribe(currentSubscription)
        }
      })

      this.connection.onclose(() => {
        console.log('SignalR connection closed')
        this.isConnected = false
        this.scheduleReconnect()
      })

      // Handle subscription confirmation
      this.connection.on('Info', (filter: any) => {
        console.log(`Info received: "${JSON.stringify(filter)}"`)
      })
      this.connection.on('TestConnectionResult', (result: any) => {
        console.log(`Test connection result: `, result)
      })

      // Handle subscription errors
      this.connection.on('Error', (errorMessage: string) => {
        console.error('SignalR subscription error:', errorMessage)
      })

      // Handle subscription errors
      this.connection.on('Block', (block: any) => {
        console.log('Block received:', block)
        callbacksBlocks.forEach((callback) => callback(block as BiatecBlock))
      })
      this.connection.on('Asset', (asset: any) => {
        console.log('asset received:', asset)
        callbacksAssets.forEach((callback) => callback(asset as BiatecAsset))
      })
      // Handle subscription errors
      this.connection.on('Trade', (trade: any) => {
        //console.log("FilteredTradeUpdated received:", trade);
        callbacksTrades.forEach((callback) => callback(trade as AMMTrade))
      })
      this.connection.on('Pool', (pool: any) => {
        //console.log("PoolUpdated received:", pool);
        callbacksPools.forEach((callback) => callback(pool as Pool))
      })
      // Handle subscription errors
      this.connection.on('Liquidity', (liquidity: any) => {
        //console.log("FilteredLiquidityUpdated received:", liquidity);
        callbacksLiquidity.forEach((callback) => callback(liquidity as AMMLiquidity))
      })
      // Handle subscription errors
      this.connection.on('AggregatedPool', (pool: any) => {
        const poolObj = pool as AMMAggregatedPool
        // console.log(
        //   "AggregatedPoolUpdated received:",
        //   poolObj.id,
        //   callbacksAggregatedPools.length,
        //   poolObj,
        //   pool
        // );
        callbacksAggregatedPools.forEach((callback) => callback(poolObj))
      })
      this.connection.on('AssetStat', (assetStat: any) => {
        callbacksAssetStats.forEach((callback) => callback(assetStat as AssetStat))
      })

      await this.connection.start()
      this.isConnected = true
      console.log('SignalR connected successfully')

      // Subscribe to receive trade updates with empty filter (all trades)
      await this.connection.invoke('TestConnection')
    } catch (error) {
      console.error('Error connecting to SignalR:', error)
      this.scheduleReconnect()
    }
  }

  public async subscribe(filter: SubscriptionFilter): Promise<void> {
    console.log('subscribing to AMM trades')
    const timeoutMs = 5000
    const start = Date.now()

    if (!this.connection || !this.isConnected) {
      console.log('Waiting up to 5s for SignalR connection...')

      // Kick off a connection if none exists
      if (!this.connection) {
        try {
          // Fire and forget; we'll await readiness below
          this.connect()
        } catch {
          // ignore
        }
      }

      while (Date.now() - start < timeoutMs && (!this.connection || !this.isConnected)) {
        await new Promise((r) => setTimeout(r, 200))
      }

      if (!this.connection || !this.isConnected) {
        console.log('Not subscribed: connection timeout (5s)')
        return
      }
    }

    try {
      currentSubscription = filter
      await this.connection.invoke('Subscribe', filter)
      console.log(`Subscribed to updates with filter: `, filter)
    } catch (error) {
      console.error('Error subscribing to updates:', error)
    }
  }
  /**
   * Register a per-component filter. All registered filters are merged into a
   * single hub subscription, so multiple components (e.g. trades list and pools
   * chart) can subscribe on the same page without clobbering each other.
   */
  public async registerFilter(key: string, filter: SubscriptionFilter): Promise<void> {
    const existing = registeredFilters.get(key)
    if (existing && JSON.stringify(existing) === JSON.stringify(filter)) {
      return
    }
    registeredFilters.set(key, filter)
    await this.applyRegisteredFilters()
  }

  public async unregisterFilter(key: string): Promise<void> {
    if (!registeredFilters.delete(key)) {
      return
    }
    await this.applyRegisteredFilters()
  }

  private async applyRegisteredFilters(): Promise<void> {
    const merged = mergeFilters(Array.from(registeredFilters.values()))
    if (!merged) {
      currentSubscription = null
      await this.unsubscribe()
      return
    }
    if (currentSubscription && JSON.stringify(currentSubscription) === JSON.stringify(merged)) {
      return
    }
    await this.subscribe(merged)
  }

  public async unsubscribe(): Promise<void> {
    if (!this.connection || !this.isConnected) return

    try {
      await this.connection.invoke('Unsubscribe')
      console.log(`Unsubscribed"`)
    } catch (error) {
      console.error('Error unsubscribing:', error)
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval)
    }

    this.reconnectInterval = setTimeout(() => {
      this.connect()
    }, 5000) as unknown as number // Retry every 5 seconds
  }

  onTradeReceived(callback: (trade: AMMTrade) => void): void {
    callbacksTrades.push(callback)
  }
  unsubscribeFromTradeUpdates(callback: (trade: AMMTrade) => void): void {
    callbacksTrades = callbacksTrades.filter((cb) => cb !== callback)
  }
  onLiquidityReceived(callback: (liquidity: AMMLiquidity) => void): void {
    callbacksLiquidity.push(callback)
  }
  unsubscribeFromLiquidityUpdates(callback: (liquidity: AMMLiquidity) => void): void {
    callbacksLiquidity = callbacksLiquidity.filter((cb) => cb !== callback)
  }
  onPoolReceived(callback: (liquidity: Pool) => void): void {
    callbacksPools.push(callback)
  }
  unsubscribeFromPoolUpdates(callback: (liquidity: Pool) => void): void {
    callbacksPools = callbacksPools.filter((cb) => cb !== callback)
  }
  onBlockReceived(callback: (block: BiatecBlock) => void): void {
    callbacksBlocks.push(callback)
  }
  unsubscribeFromBlockUpdates(callback: (block: BiatecBlock) => void): void {
    callbacksBlocks = callbacksBlocks.filter((cb) => cb !== callback)
  }
  onAssetReceived(callback: (asset: BiatecAsset) => void): void {
    callbacksAssets.push(callback)
  }
  unsubscribeFromAssetUpdates(callback: (asset: BiatecAsset) => void): void {
    callbacksAssets = callbacksAssets.filter((cb) => cb !== callback)
  }
  onAggregatedPoolReceived(callback: (liquidity: AggregatedPool) => void): void {
    callbacksAggregatedPools.push(callback)
  }
  unsubscribeFromAggregatedPoolUpdates(callback: (liquidity: AggregatedPool) => void): void {
    callbacksAggregatedPools = callbacksAggregatedPools.filter((cb) => cb !== callback)
  }
  onAssetStatReceived(callback: (assetStat: AssetStat) => void): void {
    callbacksAssetStats.push(callback)
  }
  unsubscribeFromAssetStatUpdates(callback: (assetStat: AssetStat) => void): void {
    callbacksAssetStats = callbacksAssetStats.filter((cb) => cb !== callback)
  }

  async disconnect(): Promise<void> {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval)
    }

    if (this.connection) {
      await this.connection.stop()
      this.connection = null
      this.isConnected = false
    }
  }

  getConnectionState(): boolean {
    return this.isConnected
  }
}

export const signalrService = new SignalRService()
