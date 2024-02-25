import type { IState } from '../../stores/app'
import algosdk from 'algosdk'
const getAlgodClient = (state: IState): algosdk.Algodv2 => {
  return new algosdk.Algodv2(state.algodToken, state.algodHost, state.algodPort)
}
export default getAlgodClient
