const priceTickDecimals = (price: number | bigint, precision: number = 4) => {
  if (price == 0) return 3
  const sigDecimal = Number(price) / 10 ** precision
  const ret = -Math.floor(Math.log10(Math.abs(sigDecimal)) + 1)
  return Math.max(0, ret)
}
export default priceTickDecimals
