import BigNumber from 'bignumber.js'

const initPriceDecimals = (price: number, precision: number = 4) => {
  // round the price
  // 0.0011947091 .. 0.00119
  // round the price
  // 1051 .. 11

  // Calculate 1% of the price
  //const priceDec = new BigNumber(price)
  if (!price) {
    return {
      priceDecimals: 6,
      tick: 0.001,
      fitPrice: 0.001
    }
  }
  // Calculate the order of magnitude (number of digits before the decimal point) of the price
  const sigPrecision = Math.floor(Math.log10(price))

  // Determine how many decimal places to keep based on the desired precision and the price's magnitude
  let precisionDiff = Math.max(0, precision - sigPrecision)

  // By default, use the original price for calculations
  let calcPrice = price

  // If the price is greater than 1 (sigPrecision > 0), normalize the price by dividing by its magnitude
  // and adjust the precision difference to ensure at least 2 decimal places
  if (sigPrecision > 0) {
    calcPrice = new BigNumber(price).div(10 ** sigPrecision).toNumber()
    precisionDiff = Math.max(2, precision - sigPrecision)
  }
  // Round the normalized price to the calculated precision difference
  // Example: 0.0011947091 with precisionDiff 4 becomes 0.0012
  const roundedPrice = new BigNumber(calcPrice).toFixed(precisionDiff)

  // Calculate the tick size by dividing the rounded price by 10^precision
  // This determines the minimum price increment
  const roundedTickSize = new BigNumber(roundedPrice).div(10 ** precision).toFixed(precisionDiff)

  // Determine the number of decimal places in the tick size
  const priceDecimals = new BigNumber(roundedTickSize).decimalPlaces()

  // Calculate the remainder when dividing the normalized price by the tick size
  // This is used to fit the price to the nearest tick
  const modulo = new BigNumber(calcPrice).modulo(new BigNumber(roundedTickSize))

  // Subtract the remainder from the normalized price to get the fitted price
  // This ensures the price aligns with the tick size
  const fitPrice = new BigNumber(calcPrice).minus(modulo).toFixed(precisionDiff)

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
  if (sigPrecision > 0) {
    const tick = new BigNumber(roundedTickSize).multipliedBy(10 ** sigPrecision).toNumber()
    const ret = {
      priceDecimals: tick < 1 ? 1 : 0,
      tick: tick,
      fitPrice: new BigNumber(fitPrice).multipliedBy(10 ** sigPrecision).toNumber()
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
    tick: new BigNumber(roundedTickSize).toNumber(),
    fitPrice: new BigNumber(fitPrice).toNumber()
  }
}
export default initPriceDecimals
