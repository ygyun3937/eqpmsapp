/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        expandDown: {
          from: { opacity: '0', transform: 'scaleY(0.95)' },
          to: { opacity: '1', transform: 'scaleY(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        expandDown: 'expandDown 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
