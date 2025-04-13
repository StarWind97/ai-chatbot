// This file provides a basic type declaration for modules that lack their own.

declare module '@codemirror/theme-one-dark' {
  import type { Extension } from '@codemirror/state';
  const oneDark: Extension;
  export { oneDark };
}
