# Future offline POS (planned only)

No service worker, IndexedDB, offline dependencies, or synchronization is implemented.

Future POS components should access business data through Angular services rather than direct HTTP or browser storage calls. These services can later select network or local persistence without rewriting components. The central API remains authoritative.

Before implementation, define a minimal cached catalog and price snapshot, local order queue, durable client-generated operation identifiers, retry/backoff, server deduplication, and synchronization status visible to cashiers. Choose storage and service-worker tooling only then.

Decide conflict handling, stale prices, stock overselling, payment restrictions, device/user boundaries, encrypted sensitive data, logout cleanup, retention, schema upgrades, clock skew, interrupted sync, and reconciliation procedures. Never assume offline payment authorization or final inventory availability. Test duplicate retries, reconnects, multiple devices, expired sessions, and data recovery.
