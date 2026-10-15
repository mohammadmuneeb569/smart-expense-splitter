/**
 * Debt Simplification Algorithm — Minimizing Cash Flow
 *
 * Given a list of balances per user, this algorithm computes the
 * minimal number of transactions needed to settle all debts.
 *
 * Steps:
 *  1. Compute net balance for each person (positive = creditor, negative = debtor)
 *  2. Use a greedy two-pointer approach on sorted arrays to minimize transactions
 *
 * Time Complexity: O(n log n) for sorting, O(n) for settlement computation
 */

/**
 * @param {Array<{ userId: string, name: string, balance: number }>} balances
 * @returns {Array<{ from: Object, to: Object, amount: number }>} transactions
 */
function simplifyDebts(balances) {
  // Separate into creditors (positive balance) and debtors (negative balance)
  const creditors = balances
    .filter((b) => b.balance > 0.005) // ignore floating-point dust
    .map((b) => ({ ...b, balance: parseFloat(b.balance.toFixed(2)) }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < -0.005)
    .map((b) => ({ ...b, balance: parseFloat(b.balance.toFixed(2)) }))
    .sort((a, b) => a.balance - b.balance); // most negative first

  const transactions = [];

  let ci = 0; // creditor pointer
  let di = 0; // debtor pointer

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    // Amount this debtor owes this creditor
    const amount = parseFloat(
      Math.min(creditor.balance, Math.abs(debtor.balance)).toFixed(2)
    );

    if (amount < 0.01) {
      // Skip negligible amounts
      if (creditor.balance < 0.01) ci++;
      if (Math.abs(debtor.balance) < 0.01) di++;
      continue;
    }

    transactions.push({
      from: { id: debtor.userId, name: debtor.name, avatar: debtor.avatar },
      to: { id: creditor.userId, name: creditor.name, avatar: creditor.avatar },
      amount,
    });

    creditor.balance = parseFloat((creditor.balance - amount).toFixed(2));
    debtor.balance = parseFloat((debtor.balance + amount).toFixed(2));

    if (creditor.balance < 0.01) ci++;
    if (Math.abs(debtor.balance) < 0.01) di++;
  }

  return transactions;
}

module.exports = { simplifyDebts };
