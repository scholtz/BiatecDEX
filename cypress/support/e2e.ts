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

// Install cypress-terminal-report log collector
// import 'cypress-terminal-report/src/installLogsCollector'

// Capture browser console logs to a global array
Cypress.on('window:before:load', (win) => {
  // Create a logs array on the window object
  if (!(win as any).__cypressLogs) {
    ;(win as any).__cypressLogs = []
  }

  const originalConsoleLog = win.console.log
  const originalConsoleError = win.console.error
  const originalConsoleWarn = win.console.warn

  win.console.log = function (...args: any[]) {
    try {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ')
      ;(win as any).__cypressLogs.push({
        type: 'LOG',
        message,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      // Ignore serialization errors
    }
    return originalConsoleLog.apply(win.console, args)
  }

  win.console.error = function (...args: any[]) {
    try {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ')
      ;(win as any).__cypressLogs.push({
        type: 'ERROR',
        message,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      // Ignore serialization errors
    }
    return originalConsoleError.apply(win.console, args)
  }

  win.console.warn = function (...args: any[]) {
    try {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ')
      ;(win as any).__cypressLogs.push({
        type: 'WARN',
        message,
        timestamp: new Date().toISOString()
      })
    } catch (e) {
      // Ignore serialization errors
    }
    return originalConsoleWarn.apply(win.console, args)
  }
})

// Add a custom command to dump logs to file
Cypress.Commands.add('dumpLogs', () => {
  cy.window().then((win: any) => {
    if (win.__cypressLogs && win.__cypressLogs.length > 0) {
      win.__cypressLogs.forEach((log: any) => {
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
if (typeof window !== 'undefined' && (window as any).Cypress) {
  try {
    const cypress = (window as any).Cypress
    const disable = cypress?.config?.('env')?.DISABLE_COMMAND_LOG
    const isInteractive = cypress?.config?.('isInteractive')
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
        if (!(window as any).Cypress) return
        const origLog = (window as any).Cypress.log
        if (origLog && !(window as any).__CY_LOG_SUPPRESSED) {
          ;(window as any).__CY_LOG_SUPPRESSED = true
          ;(window as any).Cypress.log = function () {
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
  } catch (e) {
    // Silently ignore
  }
}

// Alternatively you can use CommonJS syntax:
// require('./commands')
