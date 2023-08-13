<a href="https://codeclimate.com/github/beltrachi/automatic_dictionary"><img src="https://codeclimate.com/github/beltrachi/automatic_dictionary/badges/gpa.svg" /></a>
<a href="https://codeclimate.com/github/beltrachi/automatic_dictionary/coverage"><img src="https://codeclimate.com/github/beltrachi/automatic_dictionary/badges/coverage.svg" /></a>

__Please note: This project is in maintenance mode. Only critical bugs will be fixed, but no new features will be implemented.__

#  Automatic Dictionary extension for Thunderbird

![Logo](addon/logo.png)

This is the source code of the Automatic dictionary plugin:
https://addons.thunderbird.net/en-US/thunderbird/addon/automatic-dictionary-switching/

[![Build Status](https://circleci.com/gh/beltrachi/automatic_dictionary.svg?style=shield)](https://app.circleci.com/pipelines/github/beltrachi/automatic_dictionary)

## Target

Users that write emails in different languages very often to the same addresses each
time.

When writing a new email or answering one, you had to manually change the dictionary language each time.

This addon will keep a record of the language you choose for the recipients of a mail and switch it next time you write to them.

It can also guess the language based on the domain of the recipients of the mail. For example, if you write to domains that go to ".es" domains, it can "learn" to switch to Spanish if you write to them in Spanish.

## Usage

To associate a language to a recipient:

1. Go to "Compose message"
2. Write it's address in the TO field
3. Choose the language you want to assign
4. There will appear a message on the status bar announcing that that language has been assigned to a recipient.

You can assign various recipients at once, setting them all to the language.

Caution, the plugin only assigns the languages to the recipients when the
language is changed, so if the language set by default is the one you want to
assign to the users, you'll have to change the language to any other, wait the
extension to register that (the status bar will change), and then set the target
language.

Once a language is set to a user, each time you Compose a message and that
recipient appears in the "TO" or "CC" recipients, the language will be set to that.

## Bug reporting

If you have issues using this plugin, you can file an issue in github: https://github.com/beltrachi/automatic_dictionary/issues/new

With the following information:
 * Operating System? (Windows vista, Windows 7, MacOSX, Ubuntu, etc.)
 * Thunderbird version. (Go to Help > About)
 * The plugins you have installed. You can do a screenshot of the addons page and send it to me.
 * A list of steps to reproduce the bug.
 * Tell me what it does and what would you expect.
 * Error console messages. That usually is in "Tools" > "Developer tools" > "Error console".

If the plugin does something you did not expect it will be helpful if you send us the logs of the plugin.

## Contributors

* beltrachi
* Marcos Diez
* Giacomo Ciani
* ByteHamster
* SimonSapin

## How to release a new version

When we release a new version of the plugin we do:

1. Merge the changes to master branch.
2. Update manifest.json version tag with the new one (following SEMVER).
3. Update the CHANGELOG file with changes since last release.
4. Execute ./build.sh
5. Commit all changes.
6. Create tag with git.
7. Push all changes.
8. Go to Mozilla addons page and upload new version.

Then you have to wait till they approve it.

## Development

To run unit tests:

```
docker run -v $PWD:/app -it node bash -c "cd /app; npm install; npm test"
```

To run a single test:

```
docker run -v $PWD:/app -it node bash -c "cd /app; npm test -- test/units/ad.test.js -t boot"
```

### Integration tests

```
./script/docker_integration_test.sh
```

To run them locally in debug mode:
```
./script/local_integration_tests.sh
```
