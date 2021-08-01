
import { TestScheduler } from "@jest/core";
import { PersistentObject } from "./../../addon/lib/persistent_object";

var AutomaticDictionary = { Lib: {} };

import { apply as apply_logger } from "./../../addon/lib/logger";

apply_logger(AutomaticDictionary);

var logger = new AutomaticDictionary.Lib.Logger('error', function (msg) {
    console.info(msg);
});

//Storage stub for testing purposes
const StoreObjectStub = function () {
    var ifce, data = {};
    var log = { set: [], get: [] };
    return {
        set: function (k, v) {
            log.set.push([k, v]);
            data[k] = v;
            logger.warn(data);
        },
        get: function (k) {
            log.get.push([k]);
            return data[k];
        },
        data: function (k) {
            return data;
        },
        log: function (method) {
            return log[method];
        }
    }
}

test("PersistentObject", async () => {
    //Test it stores and loads the object...
    var store_object = StoreObjectStub();

    //A silly hash whith serializable methods
    var SerializableThing = (function () {
        var data = {};

        return {
            set: function (k, v) {
                logger.debug("called SET with " + k + " and value " + v);
                data[k] = v;
            },
            get: function (k) {
                logger.debug("called GET with " + k);
                logger.debug(data);
                return data[k];
            },
            toJSON: function () {
                return JSON.stringify(data);
            },
            fromJSON: function (str) {
                logger.debug("from json recieves " + str);
                data = JSON.parse(str);
            }
        };
    });

    var p = new PersistentObject(
        "my_hash_data",
        store_object,
        {
            read: ["get"],
            write: ["set"],
            serializer: "toJSON",
            loader: "fromJSON",
            logger: logger
        },
        function () {
            return new SerializableThing();
        }
    );

    expect(await p.get("A")).toBeUndefined();

    expect(store_object.get("my_hash_data")).toBeUndefined();

    //No set has been done
    expect(store_object.log("set").length).toBe(0)

    await p.set("A", 1);

    expect(store_object.log("set").length).toBe(1)
    expect(store_object.log("set")[0]).toStrictEqual(["my_hash_data", "{\"A\":1}"]);

    expect(await p.get("A")).toBe(1)

    expect(store_object.get("my_hash_data")).toBe("{\"A\":1}")

    expect(await p.get("B")).toBeUndefined();

    await p.set("A", 1);

    expect(store_object.log("set").length).toBe(2)

    expect(store_object.get("my_hash_data")).toBe("{\"A\":1}")

    expect((await p._object()).toJSON()).toBe("{\"A\":1}");

    //Another instance gets the last value stored

    var p2 = new PersistentObject(
        "my_hash_data",
        store_object,
        {
            read: ["get"],
            write: ["set"],
            serializer: "toJSON",
            loader: "fromJSON"
        },
        function () {
            return new SerializableThing();
        }
    );

    expect(await p2.get("A")).toBe(1)

    //Test reload()

    await p.set("B", 2);

    expect(await p2.get("B")).toBeUndefined();

    await p2.reload();

    expect(await p2.get("B")).toBe(2);
});