/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: {
        '2xl': '1320px',
      },
    },
    extend: {
      colors: {
        forest: {
          DEFAULT: '#153D2B',
          50: '#EEF5F1',
          100: '#D4E6DC',
          200: '#A9CDBA',
          300: '#74AF91',
          400: '#3E8965',
          500: '#1F5C3F',
          600: '#153D2B',
          700: '#103021',
          800: '#0B2117',
          900: '#06130D',
        },
        cream: {
          DEFAULT: '#F0E6CE',
          50: '#FCF9F2',
          100: '#F7F0DF',
          200: '#F0E6CE',
          300: '#E3D1AB',
          400: '#D2B783',
          500: '#BC9A5D',
        },
        gold: {
          DEFAULT: '#C5A45B',
          50: '#FAF5E8',
          100: '#F3E8CC',
          200: '#E5CE97',
          300: '#D5B874',
          400: '#C5A45B',
          500: '#A6863E',
          600: '#82672D',
        },
        charcoal: {
          DEFAULT: '#171717',
          50: '#F4F4F3',
          100: '#E5E5E3',
          200: '#C8C8C5',
          300: '#9E9E9A',
          400: '#6D6D69',
          500: '#454542',
          600: '#2A2A28',
          700: '#1F1F1E',
          800: '#171717',
          900: '#0D0D0D',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Barlow Condensed"', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
