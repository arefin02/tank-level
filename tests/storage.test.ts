import { describe, it, expect, beforeEach, afterAll } from 'bun:test';
import { TankConfigStore } from '../src/storage';
import type { SaveConfigInput } from '../src/storage';
import type { VesselConfig } from '../src/types';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_FILE = join(import.meta.dir, '.test-tank-configs.json');

function cleanup() {
  try {
    if (existsSync(TEST_FILE)) unlinkSync(TEST_FILE);
  } catch {}
}

const cylVessel: VesselConfig = {
  type: 'cylindrical',
  dimensions: { diameter: 2, height: 10 },
  orientation: 'vertical',
};

const rectVessel: VesselConfig = {
  type: 'rectangular',
  dimensions: { length: 5, width: 3, height: 10 },
};

const sphereVessel: VesselConfig = {
  type: 'spherical',
  dimensions: { diameter: 4, height: 4 },
};

describe('TankConfigStore', () => {
  beforeEach(() => {
    cleanup();
  });

  afterAll(() => {
    cleanup();
  });

  describe('save', () => {
    it('should save a tank configuration and return it with an id', () => {
      const store = new TankConfigStore(TEST_FILE);
      const input: SaveConfigInput = {
        name: 'Main Storage Tank',
        vessel: cylVessel,
        tags: ['production', 'water'],
        description: 'Primary water storage',
      };
      const saved = store.save(input);

      expect(saved.id).toBeDefined();
      expect(saved.id.length).toBeGreaterThan(0);
      expect(saved.name).toBe('Main Storage Tank');
      expect(saved.vessel.type).toBe('cylindrical');
      expect(saved.vessel.dimensions.diameter).toBe(2);
      expect(saved.tags).toEqual(['production', 'water']);
      expect(saved.description).toBe('Primary water storage');
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('should reject duplicate names', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'Tank A', vessel: cylVessel });
      expect(() => store.save({ name: 'Tank A', vessel: rectVessel })).toThrow('already exists');
    });

    it('should reject empty names', () => {
      const store = new TankConfigStore(TEST_FILE);
      expect(() => store.save({ name: '', vessel: cylVessel })).toThrow('cannot be empty');
      expect(() => store.save({ name: '   ', vessel: cylVessel })).toThrow('cannot be empty');
    });

    it('should default tags to empty array and description to empty string', () => {
      const store = new TankConfigStore(TEST_FILE);
      const saved = store.save({ name: 'Bare Tank', vessel: cylVessel });
      expect(saved.tags).toEqual([]);
      expect(saved.description).toBe('');
    });
  });

  describe('load', () => {
    it('should load a saved config by id', () => {
      const store = new TankConfigStore(TEST_FILE);
      const saved = store.save({ name: 'Tank X', vessel: rectVessel });
      const loaded = store.load(saved.id);

      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('Tank X');
      expect(loaded!.vessel.type).toBe('rectangular');
    });

    it('should return null for unknown id', () => {
      const store = new TankConfigStore(TEST_FILE);
      expect(store.load('nonexistent-id')).toBeNull();
    });
  });

  describe('loadByName', () => {
    it('should load a saved config by name', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'Feed Tank', vessel: sphereVessel, tags: ['feed'] });
      const loaded = store.loadByName('Feed Tank');

      expect(loaded).not.toBeNull();
      expect(loaded!.vessel.type).toBe('spherical');
      expect(loaded!.tags).toEqual(['feed']);
    });

    it('should return null for unknown name', () => {
      const store = new TankConfigStore(TEST_FILE);
      expect(store.loadByName('No Such Tank')).toBeNull();
    });
  });

  describe('list', () => {
    it('should list all configs when no filter is given', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'T1', vessel: cylVessel, tags: ['water'] });
      store.save({ name: 'T2', vessel: rectVessel, tags: ['oil'] });
      store.save({ name: 'T3', vessel: sphereVessel, tags: ['water'] });

      const all = store.list();
      expect(all.length).toBe(3);
    });

    it('should filter by tag', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'T1', vessel: cylVessel, tags: ['water'] });
      store.save({ name: 'T2', vessel: rectVessel, tags: ['oil'] });
      store.save({ name: 'T3', vessel: sphereVessel, tags: ['water'] });

      const waterTanks = store.list({ tag: 'water' });
      expect(waterTanks.length).toBe(2);
      expect(waterTanks.every(t => t.tags.includes('water'))).toBe(true);
    });

    it('should filter by vessel type', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'T1', vessel: cylVessel });
      store.save({ name: 'T2', vessel: rectVessel });
      store.save({ name: 'T3', vessel: cylVessel });

      const cylTanks = store.list({ type: 'cylindrical' });
      expect(cylTanks.length).toBe(2);
    });

    it('should filter by name substring', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'Main Water Tank', vessel: cylVessel });
      store.save({ name: 'Backup Water Tank', vessel: cylVessel });
      store.save({ name: 'Oil Reservoir', vessel: rectVessel });

      const waterTanks = store.list({ nameContains: 'water' });
      expect(waterTanks.length).toBe(2);
    });

    it('should return empty array when no configs match', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'T1', vessel: cylVessel, tags: ['water'] });
      expect(store.list({ tag: 'nonexistent' }).length).toBe(0);
    });
  });

  describe('update', () => {
    it('should update name and description', () => {
      const store = new TankConfigStore(TEST_FILE);
      const saved = store.save({ name: 'Old Name', vessel: cylVessel, description: 'old' });
      const updated = store.update(saved.id, { name: 'New Name', description: 'new' });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('New Name');
      expect(updated!.description).toBe('new');
      expect(updated!.updatedAt).not.toBe(saved.updatedAt);
      expect(updated!.createdAt).toBe(saved.createdAt);
    });

    it('should update vessel config', () => {
      const store = new TankConfigStore(TEST_FILE);
      const saved = store.save({ name: 'T1', vessel: cylVessel });
      const updated = store.update(saved.id, { vessel: rectVessel });

      expect(updated!.vessel.type).toBe('rectangular');
    });

    it('should reject duplicate name on update', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'Tank A', vessel: cylVessel });
      const b = store.save({ name: 'Tank B', vessel: rectVessel });

      expect(() => store.update(b.id, { name: 'Tank A' })).toThrow('already exists');
    });

    it('should return null for unknown id', () => {
      const store = new TankConfigStore(TEST_FILE);
      expect(store.update('unknown', { name: 'X' })).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a config by id', () => {
      const store = new TankConfigStore(TEST_FILE);
      const saved = store.save({ name: 'Doomed', vessel: cylVessel });
      expect(store.delete(saved.id)).toBe(true);
      expect(store.load(saved.id)).toBeNull();
      expect(store.count).toBe(0);
    });

    it('should return false for unknown id', () => {
      const store = new TankConfigStore(TEST_FILE);
      expect(store.delete('nope')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all configs', () => {
      const store = new TankConfigStore(TEST_FILE);
      store.save({ name: 'A', vessel: cylVessel });
      store.save({ name: 'B', vessel: rectVessel });
      expect(store.count).toBe(2);

      store.clear();
      expect(store.count).toBe(0);
      expect(store.list().length).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should persist configs across store instances', () => {
      const store1 = new TankConfigStore(TEST_FILE);
      const saved = store1.save({
        name: 'Persistent Tank',
        vessel: cylVessel,
        tags: ['persist-test'],
        description: 'Should survive reload',
      });

      // Create a new store instance pointing to the same file
      const store2 = new TankConfigStore(TEST_FILE);
      const loaded = store2.load(saved.id);

      expect(loaded).not.toBeNull();
      expect(loaded!.name).toBe('Persistent Tank');
      expect(loaded!.vessel.type).toBe('cylindrical');
      expect(loaded!.vessel.dimensions.diameter).toBe(2);
      expect(loaded!.tags).toEqual(['persist-test']);
      expect(loaded!.description).toBe('Should survive reload');
    });

    it('should handle missing file gracefully on first load', () => {
      cleanup();
      const store = new TankConfigStore(TEST_FILE);
      expect(store.count).toBe(0);
      expect(store.list().length).toBe(0);
    });

    it('should handle corrupted file gracefully', () => {
      const { writeFileSync } = require('fs');
      writeFileSync(TEST_FILE, 'NOT VALID JSON {{{{', 'utf-8');
      const store = new TankConfigStore(TEST_FILE);
      expect(store.count).toBe(0);
    });
  });

  describe('count', () => {
    it('should reflect the number of saved configs', () => {
      const store = new TankConfigStore(TEST_FILE);
      expect(store.count).toBe(0);
      store.save({ name: 'A', vessel: cylVessel });
      expect(store.count).toBe(1);
      store.save({ name: 'B', vessel: rectVessel });
      expect(store.count).toBe(2);
    });
  });
});
