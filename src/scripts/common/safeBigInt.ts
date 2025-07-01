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
  const scaledAmount = amount * 10 ** decimals
  return safeBigInt(scaledAmount, useFloor)
}
