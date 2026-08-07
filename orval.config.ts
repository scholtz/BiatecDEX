import type { ConfigExternal } from 'orval'

// Orval configuration for generating a typed Axios client from the Biatec Scan OpenAPI spec
const config: ConfigExternal = {
  api: {
    // testnet spec: testnet runs the newest AVMTradeReporter build, so its swagger
    // is the first to expose new fields (e.g. AssetStat.tvlOtherUSD); the runtime
    // baseURL is still selected per-network via the axios mutator below.
    input: 'https://api.testnet.scan.biatec.io/swagger/v1/swagger.json',
    output: {
      target: 'src/api/index.ts',
      schemas: 'src/api/models',
      client: 'axios',
      baseUrl: 'https://api.algorand.scan.biatec.io',
      // allow consumers to override baseURL at runtime if needed
      override: {
        mutator: {
          path: 'src/api/axios-instance.ts',
          name: 'axiosInstance'
        }
      }
    }
  }
}

export default config
