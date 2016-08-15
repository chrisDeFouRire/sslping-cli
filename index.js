#!/usr/bin/env node

const status = require('elegant-status');
const Optimist = require('optimist');
const async = require('async');
const fetch = require('node-fetch');

//const SSLPING = 'https://sslping.com';
const SSLPING = 'http://127.0.0.1:8080';
const QUEUE_LIMIT = 10;

const argv = Optimist
	.usage("Bulk load servers to https://sslping.com\nUsage: $0 -u [user] -p [password] server[:port]...")
	.demand(['user', 'password'])
	.describe('user=email', "address for your sslping.com address")
	.alias('user', 'u')
	.describe('password', "password")
	.alias('password', 'p')
	.argv

// get the rest of the arguments, add port 443 if missing
const hosts = argv._.map( host => {
	[hostname, port] = host.split(':');
	return `${hostname}:${port || 443}`;
});

if (hosts.length == 0) {
	console.error("You must specify a list of servers to import");
	process.exit(1);
}
const {user, password} = argv

/** 
 * Get the token for this user/pwd
 * @param {String} email
 * @param {String} password
 * @returns {Promise} promise for the security token (String)
 */ 
function getTokenFor(email, password) {
	return fetch(
		`${SSLPING}/api/v1/login`,
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email, password })
		}
	).then(res => {
		if (res.status != 200) {
			throw new Error('Invalid Password')
		}
		console.info("Connected and authenticated");
		return res.json()
	}).then(({token}) => token);
}

/**
 * Add a single check
 * @param {String} token
 * @param {String} host hostname:port
 * @param {Callback} callback
 */
function addSingleCheck(token, host) {
	const _status = status(`${host}`);
	return fetch(
		`${SSLPING}/api/v1/user/checks/${host}`,
		{
			method: 'POST',
			headers: { 
				'content-type': 'application/json',
				'securitytoken': token 
			}
		}
	).then(res => {
		if (res.status > 400) {
			_status(false);
			console.log(res);
		}
		_status(true)
		return res.json()
	});
}

/**
 * Now let's do it...
 * 
 * get the token for the user
 * create an async.queue
 * push all the hosts to the queue
 */
getTokenFor(user, password)
.then( (token)=> {

	const worker = (host, cb) => {
		addSingleCheck(token, host)
		.then( result => cb())
	};
	const queue = async.queue(worker, QUEUE_LIMIT);
	queue.drain = () => process.exit(0);
	for (const host in hosts) {
		queue.push(hosts[host]);
	}

})
.catch( (err)=> console.error(err));
