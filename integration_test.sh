#!/usr/bin/env ruby

# This script executes thunderbird installing the extension and runs it.

def run(command)
  `#{command}`
end

sudo apt-get update
`sudo apt-get install -y xvfb thunderbird unzip imagemagick xdotool \
tesseract-ocr`

PROFILE_NAME = "TestUser"
PROFILE_PATH = `mktemp -d`

`mkdir #{PROFILE_PATH}`

Xvfb :0 -screen 0 1280x960x24 &
#sudo Xvfb :99.0 -ac &
export DISPLAY=:0

thunderbird -CreateProfile "$PROFILE_NAME $PROFILE_PATH"

./script/install_extension.sh --path $PROFILE_PATH --extension automatic_dictionary.xpi

thunderbird -P "$PROFILE_NAME" -offline --no-remote &

sleep 5

function read_screen {
    # Create screenshot
    TMP_FILE=$(mktemp)
    rm $TMP_FILE
    TMP_FILE="${TMP_FILE}.jpg"
    # Note: we are using jpg because imagemagick png can last as much as 12s
    # when converting images. Jpg is 1s. Increased quality be less lossy.
    import -window root -quality 99% $TMP_FILE
    # Resize for tesseract to read small fonts
    convert $TMP_FILE -quality 99% -colorspace Gray -resize 400% ${TMP_FILE}-big.jpg
    # Send file to tesseract
    tesseract ${TMP_FILE}-big.jpg stdout -l eng
}



if [ $(read_screen | grep 
# Escape email setup wizard
xdotool key "Escape"


# TODO: install language packs

# TODO: configure test email account

# TODO: compose an email by shortcuts and check that it remembers
# Check that it works by ocr'ing with tesseract.

# TODO: be able to set different thunderbird versions by env var.