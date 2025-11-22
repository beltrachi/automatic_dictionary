# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Automatic Dictionary** extension for Thunderbird - a browser extension that automatically switches spell-check languages based on email recipients. The extension learns language preferences per recipient and can deduce languages from email domains.

**Important**: This project is in maintenance mode. Only critical bugs should be fixed; no new features will be implemented.

## Development Commands

### Testing
```bash
# Run unit tests
npm test

# Run unit tests via Docker
docker run -v $PWD:/app -it node bash -c "cd /app; npm install; npm test"

# Run a single test
docker run -v $PWD:/app -it node bash -c "cd /app; npm test -- test/units/ad.test.js -t boot"

# Run integration tests
./script/docker_integration_test.sh

# Run integration tests locally in debug mode
./script/local_integration_tests.sh
```

### Building
```bash
# Build the extension
./build.sh
```

This creates `automatic_dictionary.xpi` by zipping the `addon/` directory contents.

### Other Scripts
```bash
# Quick test run
./test.sh

# Integration test
./integration_test.sh
```

## Architecture

### Core Components

**Main Extension Class**: `addon/ad.js` - The `AutomaticDictionary.Class` is the central orchestrator that:
- Manages language detection and assignment
- Handles storage and configuration
- Coordinates between compose windows and language services

**Compose Window Interface**: `addon/ad/compose_window.js` - Handles interaction with Thunderbird's compose windows:
- Language change detection
- UI notifications
- Spell-check integration

**Language Services**:
- `addon/ad/language_deducer.js` - Determines language based on recipients
- `addon/ad/language_assigner.js` - Stores and retrieves language-recipient associations
- `addon/lib/domain_heuristic.js` - Language guessing based on email domains

**Data Structures**:
- `addon/lib/freq_table.js` - Frequency table for domain-language mapping
- `addon/lib/lru_hash.js` - LRU cache implementation
- `addon/lib/persistent_object.js` - Storage abstraction

### Extension Structure

- `addon/manifest.json` - WebExtension manifest (supports Thunderbird 128.0-142.0)
- `addon/background.js` - Background script that initializes extension instances
- `addon/apis/compose_ext/` - Custom Thunderbird API for compose window integration
- `addon/_locales/` - Internationalization files (en, es, fr, de, ca)

### Testing Structure

- `test/units/` - Jest unit tests for core functionality
- `test/integration/` - Ruby-based integration tests with real Thunderbird
- `test/helpers/` - Test utilities and Thunderbird mocks
- `test/performance/` - Performance benchmarks

### Storage and Configuration

The extension uses `browser.storage.local` with these key settings:
- `addressesInfo` - Recipient-language mappings
- `freqTableData` - Domain frequency data for heuristics
- `maxRecipients` - Limit for bulk operations (default: 10)
- `allowHeuristic` - Enable domain-based language guessing
- `notificationLevel` - UI notification verbosity

### Language Detection Flow

1. User composes email → `ComposeWindow` detects recipients
2. `LanguageDeducer.deduce()` checks stored associations
3. If no match, `DomainHeuristic` analyzes email domains
4. Extension sets spell-check language via compose API
5. User language changes are stored via `LanguageAssigner`

## Commit Message Conventions

Use semantic commit prefixes:
- `fix:` - Bug fixes to the addon itself (triggers patch release)
- `feat:` - New features for the addon (triggers minor release)
- `chore:` - Changes not related to the addon: CI, tests, scripts, docs (no release)

Example: CI workflow changes, test infrastructure updates, or build script modifications should use `chore:`, not `fix:`.

## Release Process

1. Merge changes to master branch
2. GitHub Actions automatically creates release following semver
3. Upload new version to Mozilla Add-ons site
4. Wait for Mozilla approval

## Testing Notes

- Jest tests run with `--experimental-vm-modules` for ES module support
- Integration tests require Docker and simulate real Thunderbird environment
- Tests use mocked Thunderbird APIs via `test/helpers/thunderbird_mocks.cjs`
- Performance tests benchmark core data structures and algorithms