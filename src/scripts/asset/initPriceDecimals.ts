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
  const sigPrecision = Math.floor(Math.log10(price))
  let precisionDiff = Math.max(0, precision - sigPrecision)
  let calcPrice = price
  if (sigPrecision > 0) {
    calcPrice = new BigNumber(price).div(10 ** sigPrecision).toNumber()
    precisionDiff = Math.max(2, precision - sigPrecision)
  }

  // 0.0011947091 .. 0.00119
  const roundedPrice = new BigNumber(calcPrice).toFixed(precisionDiff)
  const roundedTickSize = new BigNumber(roundedPrice).div(10 ** precision).toFixed(precisionDiff)
  const priceDecimals = new BigNumber(roundedTickSize).decimalPlaces()
  const modulo = new BigNumber(calcPrice).modulo(new BigNumber(roundedTickSize))
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
