## [3.2.6](https://github.com/beltrachi/automatic_dictionary/compare/v3.2.5...v3.2.6) (2023-09-24)


### Bug Fixes

* build xpi on release ([d22175f](https://github.com/beltrachi/automatic_dictionary/commit/d22175f600ce63db4a688a576714174db8093b8e))
* configure release to keep old changelog ([cab895c](https://github.com/beltrachi/automatic_dictionary/commit/cab895c60da0442be4f14ddd63fbde74c8691245))
* pre commit hook should be a CommonJS file ([2ca3596](https://github.com/beltrachi/automatic_dictionary/commit/2ca3596f509480496bca1b483570b50000878b77))
* read version from manifest.json ([cc5ee3e](https://github.com/beltrachi/automatic_dictionary/commit/cc5ee3ef981689459105bf721ecc605b197ffbfc))
* You need to checkout code before creating release ([6b2d400](https://github.com/beltrachi/automatic_dictionary/commit/6b2d400d9c5e887dbf7e9a68311df00864c6a5e9))



## 3.2.5

* Support Thunderbird beta v118

## 3.2.4

* Support Thunderbird beta v117

## 3.2.3

* Support Thunderbird beta v115

## 3.2.2

* Support Thunderbird beta v112 and upcoming

## 3.2.1

* Improve support for slow Thunderbirds (fixes #156)

## 3.2.0

* Support Thunderbird 102.0 new feature of spellchecking more than one language at a time.

## 3.1.0

* Use new extension APIs available in Thunderbird 102.0 (Basic feature)

This version still does not support more than one language per recipient.
When addon detects languages used it just gets the first one.

## 3.0.1

* Add support for Thunderbird up to 102.0

## 3.0.0

Breaking changes:
* Dropped support for legacy prefs. Users in 1.x versions should install 2.x version before this to have all data migrated.

Changes summary (more details in git log):
* CI - Raise error when the searched text appears more than once
* Fixing integration beta tests (Events word appeared twice)
* Migrate to tesseract v5 to fix randomly stuck executions
* Fix ComposeWindowStub and add some test coverage
* Migrate code to standalone modules that can be imported freely.
* Format all files with vscode
* Refactor Recipients into a class
* Rename LRUHashV2 to LRUHash
* Use events to update heuristics on LRU expiration
* Fix LanguageAssigner data persistence between windows
* Move laguage assignment to a separate module
* Fix data structures sharing between instances
* Refactoring languageChanged
* Move heuristic logic to DomainHeuristic module
* Remove conversations addon unused code
* Remove plugin support completely
* Use events instead of attaching to logger messages
* Refactoring - deduction rules moved to separate class
* Add coverage check on jest tests
* Remove integration specs for TB < 76

## 2.0.7.1

* I did block version 2.0.7 by mistake on Thunderbird addons site. Need a new version.

## 2.0.7

* Fix support for Thunderbird 92 and 93
* Fix version detection for future TB +100 version

## 2.0.6

* Support current beta Thunderbird 94

## 2.0.5

* Workaround to work with Thunderbird 90+
* Add script that makes it easy to update all locales at once
* Remove any trace of promotions plugin
* Addon was not using max size configuraiton
* Removing migrations from 9 years ago. Users should be migrated after that
* Fixing freq-suffix stored data due to previous bugs
* Rescue error when storage is not ready to not break flow
* Share data structures between instances
* Fix heuristics to only count single emails
* Fix removing heuristics when counter is zero
* Migrate unit testing to jest
* Migrate to circleci CI

## 2.0.4

* Fix compatibility with Thunderbird 85 beta

## 2.0.3

* Fix reply emails on windows, now confirmed by beta testers (2nd attempt) (issue #62)

## 2.0.2

* Fix support on replying emails (issue #62)

## 2.0.1

* Fix support on replying emails (issue #40)
* Fix support for thunderbird 80 (beta version)

## 2.0.0

* Migrated to MailExtension
* Drop support for conversations
* Broken compatibility with TB < 74
* Removed unit test, only integration tests are working.

## 1.12.0

* Fix support for Thunderbird 68-69 (Broken compatibility with TB60)

## 1.11.0

* Remove Google Analytics data collection completely.

## 1.10.5

* Fix support for Thunderbird 64 and earlier

## 1.10.4

* Fix support for Thunderbird 60 (issue #32)

## 1.10.3

* Detect compose window init to deduce lang (issue #31)

## 1.10.2

* Fix support for Thunderbird 57.x
* Fix thunderbird version detection
* Fix defaults setup migrations on upgrade
* Use document lang attribute to detect current language
* Skip language detection when is triggered by us

## 1.10.1

* Fix support for Thunderbird 56.x

## 1.10.0

* Add support for Thunderbird 52.x

## 1.9.0

* Improve message when storing languages
* Improve language change detection and dictionary boot delay
* Fix Thunderbird38 window switching (do not set lang again)

## 1.8.2

* Fix behaviour when using maxRecipients = 1

## 1.8.1

* Add support for Thunderbird 38.x

## 1.8.0

* Add German language translations

## 1.7.1

* Fix language deduction when spellchecker is not ready.
* Fix and improve localized messages and strings.

## 1.7.0

* Refactor logger calls
* Add logger to file and button to send to developer.

## 1.6.0

* Add option to disable popups [resolves #10]

## 1.5.5

* Compatible with dictionary_switcher addon

## 1.5.4

* Fixing concurrent events when ifce not ready or slow

* Fix message when spellchecking is disabled

## 1.5.0

* Detect language change from context menu on compose window.

* Allow to say No when asking to collect anonymous data.

## 1.4.1

* Fix preferences window error shown in error console

## 1.4.0

* Restartless

* Added support for Conversations plugin #5

* Added promotions to suggest user to share the plugin with it's mates or write a review

* Collect event when user finally sends mail, to see if the plugin is being useful

## 1.3.0

* Added heuristics to guess language based on the domain of the recipients.

* Added GoogleAnalytics support to track the activity of the plugin. All anonymous data.

* Improoved the responsive of the plugin by looking for languages for recipients
only when the focus is changed on the compose window. It can be disabled by
preferences.

* Fix when message hides too fast.

* Implement language detection when the known recipient is set on the CC's group.

* When doing heuristics with a group of recipients, use the more frequent lang.
