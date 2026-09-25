import BigNumber from 'bignumber.js'
import { tickDecimals, tickGridBoundaries } from 'biatec-concentrated-liquidity-amm'

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

/** Hard cap on the number of grid boundaries a single distribution may span. */
export const MAX_DISTRIBUTION_BOUNDARIES = 1000

/**
 * Builds the bin grid (`min[]`/`max[]`) covering the visible window and splits the
 * deposits across the bins of the selected `[lowPrice, highPrice]` range.
 *
 * The bins are the **canonical** tick grid of the shared package
 * (`tickGridBoundaries`): an absolute set of boundaries per precision that does not
 * depend on the window, on the mid price, or on any previous computation — so the
 * pool bounds this produces are identical no matter when or at what price the form
 * is opened (the same bin around 1500 is always `[1000, 2000]` at `wide`).
 */
const calculateDistribution = (
  input: IInputCalculateDistribution
): IOutputCalculateDistribution => {
  const labels: string[] = []
  const asset1: BigNumber[] = []
  const asset2: BigNumber[] = []
  const min: BigNumber[] = []
  const max: BigNumber[] = []
  const zero = new BigNumber(0)

  console.log('calculateDistribution.input', input)

  const boundaries = tickGridBoundaries(
    input.visibleFrom.toNumber(),
    input.visibleTo.toNumber(),
    input.precision.toNumber(),
    MAX_DISTRIBUTION_BOUNDARIES
  )
  const prices: { from: BigNumber; to: BigNumber }[] = []
  for (let i = 0; i + 1 < boundaries.length; i++) {
    prices.push({ from: new BigNumber(boundaries[i]), to: new BigNumber(boundaries[i + 1]) })
  }

  let asset1Multiplier = new BigNumber(0)
  let asset2Multiplier = new BigNumber(0)

  console.log(
    'prices',
    input.midPrice,
    prices.map((p) => p.from.toString() + '-' + p.to.toString())
  )
  for (const price1 of prices) {
    const decimals = tickDecimals(price1.to.minus(price1.from).toNumber())
    labels.push(price1.from.toFixed(decimals) + ' - ' + price1.to.toFixed(decimals))
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

  return {
    labels: labels,
    asset1: asset1Weighted,
    asset2: asset2Weighted,
    min: min,
    max: max
  }
}
export default calculateDistribution
