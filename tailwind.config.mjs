/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
        'clash': ['"Clash Display"', 'sans-serif'],
      },
      animation: {
        'float': 'floating 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        floating: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      },
      backgroundImage: {
        'grid-pattern': "url('/3d-grid.svg')",
        'blob-pattern': "url('/3d-blob.svg')",
        'wave-pattern': "url('/3d-wave.svg')",
      },
      boxShadow: {
        'neon': '0 0 5px theme(colors.blue.400), 0 0 20px theme(colors.blue.700)',
        'neon-purple': '0 0 5px theme(colors.purple.400), 0 0 20px theme(colors.purple.700)',
        '3d': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.22), 0 -2px 6px rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
};
