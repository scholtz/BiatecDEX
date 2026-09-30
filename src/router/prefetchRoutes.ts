import { runBackgroundPrefetch } from './staleChunkReload'

/**
 * Loads the lazy route chunks in the background shortly after the app starts.
 *
 * After a deploy the hashed chunks of the previous build disappear from the server. A tab that
 * was opened before the deploy then fails to load a lazy page (e.g. Add Liquidity from the main
 * page) and the app recovers with a full page load. Chunks that are already in memory never
 * hit that path, so fetching the main flows' chunks up front makes a stale tab keep working -
 * no reload, nothing lost. Vite dedupes `import()` by module, so the router's own lazy imports
 * then resolve from the already-loaded module.
 */

type ChunkLoader = () => Promise<unknown>

/** The lazy pages users reach from the main page. */
export const ROUTE_CHUNK_LOADERS: ChunkLoader[] = [
  () => import('../views/ManageLiquidity.vue'),
  () => import('../views/LiquidityProviderDashboard.vue'),
  () => import('../views/TraderDashboard.vue')
]

interface NetworkInformationLike {
  saveData?: boolean
}

export const prefetchRouteChunks = (
  loaders: ChunkLoader[] = ROUTE_CHUNK_LOADERS,
  options: { delayMs?: number } = {}
): Promise<void> => {
  const connection = (navigator as unknown as { connection?: NetworkInformationLike }).connection
  if (connection?.saveData) return Promise.resolve()

  return new Promise((resolve) => {
    setTimeout(() => {
      void runBackgroundPrefetch(async () => {
        // One at a time: this must never compete with what the user is doing.
        for (const load of loaders) {
          try {
            await load()
          } catch {
            // A stale/missing chunk is handled when the user actually navigates there.
          }
        }
      }).then(() => resolve())
    }, options.delayMs ?? 2000)
  })
}
