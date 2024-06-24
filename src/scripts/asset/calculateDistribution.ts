import initPriceDecimals from './initPriceDecimals'

interface IInputCalculateDistribution {
  type: 'spread' | 'focused' | 'equal'
  visibleFrom: number
  visibleTo: number
  midPrice: number
  lowPrice: number
  highPrice: number
  depositAssetAmount: number
  depositCurrencyAmount: number
}

const calculateDistribution = (input: IInputCalculateDistribution) => {
  console.log('input', input)
  const tickSetup = initPriceDecimals(input.visibleFrom, 2)
  let price = tickSetup.fitPrice
  const prices = [{ from: price, to: price + tickSetup.tick }]
  price = price + tickSetup.tick

  while (price <= input.visibleTo) {
    const tickSetup4 = initPriceDecimals(price, 2)
    prices.push({ from: tickSetup4.fitPrice, to: tickSetup4.fitPrice + tickSetup4.tick })
    price = tickSetup4.fitPrice + tickSetup4.tick
  }

  const labels: string[] = []
  const asset1: number[] = []
  const asset2: number[] = []

  let asset1Multiplier = 0
  let asset2Multiplier = 0

  console.log('prices', input.midPrice, prices)
  for (const price1 of prices) {
    labels.push(
      price1.from.toFixed(tickSetup.priceDecimals ?? 2) +
        ' - ' +
        price1.to.toFixed(tickSetup.priceDecimals ?? 2)
    )
    if (
      input.midPrice < price1.from ||
      input.lowPrice > price1.from ||
      input.highPrice < price1.from
    ) {
      asset1.push(0)
    } else {
      if (input.midPrice < price1.to) {
        asset1.push((asset1Multiplier * (input.midPrice - price1.from)) / (price1.to - price1.from))
      } else {
        if (asset1Multiplier == 0) asset1Multiplier = 1
        asset1.push(asset1Multiplier)
      }
    }

    if (input.midPrice > price1.to || input.lowPrice > price1.to || input.highPrice < price1.to) {
      asset2.push(0)
    } else {
      if (input.midPrice > price1.from) {
        if (asset2Multiplier == 0) asset2Multiplier = 1
        asset2.push((asset2Multiplier * (price1.to - input.midPrice)) / (price1.to - price1.from))
      } else {
        if (asset2Multiplier == 0) asset2Multiplier = 1
        asset2.push(asset2Multiplier)
      }
    }

    if (input.type === 'focused') {
      asset1Multiplier = asset1Multiplier * 1.3
      asset2Multiplier = asset2Multiplier / 1.3
    }
    if (input.type === 'spread') {
      asset1Multiplier = asset1Multiplier / 1.2
      asset2Multiplier = asset2Multiplier * 1.2
    }
    if (input.type === 'equal') {
      // always 1
    }
  }

  const sumAsset1 = asset1.reduce((partialSum, a) => partialSum + a, 0)
  const sumAsset2 = asset2.reduce((partialSum, a) => partialSum + a, 0)

  const asset1Weighted: number[] = []
  const asset2Weighted: number[] = []
  for (const a of asset1) {
    asset1Weighted.push((input.depositAssetAmount * a) / sumAsset1)
  }
  for (const a of asset2) {
    asset2Weighted.push((input.depositCurrencyAmount * a) / sumAsset2)
  }

  if (input.type) {
    //=== 'spread') {
    return {
      labels: labels,
      asset1: asset1Weighted,
      asset2: asset2Weighted
    }
  }
  return {
    labels: labels,
    asset1: asset1Weighted,
    asset2: asset2Weighted
  }
}
export default calculateDistribution