import type { IOutputCalculateDistribution } from '../asset/calculateDistribution'

// function to convert the output of calculateDistribution to a string representation
// this will format the output in a readable way
// the output will be <min[asset1,asset2]max>,<min[asset1,asset2]max>,...
export const outputCalculateDistributionToString = (
  distribution: IOutputCalculateDistribution | undefined | null
): string[] => {
  if (!distribution || !distribution.labels || distribution.labels.length === 0) {
    return ['<No distribution>']
  }
  return distribution.labels.map((label, index) => {
    const min = distribution.min[index].toFixed(2)
    const max = distribution.max[index].toFixed(2)
    const asset1 = distribution.asset1[index].toFixed(2)
    const asset2 = distribution.asset2[index].toFixed(2)
    return `<${min}[${asset1},${asset2}]${max}>`
  })
}
