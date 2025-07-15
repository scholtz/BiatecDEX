import initPriceDecimals from './initPriceDecimals'
import BigNumber from 'bignumber.js'

interface IInputCalculateDistribution {
  type: 'spread' | 'focused' | 'equal' | 'single' | 'wall'
  visibleFrom: BigNumber
  visibleTo: BigNumber
  midPrice: BigNumber
  lowPrice: BigNumber
  highPrice: BigNumber
  depositAssetAmount: BigNumber
  depositCurrencyAmount: BigNumber
  precision: BigNumber
}

export interface IOutputCalculateDistribution {
  labels: string[]
  asset1: BigNumber[]
  asset2: BigNumber[]
  min: BigNumber[]
  max: BigNumber[]
}

const calculateDistribution = (
  input: IInputCalculateDistribution
): IOutputCalculateDistribution => {
  const labels: string[] = []
  const asset1: BigNumber[] = []
  const asset2: BigNumber[] = []
  const min: BigNumber[] = []
  const max: BigNumber[] = []
  const zero = new BigNumber(0)
  // if (input.type === 'wall') {
  //   labels.push(input.lowPrice.toLocaleString())
  //   min.push(input.lowPrice)
  //   max.push(input.lowPrice)
  //   asset1.push(input.depositAssetAmount)
  //   asset2.push(input.depositCurrencyAmount)
  //   return {
  //     labels: labels,
  //     asset1: asset1,
  //     asset2: asset2,
  //     min: min,
  //     max: max
  //   }
  // }
  // if (input.type === 'single') {
  //   labels.push(input.lowPrice.toLocaleString() + ' - ' + input.highPrice.toLocaleString())
  //   min.push(input.lowPrice)
  //   max.push(input.highPrice)
  //   asset1.push(input.depositAssetAmount)
  //   asset2.push(input.depositCurrencyAmount)
  //   return {
  //     labels: labels,
  //     asset1: asset1,
  //     asset2: asset2,
  //     min: min,
  //     max: max
  //   }
  // }

  console.log('calculateDistribution.input', input)

  const tickSetup = initPriceDecimals(input.visibleFrom, input.precision)
  let price = tickSetup.fitPrice
  const initialRangeEnd = price.plus(tickSetup.tick)
  const prices = [{ from: price, to: initialRangeEnd }]
  price = price.plus(tickSetup.tick)

  while (price.lte(input.visibleTo)) {
    const tickSetup4 = initPriceDecimals(price, input.precision)
    const rangeEnd = tickSetup4.fitPrice.plus(tickSetup4.tick)

    // Special case: if price exactly equals visibleTo and is aligned to tick, don't add this range
    if (price.eq(input.visibleTo) && tickSetup4.fitPrice.eq(price)) {
      break
    }

    // Create the range
    prices.push({ from: tickSetup4.fitPrice, to: rangeEnd })
    price = tickSetup4.fitPrice.plus(tickSetup4.tick)
    if (prices.length > 1000) break
  }
  // fix prices. iterete through prices. If the next price from is lower then current price to, make current price to equal next price to, and remove next price
  for (let i = 0; i < prices.length - 1; i++) {
    if (prices[i + 1].from.lt(prices[i].to)) {
      prices[i].to = prices[i + 1].to
      prices.splice(i + 1, 1)
      i--
    }
  }

  let asset1Multiplier = new BigNumber(0)
  let asset2Multiplier = new BigNumber(0)

  console.log(
    'prices',
    input.midPrice,
    prices.map((p) => p.from.toString() + '-' + p.to.toString())
  )
  for (const price1 of prices) {
    labels.push(
      price1.from.toFixed(tickSetup.priceDecimals.toNumber() ?? 2) +
        ' - ' +
        price1.to.toFixed(tickSetup.priceDecimals.toNumber() ?? 2)
    )
    min.push(price1.from)
    max.push(price1.to)

    // Check if this price range overlaps with our desired range [lowPrice, highPrice]
    const rangeOverlapsWithDesiredRange =
      price1.to.gt(input.lowPrice) && price1.from.lt(input.highPrice)

    if (!rangeOverlapsWithDesiredRange) {
      // Outside our desired range, no allocation
      asset1.push(new BigNumber(0))
      asset2.push(new BigNumber(0))
    } else {
      // Within our desired range, allocate based on position relative to midPrice
      if (asset1Multiplier.toNumber() == 0) asset1Multiplier = new BigNumber(1)
      if (asset2Multiplier.toNumber() == 0) asset2Multiplier = new BigNumber(1)

      let asset1Amount = new BigNumber(0)
      let asset2Amount = new BigNumber(0)

      // For asset1 (base asset): allocate for ranges at or above midPrice
      if (price1.from.gte(input.midPrice)) {
        // Fully above midPrice - full asset1 allocation
        asset1Amount = asset1Multiplier
      } else if (price1.to.gt(input.midPrice)) {
        // Spans midPrice - partial asset1 allocation for the upper part
        asset1Amount = asset1Multiplier
          .multipliedBy(price1.to.minus(input.midPrice))
          .dividedBy(price1.to.minus(price1.from))
      } else {
        // Fully below midPrice - no asset1 allocation
        asset1Amount = new BigNumber(0)
      }

      // For asset2 (quote asset): allocate for ranges at or below midPrice
      if (price1.to.lte(input.midPrice)) {
        // Fully below midPrice - full asset2 allocation
        asset2Amount = asset2Multiplier
      } else if (price1.from.lt(input.midPrice)) {
        // Spans midPrice - partial asset2 allocation for the lower part
        asset2Amount = asset2Multiplier
          .multipliedBy(input.midPrice.minus(price1.from))
          .dividedBy(price1.to.minus(price1.from))
      } else {
        // Fully above midPrice - no asset2 allocation
        asset2Amount = new BigNumber(0)
      }

      asset1.push(asset1Amount)
      asset2.push(asset2Amount)
    }

    if (input.type === 'spread') {
      const multiplier = new BigNumber(1.3)
      asset1Multiplier = asset1Multiplier.multipliedBy(multiplier)
      asset2Multiplier = asset2Multiplier.dividedBy(multiplier)
    }
    if (input.type === 'focused') {
      const multiplier = new BigNumber(1.2)
      asset1Multiplier = asset1Multiplier.dividedBy(multiplier)
      asset2Multiplier = asset2Multiplier.multipliedBy(multiplier)
    }
    if (input.type === 'equal') {
      // always 1
    }
  }

  const sumAsset1 = new BigNumber(
    asset1.map((a) => a.toNumber()).reduce((partialSum, a) => partialSum + a, 0)
  )
  const sumAsset2 = new BigNumber(
    asset2.map((a) => a.toNumber()).reduce((partialSum, a) => partialSum + a, 0)
  )

  const asset1Weighted: BigNumber[] = []
  const asset2Weighted: BigNumber[] = []
  for (const a of asset1) {
    if (input.depositAssetAmount.isNaN() || sumAsset1.eq(zero)) {
      asset1Weighted.push(zero)
    } else {
      asset1Weighted.push(input.depositAssetAmount.multipliedBy(a).dividedBy(sumAsset1))
    }
  }
  for (const a of asset2) {
    if (input.depositCurrencyAmount.isNaN() || sumAsset2.eq(zero)) {
      asset2Weighted.push(zero)
    } else {
      asset2Weighted.push(input.depositCurrencyAmount.multipliedBy(a).dividedBy(sumAsset2))
    }
  }

  if (input.type) {
    //=== 'spread') {
    return {
      labels: labels,
      asset1: asset1Weighted,
      asset2: asset2Weighted,
      min: min,
      max: max
    }
  }
  return {
    labels: labels,
    asset1: asset1Weighted,
    asset2: asset2Weighted,
    min: min,
    max: max
  }
}
export default calculateDistribution
