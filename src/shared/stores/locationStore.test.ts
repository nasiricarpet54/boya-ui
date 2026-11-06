import { describe, it, expect, beforeEach } from 'vitest';
import { useLocationStore } from './locationStore';

// CITY PRIORITY: every applied city becomes the customer's default (index 0)
// until a new one is chosen; previously chosen cities shift down in
// selection order.
describe('locationStore city priority', () => {
  beforeEach(() => {
    // Reset to a known state before each scenario.
    useLocationStore.setState({
      selectedCity: 'تهران',
      selectedProvince: 'تهران',
      selectedDistrict: 'همه',
      cityPriority: ['تهران'],
    });
  });

  it('starts with the selected city as the only priority', () => {
    expect(useLocationStore.getState().cityPriority).toEqual(['تهران']);
  });

  it('promotes a newly chosen city to the default slot', () => {
    useLocationStore.getState().setSelectedCity('شیراز');
    const state = useLocationStore.getState();
    expect(state.selectedCity).toBe('شیراز');
    expect(state.cityPriority).toEqual(['شیراز', 'تهران']);
  });

  it('keeps earlier cities in selection order as priority 2, 3, ...', () => {
    useLocationStore.getState().setSelectedCity('شیراز');
    useLocationStore.getState().setSelectedCity('اصفهان');
    expect(useLocationStore.getState().cityPriority).toEqual(['اصفهان', 'شیراز', 'تهران']);
  });

  it('re-selecting an existing city promotes it back to the default', () => {
    useLocationStore.getState().setSelectedCity('شیراز');
    useLocationStore.getState().setSelectedCity('اصفهان');
    useLocationStore.getState().setSelectedCity('تهران');
    expect(useLocationStore.getState().cityPriority).toEqual(['تهران', 'اصفهان', 'شیراز']);
  });

  it('never stores the "همه" filter as a real city', () => {
    useLocationStore.getState().setSelectedCity('شیراز');
    useLocationStore.getState().setSelectedCity('همه');
    // "همه" means "all cities" — the previously applied city stays the default.
    const { cityPriority } = useLocationStore.getState();
    expect(cityPriority).not.toContain('همه');
    expect(cityPriority[0]).toBe('شیراز');
  });

  it('caps the priority list at 5 cities', () => {
    ['شیراز', 'اصفهان', 'مشهد', 'تبریز', 'کرج', 'رشت'].forEach((c) =>
      useLocationStore.getState().setSelectedCity(c));
    const list = useLocationStore.getState().cityPriority;
    expect(list.length).toBe(5);
    expect(list[0]).toBe('رشت'); // newest stays first
  });
});
