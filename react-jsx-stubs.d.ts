// Minimal React/JSX stubs to satisfy strict TS in environments without @types/react installed.
// If @types/react is available, TypeScript will prefer it and these stubs will be ignored.

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number | null;
    ref?: unknown;
  }

  interface IntrinsicElements {
    [elemName: string]: any;
  }

  interface Element {}
  interface ElementClass {
    render?: unknown;
  }
  interface ElementChildrenAttribute {
    children: unknown;
  }
}

declare module 'react/jsx-runtime' {
  const jsxRuntime: any;
  export = jsxRuntime;
}
