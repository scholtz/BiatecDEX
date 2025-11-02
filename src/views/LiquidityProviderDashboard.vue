<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import Layout from '@/layouts/PublicLayout.vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { getAVMTradeReporterAPI } from '@/api'
import { AssetsService } from '@/service/AssetsService'
import Skeleton from 'primevue/skeleton'
import type { LiquidityPosition } from '@/composables/useLiquidityProviderDashboard'
import type { BiatecAsset } from '@/api/models'
import type { IAsset } from '@/interface/IAsset'
import { useRouter } from 'vue-router'
import { BiatecClammPoolClient, getPools } from 'biatec-concentrated-liquidity-amm'
import { getApplicationAddress, Transaction } from 'algosdk'
import { Indexer } from 'algosdk'

interface AssetOption {
  label: string
  value: string
  assetId: number
}

interface AssetRow {
  assetId: number
  assetName: string
  assetCode: string
  assetSymbol: string
  decimals: number
  aggregatedAmountInPools: number
  aggregatedUsdValueInPools: number
  currentHoldingAmount: bigint
  currentHoldingUsdValue: number
  usdPrice?: number
  isSelected: boolean
}

const store = useAppStore()
const { t, locale } = useI18n()
const { authStore } = useAVMAuthentication()
const { activeNetworkConfig } = useNetwork()
const router = useRouter()
const api = getAVMTradeReporterAPI()

const state = reactive({
  isLoading: false,
  error: '',
  positions: [] as LiquidityPosition[],
  assetRows: [] as AssetRow[],
  allPoolAssets: new Set<number>()
})

const selectedAssetCode = ref<string | null>(null)

const formatUsd = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'N/A'
  }
  return usdFormatter.value.format(value)
}

const loadToken = ref(0)
let intervalId: ReturnType<typeof setInterval> | undefined

const assetCatalog = computed(() =>
  AssetsService.getAssets().filter((asset) => asset.network === store.state.env)
)

const assetCatalogById = computed(() => {
  const map = new Map<number, IAsset>()
  assetCatalog.value.forEach((asset) => {
    map.set(asset.assetId, asset)
  })
  return map
})

const usdFormatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 4
    })
)

const fromAssetOptions = computed<AssetOption[]>(() => {
  const options: AssetOption[] = []
  const seen = new Set<number>()

  // Include all assets from assetRows (which includes all opted-in assets)
  for (const row of state.assetRows) {
    if (!seen.has(row.assetId)) {
      seen.add(row.assetId)
      options.push({
        label: `${row.assetName} (${row.assetCode})`,
        value: row.assetCode,
        assetId: row.assetId
      })
    }
  }

  options.sort((a, b) => a.label.localeCompare(b.label))
  return options
})

const isActionDisabled = computed(() => !selectedAssetCode.value)

const aggregatedAssetRows = computed(() => {
  return state.assetRows
    .map((row) => {
      const isSelected = selectedAssetCode.value === row.assetCode
      const rawHoldingAmount = Number(row.currentHoldingAmount)
      const holdingBalance = Number.isFinite(rawHoldingAmount)
        ? rawHoldingAmount / 10 ** row.decimals
        : 0
      const amountFormatter = new Intl.NumberFormat(locale.value, {
        maximumFractionDigits: Math.min(row.decimals, 6)
      })
      const symbolSuffix = row.assetSymbol ? ` ${row.assetSymbol}` : ''
      const formattedAggregatedAmount = Number.isFinite(row.aggregatedAmountInPools)
        ? `${amountFormatter.format(row.aggregatedAmountInPools)}${symbolSuffix}`
        : `0${symbolSuffix}`
      const formattedHoldingAmount = Number.isFinite(holdingBalance)
        ? `${amountFormatter.format(holdingBalance)}${symbolSuffix}`
        : `0${symbolSuffix}`

      return {
        ...row,
        isSelected,
        formattedAggregatedAmount,
        formattedAggregatedValue: formatUsd(row.aggregatedUsdValueInPools),
        formattedHoldingAmount,
        formattedHoldingValue: formatUsd(row.currentHoldingUsdValue)
      }
    })
    .sort((a, b) => {
      // Sort by aggregated value descending
      return b.aggregatedUsdValueInPools - a.aggregatedUsdValueInPools
    })
})

