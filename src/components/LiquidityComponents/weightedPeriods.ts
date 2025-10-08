import type { AppPoolInfo } from 'biatec-concentrated-liquidity-amm'

export type PeriodKey = 'period1' | 'period2' | 'period3' | 'period4'

type PeriodMetric = {
  duration: keyof AppPoolInfo
  nowVolume: keyof AppPoolInfo
  prevVolume: keyof AppPoolInfo
  nowVwap: keyof AppPoolInfo
  prevVwap: keyof AppPoolInfo
  nowTime: keyof AppPoolInfo
}

const periodConfig: Record<PeriodKey, PeriodMetric> = {
  period1: {
    duration: 'period1Duration',
    nowVolume: 'period1NowVolumeB',
    prevVolume: 'period1PrevVolumeB',
    nowVwap: 'period1NowVwap',
    prevVwap: 'period1PrevVwap',
    nowTime: 'period1NowTime'
  },
  period2: {
    duration: 'period2Duration',
    nowVolume: 'period2NowVolumeB',
    prevVolume: 'period2PrevVolumeB',
    nowVwap: 'period2NowVwap',
    prevVwap: 'period2PrevVwap',
    nowTime: 'period2NowTime'
  },
  period3: {
    duration: 'period3Duration',
    nowVolume: 'period3NowVolumeB',
    prevVolume: 'period3PrevVolumeB',
    nowVwap: 'period3NowVwap',
    prevVwap: 'period3PrevVwap',
    nowTime: 'period3NowTime'
  },
  period4: {
    duration: 'period4Duration',
    nowVolume: 'period4NowVolumeB',
    prevVolume: 'period4PrevVolumeB',
    nowVwap: 'period4NowVwap',
    prevVwap: 'period4PrevVwap',
    nowTime: 'period4NowTime'
  }
}

const toNumber = (value: bigint | number | undefined) => {
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'number') return value
  return 0
}

export type WeightedPeriod = {
  price: number
  volume: number
  previousPrice: number
  previousVolume: number
  previousVolumePortion: number
}

export const computeWeightedPeriod = (
  price: AppPoolInfo,
  periodKey: PeriodKey
): WeightedPeriod => {
  const config = periodConfig[periodKey]

  const totalDuration = Math.max(toNumber(price[config.duration]), 0)
  const currentElapsed = Math.max(
    Math.min(toNumber(price[config.nowTime]), totalDuration || Infinity),
    0
  )
  const remainingDuration = totalDuration > 0 ? Math.max(totalDuration - currentElapsed, 0) : 0

  const currentPrice = toNumber(price[config.nowVwap])
  const previousPrice = toNumber(price[config.prevVwap])
  const currentVolume = toNumber(price[config.nowVolume])
  const previousVolume = toNumber(price[config.prevVolume])

  const previousVolumePortion =
    totalDuration > 0 ? (previousVolume * remainingDuration) / totalDuration : 0
  const combinedVolume = currentVolume + previousVolumePortion

  const combinedPrice =
    combinedVolume > 0
      ? (currentPrice * currentVolume + previousPrice * previousVolumePortion) / combinedVolume
      : currentPrice || previousPrice

  return {
    price: combinedPrice,
    volume: combinedVolume,
    previousPrice,
    previousVolume,
    previousVolumePortion
  }
}

export const computeWeightedPeriods = (price: AppPoolInfo) => ({
  period1: computeWeightedPeriod(price, 'period1'),
  period2: computeWeightedPeriod(price, 'period2'),
  period3: computeWeightedPeriod(price, 'period3'),
  period4: computeWeightedPeriod(price, 'period4')
})
