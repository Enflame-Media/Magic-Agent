export { default as Animated } from "./Animated.vue";
export { default as Temporary } from "./Temporary.vue";

// Re-export Vue Flow edge utilities and types so consumers can build
// custom edges without importing from @vue-flow/core directly.
export {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSimpleBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from "@vue-flow/core";
export type { EdgeProps } from "@vue-flow/core";
