import BigNumber from 'bignumber.js'
interface IInitPriceDecimalsReturn {
  priceDecimals: BigNumber
  tick: BigNumber
  fitPrice: BigNumber
}
const initPriceDecimals = (
  price: BigNumber,
  precision: BigNumber = new BigNumber(4)
): IInitPriceDecimalsReturn => {
  try {
    // round the price
    // 0.0011947091 .. 0.00119
    // round the price
    // 1051 .. 11

    // Calculate 1% of the price
    //const priceDec = new BigNumber(price)
    if (!price) {
      return {
        priceDecimals: new BigNumber(6),
        tick: new BigNumber(0.001),
        fitPrice: new BigNumber(0.001)
      }
    }
    const zero = new BigNumber(0)
    // Calculate the order of magnitude (number of digits before the decimal point) of the price
    const sigPrecision = new BigNumber(Math.floor(Math.log10(price.toNumber())))
    const sigPrecisionNum = sigPrecision.toNumber()

    // Determine how many decimal places to keep based on the desired precision and the price's magnitude
    let precisionDiff = BigNumber.max(zero, precision.minus(sigPrecision))
    // By default, use the original price for calculations
    let calcPrice = price

    // If the price is greater than 1 (sigPrecision > 0), normalize the price by dividing by its magnitude
    // and adjust the precision difference to ensure at least 2 decimal places
    if (sigPrecision.gt(zero)) {
      calcPrice = new BigNumber(price).div(10 ** sigPrecisionNum)
      precisionDiff = BigNumber.max(new BigNumber(2), precision.minus(sigPrecision))
    }

    // Throw error if calcPrice is Infinity or not finite
    if (!calcPrice.isFinite()) {
      throw new Error('[BigNumber Error] Argument out of range: Infinity')
    }

    const precisionDiffNum = precisionDiff.toNumber()
    // Round the normalized price to the calculated precision difference
    // Example: 0.0011947091 with precisionDiff 4 becomes 0.0012
    const roundedPrice = new BigNumber(calcPrice).toFixed(precisionDiffNum)

    // Calculate the tick size by dividing the rounded price by 10^precision
    // This determines the minimum price increment
    const roundedTickSize = new BigNumber(roundedPrice)
      .div(10 ** precision.toNumber())
      .toFixed(precisionDiffNum)

    // Determine the number of decimal places in the tick size
    const priceDecimalsNum = new BigNumber(roundedTickSize).decimalPlaces()
    const priceDecimals = priceDecimalsNum ? new BigNumber(priceDecimalsNum) : new BigNumber(0)

    // Calculate the remainder when dividing the normalized price by the tick size
    // This is used to fit the price to the nearest tick
    const modulo = new BigNumber(calcPrice).modulo(new BigNumber(roundedTickSize))

    // Subtract the remainder from the normalized price to get the fitted price
    // This ensures the price aligns with the tick size
    const fitPrice = new BigNumber(calcPrice).minus(modulo).toFixed(precisionDiffNum)

    // console.log('initpricedec', {
    //   price,
    //   calcPrice,
    //   roundedPrice,
    //   //tickSize,
    //   precision,
    //   priceDecimals,
    //   roundedTickSize,
    //   fitPrice,
    //   precisionDiff,
    //   sigPrecision
    // })
    if (sigPrecision.gt(zero)) {
      const tick = new BigNumber(roundedTickSize).multipliedBy(10 ** sigPrecisionNum)
      const ret = {
        priceDecimals: new BigNumber(tick.toNumber() < 1 ? 1 : 0),
        tick: tick,
        fitPrice: new BigNumber(fitPrice).multipliedBy(10 ** sigPrecisionNum)
      }
      //console.log('ret', ret)
      return ret
    }
    // console.log('ret', {
    //   priceDecimals,
    //   tick: new BigNumber(roundedTickSize).toNumber(),
    //   fitPrice: new BigNumber(fitPrice).toNumber()
    // })

    return {
      priceDecimals,
      tick: new BigNumber(roundedTickSize),
      fitPrice: new BigNumber(fitPrice)
    }
  } catch (e) {
    console.error('Error in initPriceDecimals:', e)
    return {
      priceDecimals: new BigNumber(1),
      tick: new BigNumber(0.01),
      fitPrice: new BigNumber(0.01)
    }
  }
}
export default initPriceDecimals
