import { describe, it, expect } from "bun:test";
import { calculateVolume, convertVolume, convertPercentage, strappingTable, fillRate, tankAlarms, tankInventory } from "../src/index";
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
    expect(result.percentage).toBeCloseTo(50, 2);
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
    expect(result.volume).toBeCloseTo(48.43, 2);
    // Conical: half height != 50% because wider at bottom
    expect(result.percentage).toBeCloseTo(66.07, 1);
  });

  it("should throw error for negative liquid height", () => {
    const config: VesselConfig = {
      type: "rectangular",
      dimensions: { length: 5, width: 3, height: 10 },
    };
    expect(() => calculateVolume(config, -1)).toThrow("Liquid height cannot be negative");
  });
});

describe("spherical vessel", () => {
  const sphere: VesselConfig = {
    type: "spherical",
    dimensions: { diameter: 2 },
  };

  it("should calculate 0% at height 0", () => {
    const result = calculateVolume(sphere, 0);
    expect(result.volume).toBe(0);
    expect(result.percentage).toBe(0);
  });

  it("should calculate 100% at full diameter", () => {
    const result = calculateVolume(sphere, 2);
    expect(result.percentage).toBe(100);
    // Total volume of sphere with r=1: (4/3) * pi * 1^3 = 4.189
    expect(result.volume).toBeCloseTo(4.189, 2);
  });

  it("should calculate 50% at half diameter", () => {
    const result = calculateVolume(sphere, 1);
    expect(result.percentage).toBeCloseTo(50, 1);
  });

  it("should work with radius instead of diameter", () => {
    const config: VesselConfig = {
      type: "spherical",
      dimensions: { radius: 1 },
    };
    const result = calculateVolume(config, 2);
    expect(result.percentage).toBe(100);
    expect(result.volume).toBeCloseTo(4.189, 2);
  });

  it("should throw without diameter or radius", () => {
    const config: VesselConfig = {
      type: "spherical",
      dimensions: { height: 2 },
    };
    expect(() => calculateVolume(config, 1)).toThrow("Spherical vessel requires diameter or radius");
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

// --- v0.2.0 Tests ---

describe("strappingTable", () => {
  const cylinder: VesselConfig = {
    type: "cylindrical",
    dimensions: { diameter: 2, height: 10 },
    orientation: "vertical",
  };

  it("should generate correct number of entries", () => {
    const table = strappingTable(cylinder, { steps: 10 });
    expect(table.length).toBe(11); // 0 to 10 inclusive
  });

  it("should start at 0% and end at 100%", () => {
    const table = strappingTable(cylinder, { steps: 10 });
    expect(table[0].height).toBe(0);
    expect(table[0].percentage).toBe(0);
    expect(table[10].percentage).toBeCloseTo(100, 1);
  });

  it("should increase monotonically", () => {
    const table = strappingTable(cylinder, { steps: 20 });
    for (let i = 1; i < table.length; i++) {
      expect(table[i].volume).toBeGreaterThanOrEqual(table[i - 1].volume);
    }
  });

  it("should convert to liters", () => {
    const table = strappingTable(cylinder, { steps: 5, unit: "liters" });
    // Last entry: full cylinder volume in liters (pi * 1^2 * 10 = 31.416 m3 -> 31416 liters)
    expect(table[table.length - 1].volume).toBeGreaterThan(100);
  });

  it("should throw for steps < 1", () => {
    expect(() => strappingTable(cylinder, { steps: 0 })).toThrow("Steps must be between 1 and 10000");
  });

  it("should work for spherical vessels", () => {
    const sphere: VesselConfig = {
      type: "spherical",
      dimensions: { diameter: 2 },
    };
    const table = strappingTable(sphere, { steps: 10 });
    expect(table.length).toBe(11);
    expect(table[0].percentage).toBe(0);
    expect(table[10].percentage).toBeCloseTo(100, 1);
  });

  it("should handle max steps", () => {
    const table = strappingTable(cylinder, { steps: 10000 });
    expect(table.length).toBe(10001);
  });

  it("should throw for steps > 10000", () => {
    expect(() => strappingTable(cylinder, { steps: 10001 })).toThrow("Steps must be between 1 and 10000");
  });
});

describe("fillRate", () => {
  const tank: VesselConfig = {
    type: "rectangular",
    dimensions: { length: 10, width: 5, height: 10 },
  };

  it("should detect filling", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 2,
      heightAfter: 4,
      timeMinutes: 60,
    });
    expect(result.direction).toBe("filling");
    expect(result.volumeChange).toBeGreaterThan(0);
    expect(result.ratePerMinute).toBeGreaterThan(0);
    expect(result.ratePerHour).toBeCloseTo(result.ratePerMinute * 60, 2);
    expect(result.percentBefore).toBe(20);
    expect(result.percentAfter).toBe(40);
  });

  it("should detect draining", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 8,
      heightAfter: 3,
      timeMinutes: 30,
    });
    expect(result.direction).toBe("draining");
    expect(result.volumeChange).toBeLessThan(0);
    expect(result.ratePerMinute).toBeLessThan(0);
    expect(result.ratePerHour).toBeCloseTo(result.ratePerMinute * 60, 2);
    expect(result.percentBefore).toBe(80);
    expect(result.percentAfter).toBe(30);
  });

  it("should detect stable", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 5,
      heightAfter: 5,
      timeMinutes: 10,
    });
    expect(result.direction).toBe("stable");
    expect(result.volumeChange).toBe(0);
    expect(result.ratePerMinute).toBe(0);
    expect(result.ratePerHour).toBe(0);
    expect(result.minutesToFull).toBeNull();
    expect(result.minutesToEmpty).toBeNull();
  });

  it("should calculate minutes to full for filling tank", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 4,
      heightAfter: 5,
      timeMinutes: 10,
    });
    // 1m height change in 10 min. Total height 10m. Remaining 5m. So 50 min.
    expect(result.minutesToFull).toBeCloseTo(50, 2);
    expect(result.minutesToEmpty).toBeCloseTo(50, 2); // 5m to drain at 1m/10min
  });

  it("should calculate minutes to empty for draining tank", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 7,
      heightAfter: 6,
      timeMinutes: 5,
    });
    // 1m height change in 5 min. Remaining 6m. So 30 min.
    expect(result.minutesToEmpty).toBeCloseTo(30, 2);
    expect(result.minutesToFull).toBeCloseTo(20, 2); // 4m to fill at 1m/5min
  });

  it("should handle zero timeMinutes", () => {
    expect(() => fillRate({
      vessel: tank,
      heightBefore: 2,
      heightAfter: 4,
      timeMinutes: 0,
    })).toThrow("timeMinutes must be a positive number");
  });

  it("should handle negative timeMinutes", () => {
    expect(() => fillRate({
      vessel: tank,
      heightBefore: 2,
      heightAfter: 4,
      timeMinutes: -10,
    })).toThrow("timeMinutes must be a positive number");
  });

  it("should handle invalid heightBefore/After", () => {
    expect(() => fillRate({
      vessel: tank,
      heightBefore: -1,
      heightAfter: 2,
      timeMinutes: 10,
    })).toThrow("Liquid height cannot be negative");

    expect(() => fillRate({
      vessel: tank,
      heightBefore: 2,
      heightAfter: 11,
      timeMinutes: 10,
    })).toThrow("Liquid height cannot exceed vessel height");
  });

  it("should work with different vessel types (e.g., cylindrical)", () => {
    const cylinder: VesselConfig = {
      type: "cylindrical",
      dimensions: { diameter: 2, height: 10 },
      orientation: "vertical",
    };
    const result = fillRate({
      vessel: cylinder,
      heightBefore: 4,
      heightAfter: 6,
      timeMinutes: 20,
    });
    expect(result.direction).toBe("filling");
    expect(result.volumeChange).toBeCloseTo(6.283, 2); // pi * 1^2 * (6-4)
    expect(result.ratePerMinute).toBeCloseTo(0.314, 2);
    expect(result.minutesToFull).toBeCloseTo(40, 2); // 4m remaining, 0.1m/min rate
  });
});

