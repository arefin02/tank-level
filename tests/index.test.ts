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
    expect(() => strappingTable(cylinder, { steps: 0 })).toThrow("Steps must be at least 1");
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
  });

  it("should detect draining", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 8,
      heightAfter: 5,
      timeMinutes: 30,
    });
    expect(result.direction).toBe("draining");
    expect(result.volumeChange).toBeLessThan(0);
    expect(result.minutesToEmpty).not.toBeNull();
  });

  it("should detect stable level", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 5,
      heightAfter: 5,
      timeMinutes: 60,
    });
    expect(result.direction).toBe("stable");
    expect(result.volumeChange).toBe(0);
  });

  it("should calculate ETA to full", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 0,
      heightAfter: 5,
      timeMinutes: 60,
    });
    expect(result.direction).toBe("filling");
    expect(result.minutesToFull).not.toBeNull();
    // At this rate (5m in 60min), 5 more meters needed => 60 more min
    expect(result.minutesToFull).toBeCloseTo(60, 0);
  });

  it("should throw for zero time", () => {
    expect(() => fillRate({
      vessel: tank,
      heightBefore: 2,
      heightAfter: 4,
      timeMinutes: 0,
    })).toThrow("Time must be positive");
  });

  it("should report before/after percentages", () => {
    const result = fillRate({
      vessel: tank,
      heightBefore: 2,
      heightAfter: 8,
      timeMinutes: 60,
    });
    expect(result.percentBefore).toBeCloseTo(20, 1);
    expect(result.percentAfter).toBeCloseTo(80, 1);
  });
});

describe("tankAlarms", () => {
  const tank: VesselConfig = {
    type: "rectangular",
    dimensions: { length: 10, width: 5, height: 10 },
  };
  const alarms = { highHigh: 95, high: 80, low: 20, lowLow: 5 };

  it("should return normal for mid-range level", () => {
    const result = tankAlarms(tank, 5, alarms);
    expect(result.status).toBe("normal");
    expect(result.isAlarmed).toBe(false);
    expect(result.activeAlarms.length).toBe(0);
  });

  it("should detect high alarm", () => {
    const result = tankAlarms(tank, 8.5, alarms);
    expect(result.status).toBe("high");
    expect(result.isAlarmed).toBe(true);
    expect(result.activeAlarms).toContain("high");
  });

  it("should detect high-high alarm", () => {
    const result = tankAlarms(tank, 9.8, alarms);
    expect(result.status).toBe("high-high");
    expect(result.isAlarmed).toBe(true);
    expect(result.activeAlarms).toContain("high-high");
    expect(result.activeAlarms).toContain("high");
  });

  it("should detect low alarm", () => {
    const result = tankAlarms(tank, 1.5, alarms);
    expect(result.status).toBe("low");
    expect(result.isAlarmed).toBe(true);
  });

  it("should detect low-low alarm", () => {
    const result = tankAlarms(tank, 0.3, alarms);
    expect(result.status).toBe("low-low");
    expect(result.activeAlarms).toContain("low-low");
    expect(result.activeAlarms).toContain("low");
  });

  it("should report percentage", () => {
    const result = tankAlarms(tank, 5, alarms);
    expect(result.percentage).toBeCloseTo(50, 1);
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

  it("should calculate inventory across multiple tanks", () => {
    const result = tankInventory([
      { name: "Tank A", vessel: tank1, liquidHeight: 5 },
      { name: "Tank B", vessel: tank2, liquidHeight: 5 },
    ]);
    expect(result.count).toBe(2);
    expect(result.tanks.length).toBe(2);
    expect(result.tanks[0].name).toBe("Tank A");
    expect(result.tanks[1].name).toBe("Tank B");
    expect(result.totalVolume).toBeGreaterThan(0);
  });

  it("should calculate average percentage", () => {
    const result = tankInventory([
      { name: "Tank A", vessel: tank1, liquidHeight: 5 },  // 50%
      { name: "Tank B", vessel: tank2, liquidHeight: 5 },  // 50%
    ]);
    expect(result.averagePercentage).toBeCloseTo(50, 1);
  });

  it("should convert to specified unit", () => {
    const result = tankInventory([
      { name: "Tank A", vessel: tank1, liquidHeight: 10 },
    ], "liters");
    expect(result.unit).toBe("liters");
    // 10 * 5 * 10 = 500 m3 = 500000 liters
    expect(result.totalVolume).toBeGreaterThan(100);
  });

  it("should handle empty array", () => {
    const result = tankInventory([]);
    expect(result.count).toBe(0);
    expect(result.totalVolume).toBe(0);
    expect(result.averagePercentage).toBe(0);
  });

  it("should include per-tank percentage", () => {
    const result = tankInventory([
      { name: "Tank A", vessel: tank1, liquidHeight: 2 },
    ]);
    expect(result.tanks[0].percentage).toBeCloseTo(20, 1);
  });
});
