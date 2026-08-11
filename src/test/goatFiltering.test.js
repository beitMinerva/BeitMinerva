import { describe, it, expect } from 'vitest';

const mockGoats = [
  { id: '1', tag_id: '#101', name: 'Bella', area_id: 'area-a', status: 'Active', gender: 'Female', breed: 'Shami' },
  { id: '2', tag_id: '#102', name: 'Daisy', area_id: 'area-a', status: 'Active', gender: 'Female', breed: 'Alpine' },
  { id: '3', tag_id: '#103', name: 'Max', area_id: 'area-b', status: 'Active', gender: 'Male', breed: 'Anglo-Nubian' },
  { id: '4', tag_id: '#104', name: 'Luna', area_id: 'area-b', status: 'Sold', gender: 'Female', breed: 'Shami' },
];

function filterGoats(goats, { searchTerm = '', areaId = 'ALL', status = 'ALL', gender = 'ALL' }) {
  return goats.filter((g) => {
    const matchesSearch = !searchTerm.trim() ||
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.tag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.breed && g.breed.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesArea = areaId === 'ALL' || g.area_id === areaId;
    const matchesStatus = status === 'ALL' || g.status === status;

    const matchesGender = (() => {
      if (gender === 'ALL') return true;
      const genStr = (g.gender || '').toLowerCase();
      if (gender === 'Female') return genStr.includes('female') || genStr.includes('doe') || genStr === 'f';
      if (gender === 'Male') return !genStr.includes('female') && (genStr.includes('male') || genStr.includes('buck') || genStr === 'm');
      return true;
    })();

    return matchesSearch && matchesArea && matchesStatus && matchesGender;
  });
}

describe('Goat Search & Filtering Logic', () => {
  it('filters goats by tag_id search term', () => {
    const result = filterGoats(mockGoats, { searchTerm: '#101' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bella');
  });

  it('filters goats by name search term case-insensitively', () => {
    const result = filterGoats(mockGoats, { searchTerm: 'daisy' });
    expect(result).toHaveLength(1);
    expect(result[0].tag_id).toBe('#102');
  });

  it('filters goats by barn area', () => {
    const result = filterGoats(mockGoats, { areaId: 'area-a' });
    expect(result).toHaveLength(2);
  });

  it('filters out sold goats when status is Active', () => {
    const result = filterGoats(mockGoats, { status: 'Active' });
    expect(result).toHaveLength(3);
    expect(result.some((g) => g.name === 'Luna')).toBe(false);
  });

  it('filters goats by gender (Female vs Male)', () => {
    const females = filterGoats(mockGoats, { gender: 'Female' });
    expect(females).toHaveLength(3);
    expect(females.every((g) => g.gender === 'Female')).toBe(true);

    const males = filterGoats(mockGoats, { gender: 'Male' });
    expect(males).toHaveLength(1);
    expect(males[0].name).toBe('Max');
  });
});