describe("tankAlarms", () => {
  const config = {
    highHigh: 95,
    high: 90,
    low: 10,
    lowLow: 5,
  };

  it("should be normal when within bounds", () => {
    const result = tankAlarms(config, 50);
    expect(result.status).toBe("normal");
    expect(result.isAlarmed).toBe(false);
    expect(result.activeAlarms).toEqual([]);
  });

  it("should detect high alarm", () => {
    const result = tankAlarms(config, 92);
    expect(result.status).toBe("high");
    expect(result.isAlarmed).toBe(true);
    expect(result.activeAlarms).toEqual(["high"]);
  });

  it("should detect high-high alarm", () => {
    const result = tankAlarms(config, 98);
    expect(result.status).toBe("high-high");
    expect(result.isAlarmed).toBe(true);
    expect(result.activeAlarms).toEqual(["high", "high-high"]);
  });

  it("should detect low alarm", () => {
    const result = tankAlarms(config, 8);
    expect(result.status).toBe("low");
    expect(result.isAlarmed).toBe(true);
    expect(result.activeAlarms).toEqual(["low"]);
  });

  it("should detect low-low alarm", () => {
    const result = tankAlarms(config, 3);
    expect(result.status).toBe("low-low");
    expect(result.isAlarmed).toBe(true);
    expect(result.activeAlarms).toEqual(["low", "low-low"]);
  });

  it("should handle exact boundary values", () => {
    expect(tankAlarms(config, 90).status).toBe("high");
    expect(tankAlarms(config, 95).status).toBe("high-high");
    expect(tankAlarms(config, 10).status).toBe("low");
    expect(tankAlarms(config, 5).status).toBe("low-low");
  });

  it("should handle partial alarm configurations", () => {
    const partialConfig = { high: 80 };
    expect(tankAlarms(partialConfig, 85).status).toBe("high");
    expect(tankAlarms(partialConfig, 70).status).toBe("normal");
  });

  it("should prioritize higher severity alarms", () => {
    const result = tankAlarms(config, 96);
    expect(result.status).toBe("high-high");
  });

  it("should handle empty config", () => {
    const result = tankAlarms({}, 50);
    expect(result.status).toBe("normal");
    expect(result.isAlarmed).toBe(false);
  });

  it("should throw for invalid percentage", () => {
    expect(() => tankAlarms(config, -1)).toThrow("Percentage must be between 0 and 100");
    expect(() => tankAlarms(config, 101)).toThrow("Percentage must be between 0 and 100");
  });
});

