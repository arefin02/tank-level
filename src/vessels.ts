import type { Dimensions, VesselConfig, VolumeResult } from './types';

export type VesselType = 'cylindrical' | 'rectangular' | 'conical' | 'spherical';

function validateDimensions(dimensions: Dimensions, type: VesselType): void {
  if (type === 'cylindrical') {
    if (dimensions.diameter == null && dimensions.radius == null) {
      throw new Error('Cylindrical vessel requires diameter or radius');
    }
    if (dimensions.height == null) {
      throw new Error('Cylindrical vessel requires height');
    }
  } else if (type === 'rectangular') {
    if (dimensions.length == null || dimensions.width == null || dimensions.height == null) {
      throw new Error('Rectangular vessel requires length, width, and height');
    }
  } else if (type === 'conical') {
    if (dimensions.topDiameter == null || dimensions.bottomDiameter == null || dimensions.height == null) {
      throw new Error('Conical vessel requires topDiameter, bottomDiameter, and height');
    }
  } else if (type === 'spherical') {
    if (dimensions.diameter == null && dimensions.radius == null) {
      throw new Error('Spherical vessel requires diameter or radius');
    }
  }
}

function cylindricalVolume(dimensions: Dimensions, liquidHeight: number, orientation: 'vertical' | 'horizontal' = 'vertical'): VolumeResult {
  const diameter = dimensions.diameter ?? (dimensions.radius! * 2);
  const radius = diameter / 2;
  const totalHeight = dimensions.height;
  const totalVolume = Math.PI * radius * radius * totalHeight;

  if (orientation === 'vertical') {
    if (liquidHeight <= 0) return { volume: 0, percentage: 0 };
    if (liquidHeight >= totalHeight) return { volume: totalVolume, percentage: 100 };
    const volume = Math.PI * radius * radius * liquidHeight;
    return { volume, percentage: (volume / totalVolume) * 100 };
  } else {
    if (liquidHeight <= 0) return { volume: 0, percentage: 0 };
    if (liquidHeight >= diameter) return { volume: totalVolume, percentage: 100 };
    const centralAngle = 2 * Math.acos((radius - liquidHeight) / radius);
    const segmentArea = (radius * radius / 2) * (centralAngle - Math.sin(centralAngle));
    const volume = segmentArea * totalHeight;
    return { volume, percentage: (volume / totalVolume) * 100 };
  }
}

function rectangularVolume(dimensions: Dimensions, liquidHeight: number): VolumeResult {
  const length = dimensions.length!;
  const width = dimensions.width!;
  const height = dimensions.height;
  const totalVolume = length * width * height;

  if (liquidHeight <= 0) return { volume: 0, percentage: 0 };
  if (liquidHeight >= height) return { volume: totalVolume, percentage: 100 };
  const volume = length * width * liquidHeight;
  return { volume, percentage: (volume / totalVolume) * 100 };
}

function conicalVolume(dimensions: Dimensions, liquidHeight: number): VolumeResult {
  const topDiameter = dimensions.topDiameter!;
  const bottomDiameter = dimensions.bottomDiameter!;
  const height = dimensions.height;
  const topRadius = topDiameter / 2;
  const bottomRadius = bottomDiameter / 2;
  const totalVolume = (1/3) * Math.PI * height * (topRadius * topRadius + topRadius * bottomRadius + bottomRadius * bottomRadius);

  if (liquidHeight <= 0) return { volume: 0, percentage: 0 };
  if (liquidHeight >= height) return { volume: totalVolume, percentage: 100 };

  // At height h, radius interpolates linearly from bottom to top
  const radiusAtH = bottomRadius + (topRadius - bottomRadius) * (liquidHeight / height);
  // Volume of frustum from 0 to liquidHeight
  const volume = (1/3) * Math.PI * liquidHeight * (bottomRadius * bottomRadius + bottomRadius * radiusAtH + radiusAtH * radiusAtH);
  return { volume, percentage: (volume / totalVolume) * 100 };
}

function sphericalVolume(dimensions: Dimensions, liquidHeight: number): VolumeResult {
  const diameter = dimensions.diameter ?? (dimensions.radius! * 2);
  const radius = diameter / 2;
  const totalVolume = (4 / 3) * Math.PI * radius * radius * radius;

  if (liquidHeight <= 0) return { volume: 0, percentage: 0 };
  if (liquidHeight >= diameter) return { volume: totalVolume, percentage: 100 };

  // Volume of spherical cap: V = pi * h^2 * (3r - h) / 3
  const h = liquidHeight;
  const volume = (Math.PI * h * h * (3 * radius - h)) / 3;
  return { volume, percentage: (volume / totalVolume) * 100 };
}

export function calculateVolume(config: VesselConfig, liquidHeight: number): VolumeResult {
  validateDimensions(config.dimensions, config.type);
  if (liquidHeight < 0) throw new Error('Liquid height cannot be negative');

  switch (config.type) {
    case 'cylindrical':
      return cylindricalVolume(config.dimensions, liquidHeight, config.orientation);
    case 'rectangular':
      return rectangularVolume(config.dimensions, liquidHeight);
    case 'conical':
      return conicalVolume(config.dimensions, liquidHeight);
    case 'spherical':
      return sphericalVolume(config.dimensions, liquidHeight);
    default:
      throw new Error(`Unsupported vessel type: ${config.type}`);
  }
}