const totalAggregatedValue = computed(() => {
  return state.assetRows.reduce((sum, row) => sum + row.aggregatedUsdValueInPools, 0)
})

const totalHoldingValue = computed(() => {
  return state.assetRows.reduce((sum, row) => sum + row.currentHoldingUsdValue, 0)
})

const fetchValuations = async (ids: number[]): Promise<BiatecAsset[]> => {
  const chunkSize = 20
  const aggregated: BiatecAsset[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const response = await api.getApiAsset({ ids: chunk.join(',') })
    const data = response?.data ?? []
    aggregated.push(...data)
  }
  return aggregated
}

const ensureSelections = () => {
  const fromCodes = fromAssetOptions.value.map((option) => option.value)
  if (!fromCodes.includes(selectedAssetCode.value ?? '')) {
    selectedAssetCode.value = null
  }
  if (!selectedAssetCode.value && fromCodes.length > 0) {
    if (store.state.assetCode && fromCodes.includes(store.state.assetCode)) {
      selectedAssetCode.value = store.state.assetCode
    } else {
      selectedAssetCode.value = fromCodes[0]
    }
  }
}

const loadLiquidityPositions = async (showLoading = true) => {
  if (!authStore.isAuthenticated || !authStore.account || !activeNetworkConfig.value) {
    state.positions = []
    state.assetRows = []
    state.allPoolAssets.clear()
    state.error = ''
    return
  }

  const requestId = ++loadToken.value
  if (showLoading) {
    state.isLoading = true
  }
  state.error = ''

  try {
    if (!store?.state?.clientPP?.appId) {
      throw new Error('Pool Provider App ID is not set in the store.')
    }

    const algod = getAlgodClient(activeNetworkConfig.value)
    const indexer = new Indexer('', 'https://mainnet-idx.4160.nodely.dev', '')
    const account = await algod.accountInformation(authStore.account).do()

    if (requestId !== loadToken.value) {
      return
    }

    console.log(
      `Account assets:`,
      account.assets?.map((a: any) => ({ id: a['asset-id'] ?? a.assetId, amount: a.amount }))
    )

    const nextPositions: LiquidityPosition[] = []
    const accountAssets = Array.isArray(account?.assets) ? account.assets : []
    const assetIds = new Set<number>()

    // Add native ALGO (asset ID 0)
    assetIds.add(0)

    // Get all pools for each asset to discover all pool assets
    const poolsByAsset = new Map<number, any[]>()
    const allPoolAssets = new Set<number>()

    for (const asset of accountAssets) {
      const assetId = (asset as any)['asset-id'] ?? asset.assetId
      if (assetId === undefined || assetId === null) continue

      assetIds.add(assetId)

      try {
        const pools = await getPools({
          algod: algod,
          assetId: BigInt(assetId),
          poolProviderAppId: store.state.clientPP.appId
        })
        poolsByAsset.set(assetId, pools)

        // Collect all assets from all pools
        for (const pool of pools) {
          allPoolAssets.add(Number(pool.assetA))
          allPoolAssets.add(Number(pool.assetB))
        }
      } catch (error) {
        console.error(`Error fetching pools for asset ${assetId}:`, error)
      }
    }

    state.allPoolAssets = allPoolAssets

    // Process pools and check if user has LP tokens
    const dummyAddress = 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU'
    const dummyTransactionSigner = async (
      txnGroup: Transaction[],
      indexesToSign: number[]
    ): Promise<Uint8Array[]> => {
      return [] as Uint8Array[]
    }

    for (const [assetId, pools] of poolsByAsset.entries()) {
      for (const pool of pools) {
        try {
          // Check if user has LP tokens for this pool
          const lpAsset = accountAssets.find(
            (a) => ((a as any)['asset-id'] ?? a.assetId) === Number(pool.lpTokenId)
          )
          if (!lpAsset || !lpAsset.amount || Number(lpAsset.amount) === 0) {
            continue
          }

          const biatecClammPoolClient = new BiatecClammPoolClient({
            algorand: store.state.clientPP.algorand,
            appId: pool.appId,
            defaultSender: dummyAddress,
            defaultSigner: dummyTransactionSigner
          })

          try {
            const appInfo = await algod.getApplicationByID(pool.appId).do()
            console.log(
              `Pool ${pool.appId} global state keys:`,
              (appInfo.params as any)['global-state']?.map((entry: any) => ({
                key: entry.key,
                type: entry.value.type,
                value: entry.value.uint || entry.value.bytes
              }))
            )
          } catch (e) {
            console.error(`Error getting app info for ${pool.appId}:`, e)
          }

          if (!store.state.clientConfig?.appId) {
            throw new Error('Biatec Config Provider App ID is not set in the store.')
          }

          const status = await biatecClammPoolClient.status({
            args: {
              appBiatecConfigProvider: store.state.clientConfig.appId,
              assetA: pool.assetA,
              assetB: pool.assetB,
              assetLp: pool.lpTokenId
            },
            assetReferences: [pool.assetA, pool.assetB]
          })

          const managedA = assetCatalogById.value.get(Number(pool.assetA))
          const managedB = assetCatalogById.value.get(Number(pool.assetB))

          const lpTokenAmount = BigInt(lpAsset.amount)
          const totalLPSupply = status.poolToken || 1n
          const userShareRatio = Number(lpTokenAmount) / Number(totalLPSupply)

          const userAmountA = BigInt(Math.floor(Number(status.realABalance || 0n) * userShareRatio))
          const userAmountB = BigInt(Math.floor(Number(status.realBBalance || 0n) * userShareRatio))

          nextPositions.push({
            poolAppId: Number(pool.appId),
            assetIdA: Number(pool.assetA),
            assetIdB: Number(pool.assetB),
            amountA: userAmountA,
            amountB: userAmountB,
            decimalsA: managedA?.decimals ?? 0,
            decimalsB: managedB?.decimals ?? 0,
            nameA: managedA?.name ?? `#${pool.assetA}`,
            nameB: managedB?.name ?? `#${pool.assetB}`,
            symbolA: managedA?.symbol ?? managedA?.code ?? '',
            symbolB: managedB?.symbol ?? managedB?.code ?? '',
            codeA: managedA?.code,
            codeB: managedB?.code,
            network: managedA?.network ?? store.state.env,
            lpTokenAmount,
            lpTokenDecimals: 6
          })
        } catch (error) {
          console.error(`Error processing pool ${pool.appId}:`, error)
        }
      }
    }

    console.log(`Found ${nextPositions.length} positions from main pool processing`)

    // Check for LP tokens that may not have their underlying assets opted-in
    if (requestId !== loadToken.value) return
    for (const asset of accountAssets) {
      const assetId = Number((asset as any)['asset-id'] ?? asset.assetId)
      if (assetId === 0 || assetCatalogById.value.has(assetId)) continue
      const amount = BigInt((asset as any)['amount'] ?? asset.amount ?? 0)
      if (amount === 0n) continue

      console.log(`Checking potential LP token asset ${assetId} with amount ${amount}`)
      try {
        const assetInfo = await algod.getAssetByID(assetId).do()
        const creator = assetInfo.params.creator
        console.log(`Asset ${assetId} creator: ${creator}`)
        // Assume app ID is asset ID - 1, as per pool convention
        const assumedAppId = assetId - 1
        console.log(`Assuming app ID ${assumedAppId} for LP token ${assetId}`)
        try {
          const appInfo = await algod.getApplicationByID(assumedAppId).do()
          const appAddress = getApplicationAddress(assumedAppId)
          console.log(
            `App ${assumedAppId} address: ${appAddress}, matches creator: ${String(appAddress) === creator}`
          )
          if (String(appAddress) === creator) {
            const globalState = (appInfo.params as any)['global-state'] || []
            console.log(
              `Global state for app ${assumedAppId}:`,
              globalState.map((entry: any) => ({
                key: entry.key,
                type: entry.value.type,
                value: entry.value.uint || entry.value.bytes
              }))
            )
            // Try different key possibilities
            const possibleKeys = {
              assetA: ['QQ==', 'YXNzZXRfYQ==', 'asset_a'], // 'A', 'asset_a', 'asset_a' plain
              assetB: ['Qg==', 'YXNzZXRfYg==', 'asset_b'],
              lpToken: ['TA==', 'bHBfdG9rZW4=', 'lp_token']
            }
            const assetAEntry = globalState.find(
              (entry: any) =>
                possibleKeys.assetA.includes(entry.key) ||
                possibleKeys.assetA.includes(Buffer.from(entry.key, 'base64').toString())
            )
            const assetBEntry = globalState.find(
              (entry: any) =>
                possibleKeys.assetB.includes(entry.key) ||
                possibleKeys.assetB.includes(Buffer.from(entry.key, 'base64').toString())
            )
            const lpTokenEntry = globalState.find(
              (entry: any) =>
                possibleKeys.lpToken.includes(entry.key) ||
                possibleKeys.lpToken.includes(Buffer.from(entry.key, 'base64').toString())
            )
            console.log(
              `Found entries: A=${assetAEntry?.value.uint}, B=${assetBEntry?.value.uint}, L=${lpTokenEntry?.value.uint}`
            )
            if (
              assetAEntry &&
              assetBEntry &&
              lpTokenEntry &&
              Number(lpTokenEntry.value.uint) === assetId
            ) {
              console.log(`Adding position for LP token ${assetId} in pool ${assumedAppId}`)
              const assetA = BigInt(assetAEntry.value.uint)
              const assetB = BigInt(assetBEntry.value.uint)
              const biatecClammPoolClient = new BiatecClammPoolClient({
                algorand: store.state.clientPP.algorand,
                appId: BigInt(assumedAppId),
                defaultSender: dummyAddress,
                defaultSigner: dummyTransactionSigner
              })

              if (!store.state.clientConfig?.appId) {
                console.log(`No client config appId for LP token ${assetId}`)
                continue
              }

              const status = await biatecClammPoolClient.status({
                args: {
                  appBiatecConfigProvider: store.state.clientConfig.appId,
                  assetA,
                  assetB,
                  assetLp: BigInt(assetId)
                },
                assetReferences: [assetA, assetB]
              })

              const managedA = assetCatalogById.value.get(Number(assetA))
              const managedB = assetCatalogById.value.get(Number(assetB))

              const lpTokenAmount = amount
              const totalLPSupply = status.poolToken || 1n
              const userShareRatio = Number(lpTokenAmount) / Number(totalLPSupply)

              const userAmountA = BigInt(
                Math.floor(Number(status.realABalance || 0n) * userShareRatio)
              )
              const userAmountB = BigInt(
                Math.floor(Number(status.realBBalance || 0n) * userShareRatio)
              )

              console.log(
                `Calculated position for LP token ${assetId}: amountA=${userAmountA}, amountB=${userAmountB}, totalValue=${(status.realABalance || 0n) + (status.realBBalance || 0n)}`
              )

              nextPositions.push({
                poolAppId: Number(assumedAppId),
                assetIdA: Number(assetA),
                assetIdB: Number(assetB),
                amountA: userAmountA,
                amountB: userAmountB,
                decimalsA: managedA?.decimals ?? 0,
                decimalsB: managedB?.decimals ?? 0,
                nameA: managedA?.name ?? `#${assetA}`,
                nameB: managedB?.name ?? `#${assetB}`,
                symbolA: managedA?.symbol ?? managedA?.code ?? '',
                symbolB: managedB?.symbol ?? managedB?.code ?? '',
                codeA: managedA?.code,
                codeB: managedB?.code,
                network: managedA?.network ?? store.state.env,
                lpTokenAmount,
                lpTokenDecimals: 6
              })
            } else {
              console.log(
                `Asset ${assetId} does not match LP token criteria for app ${assumedAppId}`
              )
            }
          } else {
            console.log(`App ${assumedAppId} address does not match creator ${creator}`)
          }
        } catch (e) {
          console.log(`Error checking assumed app ${assumedAppId} for asset ${assetId}:`, e)
        }
      } catch (e) {
        console.log(`Error checking asset ${assetId} as LP token:`, e)
      }
    }

    console.log(`Total positions after LP token check: ${nextPositions.length}`)

    // Fetch USD valuations for all opted-in assets
    const uniqueAssetIds = new Set<number>(assetIds)
    nextPositions.forEach((pos) => {
      uniqueAssetIds.add(pos.assetIdA)
      uniqueAssetIds.add(pos.assetIdB)
    })

    let valuationMap = new Map<number, BiatecAsset>()
    if (uniqueAssetIds.size > 0) {
      try {
        const valuations = await fetchValuations(Array.from(uniqueAssetIds))
        valuations.forEach((asset) => {
          valuationMap.set(Number(asset.index), asset)
        })

        nextPositions.forEach((position) => {
          const valuationA = valuationMap.get(position.assetIdA)
          const valuationB = valuationMap.get(position.assetIdB)

          if (valuationA && typeof valuationA.priceUSD === 'number') {
            position.usdPriceA = valuationA.priceUSD
            const balanceA = Number(position.amountA) / 10 ** position.decimalsA
            if (Number.isFinite(balanceA)) {
              position.usdValueA = balanceA * valuationA.priceUSD
            }
          }

          if (valuationB && typeof valuationB.priceUSD === 'number') {
            position.usdPriceB = valuationB.priceUSD
            const balanceB = Number(position.amountB) / 10 ** position.decimalsB
            if (Number.isFinite(balanceB)) {
              position.usdValueB = balanceB * valuationB.priceUSD
            }
          }
        })
      } catch (valuationError) {
        state.error =
          valuationError instanceof Error ? valuationError.message : String(valuationError)
      }
    }

    // Sort positions by total USD value
    nextPositions.sort((a, b) => {
      const aValue = (a.usdValueA ?? 0) + (a.usdValueB ?? 0)
      const bValue = (b.usdValueA ?? 0) + (b.usdValueB ?? 0)
      const diff = bValue - aValue
      if (Math.abs(diff) > 1e-8) {
        return diff
      }
      return a.nameA.localeCompare(b.nameA)
    })

    state.positions = nextPositions

    // Build asset rows: aggregate by asset
    const assetDataMap = new Map<
      number,
      {
        aggregatedAmountInPools: bigint
        currentHoldingAmount: bigint
      }
    >()

    // Add native ALGO token
    const algoAmount = account?.amount !== undefined ? BigInt(account.amount) : 0n
    assetDataMap.set(0, {
      aggregatedAmountInPools: 0n,
      currentHoldingAmount: algoAmount
    })

    // Initialize with all opted-in assets
    for (const asset of accountAssets) {
      const assetId = (asset as any)['asset-id'] ?? asset.assetId
      const amount = BigInt((asset as any)['amount'] ?? asset.amount ?? 0)
      if (assetId === undefined || assetId === null) continue

      assetDataMap.set(assetId, {
        aggregatedAmountInPools: 0n,
        currentHoldingAmount: amount
      })
    }

    // Aggregate pool values by asset
    for (const position of nextPositions) {
      // Asset A
      const dataA = assetDataMap.get(position.assetIdA) || {
        aggregatedAmountInPools: 0n,
        currentHoldingAmount: 0n
      }
      dataA.aggregatedAmountInPools += position.amountA
      assetDataMap.set(position.assetIdA, dataA)

      // Asset B
      const dataB = assetDataMap.get(position.assetIdB) || {
        aggregatedAmountInPools: 0n,
        currentHoldingAmount: 0n
      }
      dataB.aggregatedAmountInPools += position.amountB
      assetDataMap.set(position.assetIdB, dataB)
    }

    // Build asset rows for all opted-in assets, with pricing data from API when available
    const nextAssetRows: AssetRow[] = []
    for (const [assetId, data] of assetDataMap.entries()) {
      const valuation = valuationMap.get(Number(assetId))
      const asset = assetCatalogById.value.get(assetId)

      // Get asset information from catalog or valuation or fallback
      const decimals = asset?.decimals ?? valuation?.params?.decimals ?? 0
      const name = asset?.name ?? valuation?.params?.name ?? `Asset #${assetId}`
      const code = asset?.code ?? valuation?.params?.unitName?.toLowerCase() ?? `asa-${assetId}`
      const symbol = asset?.symbol ?? asset?.code ?? valuation?.params?.unitName ?? code

      const usdPrice = valuation?.priceUSD
      const holdingAmountRaw = Number(data.currentHoldingAmount)
      const holdingBalance = Number.isFinite(holdingAmountRaw)
        ? holdingAmountRaw / 10 ** decimals
        : 0
      const aggregatedAmountRaw = Number(data.aggregatedAmountInPools)
      const aggregatedAmountInPools = Number.isFinite(aggregatedAmountRaw)
        ? aggregatedAmountRaw / 10 ** decimals
        : 0
      const currentHoldingUsdValue = usdPrice ? holdingBalance * usdPrice : 0
      const aggregatedUsdValueInPools = usdPrice ? aggregatedAmountInPools * usdPrice : 0

      nextAssetRows.push({
        assetId,
        assetName: name,
        assetCode: code,
        assetSymbol: symbol,
        decimals,
        aggregatedAmountInPools,
        aggregatedUsdValueInPools,
        currentHoldingAmount: data.currentHoldingAmount,
        currentHoldingUsdValue,
        usdPrice,
        isSelected: false
      })
    }

    state.assetRows = nextAssetRows
    await nextTick()
    ensureSelections()
  } catch (error) {
    if (requestId !== loadToken.value) {
      return
    }
    state.error = error instanceof Error ? error.message : String(error)
    state.positions = []
    state.assetRows = []
  } finally {
    if (requestId === loadToken.value && showLoading) {
      state.isLoading = false
    }
  }
}

