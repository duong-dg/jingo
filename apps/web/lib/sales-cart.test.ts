import { test } from 'node:test';
import assert from 'node:assert/strict';
import { saleIdentity, setSaleQuantity } from './sales-cart';
import type { CartLine } from './ticket-cart';
const eco: CartLine = { id: 'eco-draft', productId: 'memories', variantId: 'eco', productName: 'Ký ức', variantName: 'Eco', date: '2099-06-01', quantities: { ADULT: 0, CHILD: 0 }, expectedTotal: 0 };
test('central selection and cart edit set absolute quantities, restore existing packages and keep date/slot identities independent', () => {
  let lines = setSaleQuantity([], eco, 'ADULT', 3, { ADULT: 300, CHILD: 150 });
  const original = lines;
  lines = setSaleQuantity(lines, { ...eco, id: 'new-view' }, 'ADULT', 3, { ADULT: 300, CHILD: 150 });
  assert.equal(lines.length, 1); assert.equal(lines[0].id, eco.id); assert.equal(lines[0].quantities.ADULT, 3, 'selecting existing Eco must not add another three');
  lines = setSaleQuantity(lines, eco, 'CHILD', 2, { ADULT: 300, CHILD: 0 }); assert.equal(lines[0].expectedTotal, 900, 'free child tickets count without falling back to adult price');
  lines = setSaleQuantity(lines, eco, 'ADULT', 1, { ADULT: 300, CHILD: 0 }); assert.equal(lines[0].quantities.CHILD, 2); assert.equal(original[0].quantities.ADULT, 3, 'store updates must not mutate old render snapshots');
  const vip = { ...eco, id: 'vip-draft', variantId: 'vip', variantName: 'VIP' };
  lines = setSaleQuantity(lines, vip, 'ADULT', 1, { ADULT: 500 });
  lines = setSaleQuantity(lines, { ...eco, id: 'tomorrow', date: '2099-06-02' }, 'ADULT', 1, { ADULT: 400 });
  lines = setSaleQuantity(lines, { ...eco, id: 'evening', slotId: 'pm' }, 'ADULT', 1, { ADULT: 350 });
  assert.equal(new Set(lines.map(saleIdentity)).size, 4); assert.equal(lines.find(i => i.variantId === 'eco' && i.date === eco.date && !i.slotId)?.quantities.ADULT, 1);
  lines = setSaleQuantity(lines, eco, 'ADULT', 0); lines = setSaleQuantity(lines, eco, 'CHILD', 0); assert.ok(!lines.some(i => i.id === eco.id), 'remove line when the final guest reaches zero');
});
test('staff quantity edits enforce per-group and whole-cart limits before persisting', () => {
  assert.throws(() => setSaleQuantity([], eco, 'ADULT', 51)); assert.throws(() => setSaleQuantity([], eco, 'ADULT', 1.5)); assert.throws(() => setSaleQuantity([], eco, 'INVALID', 1));
  const full = [{ ...eco, quantities: { ADULT: 50, CHILD: 50, SENIOR: 50 } }];
  assert.throws(() => setSaleQuantity(full, { ...eco, id: 'vip', variantId: 'vip' }, 'ADULT', 1), /150/); assert.equal(full[0].quantities.ADULT, 50);
  const many = Array.from({ length: 20 }, (_, n) => ({ ...eco, id: String(n), productId: String(n), quantities: { ADULT: 1 } }));
  assert.throws(() => setSaleQuantity(many, eco, 'ADULT', 1), /20/);
});
