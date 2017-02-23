'use strict';

// This file is for test. Not required in npm package.

/*
** Import Packages
*/
let express = require("express");
let logger = require('morgan');
let bot_dock = require("./index");

/*
** Middleware Configuration
*/
let app = express();
app.use(logger('dev'));
app.listen(process.env.PORT || 5000, () => {
    console.log(`server is running...`);
});

/*
** Router Configuration
*/
app.use('/webhook', bot_dock({
    line_channel_id: process.env.LINE_CHANNEL_ID,
    line_channel_secret: process.env.LINE_CHANNEL_SECRET,
    line_channel_access_token: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    apiai_client_access_token: process.env.APIAI_CLIENT_ACCESS_TOKEN,
    default_skill: 'fulfill'
}));

module.exports = app;