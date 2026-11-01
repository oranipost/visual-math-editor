/** Fixed, offline teaching shapes. Lengths use one consistent user-chosen unit. */
export type SolidGeometryShape = 'sphere' | 'cylinder' | 'cone' | 'pyramid' | 'prism' | 'cuboid' | 'plane';
export type SpatialGeometryShape = 'planes' | 'line-plane' | 'sphere-plane';
export type GeometryShape = SolidGeometryShape | SpatialGeometryShape;
export interface GeometryModel {
  shape: GeometryShape;
  radius?: number;
  width?: number;
  depth?: number;
  height?: number;
  sides?: number;
  faces?: boolean;
  /** Basic spatial-scene angle in degrees and signed offset from z = 0. */
  angle?: number;
  offset?: number;
}
