/**
 * Vue SFC type declarations
 *
 * This shim allows TypeScript to understand .vue single-file components
 * and provides proper type support for Vue 3 components.
 */
declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<
        Record<string, unknown>,
        Record<string, unknown>,
        unknown
    >;
    export default component;
}
