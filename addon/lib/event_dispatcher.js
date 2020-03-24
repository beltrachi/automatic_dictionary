export function apply(AutomaticDictionary){
// Adds event listener pattern to the object.
/*
 * Usage: AutomaticDictionary.extend( myclass, EventDispatcher );
 **/
// Based on https://github.com/mrdoob/eventdispatcher.js
  AutomaticDictionary.EventDispatcher = {
    event_listeners: null,
    initEventListener: function(){
      this.event_listeners = this.event_listeners || {};
    },
    addEventListener: function ( type, listener ) {
      this.initEventListener();
      if ( this.event_listeners[ type ] === undefined ) {
        this.event_listeners[ type ] = [];
      }
      if ( this.event_listeners[ type ].indexOf( listener ) === - 1 ) {
        this.event_listeners[ type ].push( listener );
      }
    },
    removeEventListener: function ( type, listener ) {
      this.initEventListener();
      var index = (this.event_listeners[ type ]|| []).indexOf( listener );
      if ( index !== - 1 ) {
        if(this.logger)
          this.logger.debug("removing eventListener for "+type);

        this.event_listeners[ type ].splice( index, 1 );
      }
    },
    dispatchEvent: function ( event ) {
      this.initEventListener();
      if(this.logger) {
        this.logger.debug("dispatching event ");
        this.logger.debug(JSON.stringify(event));
      }
      var listenerArray = this.event_listeners[ event.type ] || [];
      var list;
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