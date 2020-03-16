//This is a stub plugin for testing purposes and to see the minimal
//interface required.
export function apply(AutomaticDictionary){

//Constructor
AutomaticDictionary.Plugins.PluginBase = function(ad){
    this.init(ad);
}; 

//Method called by AD
AutomaticDictionary.Plugins.PluginBase.init = function(ad){
    new AutomaticDictionary.Plugins.PluginBase(ad);
}

AutomaticDictionary.extend( 
    AutomaticDictionary.Plugins.PluginBase.prototype,
    AutomaticDictionary.Lib.Shutdownable);

AutomaticDictionary.extend( AutomaticDictionary.Plugins.PluginBase.prototype, {
    //Called on ad boot
    init:function(ad){
        this.ad = ad;
    }
});

AutomaticDictionary.enabled_plugins.push(AutomaticDictionary.Plugins.PluginBase);

}