const onAddLiquidity = () => {
  // This function is no longer used since we removed the main Add Liquidity button
  // Keeping for backward compatibility
  return
}

const onAddLiquidityForAsset = (assetCode: string) => {
  if (!selectedAssetCode.value) {
    // Set the asset as selected
    selectedAssetCode.value = assetCode
    return
  }
  if (selectedAssetCode.value === assetCode) {
    // Can't add liquidity for the same asset pair
    return
  }
  const network = store.state.env || 'algorand'
  router.push({
    name: 'liquidity-with-assets',
    params: {
      network,
      assetCode: assetCode,
      currencyCode: selectedAssetCode.value
    }
  })
}

const onWithdrawLiquidityForAsset = (assetCode: string) => {
  if (!selectedAssetCode.value) {
    // Set the asset as selected
    selectedAssetCode.value = assetCode
    return
  }
  if (selectedAssetCode.value === assetCode) {
    // Can't withdraw from same asset pair
    return
  }

  // Find a pool with this asset pair
  const assetId = fromAssetOptions.value.find((opt) => opt.value === assetCode)?.assetId
  const selectedAssetId = fromAssetOptions.value.find(
    (opt) => opt.value === selectedAssetCode.value
  )?.assetId

  if (!assetId || !selectedAssetId) return

  const position = state.positions.find(
    (p) =>
      (p.assetIdA === assetId && p.assetIdB === selectedAssetId) ||
      (p.assetIdA === selectedAssetId && p.assetIdB === assetId)
  )

  if (position) {
    onRemoveLiquidity(position.poolAppId)
  }
}

