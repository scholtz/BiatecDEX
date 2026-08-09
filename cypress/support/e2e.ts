// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2020 syntax:
import './commands'

interface CypressLogEntry {
  type: 'LOG' | 'ERROR' | 'WARN'
  message: string
  timestamp: string
}

// The real `Cypress` global (from @types/cypress) is only exposed as a bare identifier, not
// as a `Window` property — this app-under-test-side access needs its own minimal shape for
// just the members this file touches.
interface CypressWindowGlobal {
  // Cypress.config()'s real return type varies per key; only truthiness/property access is used here.
  config?: (key: string) => unknown
  // Overridden below with a stub — the real Cypress.log() accepts arbitrary log options.
  log?: (...args: unknown[]) => { end: () => void; set: () => void; get: () => void }
}

declare global {
  interface Window {
    __cypressLogs?: CypressLogEntry[]
    Cypress?: CypressWindowGlobal
    __CY_LOG_SUPPRESSED?: boolean
  }
}

// Install cypress-terminal-report log collector
// import 'cypress-terminal-report/src/installLogsCollector'

// Capture browser console logs to a global array
Cypress.on('window:before:load', (win) => {
  // Create a logs array on the window object
  if (!win.__cypressLogs) {
    win.__cypressLogs = []
  }

  const originalConsoleLog = win.console.log
  const originalConsoleError = win.console.error
  const originalConsoleWarn = win.console.warn

  // Mirrors console.log's own (...data: unknown[]) signature — logged args are arbitrary.
  win.console.log = function (...args: unknown[]) {
    try {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ')
      win.__cypressLogs?.push({
        type: 'LOG',
        message,
        timestamp: new Date().toISOString()
      })
    } catch {
      // Ignore serialization errors
    }
    return originalConsoleLog.apply(win.console, args)
  }

  // Same rationale as console.log above.
  win.console.error = function (...args: unknown[]) {
    try {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ')
      win.__cypressLogs?.push({
        type: 'ERROR',
        message,
        timestamp: new Date().toISOString()
      })
    } catch {
      // Ignore serialization errors
    }
    return originalConsoleError.apply(win.console, args)
  }

  // Same rationale as console.log above.
  win.console.warn = function (...args: unknown[]) {
    try {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ')
      win.__cypressLogs?.push({
        type: 'WARN',
        message,
        timestamp: new Date().toISOString()
      })
    } catch {
      // Ignore serialization errors
    }
    return originalConsoleWarn.apply(win.console, args)
  }
})

// Add a custom command to dump logs to file
Cypress.Commands.add('dumpLogs', () => {
  cy.window().then((win) => {
    if (win.__cypressLogs && win.__cypressLogs.length > 0) {
      win.__cypressLogs.forEach((log) => {
        cy.task('log', `[${log.timestamp}] [${log.type}] ${log.message}`, { log: false })
      })
      // Clear logs after dumping
      win.__cypressLogs = []
    }
  })
})

// Hide Cypress runner chrome (sidebar, header) in recorded videos for a full-content view
// Only applies in runMode (headless) where window.top.document is accessible
// Adjust selectors if Cypress updates DOM structure.
if (typeof window !== 'undefined' && window.Cypress) {
  try {
    const cypress = window.Cypress
    const disable = (cypress.config?.('env') as { DISABLE_COMMAND_LOG?: boolean } | undefined)
      ?.DISABLE_COMMAND_LOG
    const isInteractive = cypress.config?.('isInteractive')
    // Only hide when flag set and not in interactive open mode
    if (disable && !isInteractive) {
      const inject = () => {
        const topDoc = window.top?.document
        if (!topDoc) return

        // Remove any existing style to force re-injection
        const existingStyle = topDoc.head.querySelector('style[data-cy-runner-hide]')
        if (existingStyle) {
          existingStyle.remove()
        }

        const style = topDoc.createElement('style')
        style.setAttribute('data-cy-runner-hide', 'true')
        style.innerHTML = `
					/* Nuclear option: Hide everything except the app iframe */
					body > *:not(.container):not(.app):not(.runner),
					.container > *:not(.viewport-container):not(.aut-iframe),
					.app > *:not(.viewport-container):not(.aut-iframe),
					.runner > *:not(.viewport-container):not(.aut-iframe),
					.viewport-container > *:not(.aut-iframe),
					.reporter, .reporter-wrap, .sidebar, .commands-container,
					.command-log, .command-name, .command-wrapper, .header,
					.controls, .specs-list, .runnable-header, aside, nav,
					[data-cy], [data-cy="reporter-panel"], [data-cy="sidebar"],
					[data-cy="command-log"], .unified-reporter {
						display: none !important;
						visibility: hidden !important;
						opacity: 0 !important;
						position: absolute !important;
						left: -10000px !important;
						top: -10000px !important;
						width: 0 !important;
						height: 0 !important;
						overflow: hidden !important;
						clip: rect(0,0,0,0) !important;
					}
					
					/* Force iframe to cover entire viewport */
					iframe.aut-iframe, .aut-iframe {
						position: fixed !important;
						top: 0 !important;
						left: 0 !important;
						width: 100vw !important;
						height: 100vh !important;
						z-index: 999999 !important;
						border: none !important;
						margin: 0 !important;
						padding: 0 !important;
						transform: none !important;
					}
					
					/* Hide any remaining Cypress UI */
					* {
						--cypress-hide-ui: 'true';
					}
					
					/* Override any Cypress styles that might interfere */
					.runner-container, .container, .app, .viewport, .viewport-container {
						position: fixed !important;
						top: 0 !important;
						left: 0 !important;
						width: 100vw !important;
						height: 100vh !important;
						margin: 0 !important;
						padding: 0 !important;
						border: none !important;
						box-shadow: none !important;
					}
				`
        topDoc.head.appendChild(style)

        // Force immediate application of styles
        const iframe = topDoc.querySelector('iframe.aut-iframe, .aut-iframe') as HTMLIFrameElement
        if (iframe) {
          iframe.style.position = 'fixed'
          iframe.style.top = '0'
          iframe.style.left = '0'
          iframe.style.width = '100vw'
          iframe.style.height = '100vh'
          iframe.style.zIndex = '999999'
          iframe.style.border = 'none'
          iframe.style.margin = '0'
          iframe.style.padding = '0'
        }
      }

      // Suppress command log events
      const suppress = () => {
        if (!window.Cypress) return
        const origLog = window.Cypress.log
        if (origLog && !window.__CY_LOG_SUPPRESSED) {
          window.__CY_LOG_SUPPRESSED = true
          window.Cypress.log = function () {
            return { end: () => {}, set: () => {}, get: () => {} }
          }
        }
      }

      // Run immediately and repeatedly
      inject()
      suppress()

      // Mutation observer for dynamic content
      const doc = window.top?.document
      if (doc) {
        const observer = new MutationObserver(() => {
          inject()
          suppress()
        })
        observer.observe(doc.documentElement, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'data-cy']
        })
        setTimeout(() => observer.disconnect(), 10000)
      }

      // Aggressive interval for first 10 seconds
      let cycles = 0
      const interval = setInterval(() => {
        inject()
        suppress()
        cycles++
        if (cycles > 30) clearInterval(interval)
      }, 200)
    }
  } catch {
    // Silently ignore
  }
}

// Alternatively you can use CommonJS syntax:
// require('./commands')
