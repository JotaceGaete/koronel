/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',           // blue-800
          foreground: 'var(--color-primary-foreground)', // white
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',          // gray-600
          foreground: 'var(--color-secondary-foreground)', // white
        },
        accent: {
          DEFAULT: 'var(--color-accent)',             // yellow-600
          foreground: 'var(--color-accent-foreground)', // gray-900
        },
        background: 'var(--color-background)',        // gray-50
        foreground: 'var(--color-foreground)',        // gray-900
        card: {
          DEFAULT: 'var(--color-card)',               // white
          foreground: 'var(--color-card-foreground)', // gray-700
        },
        popover: {
          DEFAULT: 'var(--color-popover)',            // white
          foreground: 'var(--color-popover-foreground)', // gray-700
        },
        muted: {
          DEFAULT: 'var(--color-muted)',              // gray-100
          foreground: 'var(--color-muted-foreground)', // gray-600
        },
        border: 'var(--color-border)',                // gray-200
        input: 'var(--color-input)',                  // gray-200
        ring: 'var(--color-ring)',                    // blue-800
        success: {
          DEFAULT: 'var(--color-success)',            // green-600
          foreground: 'var(--color-success-foreground)', // white
        },
        warning: {
          DEFAULT: 'var(--color-warning)',            // yellow-600
          foreground: 'var(--color-warning-foreground)', // gray-900
        },
        error: {
          DEFAULT: 'var(--color-error)',              // red-500
          foreground: 'var(--color-error-foreground)', // white
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',        // red-500
          foreground: 'var(--color-destructive-foreground)', // white
        },
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
        caption: ['Inter', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
        sans: ['Source Sans 3', 'sans-serif'],
      },
      fontSize: {
        'h1': ['2.25rem', { lineHeight: '1.2' }],
        'h2': ['1.875rem', { lineHeight: '1.25' }],
        'h3': ['1.5rem', { lineHeight: '1.3' }],
        'h4': ['1.25rem', { lineHeight: '1.4' }],
        'h5': ['1.125rem', { lineHeight: '1.5' }],
        'caption': ['0.875rem', { lineHeight: '1.4', letterSpacing: '0.025em' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '18px',
        'xl': '24px',
        DEFAULT: '12px',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(45, 55, 72, 0.1)',
        'md': '0 4px 6px rgba(45, 55, 72, 0.1)',
        'lg': '0 6px 12px rgba(45, 55, 72, 0.12)',
        'xl': '0 20px 25px -5px rgba(45, 55, 72, 0.15)',
        'card': '0 2px 4px rgba(45, 55, 72, 0.1)',
        'card-hover': '0 4px 8px rgba(45, 55, 72, 0.12)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        DEFAULT: '250ms',
        'fast': '150ms',
        'normal': '250ms',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      maxWidth: {
        'prose': '70ch',
      },
      zIndex: {
        'dropdown': '50',
        'sticky': '100',
        'overlay': '150',
        'modal': '200',
        'toast': '300',
      },
      minHeight: {
        'touch': '44px',
      },
      minWidth: {
        'touch': '44px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/line-clamp'),
    require('tailwindcss-animate'),
  ],
};