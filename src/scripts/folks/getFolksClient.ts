import { FolksRouterClient, Network } from '@folks-router/js-sdk'

const getFolksClient = (env: string) => {
  if (env == 'mainnet-v1.0') {
    return new FolksRouterClient(Network.MAINNET)
  }
  if (env == 'mainnet') {
    return new FolksRouterClient(Network.MAINNET)
  }
  if (env == 'testnet-v1.0') {
    return new FolksRouterClient(Network.TESTNET)
  }
  if (env == 'testnet') {
    return new FolksRouterClient(Network.TESTNET)
  }
  return null
}
export default getFolksClient
