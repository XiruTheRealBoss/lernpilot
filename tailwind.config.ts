import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fundo: '#F5F6F8',
        primaria: '#1F48C9',
        secundaria: '#8FB3FF',
        urgente: '#E5484D',
        atencao: '#F5B82E',
        ok: '#1F9D6B',
        texto: '#16181D',
        'texto-suave': '#5F6672',
        card: '#FFFFFF',
        borda: '#E5E7EB',
      },
      fontFamily: {
        display: ['"Atkinson Hyperlegible"', 'sans-serif'],
        sans: ['"Atkinson Hyperlegible"', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        
      },
      boxShadow: {
        card: '0 0 0 1px #E5E7EB',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
} satisfies Config;
