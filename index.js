#!/usr/bin/env node
'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

global.Promise = global.Promise ? Promise : require('promise-polyfill');
var status = require('elegant-status');
var Optimist = require('optimist');
var async = require('async');
var fetch = require('node-fetch');

var SSLPING = 'https://sslping.com';
//const SSLPING = 'http://127.0.0.1:8080';
var QUEUE_LIMIT = 10;

var argv = Optimist.usage("Bulk load servers to https://sslping.com\nUsage: $0 -u [user] -p [password] server[:port]...").demand(['user', 'password']).describe('user=email', "address for your sslping.com address").alias('user', 'u').describe('password', "password").alias('password', 'p').argv;

// get the rest of the arguments, add port 443 if missing
var hosts = argv._.map(function (host) {
	var _host$split = host.split(':'),
	    _host$split2 = _slicedToArray(_host$split, 2),
	    hostname = _host$split2[0],
	    port = _host$split2[1];

	return hostname + ':' + (port || 443);
});

if (hosts.length == 0) {
	console.error("You must specify a list of servers to import");
	process.exit(1);
}
var user = argv.user,
    password = argv.password;

/** 
 * Get the token for this user/pwd
 * @param {String} email
 * @param {String} password
 * @returns {Promise} promise for the security token (String)
 */

function getTokenFor(email, password) {
	return fetch(SSLPING + '/api/v1/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: email, password: password })
	}).then(function (res) {
		if (res.status != 200) {
			throw new Error('Invalid Password');
		}
		console.info("Connected and authenticated");
		return res.json();
	}).then(function (_ref) {
		var token = _ref.token;
		return token;
	});
}

/**
 * Add a single check
 * @param {String} token
 * @param {String} host hostname:port
 * @param {Callback} callback
 */
function addSingleCheck(token, host) {
	var _status = status('' + host);
	return fetch(SSLPING + '/api/v1/user/checks/' + host, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'securitytoken': token
		}
	}).then(function (res) {
		if (res.status > 400) {
			_status(false);
			console.log(res);
		}
		_status(true);
		return res.json();
	});
}

/**
 * Now let's do it...
 * 
 * get the token for the user
 * create an async.queue
 * push all the hosts to the queue
 */
getTokenFor(user, password).then(function (token) {

	var worker = function worker(host, cb) {
		addSingleCheck(token, host).then(function (result) {
			return cb();
		});
	};
	var queue = async.queue(worker, QUEUE_LIMIT);
	queue.drain = function () {
		return process.exit(0);
	};
	for (var host in hosts) {
		queue.push(hosts[host]);
	}
}).catch(function (err) {
	return console.error(err);
});

