//derived from : Sonny's Works (https://github.com/sonnylazuardi/blitz-cli/blob/master/index.js) && Andhika (https://github.com/andhikanugraha/bot-bioskop/blob/master/lib/BlitzConnector.js)

const
    request = require('request-promise'),
    cheerio = require('cheerio'),
    config = require('config'),
    moment = require('moment');
require('moment-timezone'),
    Schedules = require('../models/Schedules'),
    Cinemas = require('../models/Cinemas'),
    Cities = require('../models/Cities');

var model = [];
var cities = [];
var cinemas = [];
var movies = [];

var blitzProvider = BlitzProvider.prototype;

function BlitzProvider() {

}

blitzProvider.collectData = function (callback) {

    var options = {
        uri: config.get('blitzBaseUrl'),
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    request(options)
        .then(function ($) {
            $('.city').each(function (i, elm) {
                var city = $(elm).children().first().text().toUpperCase();
                //write city to mongo
                console.log("add city : " + city);
                var cinemasObject = $(elm).children().eq(1).children().first().children();
                cinemasObject.each(function (i, elm) {
                    cinemas.push({
                        name: $(elm).first().text().toUpperCase() + ' CGVBLITZ',
                        city: city,
                        id: $(elm).first().children().first().attr('id')
                    });

                    console.log("Add Cinema : " + $(elm).first().text().toUpperCase() + ' CGVBLITZ');

                    var newCinema = new Cinemas({
                        name: $(elm).first().text().toUpperCase() + ' CGVBLITZ',
                        _id: $(elm).first().children().first().attr('id'),
                        city: city
                    });
                    newCinema.save()

                });
                var newCity = new Cities({
                    name: city
                });
                newCity.save();

            });
            callback(true, cinemas);
        })
        .catch(function (err) {
            // Crawling failed or Cheerio choked...
        });
};


blitzProvider.refreshMovieSchedule = function (cinemaId, cinemaName, city, cb) {
    var moviesTitle = {};
    var options = {
        uri: config.get('blitzBaseUrl') + '/' + cinemaId,
        transform: function (body) {
            return cheerio.load(body);
        }
    };

    request(options)
        .then(function ($) {
            try {
                $('.schedule-title').each((i, elm) => {
                    var filmTitle = $(elm).children().first().text().trim().toUpperCase();
                    var splitId = $(elm).children().first().attr('href').toString().split('/');
                    moviesTitle[String(filmTitle)] = {}
                    var variantElements = $(elm).parent().find('.schedule-type');
                    variantElements.each((i, elm) => {
                        var variant = $(elm).text().trim();
                        var timeElements = $(elm).next().find('.showtime-lists').children();
                        timeElements.each((i, elm) => {
                            console.log("Processing Movies : " + filmTitle + " cinema : " + cinemaName);
                            movies.push({
                                // cinemaId: cinemaId,
                                // cinemaName: cinemaName,
                                // city: city,
                                ticketType: variant,
                                date: moment().tz('Asia/Jakarta').format('YYYY-MM-DD'),
                                time: $(elm).text(),
                                priceIdr: parseInt($(elm).first().children().first().attr('price'))
                            });
                        });
                        moviesTitle[String(filmTitle)].schedules = movies;
                        moviesTitle[String(filmTitle)].trailer = "";
                        moviesTitle[String(filmTitle)].id = splitId[splitId.length - 1].toString();
                    });
                })
                if (moviesTitle != null) {
                    //console.dir(moviesTitle);
                    cb(moviesTitle);
                }
            } catch (err) {
                console.log(err);
            }
        })
        .catch(function (err) {
            // Crawling failed or Cheerio choked...
            console.log(err);
        });
};

module.exports = BlitzProvider;







