import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products } from '../catalog/catalog.data';
import { calculateQuote, PriceRule } from './pricing';

const product = products[0];
const rule: PriceRule = { id: 'summer', productId: product.id, variantId: 'eco', customerType: 'ADULT',
  startDate: '2027-06-01', endDate: '2027-08-31', priority: 10, amount: 450000 };
test('uses base prices and rejects unsupported senior tickets', () => {
  assert.equal(calculateQuote(product, 'eco', '2027-06-01', { ADULT: 2, CHILD: 1 }).total, 1000000);
  assert.equal(calculateQuote(product, 'eco', '2027-06-01', { ADULT: 2, CHILD: 1, SENIOR: undefined }).total, 1000000);
  assert.throws(() => calculateQuote(product, 'eco', '2027-06-01', { SENIOR: 1 }));
});
test('specific override wins; zero means free, not fallback', () => {
  const holiday = { ...rule, id: 'holiday', priority: 20, amount: 0 };
  const quote = calculateQuote(product, 'eco', '2027-06-01', { ADULT: 1 }, [rule, holiday]);
  assert.equal(quote.total, 0);
  assert.equal(quote.lines[0].ruleId, 'holiday');
});
test('closure blocks sales despite configured prices', () => {
  assert.throws(() => calculateQuote(product, 'eco', '2027-06-01', { ADULT: 1 }, [rule],
    [{ productId: product.id, startDate: '2027-06-01', endDate: '2027-06-02' }]), /khóa bán/);
});
test('rejects conflicting rules, invalid dates and fractional quantities', () => {
  assert.throws(() => calculateQuote(product, 'eco', '2027-06-01', { ADULT: 1 }, [rule, { ...rule, id: 'other' }]), /xung đột/);
  assert.throws(() => calculateQuote(product, 'eco', '2027-02-30', { ADULT: 1 }));
  assert.throws(() => calculateQuote(product, 'eco', '2027-06-01', { ADULT: 1.5 }));
});
test('date boundaries are inclusive and weekday filtering works', () => {
  assert.equal(calculateQuote(product, 'eco', '2027-08-31', { ADULT: 1 }, [rule]).total, 450000);
  assert.equal(calculateQuote(product, 'eco', '2027-09-01', { ADULT: 1 }, [rule]).total, 400000);
  assert.equal(calculateQuote(product, 'eco', '2027-06-01', { ADULT: 1 }, [{ ...rule, weekdays: [7] }]).total, 400000);
});

test('local adult/child/senior prices coexist with visitor prices and use independent calendar rules without fallback', () => {
  const local = { ...product, variants: [{ id: 'eco', name: 'Eco', prices: { ADULT: 600000, CHILD: 300000, LOCAL_ADULT: 350000, LOCAL_CHILD: 0, LOCAL_SENIOR: 250000 } }] };
  const localRule: PriceRule = { ...rule, customerType: 'LOCAL_ADULT', amount: 370000 };
  const quote = calculateQuote(local, 'eco', '2027-06-01', { ADULT: 1, CHILD: 1, LOCAL_ADULT: 2, LOCAL_CHILD: 1, LOCAL_SENIOR: 1 }, [localRule]);
  assert.equal(quote.total, 1890000); assert.equal(quote.lines.find(l => l.customerType === 'ADULT')!.unitPrice, 600000); assert.equal(quote.lines.find(l => l.customerType === 'LOCAL_CHILD')!.unitPrice, 0);
  assert.throws(() => calculateQuote(product, 'eco', '2027-06-01', { LOCAL_ADULT: 1 }), /không áp dụng/);
  assert.throws(() => calculateQuote(local, 'eco', '2027-06-01', { LOCAL_ADULT: 1 }, [localRule, { ...localRule, id:'local-conflict' }]), /xung đột/);
});
test('six visitor/local groups share the 150 guest order limit', () => {
  const local = { ...product, variants: [{ id:'eco', name:'Eco', prices: { ADULT:1,CHILD:1,SENIOR:1,LOCAL_ADULT:1,LOCAL_CHILD:1,LOCAL_SENIOR:1 } }] };
  assert.equal(calculateQuote(local,'eco','2099-06-01',{ADULT:25,CHILD:25,SENIOR:25,LOCAL_ADULT:25,LOCAL_CHILD:25,LOCAL_SENIOR:25}).total,150);
  assert.throws(()=>calculateQuote(local,'eco','2099-06-01',{ADULT:50,CHILD:50,LOCAL_ADULT:50,LOCAL_CHILD:1}),/150/);
});
