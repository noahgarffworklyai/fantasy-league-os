/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Static colors (light theme). Defined as hex so NativeWind resolves
      // them reliably on native and opacity modifiers (bg-foreground/5) work.
      colors: {
        background: '#F2F2F2',
        foreground: '#0D0D0D',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0D0D0D',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#0D0D0D',
        },
        primary: {
          DEFAULT: '#0D0D0D',
          foreground: '#FCFCFC',
        },
        secondary: {
          DEFAULT: '#F0F0F0',
          foreground: '#0D0D0D',
        },
        muted: {
          DEFAULT: '#F0F0F0',
          foreground: '#636363',
        },
        accent: {
          DEFAULT: '#28BD5F',
          foreground: '#141414',
        },
        destructive: {
          DEFAULT: '#EE3734',
          foreground: '#FCFCFC',
        },
        success: '#28BD5F',
        warning: '#F2B10D',
        danger: '#EE3734',
        neutral: '#878787',
        surface: {
          DEFAULT: '#FCFCFC',
          elevated: '#FFFFFF',
        },
        hairline: '#D1D1D1',
        border: '#DEDEDE',
        input: '#EBEBEB',
        ring: '#28BD5F',
      },
      borderRadius: {
        sm: '12px',
        md: '18px',
        lg: '24px',
        xl: '30px',
        '2xl': '36px',
        '3xl': '44px',
        '4xl': '56px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['System'],
      },
      letterSpacing: {
        tightish: '-0.2px',
        tighter2: '-0.6px',
      },
    },
  },
  plugins: [],
};
