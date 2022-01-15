# Decision log

A log of which decisions were taken and why.

## 2021-01-15 Deprecate prefs support

### Problem

prefs coexisting with local storage has brought new issues.

Example: Thunderbird is keeping prefs but not local storage when you uninstall an addon. Then, when we reinstall the addon, it can says it has all data migrated, and then no local storage setting is set so the addon has no preference.

A solution could be to create a new migration that removes prefs once we migrated. But its too late for that (version was released long time ago).
If we define a migration that removes prefs, we would fix the ones that migrate, but we will have to maintain that migration forever... unless... you release a version that do not support prefs.

So, options:
A) Add a migration that removes prefs values.
  - BAD: we need perfs code and fixes for "prefs persisted" there for some time again.
  - GOOD: we keep compatibility for people with older versions. (9% of the users did not update from 1.12, maybe because they are stuck in old TB versions.
B) Remove support for prefManager support completely. Users that had the chance to migrate already did, others will lose "preferences" stored but they had plenty of time for that.
  - GOOD: code will get much cleaner, tests too.
  - GOOD: we simplify approach and problems.
  - GOOD: easier solution.
  - BAD: these 9% of the users might get angry a bit, but given my limited time, I should prioritize cleaningness to small part of userbase. If users complain, they still could install version 2.x (because this change should be on v3 because we are dropping support)

### Decision

B: Remove pref support completely.
