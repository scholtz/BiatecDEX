import priceTickDecimals from './priceTickDecimals'

const formatNumber = (
  price: number | bigint,
  decimals: number | undefined = undefined,
  formatDecimals: number | undefined = undefined,
  multiply: boolean = false,
  language: string | undefined = undefined,
  currency: string = ''
) => {
  let priceNumber = price
  if (decimals === undefined) {
    decimals = priceTickDecimals(priceNumber)
  }
  if (multiply) {
    priceNumber = Number(price) / Number(10 ** Number(decimals))
  }
  let add = ''
  if (currency) {
    add = ' ' + currency
  }
  if (formatDecimals === undefined) formatDecimals = decimals
  const formatter = new Intl.NumberFormat(language, {
    minimumFractionDigits: formatDecimals
  })
  return formatter.format(priceNumber) + add
}
export default formatNumber
