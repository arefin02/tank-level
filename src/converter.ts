import type { Unit } from './types';

const CONVERSION_FACTORS: Record<Unit, Record<Unit, number>> = {
  liters: {
    liters: 1,
    gallons: 0.264172,
    cubicMeters: 0.001,
    percentage: 1,
  },
  gallons: {
    liters: 3.78541,
    gallons: 1,
    cubicMeters: 0.00378541,
    percentage: 1,
  },
  cubicMeters: {
    liters: 1000,
    gallons: 264.172,
    cubicMeters: 1,
    percentage: 1,
  },
  percentage: {
    liters: 1,
    gallons: 1,
    cubicMeters: 1,
    percentage: 1,
  },
};

export function convertVolume(value: number, fromUnit: Unit, toUnit: Unit, precision: number = 2): number {
  if (fromUnit === toUnit) return value;
  const factor = CONVERSION_FACTORS[fromUnit][toUnit];
  const result = value * factor;
  return parseFloat(result.toFixed(precision));
}

export function convertPercentage(value: number, toUnit: Unit, precision: number = 2): number {
  if (toUnit === 'percentage') return value;
  return parseFloat(value.toFixed(precision));
}