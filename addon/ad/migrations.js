/**
 * Migrations and process to migrate.
 */
export function apply(AutomaticDictionary) {

  AutomaticDictionary.Migrations = {
    pref_key: "migrations_applied",
    // Upgrades plugin data to current release version
    migrate: async function () {
      var migrations_applied = await this.getMigrationsApplied();

      // Apply all data migrations required
      // Get ordered migrations (by key size)
      var available_migrations = [];
      for (var key in this.migrations) {
        available_migrations.push(key)
      }

      //Iterate over migration keys and apply them if needed
      available_migrations.sort();
      for (var idx in available_migrations) {
        var migration_key = available_migrations[idx];
        if (migrations_applied.indexOf(migration_key) < 0) {
          //apply migration
          this.logger.info("applying migration " + migration_key);
          await this.migrations[migration_key](this);
          migrations_applied.push(migration_key);
          this.logger.info("migration " + migration_key + " applied successfully");
        }else{
          this.logger.debug('skipping migration '+ migration_key)
        }
      }
      await this.updateApplied(migrations_applied);
    },
    getMigrationsApplied: async function () {
      var data = [];
      try {
        data = await this.storage.get(this.pref_key);
      } catch (e) {
        this.logger.error(e);
      }
      if (data == [] || typeof (data) == "undefined") {
        // Fallback to legacy storage
        this.logger.debug("Reading migrations from prefs");
        data = [];
        var pref_key = this.getPrefKey();
        var raw_data = await this.prefManager.getCharPref(pref_key, "[]");
        if (raw_data !== "") {
          data = JSON.parse(raw_data);
        }
        if(this.weNeedToMigrateAllAgain(data)){
          this.logger.info('Detected wrong migraiton data, re-migrating...')
          data = [];
        }
      }

      try {
        data = JSON.parse(data)
      } catch (e) { }
      return data;
    },

    weNeedToMigrateAllAgain: function(data){
      return this.emptyLocalStorageButPrefsSayWeMigratedAlready(data);
    },
    emptyLocalStorageButPrefsSayWeMigratedAlready: function(data) {
      const PREF_TO_STORAGE_MIGRATION = '202003231651'
      return data.indexOf(PREF_TO_STORAGE_MIGRATION) > -1;
    },

    updateApplied: async function (migrations_applied) {
      var pref_key = this.getPrefKey();
      await this.prefManager.setCharPref(pref_key, JSON.stringify(migrations_applied));
      await this.storage.set('migrations_applied', migrations_applied);
    },

    getPrefKey: function () {
      return this.pref_prefix + this.pref_key;
    },
    //Ordered migrations
    migrations: {
      //Key is date
      "201101010000": async function (self) {
        self.logger.debug("running base migration");
      },
      "202003161545": async function (self) {
        //Added saveLogFile
        await self.setDefaults();
      },
      // Migrate pref to storage API
      "202003231651": async function (self) {
        var keys_to_skip = [
          // migrations_applied will be migrated by global updateApplied
          "migrations_applied"
        ];
        for (var k in self.defaults) {
          var v = null;
          try {
            v = await self.prefManager.get(self.pref_prefix + k);
          } catch (e) { }
          if (keys_to_skip.includes(k)) {
            continue;
          }
          if (typeof (v) == "undefined" || v == null) {
            self.logger.debug("Value for " + k + " is empty, nothing to migrate");
            continue;
          }
          await self.storage.set(k, v);
        }
      },
      "202106051955": async function (self) {
        await self.setDefaults();
      },
      "202106271139": async function (self) {
        // Fix freq-suffix counters data. We need to remove negative values.
        // Negative values exist because of 2 reasons:
        // - When we removed a key from the LRU, we substracted 1 from the
        //   recipients counter domain (example.com with value of 4 would become example.com with 3).
        //   BUT we were not removing the key when it reached 0. This was fixed but we need to clean stored data.
        // - When a combined recipient was removed from the LRU hash, it was also removed
        //   from the pair counter structure, but we never sent combined recipients in the first place
        //   so it was substracting from unexisting keys. This creates the key with negative
        //   values.

        var raw_data = await self.storage.get(self.FREQ_TABLE_KEY)
        if (!raw_data) return;

        var data = JSON.parse(raw_data);

        // Data is an array of [key(recipient), value(lang), counter]
        self.logger.debug(data);
        var result = [];
        for (let i = 0; i < data.length; i++) {
          const element = data[i];
          const counter = element[2];
          if (counter < 1) {
            continue; // Discarding this element.
          }
          result.push(data[i]);
        }
        var migrated_data = JSON.stringify(result);
        self.logger.debug('migrated data: ' + migrated_data);
        await self.storage.set(self.FREQ_TABLE_KEY, migrated_data);
      },
    }
  };

}