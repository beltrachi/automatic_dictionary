import { benchmark } from '../helpers/ad_test_helper.js'
import { FreqTable } from "./../../addon/lib/freq_table";

test('FreqTable performance', async (done) => {
    var amount = 1000;

    var obj = new FreqTable();
    await benchmark( 50, function(){
        for(var i=0; i < amount; i++){
            //10 diferent first items and 11 second items
            obj.add("a"+(i%10));
        }
    });

    await benchmark( 50, function(){
        for(var i=0; i < amount; i++){
            //10 diferent first items and 11 second items
            obj.remove("a"+(i%10));
        }
    });
    done();
});
