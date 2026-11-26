import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fundo: '#F6F5F0', // papel levemente frio, não creme
        primaria: '#2A4BA0', // azul editorial, usado com parcimônia
        secundaria: '#8FB3FF',
        urgente: '#BF3A30', // vermelho contido, só atrasado/hoje
        atencao: '#B07A14',
        ok: '#2F7D5B',
        texto: '#17181C',
        'texto-suave': '#6B6F79',
        card: '#FFFFFF',
        borda: '#E4E2DA', // fio de cabelo quente
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Atkinson Hyperlegible"', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 0 0 1px #E4E2DA',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config;
