'use strict';

let Promise = require("bluebird");
let debug = require("debug")("bot-express:nlp");

module.exports = class CustomNLP {
    constructor(options){
        if(options.custom_nlp_function){
            this._custom_nlp_function = options.custom_nlp_function;
        } else {
            debug("custom nlp function is null. custom_nlp_function required return response intent promise");
            this._custom_nlp_function = null;
        }
    }

    identify_intent(sentence, options){
        if(this._custom_nlp_function !== null){
            return this._custom_nlp_function(sentence, options);
        } else {
            return new Promise((resolve, reject) => {
                return resolve({
                    name: process.env.DEFAULT_SKILL,
                    parameters: null,
                    text_response: null,
                    fulfillment: null
                });
            })
        }
    }
}
