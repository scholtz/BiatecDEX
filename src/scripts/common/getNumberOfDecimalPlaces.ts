const getNumberOfDecimalPlaces = (num: number): number => {
  // Convert the number to a string
  const numStr = num.toString()

  // Find the position of the decimal point
  const decimalIndex = numStr.indexOf('.')

  // If there is no decimal point, return 0
  if (decimalIndex === -1) {
    return 0
  }

  // The number of decimal places is the length of the string after the decimal point
  return numStr.length - decimalIndex - 1
}
export default getNumberOfDecimalPlaces
