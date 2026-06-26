// JS mirror of the CSS design tokens (global.css) for use where className
// cannot reach: icon `color` props, BlurView tint, StatusBar, gradients, SVG.
// Keep in sync with global.css / tailwind.config.js.

export type ColorScheme = 'light' | 'dark';

type Palette = {
  background: string;
  foreground: string;
  surface: string;
  surfaceElevated: string;
  hairline: string;
  card: string;
  cardForeground: string;
  popover: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  neutral: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  glass: string;
};

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    background: 'hsl(0,0%,95%)',
    foreground: 'hsl(0,0%,5%)',
    surface: 'hsl(0,0%,99%)',
    surfaceElevated: 'hsl(0,0%,100%)',
    hairline: 'hsl(0,0%,82%)',
    card: 'hsl(0,0%,100%)',
    cardForeground: 'hsl(0,0%,5%)',
    popover: 'hsl(0,0%,100%)',
    primary: 'hsl(0,0%,5%)',
    primaryForeground: 'hsl(0,0%,99%)',
    secondary: 'hsl(0,0%,94%)',
    secondaryForeground: 'hsl(0,0%,5%)',
    muted: 'hsl(0,0%,94%)',
    mutedForeground: 'hsl(0,0%,39%)',
    accent: 'hsl(142,65%,45%)',
    success: 'hsl(142,65%,45%)',
    warning: 'hsl(43,90%,50%)',
    danger: 'hsl(1,85%,57%)',
    neutral: 'hsl(0,0%,53%)',
    destructive: 'hsl(1,85%,57%)',
    border: 'hsl(0,0%,87%)',
    input: 'hsl(0,0%,92%)',
    ring: 'hsl(142,65%,45%)',
    glass: 'rgba(255,255,255,0.72)',
  },
  dark: {
    background: 'hsl(0,0%,3%)',
    foreground: 'hsl(0,0%,97%)',
    surface: 'hsl(0,0%,8%)',
    surfaceElevated: 'hsl(0,0%,12%)',
    hairline: 'hsl(0,0%,16%)',
    card: 'hsl(0,0%,8%)',
    cardForeground: 'hsl(0,0%,97%)',
    popover: 'hsl(0,0%,10%)',
    primary: 'hsl(0,0%,97%)',
    primaryForeground: 'hsl(0,0%,8%)',
    secondary: 'hsl(0,0%,14%)',
    secondaryForeground: 'hsl(0,0%,97%)',
    muted: 'hsl(0,0%,14%)',
    mutedForeground: 'hsl(0,0%,60%)',
    accent: 'hsl(142,67%,48%)',
    success: 'hsl(142,67%,48%)',
    warning: 'hsl(43,92%,60%)',
    danger: 'hsl(1,80%,60%)',
    neutral: 'hsl(0,0%,53%)',
    destructive: 'hsl(1,80%,60%)',
    border: 'hsl(0,0%,16%)',
    input: 'hsl(0,0%,16%)',
    ring: 'hsl(142,67%,48%)',
    glass: 'rgba(8,8,8,0.72)',
  },
};
