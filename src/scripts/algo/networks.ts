import { NetworkConfigBuilder } from '@txnlab/use-wallet-vue'

/**
 * Networks registered with use-wallet. Their ids are the genesis ids the rest of the app uses in
 * `store.state.env` (NOT use-wallet 5's canonical `mainnet` / `testnet`), and `isTestnet` decides
 * where the insecure mnemonic wallet may be offered (see walletRegistry.ts).
 */
export const networks = new NetworkConfigBuilder()
  .addNetwork('mainnet-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://algorand-algod-public.de-4.biatec.io',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
    genesisId: 'mainnet-v1.0',
    caipChainId: 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k'
  })
  .addNetwork('testnet-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://testnet-api.4160.nodely.dev',
      port: ''
    },
    isTestnet: true,
    genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
    genesisId: 'testnet-v1.0',
    caipChainId: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe'
  })
  .addNetwork('voimain-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://voimain-algod-public.de.nodes.biatec.io',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=',
    genesisId: 'voimain-v1.0',
    caipChainId: 'algorand:r20fSQI8gWe_kFZziNonSPCXLwcQmH_n'
  })
  .addNetwork('aramidmain-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://algod.aramidmain.a-wallet.net',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'PgeQVJJgx/LYKJfIEz7dbfNPuXmDyJ+O7FwQ4XL9tE8=',
    genesisId: 'aramidmain-v1.0',
    caipChainId: 'algorand:PgeQVJJgx_LYKJfIEz7dbfNPuXmDyJ-O'
  })
  .addNetwork('dockernet-v1', {
    algod: {
      token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      baseServer: 'http://localhost',
      port: '4001'
    },
    isTestnet: true,
    genesisHash: 'NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb471aNSHp/e1Yw=',
    genesisId: 'dockernet-v1',
    caipChainId: 'algorand:NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb47'
  })
  .build()
