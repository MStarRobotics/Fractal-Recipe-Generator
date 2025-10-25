// Fallback stub for React module types when @types/react is not installed.
// Intentionally minimal and only for local typechecking; prefer @types/react.

declare module 'react' {
  export type FC<P = {}> = (props: P) => any;
  export type ReactNode = any;
  export type ChangeEvent<T = any> = { target: T } & any;
  export function useState<S = any>(initial: S): [S, (v: S) => void];
  export function useEffect(effect: (...args: any[]) => any, deps?: any[]): void;
  export function useRef<T = any>(initial: T): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
  const React: any;
  export default React;
}
