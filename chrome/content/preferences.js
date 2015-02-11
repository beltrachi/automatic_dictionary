if( typeof(AutomaticDictionary)=== "undefined" ){
    var AutomaticDictionary = {};
}

//Used on a text field allows to control the value of the field in a range.
// defv is the default value
AutomaticDictionary.check_int_range = function( field , min, max, defv ){
    defv = defv || min;
    var value = field.value * 1;
    // reset if it's not the same as string of it
    if( (value === NaN) || (value + "" !== field.value) ){
        field.value = defv;
    }
    if( value < min ){
        field.value = min;
    }else if( value > max ){
        field.value = max;
    }

    return false;
};

