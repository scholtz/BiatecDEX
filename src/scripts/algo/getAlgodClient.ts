import type { NetworkConfig } from '@txnlab/use-wallet-vue'
import type { IState } from '../../stores/app'
import algosdk from 'algosdk'
const getAlgodClient = (state: NetworkConfig): algosdk.Algodv2 => {
  return new algosdk.Algodv2(
    state.algod.token,
    state.algod.baseServer,
    state.algod.port,
    state.algod.headers
  )
}
export default getAlgodClient
