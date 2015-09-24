# Automatic Dictionary extension for Thunderbird

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
  

## Contributors

* beltrachi
* Marcos Diez
* Giacomo Ciani
* ByteHamster
* SimonSapin
