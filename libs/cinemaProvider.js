var providers = ['cgvBlitz', 'xxi', 'cinemaxx'];
var BlitzProvider = require('./blitzProvider');
var async = require("async");
var Schedules = require('../models/Schedules');
var moment = require('moment');
require('moment-timezone');
var _ = require("lodash");
var currentProvider = {};

var cinemaProviders = {
    refreshData: function (provider) {
        if (providers[provider] == 'cgvBlitz') {
            currentProvider = new BlitzProvider();
        }

        currentProvider.collectData(function (isSuccess, cinemas) {
            if (isSuccess) {
                var moviesTitles = [];
                var itemProcessed = 0;
                async.each(cinemas, function (cinema, callback) {
                    currentProvider.refreshMovieSchedule(cinema.id, cinema.name, cinema.city, function (moviesTitle) {
                        if (moviesTitle != null && Object.keys(moviesTitle).length > 0) {
                            var schedules = new Schedules({
                                date: moment().tz('Asia/Jakarta').format('YYYY-MM-DD'),
                                city: cinema.city,
                                cinemaName: cinema.name,
                                cinemaId: cinema.id,
                                schedules: moviesTitle
                            });
                            schedules.save(function (err, newItems) {
                                if (err == null) {
                                    itemProcessed++;
                                }
                            });
                        } else {
                            //skip and mark as processed
                            itemProcessed++;
                        }


                            console.log("Process Item : " + itemProcessed + " : " + cinemas.length);
                            callback();

                    });


                }, function (err) {
                    // if any of the file processing produced an error, err would equal that error
                    if (err) {
                        // One of the iterations produced an error.
                        // All processing will now stop.
                        console.log('A file failed to process');
                    } else {
                        console.log('All Movies processed successfully');
                    }
                });

            }
        });
    }
}

module.exports = cinemaProviders;