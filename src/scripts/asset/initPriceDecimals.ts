import priceTickDecimals from './priceTickDecimals'

const initPriceDecimals = (price: number, precision: number = 4) => {
  let priceDecimals = 0
  let tick = 1
  if (price > 0) {
    priceDecimals = priceTickDecimals(price, precision)
    for (let i = 0; i < priceDecimals; i++) tick = tick / 10
  }
  return {
    priceDecimals,
    tick
  }
}
export default initPriceDecimals
