var mongoose = require('mongoose');

module.exports = mongoose.model('Cinemas', {
	_id: { type: String, index: { unique: true }},
    name: { type: String, index: { unique: true }},
    city: String
});