const onRemoveLiquidity = (poolAppId: number) => {
  const network = store.state.env || 'algorand'
  router.push({
    name: 'remove-liquidity',
    params: {
      network,
      ammAppId: poolAppId.toString()
    }
  })
}

const onRefresh = () => {
  void loadLiquidityPositions()
}

const onNavigateToOptIn = () => {
  router.push({
    name: 'asset-opt-in'
  })
}

watch(
  () => authStore.account,
  (account) => {
    if (!account) {
      state.positions = []
      state.assetRows = []
      state.allPoolAssets.clear()
      state.error = ''
      selectedAssetCode.value = null
    } else {
      void loadLiquidityPositions()
    }
  }
)

watch(fromAssetOptions, ensureSelections)

watch(
  () => store.state.assetCode,
  (code) => {
    if (code && fromAssetOptions.value.some((option) => option.value === code)) {
      selectedAssetCode.value = code
    }
  }
)

watch(
  () => store.state.refreshAccountBalance,
  (shouldRefresh) => {
    if (shouldRefresh) {
      void loadLiquidityPositions(false)
      store.state.refreshAccountBalance = false
    }
  }
)

onMounted(() => {
  ensureSelections()
  void loadLiquidityPositions()
  intervalId = setInterval(() => {
    void loadLiquidityPositions(false)
  }, 10000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <Layout :authRequired="true">
    <div class="flex w-full flex-col gap-4 py-2">
      <div class="relative px-2">
        <div
          class="absolute inset-0 rounded-xl bg-white/70 backdrop-blur-sm dark:bg-surface-800/70 shadow-sm"
        ></div>
        <div class="relative flex flex-col gap-6 p-4 rounded-xl">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {{ t('views.liquidityProviderDashboard.title') }}
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {{ t('views.liquidityProviderDashboard.subtitle') }}
            </p>
          </div>
          <div
            class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr"
          >
            <!-- Portfolio Value -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.totalPoolValue') }}</span
              >
              <span
                class="mt-1 text-xl sm:text-2xl font-bold truncate"
                :title="totalAggregatedValue.toLocaleString(locale)"
                >{{ formatUsd(totalAggregatedValue) }}</span
              >
            </div>
            <!-- Total Holding Value -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.totalHoldingValue') }}</span
              >
              <span
                class="mt-1 text-xl sm:text-2xl font-bold truncate"
                :title="totalHoldingValue.toLocaleString(locale)"
                >{{ formatUsd(totalHoldingValue) }}</span
              >
            </div>
            <!-- Asset Count -->
            <div
              v-if="state.assetRows.length > 0"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.assetCount') }}</span
              >
              <span class="mt-1 text-xl sm:text-2xl font-bold">{{ state.assetRows.length }}</span>
            </div>
            <!-- Asset Selection -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.selection.selectAsset') }}</span
              >
              <div class="mt-2 flex items-center gap-2">
                <Button
                  icon="pi pi-refresh"
                  size="small"
                  class="shrink-0"
                  :title="t('views.liquidityProviderDashboard.actions.refresh')"
                  @click="onRefresh"
                />
                <Dropdown
                  v-model="selectedAssetCode"
                  :options="fromAssetOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                  :placeholder="t('views.liquidityProviderDashboard.selection.assetLabel')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Card class="mx-0">
        <template #content>
          <Message v-if="state.error" severity="error" class="mb-3">
            {{ t('views.liquidityProviderDashboard.errors.loadFailed', { message: state.error }) }}
          </Message>
          <Message
            v-else-if="!state.isLoading && aggregatedAssetRows.length === 0"
            severity="info"
            class="mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-lg"></i>
            {{ t('views.liquidityProviderDashboard.emptyAssets') }}
          </Message>
          <div v-if="state.isLoading" class="flex flex-col gap-2">
            <div v-for="n in 4" :key="n" class="flex items-center gap-6">
              <Skeleton width="14rem" height="1rem" />
              <Skeleton width="10rem" height="1rem" />
              <Skeleton width="8rem" height="1rem" />
              <Skeleton width="6rem" height="1rem" />
              <Skeleton width="6rem" height="1rem" />
            </div>
          </div>
          <template v-else>
            <DataTable
              :value="aggregatedAssetRows"
              dataKey="assetId"
              stripedRows
              responsiveLayout="scroll"
              class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
              :rowClass="(row) => (row.isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : '')"
              sortMode="multiple"
            >
              <Column :header="t('views.liquidityProviderDashboard.table.assetName')" sortable>
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ data.assetName }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-300">
                      {{ data.assetCode }} ({{ data.assetId }})
                    </span>
                  </div>
                </template>
              </Column>
              <Column
                field="aggregatedAmountInPools"
                :header="t('views.liquidityProviderDashboard.table.value')"
                sortable
                headerClass="text-right"
                bodyClass="text-right"
              >
                <template #body="{ data }">
                  <span>{{ data.formattedAggregatedAmount }}</span>
                </template>
              </Column>
              <Column
                field="aggregatedUsdValueInPools"
                :header="t('views.liquidityProviderDashboard.table.poolValue')"
                sortable
                headerClass="text-right"
                bodyClass="text-right"
              >
                <template #body="{ data }">
                  <span>{{ data.formattedAggregatedValue }}</span>
                </template>
              </Column>
              <Column
                field="currentHoldingAmount"
                :header="t('views.liquidityProviderDashboard.table.holding')"
                sortable
                headerClass="text-right"
                bodyClass="text-right"
              >
                <template #body="{ data }">
                  <div class="flex flex-col text-right">
                    <span>{{ data.formattedHoldingAmount }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-300">{{
                      data.formattedHoldingValue
                    }}</span>
                  </div>
                </template>
              </Column>
              <Column
                :header="t('views.liquidityProviderDashboard.table.actions')"
                headerClass="text-right"
                bodyClass="text-right"
              >
                <template #body="{ data }">
                  <div class="flex gap-2 justify-end">
                    <Button
                      icon="pi pi-plus-circle"
                      size="small"
                      severity="success"
                      :title="t('views.liquidityProviderDashboard.actions.depositLiquidity')"
                      @click="onAddLiquidityForAsset(data.assetCode)"
                      :disabled="!selectedAssetCode || selectedAssetCode === data.assetCode"
                    />
                    <Button
                      icon="pi pi-minus-circle"
                      size="small"
                      severity="danger"
                      :title="t('views.liquidityProviderDashboard.actions.withdrawLiquidity')"
                      @click="onWithdrawLiquidityForAsset(data.assetCode)"
                      :disabled="
                        !selectedAssetCode ||
                        selectedAssetCode === data.assetCode ||
                        data.aggregatedUsdValueInPools === 0
                      "
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <div
              class="mt-4 m-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ t('views.liquidityProviderDashboard.optIn.hint') }}
              </span>
              <Button
                icon="pi pi-plus"
                size="small"
                :label="t('views.liquidityProviderDashboard.optIn.cta')"
                @click="onNavigateToOptIn"
              />
            </div>
          </template>
        </template>
      </Card>
    </div>
  </Layout>
</template>
