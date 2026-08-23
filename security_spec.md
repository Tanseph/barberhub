# Security Specification for BarberPOS

## Data Invariants
1. A shop is isolated by its unique `shopId` (derived or generated per email workspace).
2. Documents under `/shops/{shopId}/*` belong solely to that shop.
3. Sale bills must contain valid amounts >= 0, timestamps, and payment methods.
4. Expenses must contain valid category, date, amount >= 0, and non-empty metadata.
5. All operations strictly validate ID formats and field constraints to prevent resource exhaustion and data corruption.

## Dirty Dozen Payloads Handled
1. Creating a shop without an email address.
2. Injected ghost fields into SaleBill updates.
3. Negative values for gross total or haircut fees.
4. Overly long string injections in notes or names (> 2000 chars).
5. Attempting to tamper with timestamps or IDs across tenants.
6. Deleting subcollection records without valid shop path.
7. Attempting to bypass tenant workspace isolation.
8. Malformed queue slots with invalid time structures.
9. Array overflow attacks on bill products.
10. Unsanitized payment methods outside of transfer/cash/split.
11. PII exposure across different email tenant workspaces.
12. Denial of wallet queries using unindexed broad scans.
