const calculateDistribution = require('./src/scripts/asset/calculateDistribution.ts').default
const {
  outputCalculateDistributionToString
} = require('./src/scripts/clamm/outputCalculateDistributionToString.ts')
const BigNumber = require('bignumber.js')

const input = {
  type: 'equal',
  visibleFrom: new BigNumber('0.6'),
  visibleTo: new BigNumber('1.35'),
  lowPrice: new BigNumber('0.7'),
  midPrice: new BigNumber('1.0'),
  highPrice: new BigNumber('1.3'),
  depositAssetAmount: new BigNumber('24'),
  depositCurrencyAmount: new BigNumber('48'),
  precision: new BigNumber('1')
}

const result = calculateDistribution(input)
const output = outputCalculateDistributionToString(result)

console.log('Mid range test output:')
output.forEach((line, i) => console.log(`${i}: ${line}`))
