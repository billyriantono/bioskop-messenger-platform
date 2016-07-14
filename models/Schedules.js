var mongoose = require('mongoose');

module.exports = mongoose.model('Schedules', {
    date: { type: String },
    city: String,
    cinemaId: { type: String },
    cinemaName: String,
    schedules: {}
});