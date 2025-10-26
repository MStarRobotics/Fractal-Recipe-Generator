// Fallback stub for React module types when @types/react is not installed.
// Intentionally lightweight: prefer installing the official React type packages for full fidelity.

declare module 'react' {
  export type Key = string | number;
  export type ReactText = string | number;
  export type ReactNode = ReactElement | ReactText | boolean | null | undefined | Iterable<ReactNode>;

  export interface ReactElement<P = any, T = any> {
    type: T;
    props: P;
    key: Key | null;
  }

  export type FC<P = {}> = (props: P & { children?: ReactNode }) => JSX.Element | null;
  export type PropsWithChildren<P = {}> = P & { children?: ReactNode };

  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);

  export interface MutableRefObject<T> {
    current: T;
  }

  export interface RefObject<T> {
    readonly current: T | null;
  }

  export type DependencyList = readonly unknown[];

  export interface BaseSyntheticEvent<T = Event, E = EventTarget> {
    nativeEvent: T;
    target: E;
    currentTarget: E;
    preventDefault(): void;
    stopPropagation(): void;
  }

  export type SyntheticEvent<T = Element, E = Event> = BaseSyntheticEvent<E, T>;

  export interface ChangeEvent<T = Element> extends SyntheticEvent<T, Event> {
    target: T;
  }

  export interface KeyboardEvent<T = Element> extends SyntheticEvent<T, globalThis.KeyboardEvent> {
    key: string;
  }

  export interface MouseEvent<T = Element> extends SyntheticEvent<T, globalThis.MouseEvent> {
    button: number;
  }

  export type FormEvent<T = Element> = SyntheticEvent<T>;
  export type FocusEvent<T = Element> = SyntheticEvent<T, globalThis.FocusEvent>;

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  export type HTMLAttributes<T> = Record<string, unknown>;
  export type ButtonHTMLAttributes<T> = HTMLAttributes<T>;
  export type InputHTMLAttributes<T> = HTMLAttributes<T> & { value?: string | number; onChange?: (event: ChangeEvent<T>) => void };
  export type DetailedHTMLProps<E, T> = E & T;

  export function createElement(type: any, props?: any, ...children: ReactNode[]): ReactElement;
  export const Fragment: FC<{ children?: ReactNode }>;
  export const StrictMode: FC<{ children?: ReactNode }>;

  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>];

  export function useEffect(effect: () => void | (() => void | undefined), deps?: DependencyList): void;
  export function useMemo<T>(factory: () => T, deps?: DependencyList): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: DependencyList): T;

  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useRef<T>(initialValue: T | null): MutableRefObject<T | null>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;

  export interface Context<T> {
    Provider: FC<{ value: T; children?: ReactNode }>;
    Consumer: FC<{ children: (value: T) => ReactNode }>;
    displayName?: string;
  }

  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;

  const React: {
    createElement: typeof createElement;
    Fragment: typeof Fragment;
    StrictMode: typeof StrictMode;
  } & Record<string, any>;

  export default React;
}

declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export interface Root {
    render(children: ReactNode): void;
    unmount(): void;
  }

  export function createRoot(container: Element | DocumentFragment): Root;
}
