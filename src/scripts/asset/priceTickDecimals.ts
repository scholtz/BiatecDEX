const priceTickDecimals = (price: number | bigint) => {
  if (price == 0) return 3
  const sigDecimal = Number(price) / 10000
  const ret = -Math.floor(Math.log10(Math.abs(sigDecimal)) + 1)
  console.log('ret', price, ret)
  return Math.max(0, ret)
}
export default priceTickDecimals
