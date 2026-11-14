import BigNumber from 'bignumber.js'

/**
 * Safely converts a number or numeric calculation result to BigInt
 * Ensures the value is an integer before conversion to prevent the
 * "cannot be converted to a BigInt because it is not an integer" error
 *
 * @param value - The numeric value to convert
 * @param useFloor - Whether to use Math.floor (default) or Math.round for conversion
 * @returns BigInt representation of the value
 */
export const safeBigInt = (value: number, useFloor: boolean = true): bigint => {
  const integerValue = useFloor ? Math.floor(value) : Math.round(value)
  return BigInt(integerValue)
}

/**
 * Safely converts a token amount with decimals to BigInt
 * Common pattern for converting user input amounts to blockchain representation
 *
 * @param amount - The decimal amount (e.g., 123.456)
 * @param decimals - The number of decimal places for the token
 * @param useFloor - Whether to use Math.floor (default) or Math.round for conversion
 * @returns BigInt representation suitable for blockchain operations
 */
export const tokenAmountToBigInt = (
  amount: number,
  decimals: number,
  useFloor: boolean = true
): bigint => {
  // Decimal-exact: BigNumber parses the number's shortest decimal form, so 0.29 with 6
  // decimals is 290000 (a float product, 289999.99999999994, used to floor to 289999).
  const scaled = new BigNumber(amount)
    .shiftedBy(decimals)
    .integerValue(useFloor ? BigNumber.ROUND_FLOOR : BigNumber.ROUND_HALF_UP)
  if (!scaled.isFinite()) return safeBigInt(Number.NaN)
  return BigInt(scaled.toFixed(0))
}
