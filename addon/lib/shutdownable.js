export function apply(AutomaticDictionary) {
//A component can be shutten down unregistering from what had done
AutomaticDictionary.Lib.Shutdownable = {
    shutdown_chain: [],
    
    //Registers and queues unregistering
    setListener: function(target, on, func, useCapture){
        target.addEventListener(on, func, useCapture);
        this.shutdown_chain.push(function(){
            target.removeEventListener(on, func, useCapture); 
        });
    },
    
    shutdown:function(){
        this.logger.debug("Shutdown...");
        for(var x=0; x< this.shutdown_chain.length;x++){
            try{
                this.logger.debug("Shutdown chain "+ x + "/"+this.shutdown_chain.length);
                this.shutdown_chain[x]();
            }catch(e){
                AutomaticDictionary.logException(e);
            }
        }
    }
    
}

}
