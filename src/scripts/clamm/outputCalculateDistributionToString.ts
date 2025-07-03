import type { IOutputCalculateDistribution } from '../asset/calculateDistribution'

// function to convert the output of calculateDistribution to a string representation
// this will format the output in a readable way
// the output will be <min[asset1,asset2]max>,<min[asset1,asset2]max>,...
export const outputCalculateDistributionToString = (
  distribution: IOutputCalculateDistribution | undefined | null,
  decimals: number = 2
): string[] => {
  if (!distribution || !distribution.labels || distribution.labels.length === 0) {
    return ['<No distribution>']
  }
  return distribution.labels.map((label, index) => {
    const min = distribution.min[index].toFixed(decimals)
    const max = distribution.max[index].toFixed(decimals)
    const asset1 = distribution.asset1[index].toFixed(decimals)
    const asset2 = distribution.asset2[index].toFixed(decimals)
    return `<${min}[${asset1},${asset2}]${max}>`
  })
}
