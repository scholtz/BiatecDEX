import type algosdk from 'algosdk'

export const getDummySigner = () => {
  return {
    address: 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU',
    transactionSigner: async (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ): Promise<Uint8Array[]> => {
      console.log('transactionSigner', txnGroup, indexesToSign)
      return [] as Uint8Array[]
    }
  }
}
