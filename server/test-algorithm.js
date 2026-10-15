const { simplifyDebts } = require('./utils/simplifyDebts');

console.log('🧪 Testing Debt Simplification Algorithm...');

// Scenario 1: Basic 3-person split
// Alice paid 300 for dinner split equally between Alice, Bob, Charlie (100 each)
// Bob: owes 100 (balance: -100)
// Charlie: owes 100 (balance: -100)
// Alice: owed 200 (balance: +200)
const balances1 = [
  { userId: '1', name: 'Alice', balance: 200 },
  { userId: '2', name: 'Bob', balance: -100 },
  { userId: '3', name: 'Charlie', balance: -100 },
];

const res1 = simplifyDebts(balances1);
console.log('\n--- Scenario 1: Standard Split ---');
console.log('Input balances:', balances1);
console.log('Calculated minimal transactions:', JSON.stringify(res1, null, 2));

// Verify total transferred equals sum of positives
const totalTransferred1 = res1.reduce((sum, t) => sum + t.amount, 0);
console.assert(totalTransferred1 === 200, `Expected 200 total transferred, got ${totalTransferred1}`);
console.assert(res1.length === 2, `Expected 2 transactions, got ${res1.length}`);

// Scenario 2: Cyclic / Transitive debt chain
// A owes B 100, B owes C 100
// Net balances: A: -100, B: 0, C: +100
// Without simplification: 2 transactions (A->B, B->C)
// With simplification: 1 transaction (A->C 100)
const balances2 = [
  { userId: '1', name: 'Alice', balance: -100 },
  { userId: '2', name: 'Bob', balance: 0 },
  { userId: '3', name: 'Charlie', balance: 100 },
];

const res2 = simplifyDebts(balances2);
console.log('\n--- Scenario 2: Transitive Debt Minimization ---');
console.log('Input balances:', balances2);
console.log('Calculated minimal transactions:', JSON.stringify(res2, null, 2));
console.assert(res2.length === 1, `Expected 1 transaction, got ${res2.length}`);
console.assert(res2[0].from.name === 'Alice' && res2[0].to.name === 'Charlie' && res2[0].amount === 100, 'Expected Alice -> Charlie 100');

// Scenario 3: Complex 4-person uneven debts
// Alice: +350, Bob: +150, Charlie: -200, David: -300
// Total positive = 500, Total negative = -500
const balances3 = [
  { userId: '1', name: 'Alice', balance: 350 },
  { userId: '2', name: 'Bob', balance: 150 },
  { userId: '3', name: 'Charlie', balance: -200 },
  { userId: '4', name: 'David', balance: -300 },
];

const res3 = simplifyDebts(balances3);
console.log('\n--- Scenario 3: Multi-Party Group Settlement ---');
console.log('Input balances:', balances3);
console.log('Calculated minimal transactions:', JSON.stringify(res3, null, 2));
const totalTransferred3 = res3.reduce((sum, t) => sum + t.amount, 0);
console.assert(Math.abs(totalTransferred3 - 500) < 0.01, `Expected 500 total, got ${totalTransferred3}`);
console.assert(res3.length <= 3, `Expected at most 3 transactions, got ${res3.length}`);

console.log('\n✅ All Debt Simplification Algorithm tests passed successfully!');
