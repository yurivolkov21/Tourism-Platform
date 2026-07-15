import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDED_KEY, markOnboarded, readOnboarded } from '../lib/onboarding';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

test('readOnboarded is false on first launch', async () => {
  expect(await readOnboarded()).toBe(false);
});

test('markOnboarded persists and readOnboarded turns true', async () => {
  await markOnboarded();
  expect(await AsyncStorage.getItem(ONBOARDED_KEY)).toBe('1');
  expect(await readOnboarded()).toBe(true);
});

test('readOnboarded swallows storage errors as false (never blocks the app)', async () => {
  jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('io'));
  expect(await readOnboarded()).toBe(false);
});
