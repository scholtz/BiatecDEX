import { definePreset } from '@primevue/themes'
import DefualtTheme from '@primevue/themes/material'

const Noir = definePreset(DefualtTheme, {
  semantic: {
    primary: {
      50: '{teal.50}',
      100: '{teal.100}',
      200: '{teal.200}',
      300: '{teal.300}',
      400: '{teal.400}',
      500: '{teal.500}',
      600: '{teal.600}',
      700: '{teal.700}',
      800: '{teal.800}',
      900: '{teal.900}',
      950: '{teal.950}'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.500}',
          contrastColor: '#fff',
          hoverColor: '{primary.700}',
          activeColor: '{primary.600}'
        },
        highlight: {
          background: '{primary.950}',
          focusBackground: '{primary.700}',
          color: '#fff',
          focusColor: '#fff'
        }
      },
      dark: {
        primary: {
          color: '{primary.50}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.100}',
          activeColor: '{primary.200}'
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.300}',
          color: '{primary.950}',
          focusColor: '{primary.950}'
        }
      }
    }
  }
})

export default Noir
