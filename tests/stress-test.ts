// Stress test: compare demo.html JS formulas against library + known engineering data
import { calculateVolume } from "../src/index";
import type { VesselConfig } from "../src/index";

const TOLERANCE = 0.001; // 0.1% relative tolerance
let passed = 0;
let failed = 0;

function check(label: string, got: number, expected: number, tol = TOLERANCE) {
  const rel = expected !== 0 ? Math.abs((got - expected) / expected) : Math.abs(got);
  if (rel > tol && Math.abs(got - expected) > 0.001) {
    console.error(`FAIL: ${label} — got ${got.toFixed(6)}, expected ${expected.toFixed(6)} (err ${(rel*100).toFixed(4)}%)`);
    failed++;
  } else {
    passed++;
  }
}

// =====================================================
// 1. VERTICAL CYLINDER — textbook: V = pi * r^2 * h
// =====================================================
const cyl: VesselConfig = { type: "cylindrical", dimensions: { diameter: 2, height: 10 }, orientation: "vertical" };
// Full volume = pi * 1^2 * 10 = 31.41593
check("Cyl-V full volume", calculateVolume(cyl, 10).volume, Math.PI * 1 * 10);
check("Cyl-V half volume", calculateVolume(cyl, 5).volume, Math.PI * 1 * 5);
check("Cyl-V 25%", calculateVolume(cyl, 2.5).percentage, 25);
check("Cyl-V 75%", calculateVolume(cyl, 7.5).percentage, 75);
check("Cyl-V empty", calculateVolume(cyl, 0).volume, 0);
check("Cyl-V 100%", calculateVolume(cyl, 10).percentage, 100);

// Large tank: 20m diameter, 15m height (typical refinery tank ~4700 m3)
const bigCyl: VesselConfig = { type: "cylindrical", dimensions: { diameter: 20, height: 15 }, orientation: "vertical" };
check("BigCyl total", calculateVolume(bigCyl, 15).volume, Math.PI * 100 * 15);
check("BigCyl 1m fill", calculateVolume(bigCyl, 1).volume, Math.PI * 100 * 1);

// =====================================================
// 2. HORIZONTAL CYLINDER — circular segment formula
// =====================================================
const hcyl: VesselConfig = { type: "cylindrical", dimensions: { diameter: 2, height: 10 }, orientation: "horizontal" };
// At half (h=r=1): segment = half circle, V = 0.5 * total
check("Cyl-H 50%", calculateVolume(hcyl, 1).percentage, 50, 0.01);
check("Cyl-H full", calculateVolume(hcyl, 2).percentage, 100);
check("Cyl-H empty", calculateVolume(hcyl, 0).volume, 0);
// At h=0.5 (quarter diameter): known formula
// angle = 2*acos((1 - 0.5)/1) = 2*acos(0.5) = 2*pi/3
// segA = (1/2)*(2pi/3 - sin(2pi/3)) = (1/2)*(2.0944 - 0.8660) = 0.6142
// V = 0.6142 * 10 = 6.142
const hQuarter = calculateVolume(hcyl, 0.5);
const expectedSegArea = 0.5 * (2*Math.PI/3 - Math.sin(2*Math.PI/3));
check("Cyl-H quarter", hQuarter.volume, expectedSegArea * 10, 0.001);

// =====================================================
// 3. RECTANGULAR — V = l * w * h
// =====================================================
const rect: VesselConfig = { type: "rectangular", dimensions: { length: 5, width: 3, height: 10 } };
check("Rect full", calculateVolume(rect, 10).volume, 150);
check("Rect half", calculateVolume(rect, 5).volume, 75);
check("Rect 20%", calculateVolume(rect, 2).percentage, 20);
check("Rect arbitrary", calculateVolume(rect, 7.3).volume, 5 * 3 * 7.3);

// =====================================================
// 4. CONICAL (frustum) — V = (pi*h/3)*(R1^2 + R1*R2 + R2^2)
// =====================================================
const cone: VesselConfig = { type: "conical", dimensions: { topDiameter: 2, bottomDiameter: 4, height: 10 } };
// Total volume: (pi*10/3)*(1 + 1*2 + 4) = (10pi/3)*7 = 73.304
const totalCone = (Math.PI * 10 / 3) * (1 + 2 + 4);
check("Cone total", calculateVolume(cone, 10).volume, totalCone);
check("Cone empty", calculateVolume(cone, 0).volume, 0);