describe("tankInventory", () => {
  const tank1: VesselConfig = {
    type: "rectangular",
    dimensions: { length: 10, width: 5, height: 10 },
  };
  const tank2: VesselConfig = {
    type: "cylindrical",
    dimensions: { diameter: 2, height: 10 },
    orientation: "vertical",
  };

  const readings = [
    { name: "Tank A", vessel: tank1, liquidHeight: 5, unit: "liters" },
    { name: "Tank B", vessel: tank2, liquidHeight: 5, unit: "liters" },
    { name: "Tank C", vessel: tank1, liquidHeight: 2, unit: "cubicMeters" },
  ];

  it("should calculate total inventory correctly", () => {
    const result = tankInventory(readings);
    expect(result.count).toBe(3);
    expect(result.unit).toBe("cubicMeters"); // Default unit is cubicMeters

    // Tank A: 10*5*5 = 250 m3
    // Tank B: pi * 1^2 * 5 = 15.708 m3
    // Tank C: 10*5*2 = 100 m3
    expect(result.totalVolume).toBeCloseTo(250 + 15.708 + 100, 2);

    // Tank A: 50%
    // Tank B: 50%
    // Tank C: 20%
    expect(result.averagePercentage).toBeCloseTo((50 + 50 + 20) / 3, 2);

    expect(result.tanks[0].name).toBe("Tank A");
    expect(result.tanks[0].volume).toBeCloseTo(250, 2);
    expect(result.tanks[0].percentage).toBe(50);
    expect(result.tanks[0].unit).toBe("cubicMeters");

    expect(result.tanks[1].name).toBe("Tank B");
    expect(result.tanks[1].volume).toBeCloseTo(15.708, 2);
    expect(result.tanks[1].percentage).toBe(50);
    expect(result.tanks[1].unit).toBe("cubicMeters");

    expect(result.tanks[2].name).toBe("Tank C");
    expect(result.tanks[2].volume).toBeCloseTo(100, 2);
    expect(result.tanks[2].percentage).toBe(20);
    expect(result.tanks[2].unit).toBe("cubicMeters");
  });

  it("should allow specifying a target unit", () => {
    const result = tankInventory(readings, { targetUnit: "gallons" });
    expect(result.unit).toBe("gallons");

    // 250 m3 = 66043 gallons
    // 15.708 m3 = 4150 gallons
    // 100 m3 = 26417 gallons
    const expectedTotalGallons = convertVolume(250 + 15.708 + 100, "cubicMeters", "gallons");
    expect(result.totalVolume).toBeCloseTo(expectedTotalGallons, 0);

    expect(result.tanks[0].unit).toBe("gallons");
    expect(result.tanks[0].volume).toBeCloseTo(convertVolume(250, "cubicMeters", "gallons"), 0);
  });

  it("should handle empty readings array", () => {
    const result = tankInventory([]);
    expect(result.count).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.averagePercentage).toBe(0);
    expect(result.tanks).toEqual([]);
  });

  it("should handle readings with invalid liquid heights", () => {
    const invalidReadings = [
      { name: "Tank A", vessel: tank1, liquidHeight: -1, unit: "liters" },
      { name: "Tank B", vessel: tank2, liquidHeight: 5, unit: "liters" },
    ];
    // Expect the invalid tank to be skipped or result in 0 volume/percentage
    const result = tankInventory(invalidReadings);
    expect(result.count).toBe(1); // Only Tank B is valid
    expect(result.tanks[0].name).toBe("Tank B");
    expect(result.tanks[0].volume).toBeCloseTo(15.708, 2);
  });
});
