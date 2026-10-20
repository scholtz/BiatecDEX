// Describes the page for the Biatec AI widget (`useBiatecChat().setPageContext`). Built only from
// route params - never from wallet or account data. The widget treats it as untrusted text and
// sends it only with a message.

type RouteParam = string | string[] | undefined

const first = (value: RouteParam): string | undefined => {
  const v = Array.isArray(value) ? value[0] : value
  return v ? v : undefined
}

/** `undefined` when the route is not a pair/pool page, which clears the widget's context. */
export const buildChatPageContext = (
  routeName: string | symbol | null | undefined,
  params: Record<string, RouteParam>
): string | undefined => {
  if (typeof routeName !== 'string') return undefined
  const network = first(params.network)
  const asset = first(params.assetCode)
  const currency = first(params.currencyCode)
  const pool = first(params.ammAppId)

  let area: string
  switch (routeName) {
    case 'tradeWithAssets':
      area = 'trade'
      break
    case 'liquidity-with-assets':
      area = 'liquidity'
      break
    case 'add-liquidity':
      area = 'add liquidity'
      break
    case 'remove-liquidity':
      area = 'remove liquidity'
      break
    case 'pool-swap':
      area = 'pool swap'
      break
    default:
      return undefined
  }

  const parts = ['Biatec DEX', area]
  if (network) parts.push(network)
  if (asset && currency) parts.push(`pair ${asset}/${currency}`)
  if (pool) parts.push(`pool app ${pool}`)
  return parts.join(' · ')
}
