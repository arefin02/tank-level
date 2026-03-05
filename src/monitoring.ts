import type { VesselConfig, StrappingEntry, StrappingOptions, FillRateInput, FillRateResult, AlarmConfig, AlarmStatus, AlarmResult, TankReading, InventoryEntry, InventoryResult, Unit } from './types';
import { calculateVolume } from './vessels';
import { convertVolume } from './converter';

/**
 * Generate a strapping (calibration) table for a vessel.
 * Returns volume at evenly spaced height intervals.
 */
export function strappingTable(vessel: VesselConfig, options?: StrappingOptions): readonly StrappingEntry[] {
  const steps = options?.steps ?? 20;
  const unit = options?.unit ?? 'cubicMeters';
  const precision = options?.precision ?? 4;

  if (steps < 1) throw new Error('Steps must be at least 1');

  // Determine max height based on vessel type
  let maxHeight: number;
  if (vessel.type === 'spherical') {
    const d = vessel.dimensions.diameter ?? (vessel.dimensions.radius! * 2);
    maxHeight = d;
  } else if (vessel.type === 'cylindrical' && vessel.orientation === 'horizontal') {
    const d = vessel.dimensions.diameter ?? (vessel.dimensions.radius! * 2);
    maxHeight = d;
  } else {
    maxHeight = vessel.dimensions.height;
  }

  const entries: StrappingEntry[] = [];
  for (let i = 0; i <= steps; i++) {
    const height = (i / steps) * maxHeight;
    const result = calculateVolume(vessel, height);

    let volume = result.volume;
    if (unit !== 'cubicMeters' && unit !== 'percentage') {
      volume = convertVolume(result.volume, 'cubicMeters', unit, precision);
    }

    entries.push({
      height: parseFloat(height.toFixed(precision)),
      volume: unit === 'percentage' ? parseFloat(result.percentage.toFixed(precision)) : parseFloat(volume.toFixed(precision)),
      percentage: parseFloat(result.percentage.toFixed(precision)),
    });
  }

  return entries;
}

/**
 * Calculate fill/drain rate from two level readings.
 */
export function fillRate(input: FillRateInput): FillRateResult {
  if (input.timeMinutes <= 0) throw new Error('Time must be positive');

  const before = calculateVolume(input.vessel, input.heightBefore);
  const after = calculateVolume(input.vessel, input.heightAfter);

  const volumeChange = after.volume - before.volume;
  const ratePerMinute = volumeChange / input.timeMinutes;
  const ratePerHour = ratePerMinute * 60;

  const direction: 'filling' | 'draining' | 'stable' =
    Math.abs(volumeChange) < 1e-10 ? 'stable' :
    volumeChange > 0 ? 'filling' : 'draining';

  // Calculate total vessel volume for ETA
  let maxHeight: number;
  if (input.vessel.type === 'spherical') {
    const d = input.vessel.dimensions.diameter ?? (input.vessel.dimensions.radius! * 2);
    maxHeight = d;
  } else if (input.vessel.type === 'cylindrical' && input.vessel.orientation === 'horizontal') {
    const d = input.vessel.dimensions.diameter ?? (input.vessel.dimensions.radius! * 2);
    maxHeight = d;
  } else {
    maxHeight = input.vessel.dimensions.height;
  }
  const totalVolume = calculateVolume(input.vessel, maxHeight).volume;

  let minutesToFull: number | null = null;
  let minutesToEmpty: number | null = null;

  if (direction === 'filling') {
    const remaining = totalVolume - after.volume;
    minutesToFull = remaining / ratePerMinute;
  } else if (direction === 'draining') {
    minutesToEmpty = after.volume / Math.abs(ratePerMinute);
  }

  return {
    ratePerMinute: parseFloat(ratePerMinute.toFixed(6)),
    ratePerHour: parseFloat(ratePerHour.toFixed(4)),
    direction,
    volumeChange: parseFloat(volumeChange.toFixed(6)),
    minutesToFull: minutesToFull !== null ? parseFloat(minutesToFull.toFixed(1)) : null,
    minutesToEmpty: minutesToEmpty !== null ? parseFloat(minutesToEmpty.toFixed(1)) : null,
    percentBefore: parseFloat(before.percentage.toFixed(2)),
    percentAfter: parseFloat(after.percentage.toFixed(2)),
  };
}

/**
 * Evaluate tank level against alarm thresholds.
 * Thresholds are percentages (0-100).
 */
export function tankAlarms(vessel: VesselConfig, liquidHeight: number, alarms: AlarmConfig): AlarmResult {
  const result = calculateVolume(vessel, liquidHeight);
  const pct = result.percentage;

  const activeAlarms: AlarmStatus[] = [];

  if (alarms.highHigh !== undefined && pct >= alarms.highHigh) {
    activeAlarms.push('high-high');
  }
  if (alarms.high !== undefined && pct >= alarms.high) {
    activeAlarms.push('high');
  }
  if (alarms.low !== undefined && pct <= alarms.low) {
    activeAlarms.push('low');
  }
  if (alarms.lowLow !== undefined && pct <= alarms.lowLow) {
    activeAlarms.push('low-low');
  }

  // Most severe alarm wins
  let status: AlarmStatus = 'normal';
  if (activeAlarms.includes('high-high')) status = 'high-high';
  else if (activeAlarms.includes('low-low')) status = 'low-low';
  else if (activeAlarms.includes('high')) status = 'high';
  else if (activeAlarms.includes('low')) status = 'low';

  return {
    status,
    percentage: parseFloat(pct.toFixed(2)),
    activeAlarms,
    isAlarmed: activeAlarms.length > 0,
  };
}

/**
 * Calculate inventory across multiple tanks.
 */
export function tankInventory(readings: readonly TankReading[], outputUnit?: Unit): InventoryResult {
  const unit = outputUnit ?? 'cubicMeters';

  const tanks: InventoryEntry[] = readings.map(r => {
    const result = calculateVolume(r.vessel, r.liquidHeight);
    let volume = result.volume;
    if (unit !== 'cubicMeters' && unit !== 'percentage') {
      volume = convertVolume(result.volume, 'cubicMeters', unit);
    }
    return {
      name: r.name,
      volume: parseFloat(volume.toFixed(4)),
      percentage: parseFloat(result.percentage.toFixed(2)),
      unit,
    };
  });

  const totalVolume = parseFloat(tanks.reduce((sum, t) => sum + t.volume, 0).toFixed(4));
  const averagePercentage = tanks.length > 0
    ? parseFloat((tanks.reduce((sum, t) => sum + t.percentage, 0) / tanks.length).toFixed(2))
    : 0;

  return {
    tanks,
    totalVolume,
    averagePercentage,
    count: tanks.length,
    unit,
  };
}
