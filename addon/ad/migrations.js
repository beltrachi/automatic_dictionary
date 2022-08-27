/**
 * Migrations and process to migrate.
 */
export function apply(AutomaticDictionary) {

  AutomaticDictionary.Migrations = {
    storage_key: "migrations_applied",
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
        data = await this.storage.get(this.storage_key);
      } catch (e) {
        this.logger.error(e);
      }

      try {
        data = JSON.parse(data)
      } catch (e) { }
      return data || [];
    },

    updateApplied: async function (migrations_applied) {
      await this.storage.set(this.storage_key, migrations_applied);
    },

    //Ordered migrations
    migrations: {
      //Key is date
      "201101010000": async function (self) {
        self.logger.debug("running base migration");
      },
      "202106051955": async function (self) {
        await self.setDefaults();
      },
      "202209270000": async function (self) {
        // TB 102 multilanguage support
        // Migrate all pairs data from single value to array of languages.
        let data = await self.storage.get('addressesInfo');
        if (!data) return;
        data = JSON.parse(data)
        for(const key in data.hash){
          data.hash[key] = [data.hash[key]]
        }
        await self.storage.set('addressesInfo', JSON.stringify(data))
      }
    }
  };

}