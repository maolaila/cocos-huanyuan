import { expect, test } from 'bun:test';
import { gameUnitDisplay, requireMoneyDisplayContract, type GameHubMoneyDisplayContract } from '../creator-3.8.x-upgrade/assets/Standalone/GameHubMoneyDisplay';

const money: GameHubMoneyDisplayContract = {schema:'gamehub-money-contract-v1',contractId:'original',currency:'VND',baseUnit:1000,displayScale:3};
test('source integer chips remain actual, and display scales exactly once',()=>{
  const actual='20001.000000';
  expect(gameUnitDisplay(actual,money)).toBe('20.001');
  expect(gameUnitDisplay('1',money)).toBe('0.001');
  expect(actual).toBe('20001.000000');
  expect(gameUnitDisplay('11.125',{...money,baseUnit:1,displayScale:2})).toBe('11.12');
  expect(gameUnitDisplay('-11.129',{...money,baseUnit:1,displayScale:2})).toBe('-11.12');
});
test('full capacity, fractional balances, compact prefixes and currency mismatch',()=>{
  expect(gameUnitDisplay('99999999999999.999999',{...money,displayScale:6})).toBe('99999999999.999999');
  expect(gameUnitDisplay('1200000',money,3)).toBe('1.200');
  expect(()=>requireMoneyDisplayContract(money,'USD')).toThrow();
  expect(()=>requireMoneyDisplayContract(undefined as never,'VND')).toThrow();
  expect(()=>gameUnitDisplay('NaN',money)).toThrow();
});