// At h=5: r_h = 2 + (1-2)*(5/10) = 1.5
// V = (pi*5/3)*(4 + 2*1.5 + 2.25) = (5pi/3)*9.25 = 48.434
const midCone = (Math.PI * 5 / 3) * (4 + 3 + 2.25);
check("Cone mid", calculateVolume(cone, 5).volume, midCone);

// Degenerate: cone with equal diameters = cylinder
const cylCone: VesselConfig = { type: "conical", dimensions: { topDiameter: 4, bottomDiameter: 4, height: 10 } };
check("Cone=Cyl total", calculateVolume(cylCone, 10).volume, Math.PI * 4 * 10);
check("Cone=Cyl half", calculateVolume(cylCone, 5).volume, Math.PI * 4 * 5);

// =====================================================
// 5. SPHERICAL — spherical cap: V = pi*h^2*(3r-h)/3
// =====================================================
const sphere: VesselConfig = { type: "spherical", dimensions: { diameter: 2 } };
const totalSphere = (4/3) * Math.PI; // r=1
check("Sphere total", calculateVolume(sphere, 2).volume, totalSphere);
check("Sphere 50%", calculateVolume(sphere, 1).percentage, 50, 0.01);
check("Sphere empty", calculateVolume(sphere, 0).volume, 0);

// Quarter fill (h=0.5, r=1): V = pi*0.25*(3-0.5)/3 = pi*0.25*2.5/3 = 0.6545
const qSphere = (Math.PI * 0.25 * 2.5) / 3;
check("Sphere quarter h", calculateVolume(sphere, 0.5).volume, qSphere);

// Three-quarter fill (h=1.5, r=1): V = pi*2.25*(3-1.5)/3 = pi*2.25*1.5/3 = 3.5343
const tqSphere = (Math.PI * 2.25 * 1.5) / 3;
check("Sphere 3/4 h", calculateVolume(sphere, 1.5).volume, tqSphere);

// Large sphere (LPG bullet tank, 10m diameter)
const bigSphere: VesselConfig = { type: "spherical", dimensions: { diameter: 10 } };
const bigTotal = (4/3) * Math.PI * 125;
check("BigSphere total", calculateVolume(bigSphere, 10).volume, bigTotal);
check("BigSphere 50%", calculateVolume(bigSphere, 5).percentage, 50, 0.01);

// =====================================================
// 6. KNOWN ENGINEERING REFERENCE DATA
// =====================================================
// 1000-gallon vertical cylindrical tank: ~48" diameter, ~72" height (1.2192m x 1.8288m)
// Full volume = pi * (0.6096)^2 * 1.8288 = 2.1367 m3 = 564.2 gallons (close to industry ~1000 US gal tanks vary)
const refTank: VesselConfig = { type: "cylindrical", dimensions: { diameter: 1.2192, height: 1.8288 }, orientation: "vertical" };
const refFull = Math.PI * Math.pow(0.6096, 2) * 1.8288;
check("Ref 48x72 tank", calculateVolume(refTank, 1.8288).volume, refFull);

// Symmetry test: sphere at h and (d-h) should sum to total
for (const h of [0.1, 0.3, 0.7, 1.0, 1.3, 1.7, 1.9]) {
  const v1 = calculateVolume(sphere, h).volume;
  const v2 = calculateVolume(sphere, 2 - h).volume;
  check(`Sphere symmetry h=${h}`, v1 + v2, totalSphere, 0.0001);
}

// Monotonicity test: volume must always increase with height
for (const cfg of [cyl, hcyl, rect, cone, sphere]) {
  const heights = Array.from({length: 21}, (_, i) => i * (cfg.type === 'spherical' ? 2 : 10) / 20);
  let prev = 0;
  let mono = true;
  for (const h of heights) {
    const v = calculateVolume(cfg, h).volume;
    if (v < prev - 0.0001) { mono = false; break; }
    prev = v;
  }
  check(`Monotonicity ${cfg.type}`, mono ? 1 : 0, 1);
}

console.log(`\n=== STRESS TEST RESULTS ===`);
console.log(`Passed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) process.exit(1);
else console.log("ALL TESTS PASSED");
