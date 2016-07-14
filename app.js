/*
 * Copyright 2016-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/* jshint node: true, devel: true */
'use strict';

const
    bodyParser = require('body-parser'),
    config = require('config'),
    crypto = require('crypto'),
    express = require('express'),
    https = require('https'),
    cinemaProvider = require('./libs/cinemaProvider'),
    mongoose = require('mongoose'),
    Botkit = require('botkit'),
    os = require('os'),
    _ = require('lodash'),
    Cities = require('./models/Cities'),
    Movies = require('./models/Movies'),
    async = require("async"),
    request = require('request');

var app = express();

var movies = [];

var options = {server: {socketOptions: {keepAlive: 1}}};
var connectionString = 'mongodb://' + config.get('mongoDbUsername') + ':' + config.get('mongoDbPassword') + '@' + config.get('mongoDbHost') + '/tata';

mongoose.connect(connectionString, options);

app.set('port', process.env.PORT || 8000);
// app.use(bodyParser.json({verify: verifyRequestSignature}));
app.use(express.static('public'));


//setup cron
var domain = require('domain');
var scope = domain.create();


/*
 * Be sure to setup your config values before running this code. You can 
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
    process.env.MESSENGER_APP_SECRET :
    config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
    (process.env.MESSENGER_VALIDATION_TOKEN) :
    config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
    (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
    config.get('pageAccessToken');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
    console.error("Missing config values");
    process.exit(1);
}

var controller = Botkit.facebookbot({
    debug: true,
    access_token: PAGE_ACCESS_TOKEN,
    verify_token: VALIDATION_TOKEN,
});

var bot = controller.spawn({
    json_file_store: 'data'
});

controller.setupWebserver(process.env.port || 5000, function (err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function () {
        console.log('ONLINE!');
    });
});
//set greeting
setGreetingText();

scope.run(function () {
    // Launch the cinema data scraper
    try {
        var CronJob = require('cron').CronJob;
        var job = new CronJob("00 00 10 * * *",
            function () {
                cinemaProvider.refreshData(0);
            }, function () {
                // This function is executed when the job stops
            },
            true
        );
        console.log("Cron job started");
    } catch (ex) {
        console.log("Cron pattern not valid");
    }
    // Start extraction right now
    cinemaProvider.refreshData(0);
});
scope.on('error', function (err) {
    console.log(err.stack.split("\n"));
});

var city = [];
Cities.find({}, function (err, cities) {
    cities.reduce(function (userMap, item) {
        city.push(item.name);
    }, {});
});
//bot section
controller.hears(['hello', 'hi', 'halo'], 'message_received', function (bot, message) {
    console.dir(message.user);
    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello.');
        }
        bot.startConversation(message, function (err, convo) {

            convo.say('Selamat datang di Tiket Bioskop ! Saat ini kami baru mendukung untuk pencarian jadwal Film di CGVBlitz.');
            convo.say('Daftar Kota yang telah kami dukung : ');
            city.forEach(function (item) {
                convo.say("[ + ] " + item);
            })
            convo.ask('Masukan Kota yang ingin anda lihat jadwalnya ?', function (response, convo) {
                convo.say('Ok Cool ! Anda akan melihat jadwal untuk kota : ' + response.text + '\nAnda nanti dapat mengganti kota anda dengan mengetikan city \<nama kota\>\nKetik help untuk perintah yang lain.');

                convo.next();
            });
        });
    });
});

controller.hears(['nowplaying'], 'message_received', function (bot, message) {
    bot.reply(message, "Baik kami akan memproses permintaan anda.")
    var movies = [];
    async.parallel([
        function (cb) {
            Movies.find({}, function (err, cities) {
                cities.reduce(function (userMap, item) {
                    var item = {
                        'title': item.title,
                        'image_url': item.poster,
                        'subtitle': item.synopsis,
                        'buttons': [
                            {
                                'type': 'web_url',
                                'url': item.trailer,
                                'title': 'Play Trailer'
                            },
                            {
                                'type': 'web_url',
                                'url': config.get('blitzMovieUrl') + '/' + item.id,
                                'title': 'Lihat Jadwal & Tiket'
                            }

                        ]
                    };
                    movies.push(item);
                }, {});
                cb(movies);
            });
        }
    ], function (results) {
        console.dir(results);
        _.chunk(results, 10).forEach(function (item) {
            console.dir(item);
            bot.reply(message, {
                attachment: {
                    'type': 'template',
                    'payload': {
                        'template_type': 'generic',
                        'elements': item
                    }
                }
            });
        });
    });

});


controller.on('facebook_optin', function (bot, message) {
    Movies.find({}, function (err, cities) {
        cities.reduce(function (userMap, item) {
            var item = {
                'title': item.title,
                'image_url': item.poster,
                'subtitle': item.synopsis,
                'buttons': [
                    {
                        'type': 'web_url',
                        'url': item.trailer,
                        'title': 'Play Trailer'
                    }
                ]
            };
            movies.push(item);
        }, {});
    });
    bot.startConversation(message, function (err, convo) {

        convo.say('Selamat datang di Tiket Bioskop ! Saat ini kami baru mendukung untuk pencarian jadwal Film di CGVBlitz.');
        convo.say('Daftar Kota yang telah kami dukung : ');
        Cities.find({}, function (err, cities) {
            cities.reduce(function (userMap, item) {
                convo.say("> " + item);
            }, {});
        });
        convo.ask('Masukan Kota yang ingin anda lihat jadwalnya ?', function (response, convo) {
            convo.say('Golly, I love ' + response.text + ' too!!!');
            convo.next();
        });
    });
    //bot.reply(message, 'Selamat datang di Tiket Bioskop ! Saat ini kami baru mendukung untuk pencarian jadwal Film di CGVBlitz.');

});


function setGreetingText() {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
        qs: {access_token: PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: '{' +
        '"setting_type":"greeting",' +
        '"greeting":{' +
        '"text":"Selamat datang di Tiket Bioskop ! Saat ini kami baru mendukung untuk pencarian jadwal Film di CGVBlitz."' +
        '}' +
        '}'
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body);
        }
    });
}

controller.on('facebook_postback', function (bot, message) {

    bot.reply(message, 'Great Choice!!!! (' + message.payload + ')');

});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'], 'message_received',
    function (bot, message) {

        var hostname = os.hostname();
        var uptime = formatUptime(process.uptime());

        bot.reply(message,
            ':|] I am a bot. I have been running for ' + uptime + ' on ' + hostname + '.');
    });


controller.on('message_received', function (bot, message) {
    bot.reply(message, 'Perintah yang kami dukung :\n schedule , nowplaying');
    return false;
});


function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}


// Start server
// Webhooks must be available via SSL with a certificate signed by a valid 
// certificate authority.
app.listen(8000, function () {
    console.log('Node app is running on port', app.get('port'));
});

module.exports = app;

