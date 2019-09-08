<a href="https://codeclimate.com/github/beltrachi/automatic_dictionary"><img src="https://codeclimate.com/github/beltrachi/automatic_dictionary/badges/gpa.svg" /></a>
<a href="https://codeclimate.com/github/beltrachi/automatic_dictionary/coverage"><img src="https://codeclimate.com/github/beltrachi/automatic_dictionary/badges/coverage.svg" /></a>

#  Automatic Dictionary extension for Thunderbird

![Logo](https://raw.githubusercontent.com/beltrachi/automatic_dictionary/master/chrome/content/logo.png)

This is the source code of the Automatic dictionary plugin:
https://addons.thunderbird.net/en-US/thunderbird/addon/automatic-dictionary-switching/

[![Build Status](https://api.travis-ci.org/beltrachi/automatic_dictionary.svg)](https://travis-ci.org/beltrachi/automatic_dictionary)

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
 * Error console lessages. That usually is in "Tools" > "Developer tools" > "Error console".

If the plugin does something you did not expect it will be helpful if you send us the logs of the plugin (as described in the next section)

### Sending logs

You can send me a detailed description of which steps to reproduce your bug with the plugin logs attached.

Steps to activate the plugin logs:

1. Go to preferences of the plugin (in Thunderbird > Addons > Automatic Dictionary > Preferences)
2. Activate "Save log to file"
3. Set Log level to "Debug"
4. Restart thunderbird
5. Reproduce the case that do not work.
6. Close Thunderbird and open it again.
7. Go to Automatic Dictionary preferences and click on "Send log to developer"

After that, you should disable the "Save to log file" and set Log level back to "Warning".

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
3. Execute ./update_version.sh
4. Update the CHANGELOG file with changes since last release.
5. Execute ./build.sh
6. Commit all changes.
7. Create tag with git.
8. Push all changes.
9. Go to Mozilla addon page and upload new version.

Then you have to wait till they approve it.
