export { default as Canvas } from './Canvas.vue'

// Re-export commonly-used Vue Flow types so consumers do not import from
// @vue-flow/* directly. AI Elements is the canonical entry point for the
// workflow system; these types are part of the wrapper contract.
export type {
  Connection,
  Edge,
  EdgeChange,
  FlowElements,
  FlowEmits,
  FlowProps,
  FlowSlots,
  GraphEdge,
  GraphNode,
  Node,
  NodeChange,
  ViewportTransform,
  XYPosition,
} from '@vue-flow/core'

// Runtime helpers commonly needed when constructing workflow state
export {
  MarkerType,
  Position,
  useVueFlow,
} from '@vue-flow/core'
