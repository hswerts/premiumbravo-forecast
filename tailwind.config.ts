import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        premiumbravo: {
          DEFAULT: '#004F5A', // cor principal
          light: '#04606E',   // tom mais claro
          dark: '#003E47',    // tom mais escuro
        },
      },
    },
  },
  plugins: [],
}

export default config
