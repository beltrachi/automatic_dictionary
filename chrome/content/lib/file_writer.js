AutomaticDictionary.Lib.FileWriter = function(file){
    this.initialize(file);
};
AutomaticDictionary.Lib.FileWriter.prototype = {
    file: null,
    converter: null,
    enabled: null,
    initialize: function(file){
        this.file = Components.classes["@mozilla.org/file/local;1"].
            createInstance(Components.interfaces.nsILocalFile);
        this.file.initWithPath(file);
        if( !this.file.exists() ){
            this.file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0600);
        }
        // source: https://developer.mozilla.org/en-US/Add-ons/Code_snippets/File_I_O
        // file is nsIFile, data is a string
        var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
            createInstance(Components.interfaces.nsIFileOutputStream);

        // use 0x02 | 0x10 to open file for appending.
        foStream.init(this.file, 0x02 | 0x10, 0666, 0);
        // write, create, truncate
        // In a c file operation, we have no need to set file mode with or operation,
        // directly using "r" or "w" usually.

        // if you are sure there will never ever be any non-ascii text in data you can
        // also call foStream.write(data, data.length) directly
        this.converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
            createInstance(Components.interfaces.nsIConverterOutputStream);
        this.converter.init(foStream, "UTF-8", 0, 0);
        this.enabled = true;
    },
    write: function(string){
        if (this.enabled) {
            this.converter.writeString(string + "\n");
        }
    },
    close: function(){
        this.converter.close(); // this closes foStream
    }
}