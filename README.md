# tank-level

**Tank volume calculator with strapping tables, fill rate tracking, alarms & multi-tank inventory.**

Zero dependencies. TypeScript first. Built for IoT, SCADA, and process control.

## Who is this for?

- **Process engineers** -- tank gauging, calibration charts, level monitoring
- **IoT / SCADA integrators** -- level sensor data to volume conversion
- **Chemical plants & refineries** -- multi-tank inventory, alarm thresholds
- **Homebrewers & aquarists** -- simple volume calculations for any vessel shape

## Installation

```bash
bun add @adametherzlab/tank-level
# or: npm install @adametherzlab/tank-level
```

## Quick Start

```typescript
import { calculateVolume, strappingTable, fillRate, tankAlarms, tankInventory } from '@adametherzlab/tank-level';

// Calculate volume at a given liquid height
const result = calculateVolume({
  type: 'cylindrical',
  dimensions: { diameter: 2, height: 10 },
  orientation: 'vertical',
}, 5); // liquid height in meters
// => { volume: 15.708, percentage: 50 }

// Generate a calibration chart
const table = strappingTable({
  type: 'spherical',
  dimensions: { diameter: 3 },
}, { steps: 10, unit: 'liters' });

// Track fill/drain rate
const rate = fillRate({
  vessel: { type: 'rectangular', dimensions: { length: 10, width: 5, height: 10 } },
  heightBefore: 2,
  heightAfter: 6,
  timeMinutes: 120,
});
// => { direction: 'filling', ratePerHour: 100, minutesToFull: 120, ... }
```

## API Reference

### `calculateVolume(config, liquidHeight)` -- Volume from Height

Calculate volume and percentage for any vessel type.

```typescript
// Vertical cylinder
calculateVolume({ type: 'cylindrical', dimensions: { diameter: 2, height: 10 }, orientation: 'vertical' }, 5);
// => { volume: 15.708, percentage: 50 }

// Horizontal cylinder
calculateVolume({ type: 'cylindrical', dimensions: { diameter: 2, height: 10 }, orientation: 'horizontal' }, 1);
// => { volume: 15.71, percentage: 50 }

// Rectangular
calculateVolume({ type: 'rectangular', dimensions: { length: 5, width: 3, height: 10 } }, 4);
// => { volume: 60, percentage: 40 }

// Conical (frustum)
calculateVolume({ type: 'conical', dimensions: { topDiameter: 2, bottomDiameter: 4, height: 10 } }, 5);
// => { volume: 48.43, percentage: 66.1 }

// Spherical (NEW in v0.2.0)
calculateVolume({ type: 'spherical', dimensions: { diameter: 2 } }, 1);
// => { volume: 2.094, percentage: 50 }
```

**Vessel types:** `cylindrical` (vertical/horizontal), `rectangular`, `conical`, `spherical`

### `strappingTable(vessel, options?)` -- Calibration Chart

Generate a height-to-volume lookup table at evenly spaced intervals. Industry-standard tank calibration.

```typescript
strappingTable({
  type: 'cylindrical',
  dimensions: { diameter: 2, height: 10 },
  orientation: 'vertical',
}, { steps: 5, unit: 'liters' });
// => [
//   { height: 0,  volume: 0,     percentage: 0 },
//   { height: 2,  volume: 6283,  percentage: 20 },
//   { height: 4,  volume: 12566, percentage: 40 },
//   { height: 6,  volume: 18850, percentage: 60 },
//   { height: 8,  volume: 25133, percentage: 80 },
//   { height: 10, volume: 31416, percentage: 100 },
// ]
```

Options: `steps` (default 20), `unit` (`liters`/`gallons`/`cubicMeters`/`percentage`), `precision`.

### `fillRate(input)` -- Fill/Drain Rate & ETA

Calculate flow rate from two level readings and time elapsed. Returns direction, rate, and estimated time to full/empty.

```typescript
fillRate({
  vessel: { type: 'rectangular', dimensions: { length: 10, width: 5, height: 10 } },
  heightBefore: 2,
  heightAfter: 8,
  timeMinutes: 60,
});
// => {
//   direction: 'filling',
//   ratePerMinute: 5.0,
//   ratePerHour: 300.0,
//   volumeChange: 300.0,
//   minutesToFull: 20.0,
//   minutesToEmpty: null,
//   percentBefore: 20,
//   percentAfter: 80,
// }
```

**Direction:** `'filling'` | `'draining'` | `'stable'`

### `tankAlarms(vessel, liquidHeight, alarms)` -- Level Alarms

Evaluate tank level against configurable thresholds. Supports 4-level alarm hierarchy.

```typescript
tankAlarms(
  { type: 'rectangular', dimensions: { length: 10, width: 5, height: 10 } },
  9.8, // liquid height
  { highHigh: 95, high: 80, low: 20, lowLow: 5 }
);
// => {
//   status: 'high-high',
//   percentage: 98,
//   activeAlarms: ['high-high', 'high'],
//   isAlarmed: true,
// }
```

**Alarm levels:** `highHigh`, `high`, `low`, `lowLow` (all in percentage 0-100)

**Status priority:** `high-high` > `low-low` > `high` > `low` > `normal`

### `tankInventory(readings, outputUnit?)` -- Multi-Tank Rollup

Sum volumes across multiple tanks with per-tank breakdown.

```typescript
tankInventory([
  { name: 'Feed Tank', vessel: feedTankConfig, liquidHeight: 5 },
  { name: 'Product Tank', vessel: productTankConfig, liquidHeight: 8 },
  { name: 'Waste Tank', vessel: wasteTankConfig, liquidHeight: 2 },
], 'liters');
// => {
//   tanks: [
//     { name: 'Feed Tank', volume: 12500, percentage: 50, unit: 'liters' },
//     { name: 'Product Tank', volume: 8000, percentage: 80, unit: 'liters' },
//     { name: 'Waste Tank', volume: 3000, percentage: 20, unit: 'liters' },
//   ],
//   totalVolume: 23500,
//   averagePercentage: 50,
//   count: 3,
//   unit: 'liters',
// }
```

### `convertVolume(value, fromUnit, toUnit, precision?)` -- Unit Conversion

```typescript
convertVolume(1.5, 'cubicMeters', 'liters');  // => 1500
convertVolume(100, 'gallons', 'liters');       // => 378.54
```

**Units:** `liters`, `gallons`, `cubicMeters`, `percentage`

## Use Cases

### IoT Level Sensor

```typescript
// Read ultrasonic sensor, convert to volume
const sensorHeight = readSensor(); // meters
const result = calculateVolume(tankConfig, sensorHeight);
const alarms = tankAlarms(tankConfig, sensorHeight, { high: 90, low: 10 });
if (alarms.isAlarmed) sendAlert(alarms.status);
```

### Tank Farm Inventory

```typescript
const inventory = tankInventory(allTankReadings, 'gallons');
console.log(`Total: ${inventory.totalVolume} gal across ${inventory.count} tanks`);
console.log(`Average fill: ${inventory.averagePercentage}%`);
```

### Calibration Chart for Operators

```typescript
const chart = strappingTable(myTank, { steps: 50, unit: 'gallons' });
// Print or display as lookup table for field operators
```

### Leak Detection

```typescript
// Compare fill rate when pumps are off — should be stable
const rate = fillRate({ vessel: tank, heightBefore: h1, heightAfter: h2, timeMinutes: 60 });
if (rate.direction === 'draining' && pumpsOff) {
  alert('Possible leak detected!');
}
```

## License

MIT
