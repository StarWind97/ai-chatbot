import type { NextFontWithVariable } from 'next/dist/compiled/@next/font';

declare module 'geist' {
  export const GeistSans: NextFontWithVariable;
  export const GeistMono: NextFontWithVariable;
}

declare module 'geist/font' {
  export const GeistSans: NextFontWithVariable;
  export const GeistMono: NextFontWithVariable;
}
