export { default as Connection } from './Connection.vue'

// Re-export the connection line props type so consumers can type their
// custom connection line slots without reaching into @vue-flow/core.
export type { ConnectionLineProps } from '@vue-flow/core'
