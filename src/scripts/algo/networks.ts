import { NetworkConfigBuilder } from '@txnlab/use-wallet-vue'

export const ALGORAND_MAINNET = 'mainnet-v1.0'
export const ALGORAND_TESTNET = 'testnet-v1.0'
export const VOI_MAINNET = 'voimain-v1.0'
export const ARAMID_MAINNET = 'aramidmain-v1.0'
export const DOCKERNET = 'dockernet-v1'

/**
 * Networks registered with use-wallet. Their ids are the genesis ids the rest of the app uses in
 * `store.state.env` (NOT use-wallet 5's canonical `mainnet` / `testnet`), and `isTestnet` decides
 * where the insecure mnemonic wallet may be offered (see walletRegistry.ts).
 */
export const networks = new NetworkConfigBuilder()
  .addNetwork(ALGORAND_MAINNET, {
    algod: {
      token: '',
      baseServer: 'https://algorand-algod-public.de-4.biatec.io',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
    genesisId: ALGORAND_MAINNET,
    caipChainId: 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k'
  })
  .addNetwork(ALGORAND_TESTNET, {
    algod: {
      token: '',
      baseServer: 'https://testnet-api.4160.nodely.dev',
      port: ''
    },
    isTestnet: true,
    genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
    genesisId: ALGORAND_TESTNET,
    caipChainId: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe'
  })
  .addNetwork(VOI_MAINNET, {
    algod: {
      token: '',
      baseServer: 'https://voimain-algod-public.de.nodes.biatec.io',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=',
    genesisId: VOI_MAINNET,
    caipChainId: 'algorand:r20fSQI8gWe_kFZziNonSPCXLwcQmH_n'
  })
  .addNetwork(ARAMID_MAINNET, {
    algod: {
      token: '',
      baseServer: 'https://algod.aramidmain.a-wallet.net',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'PgeQVJJgx/LYKJfIEz7dbfNPuXmDyJ+O7FwQ4XL9tE8=',
    genesisId: ARAMID_MAINNET,
    caipChainId: 'algorand:PgeQVJJgx_LYKJfIEz7dbfNPuXmDyJ-O'
  })
  .addNetwork(DOCKERNET, {
    algod: {
      token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      baseServer: 'http://localhost',
      port: '4001'
    },
    isTestnet: true,
    genesisHash: 'NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb471aNSHp/e1Yw=',
    genesisId: DOCKERNET,
    caipChainId: 'algorand:NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb47'
  })
  .build()
