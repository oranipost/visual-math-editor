/** Fixed, offline teaching shapes. Lengths use one consistent user-chosen unit. */
export type SolidGeometryShape =
  | 'sphere'
  | 'hemisphere'
  | 'cylinder'
  | 'cone'
  | 'frustum'
  | 'pyramid'
  | 'prism'
  | 'cuboid'
  | 'plane';

export type SpatialGeometryShape = 'planes' | 'line-plane' | 'sphere-plane';
export type GeometryShape = SolidGeometryShape | SpatialGeometryShape | 'composite';

export type CompositePartStyle = 'solid' | 'translucent' | 'wireframe';
export type CompositePartColor = 'indigo' | 'teal' | 'amber' | 'rose' | 'slate';

export interface CompositeVector3 {
  x: number;
  y: number;
  z: number;
}

export interface CompositeRotation {
  x?: number;
  y?: number;
  z?: number;
}

export interface CompositeGeometryPart {
  shape: SolidGeometryShape;
  radius?: number;
  topRadius?: number;
  width?: number;
  depth?: number;
  height?: number;
  sides?: number;
  offset?: CompositeVector3;
  rotation?: CompositeRotation;
  style?: CompositePartStyle;
  color?: CompositePartColor;
}

export interface GeometryModel {
  shape: GeometryShape;
  radius?: number;
  topRadius?: number;
  width?: number;
  depth?: number;
  height?: number;
  sides?: number;
  faces?: boolean;
  /** Basic spatial-scene angle in degrees and signed offset from z = 0. */
  angle?: number;
  offset?: number;
  /** Bounded multi-solid composite scene (2 to 6 primitive parts). */
  parts?: CompositeGeometryPart[];
}
