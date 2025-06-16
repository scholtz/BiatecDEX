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

interface IOutputCalculateDistribution {
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

  console.log('input', input)

  const tickSetup = initPriceDecimals(input.visibleFrom, input.precision)
  let price = tickSetup.fitPrice
  const prices = [{ from: price, to: price.plus(tickSetup.tick) }]
  price = price.plus(tickSetup.tick)

  while (price <= input.visibleTo) {
    const tickSetup4 = initPriceDecimals(price, input.precision)
    prices.push({ from: tickSetup4.fitPrice, to: tickSetup4.fitPrice.plus(tickSetup4.tick) })
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
    if (
      input.midPrice < price1.from ||
      input.lowPrice > price1.from ||
      input.highPrice < price1.from
    ) {
      asset1.push(new BigNumber(0))
    } else {
      if (input.midPrice < price1.to) {
        asset1.push(
          asset1Multiplier
            .multipliedBy(input.midPrice.minus(price1.from))
            .dividedBy(price1.to.minus(price1.from))
        )
      } else {
        if (asset1Multiplier.toNumber() == 0) asset1Multiplier = new BigNumber(1)
        asset1.push(asset1Multiplier)
      }
    }

    if (
      input.midPrice.gt(price1.to) ||
      input.lowPrice.gt(price1.to) ||
      input.highPrice.lt(price1.to)
    ) {
      asset2.push(new BigNumber(0))
    } else {
      if (input.midPrice > price1.from) {
        if (asset2Multiplier.toNumber() == 0) asset2Multiplier = new BigNumber(1)
        asset2.push(
          asset2Multiplier
            .multipliedBy(price1.to.minus(input.midPrice))
            .dividedBy(price1.to.minus(price1.from))
        )
      } else {
        if (asset2Multiplier.toNumber() == 0) asset2Multiplier = new BigNumber(1)
        asset2.push(asset2Multiplier)
      }
    }

    if (input.type === 'focused') {
      const multiplier = new BigNumber(1.3)
      asset1Multiplier = asset1Multiplier.multipliedBy(multiplier)
      asset2Multiplier = asset2Multiplier.dividedBy(multiplier)
    }
    if (input.type === 'spread') {
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
