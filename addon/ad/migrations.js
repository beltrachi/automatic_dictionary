/**
 * Migrations and process to migrate.
 */
export function apply(AutomaticDictionary){

  AutomaticDictionary.Migrations = {
    pref_key: "migrations_applied",
    // Upgrades plugin data to current release version
    migrate: async function(){
      var migrations_applied = await this.getMigrationsApplied();

      // Apply all data migrations required
      // Get ordered migrations (by key size)
      var available_migrations = [];
      for( var key in this.migrations ){
        available_migrations.push( key )
      }

      //Iterate over migration keys and apply them if needed
      available_migrations.sort();
      for( var idx in available_migrations ){
        var migration_key = available_migrations[ idx ];
        if( migrations_applied.indexOf( migration_key ) < 0 ){
          //apply migration
          this.logger.info("applying migration "+ migration_key);
          await this.migrations[ migration_key ](this);
          migrations_applied.push( migration_key );
          this.logger.info("migration "+ migration_key + " applied successfully");
        }
      }
      await this.updateApplied(migrations_applied);
    },
    getMigrationsApplied: async function(){
      var data = [];
      try {
        data = await this.storage.get(this.pref_key);
      }catch(e){
        this.logger.error(e);
      }
      if (data == [] || typeof(data) == "undefined"){
        // Fallback to legacy storage
        this.logger.debug("Reading migrations from prefs");
        data = [];
        var pref_key = this.getPrefKey();
        var raw_data = await this.prefManager.getCharPref( pref_key , "[]");
        if( raw_data !== "" ){
          data = JSON.parse( raw_data );
        }
      }

      try{
        data = JSON.parse(data)
      }catch(e){}
      return data;
    },

    updateApplied: async function(migrations_applied){
      var pref_key = this.getPrefKey();
      await this.prefManager.setCharPref( pref_key, JSON.stringify( migrations_applied ) );
      await this.storage.set('migrations_applied', migrations_applied);
    },

    getPrefKey: function(){
       return this.pref_prefix + this.pref_key;
    },
    //Ordered migrations
    migrations: {
      //Key is date
      "201101010000": async function(self){
        self.logger.debug("running base migration");
      },
      "201102130000": async function(self){
        //Adpat data structure to new one
        // Steps: 1. Load old data. 2. Save as new data
        var prefPath = self.pref_prefix + self.ADDRESS_INFO_KEY;
        var v = await self.prefManager.getCharPref( prefPath );
        if( v ){
          try{
            v = JSON.parse( v );
          }catch(e){
            self.logger.debug("Failed the read of the old preferences. Maybe they were empty.");
            return; // Nothing to migrate.
          }
        }else{
          return;
        }
        // Save data as new format!
        var maxSize = await self.prefManager.getIntPref( prefPath + ".maxSize");
        var lru = new AutomaticDictionary.Lib.LRUHashV2( v, {
          size: maxSize
        } );
        await self.prefManager.setCharPref(prefPath, lru.toJSON());
      },
      "201106032254": async function(self){
        //Add limit of max_recipients
        var prefPath = self.pref_prefix + self.MAX_RECIPIENTS_KEY;
        var maxRecipients = await self.prefManager.getIntPref( prefPath );
        if( self.isBlank( maxRecipients ) ){
          await self.prefManager.setIntPref( prefPath, 10);
        }

        //Increment max_size of shared_hash param because now we support saving
        //The CCs so 200 can be really low. Should be 1000 at least. A mail with
        // 1 A and 4 CCs generates 6 keys saved. A, A+CCs, CC1, CC2, CC3, CC4
        var factor = 6; // 6 times the current limit
        prefPath = self.pref_prefix + self.ADDRESS_INFO_KEY + ".maxSize";
        var maxSize = await self.prefManager.getIntPref( prefPath );
        await self.prefManager.setIntPref( prefPath, maxSize * factor );
      },
      "201210192306": async function(self){
        //Add limit of max_recipients
        await self.prefManager.setBoolPref( self.pref_prefix + self.ALLOW_HEURISTIC, true);
      },
      "201211112134": async function(self){
        //Create freq table base data from current data already stored.

        // We need self.data to be loaded so we attach to the event "load"
        var listener = async function(){
          var start_at = (new Date()).getTime(),
              keys = await self.data.keys(), key, lang;
          self.logger.debug("migrating to generate freq_suffix with "+JSON.stringify(keys));
          for(var i=0;i< keys.length;i++){
            key = keys[i];
            //Only use single items, exclude grouped ones
            //Coma is used to separate values
            if(key.indexOf(",") === -1 && key.indexOf("[cc]") === -1){
              lang = await self.data.get(key);
              if(lang){
                self.save_heuristic(key,lang);
              }
            }
          }
          self.removeEventListener('load', listener);
        };
        self.addEventListener('load',listener);
      },
      // Only a setDefaults is needed. No need to set defaults so many times.
      // "201302272039": async function(self){
      //     //Migrated to restartless
      //     await self.setDefaults();
      // },
      // "201303021735": async function(self){
      //     //Added internal stats
      //     await self.setDefaults();
      // },
      // "201405132246": async function(self){
      //     //Added notificationLevel
      //     await self.setDefaults();
      // },
      // "201501011313": async function(self){
      //     //Added notificationLevel
      //     await self.setDefaults();
      // },
      // "201501061813": async function(self){
      //     //Added saveLogFile
      //     await self.setDefaults();
      //  },
      "202003161545": async function(self){
        //Added saveLogFile
        await self.setDefaults();
      },
      // Migrate pref to storage API
      "202003231651": async function(self){
        var keys_to_skip = [
          // migrations_applied will be migrated by global updateApplied
          "migrations_applied"
        ];
        for(var k in self.defaults){
          var v = null;
          try {
            v = await self.prefManager.get(self.pref_prefix + k);
          }catch(e){}
          if(keys_to_skip.includes(k)){
            continue;
          }
          if(typeof(v) == "undefined" || v == null){
            self.logger.debug("Value for "+k+" is empty, nothing to migrate");
            continue;
          }
          await self.storage.set(k, v);
        }
      }
    }
  };

}