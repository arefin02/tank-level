import { describe, it, expect } from "bun:test";
import { calculateVolume, convertVolume, convertPercentage } from "../src/index";
import type { VesselConfig } from "../src/index";

describe("calculateVolume", () => {
  it("should calculate volume for vertical cylindrical vessel", () => {
    const config: VesselConfig = {
      type: "cylindrical",
      dimensions: { diameter: 2, height: 10 },
      orientation: "vertical",
    };
    const result = calculateVolume(config, 5);
    expect(result.volume).toBeCloseTo(15.708, 2);
    expect(result.percentage).toBe(50);
  });

  it("should calculate volume for horizontal cylindrical vessel", () => {
    const config: VesselConfig = {
      type: "cylindrical",
      dimensions: { diameter: 2, height: 10 },
      orientation: "horizontal",
    };
    const result = calculateVolume(config, 1);
    expect(result.volume).toBeCloseTo(15.71, 2);
    expect(result.percentage).toBeCloseTo(50, 2); // Corrected percentage
  });

  it("should calculate volume for rectangular vessel", () => {
    const config: VesselConfig = {
      type: "rectangular",
      dimensions: { length: 5, width: 3, height: 10 },
    };
    const result = calculateVolume(config, 4);
    expect(result.volume).toBe(60);
    expect(result.percentage).toBe(40);
  });

  it("should calculate volume for conical vessel", () => {
    const config: VesselConfig = {
      type: "conical",
      dimensions: { topDiameter: 2, bottomDiameter: 4, height: 10 },
    };
    const result = calculateVolume(config, 5);
    expect(result.volume).toBeCloseTo(48.43, 2); // Corrected expected volume
    expect(result.percentage).toBe(50);
  });

  it("should throw error for negative liquid height", () => {
    const config: VesselConfig = {
      type: "rectangular",
      dimensions: { length: 5, width: 3, height: 10 },
    };
    expect(() => calculateVolume(config, -1)).toThrow("Liquid height cannot be negative");
  });
});

describe("convertVolume", () => {
  it("should convert liters to gallons", () => {
    const result = convertVolume(10, "liters", "gallons");
    expect(result).toBeCloseTo(2.64, 2);
  });

  it("should convert gallons to liters", () => {
    const result = convertVolume(5, "gallons", "liters");
    expect(result).toBeCloseTo(18.93, 2);
  });

  it("should return same value when units are identical", () => {
    const result = convertVolume(100, "liters", "liters");
    expect(result).toBe(100);
  });
});

describe("convertPercentage", () => {
  it("should convert percentage to liters", () => {
    const result = convertPercentage(50, "liters");
    expect(result).toBe(50);
  });

  it("should return same value when unit is percentage", () => {
    const result = convertPercentage(75, "percentage");
    expect(result).toBe(75);
  });
});