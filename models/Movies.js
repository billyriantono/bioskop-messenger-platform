var mongoose = require('mongoose');

module.exports = mongoose.model('Movies', {
    id: { type:String , index: { unique: true }},
    title: { type: String },
    trailer: String,
    poster: String,
    actors: String,
    directors: String,
    duration: Number,
    rating: Number,
    synopsis: String
});