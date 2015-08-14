/**
 * Migrations and process to migrate.
*/

AutomaticDictionary.Migrations = {
    // Upgrades plugin data to current release version
    migrate: function(){
        // Get current migrations applied
        var pref_key = this.PREFERENCE_SCOPE + ".migrations_applied";

        var migrations_applied = [];
        var raw_data = this.prefManager.getCharPref( pref_key );
        if( raw_data !== "" ){
            migrations_applied = JSON.parse( raw_data ); 
        }

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
                this.migrations[ migration_key ](this);
                migrations_applied.push( migration_key );
                this.logger.info("migration "+ migration_key + " applied successfully");
            }
        }
        this.prefManager.setCharPref( pref_key, JSON.stringify( migrations_applied ) );
    },

    //Ordered migrations
    migrations: {
        //Key is date
        "201101010000": function(self){
            self.logger.debug("running base migration");
        },
        "201102130000": function(self){
            //Adpat data structure to new one
            // Steps: 1. Load old data. 2. Save as new data
            var prefPath = self.ADDRESS_INFO_PREF;
            var v = self.prefManager.getCharPref( prefPath );
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
            var maxSize = self.prefManager.getIntPref( prefPath + ".maxSize");
            var lru = new AutomaticDictionary.Lib.LRUHashV2( v, {
                size: maxSize
            } );
            self.prefManager.setCharPref(prefPath, lru.toJSON());
        },
        "201106032254": function(self){
            //Add limit of max_recipients
            var prefPath = self.MAX_RECIPIENTS_KEY;
            var maxRecipients = self.prefManager.getIntPref( prefPath );
            if( self.isBlank( maxRecipients ) ){
                self.prefManager.setIntPref( prefPath, 10);
            }

            //Increment max_size of shared_hash param because now we support saving
            //The CCs so 200 can be really low. Should be 1000 at least. A mail with
            // 1 A and 4 CCs generates 6 keys saved. A, A+CCs, CC1, CC2, CC3, CC4
            var factor = 6; // 6 times the current limit
            prefPath = self.ADDRESS_INFO_PREF + ".maxSize";
            var maxSize = self.prefManager.getIntPref( prefPath );
            self.prefManager.setIntPref( prefPath, maxSize * factor );
        },
        "201210142159": function(self){
            //Allow collect data by default
            self.prefManager.setBoolPref( self.pref_prefix + self.ALLOW_COLLECT_KEY, true);
        },
        "201210192306": function(self){
            //Add limit of max_recipients
            self.prefManager.setBoolPref( self.ALLOW_HEURISTIC, true);
        },
        "201211112134": function(self){
            //Add freq table base data
            //Tricky trick to overwrite the start method and trigger the freq
            //update when it's first time called
            var start = self.start, runned = false;
            self.start = function(){
                var start_at = (new Date()).getTime(),
                    keys = self.data.keys(), key, lang;
                self.logger.debug("migrating to generate freq_suffix with "+JSON.stringify(keys));
                for(var i=0;i< keys.length;i++){
                    key = keys[i];
                    //Only use single items, exclude grouped ones
                    //Coma is used to separate values
                    if(key.indexOf(",") === -1 && key.indexOf("[cc]") === -1){
                        lang = self.data.get(key);
                        if(lang){
                            self.save_heuristic(key,lang);
                        }
                    }
                }
                self.collect_event("process","build_from_hash",
                    {value:((new Date()).getTime() - start_at)}
                );
                //Undo the trick and call start.
                self.start = start;
                start.apply(self);
            }
        },
        "201302272039": function(self){
            //Migrated to restartless
            self.setDefaults();
        },
        "201303021735": function(self){
            //Added internal stats
            self.setDefaults();
        },
        "201405132246": function(self){
            //Added notificationLevel
            self.setDefaults();
        },
        "201501011313": function(self){
            //Added notificationLevel
            self.setDefaults();
        },
        "201501061812": function(self){
            //Added saveLogFile
            self.setDefaults();
        }
    }
};

