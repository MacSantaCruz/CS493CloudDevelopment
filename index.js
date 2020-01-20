const router = module.exports = require('express').Router();

router.use('/days', require('./day'));
router.use('/lifts', require('./lift'));
