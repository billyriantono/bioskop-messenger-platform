var mongoose = require('mongoose');

module.exports = mongoose.model('Cities', {
    name: { type: String, index: { unique: true }}
});