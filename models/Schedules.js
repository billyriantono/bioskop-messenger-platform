var mongoose = require('mongoose');
var Movies = require('./Movies');

module.exports = mongoose.model('Schedules', {
    date: { type: String },
    city: String,
    cinemaId: { type: String },
    cinemaName: String,
    schedules: {}
});