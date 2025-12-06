// Minimal React/JSX stubs to satisfy strict TS in environments without @types/react installed.
// If @types/react is available, TypeScript will prefer it and these stubs will be ignored.

declare namespace JSX {
  interface IntrinsicAttributes {
    key?: string | number | null;
    ref?: unknown;
  }

  interface IntrinsicElements {
    [elemName: string]: unknown;
  }

  // Ensure JSX.Element is compatible with React.ReactElement so Root.render accepts it
  interface Element extends React.ReactElement<unknown, unknown> {
    // Additional properties can be added here if needed
  }
  interface ElementClass {
    render?: unknown;
  }
  interface ElementChildrenAttribute {
    children: React.ReactNode;
  }
}

declare module 'react/jsx-runtime' {
  const jsxRuntime: unknown;
  export = jsxRuntime;
}
