/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Sampled from the supplied logo: rgb(76,183,72)
        brand: { DEFAULT: '#4CB748', deep: '#2F7F2C', tint: '#E7F4E6', mist: '#F1F8F0' },
        ink: { DEFAULT: '#101010', soft: '#2A2C2B' },
        paper: { DEFAULT: '#FFFFFF', grey: '#F3F5F4', line: '#E2E6E4' },
        muted: '#666666',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        display: ['clamp(2.4rem, 5.2vw, 4.25rem)', { lineHeight: '1.04', letterSpacing: '-0.035em', fontWeight: '800' }],
        h2: ['clamp(1.75rem, 3vw, 2.5rem)', { lineHeight: '1.12', letterSpacing: '-0.025em', fontWeight: '800' }],
        h3: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '700' }],
        lead: ['1.125rem', { lineHeight: '1.65' }],
      },
      maxWidth: { site: '76rem', prose: '40rem' },
      borderRadius: { card: '14px', btn: '10px' },
      boxShadow: {
        lift: '0 1px 2px rgba(16,16,16,.06), 0 8px 24px -12px rgba(16,16,16,.18)',
      },
    },
  },
  plugins: [],
};
