import type { TransactionSigner } from 'algosdk'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'

/**
 * An algosdk `TransactionSigner` backed by the signed-in account (ARC-76 or a use-wallet wallet).
 *
 * algosdk / algokit call a signer with the whole group plus `indexesToSign` and expect one
 * signature per requested index, in that order. use-wallet honours that contract, but the
 * ARC-76 branch of algorand-authentication-component-vue's `sign()` signs *every* transaction it
 * is given and ignores the indexes - so for ARC-76 only the requested subset is handed over.
 */
export function useTransactionSigner(): TransactionSigner {
  const { authStore, sign } = useAVMAuthentication()
  return (txnGroup, indexesToSign) =>
    authStore.wallet === 'arc76'
      ? sign(
          indexesToSign.map((index) => txnGroup[index]),
          indexesToSign
        )
      : sign(txnGroup, indexesToSign)
}
