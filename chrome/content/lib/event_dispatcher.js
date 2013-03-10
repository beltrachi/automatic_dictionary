// Adds event listener pattern to the object.
/*
 * Usage: AutomaticDictionary.extend( myclass, EventDispatcher );
 **/
// Based on https://github.com/mrdoob/eventdispatcher.js
AutomaticDictionary.EventDispatcher = {
    event_listeners: {},
    addEventListener: function ( type, listener ) {
        if ( this.event_listeners[ type ] === undefined ) {
            this.event_listeners[ type ] = [];
        }
        if ( this.event_listeners[ type ].indexOf( listener ) === - 1 ) {
            this.event_listeners[ type ].push( listener );
        }
    },
    removeEventListener: function ( type, listener ) {
        var index = this.event_listeners[ type ].indexOf( listener );
        if ( index !== - 1 ) {
            if(this.log) 
                this.log("removing eventListener for "+type);
            
            this.event_listeners[ type ].splice( index, 1 );
        }
    },
    dispatchEvent: function ( event ) {
        if(this.log) this.log("dispatching event "+event.toSource());
        var listenerArray = this.event_listeners[ event.type ];
        var list;
        if ( listenerArray !== undefined ) {
            event.target = this;
            //cloning the listeners in case it removes itself and offsets the 
            //positions so losing a listener call.
            list = ([]).concat(listenerArray);
            for ( var i = 0, l = list.length; i < l; i ++ ) {
                try{
                    list[ i ].call( this, event );
                }catch(e){
                    AutomaticDictionary.logException(e);
                }
            }
        }
    }
}
