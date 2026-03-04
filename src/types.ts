import type { VesselType } from './vessels';

export interface Dimensions {
  readonly length?: number;
  readonly width?: number;
  readonly height: number;
  readonly diameter?: number;
  readonly radius?: number;
  readonly topDiameter?: number;
  readonly bottomDiameter?: number;
}

export interface VesselConfig {
  readonly type: VesselType;
  readonly dimensions: Dimensions;
  readonly orientation?: 'vertical' | 'horizontal';
}

export interface VolumeResult {
  readonly volume: number;
  readonly percentage: number;
}

export type Unit = 'liters' | 'gallons' | 'cubicMeters' | 'percentage';

export interface ConversionOptions {
  readonly fromUnit?: Unit;
  readonly toUnit?: Unit;
  readonly precision?: number;
}

export interface TankLevelConfig {
  readonly defaultUnit?: Unit;
  readonly precision?: number;
}

export interface CalculationInput {
  readonly vessel: VesselConfig;
  readonly liquidHeight: number;
  readonly unit?: Unit;
}

export interface CalculationResult {
  readonly volume: number;
  readonly percentage: number;
  readonly unit: Unit;
}