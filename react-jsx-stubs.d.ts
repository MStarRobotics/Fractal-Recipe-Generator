// Minimal React/JSX stubs to satisfy strict TS in environments without @types/react installed.
// If @types/react is available, TypeScript will prefer it and these stubs will be ignored.

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react/jsx-runtime' {
  const jsxRuntime: any;
  export = jsxRuntime;
}
