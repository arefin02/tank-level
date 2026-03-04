# 🛢️ tank-level — Tank Volume Calculator

**Calculate tank/reservoir volume from liquid height — because guessing is for amateurs!**

## 🚀 Quick Start

```typescript
import { calculateVolume } from 'tank-level';

const result = calculateVolume({
  type: 'cylindrical',
  orientation: 'vertical',
  radius: 1.5, // meters
  height: 3.0, // meters
}, 1.2); // current liquid height in meters

console.log(result.volume); // volume in cubic meters
console.log(result.percentage); // % full
```

## 📦 Installation

```bash
bun add tank-level
# or
npm install tank-level
```

## 📖 API

### `calculateVolume(config: VesselConfig, liquidHeight: number): VolumeResult`

Calculate volume and percentage from liquid height.

**Supported vessel types:**
- `cylindrical` (vertical/horizontal)
- `rectangular`
- `conical`

**Returns:**
```typescript
{
  volume: number; // cubic meters
  percentage: number; // 0-100
}
```

### `convertVolume(value: number, fromUnit: Unit, toUnit: Unit, precision?: number): number`

Convert between volume units (`liters`, `gallons`, `cubicMeters`).

### `convertPercentage(value: number, toUnit: Unit, precision?: number): number`

Convert percentage (0-100) to volume in specified unit.

## 🧪 Examples

**Horizontal Cylindrical Tank:**
```typescript
const result = calculateVolume({
  type: 'cylindrical',
  orientation: 'horizontal',
  radius: 1.0,
  length: 4.0,
}, 0.5); // 50cm liquid height
```

**Conical Tank:**
```typescript
const result = calculateVolume({
  type: 'conical',
  radius: 1.5,
  height: 3.0,
}, 1.0); // 1m liquid height
```

**Unit Conversion:**
```typescript
import { convertVolume } from 'tank-level';

const liters = convertVolume(1.5, 'cubicMeters', 'liters'); // 1500 liters
```

## 🤝 Contributing

Found a bug? Got a feature idea? Open an issue or PR! We love contributions — just keep it simple and type-safe.

## 📄 License

MIT — do what you want, just don't blame us if your tank overflows! 😉