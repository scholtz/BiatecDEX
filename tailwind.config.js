/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui'

export default {
  important: true,

  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,mdx,vue,html}',
    './node_modules/algorand-authentication-component-vue/src/**/*.{js,ts,jsx,tsx,mdx,vue,html}' // 👈 point to source files
  ],
  safelist: [
    // Layout & Flexbox
    'flex',
    'min-h-screen',
    'w-full',
    'w-1/2',
    'w-64',
    'flex-col',
    'flex-row',
    'md:flex-row',
    'md:w-1/2',
    'lg:w-1/2',
    'items-center',
    'justify-center',

    // Spacing
    'p-2',
    'p-6',
    'p-12',
    'py-2',
    'px-4',
    'm-2',
    'my-2',
    'my-3',
    'mr-2',
    'mx-1',
    'mt-1',
    'space-y-6',

    // Sizing
    'h-8',
    'h-10',
    'w-10',
    'max-w-sm',
    'block',

    // Colors & Backgrounds
    'bg-white',
    'bg-white/50',
    'bg-white/90',
    'bg-gray-100',
    'bg-gray-200',
    'bg-gray-300',
    'bg-gray-700/50',
    'bg-gray-800/50',
    'bg-gray-900/80',
    'bg-blue-600',
    'bg-blue-700',
    'bg-red-100',
    'text-white',
    'text-gray-700',
    'text-gray-800',
    'text-gray-900',
    'text-red-800',

    // Borders & Shadows
    'border',
    'border-gray-300',
    'rounded-md',
    'rounded-lg',
    'shadow-sm',
    'shadow-md',
    'shadow-lg',

    // Typography
    'text-2xl',
    'text-sm',
    'font-bold',
    'font-medium',

    // Positioning
    'relative',
    'absolute',
    'left-1/2',
    'transform',
    '-translate-x-1/2',

    // States & Effects
    'cursor-pointer',
    'hover:bg-gray-100',
    'hover:bg-gray-300',
    'hover:bg-gray-700/50',
    'hover:bg-blue-700',
    'focus:ring-blue-500',
    'focus:border-blue-500'
  ],
  darkMode: ['selector', '[class="p-dark"]'],
  plugins: [PrimeUI]
}
