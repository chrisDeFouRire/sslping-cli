#!/usr/bin/env node
global.Promise = global.Promise ? Promise : require('promise-polyfill');

const Optimist = require('optimist');
const async = require('async');
const fetch = require('node-fetch');

const SSLPING = 'https://sslping.com';
//const SSLPING = 'http://127.0.0.1:8080';
const QUEUE_LIMIT = 10; // reasonnable default, 10 servers at a time

const argv = Optimist
	.usage(`Bulk import and export servers to https://sslping.com
Usage: $0 -u <user> -p <password> [--quiet=true] import|export server[:port]...`)
	.demand(['user', 'password'])
	.alias('user', 'u')
	.describe('password', "password")
	.alias('password', 'p')
	.describe('quiet', false)
	.argv

/** 
 * Get the token for this user/pwd
 * @param {String} email
 * @param {String} password
 * @returns {Promise} promise for the security token (String)
 */ 
function getTokenFor(email, password) {
	if (!argv.quiet) {
		console.info("Connecting...");
	}

	return fetch(
		`${SSLPING}/api/v1/login`,
		{
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ type: 'password', opts: {email, password} })
		}
	).then(res => {
		if (res.status != 200) {
			throw new Error('Invalid Password')
		}
		if (!argv.quiet) {
			console.info("Connected and authenticated");
		}
		return res.json()
	}).then(({token}) => token);
}

/**
 * Get the hosts we should import from the command line
 */
function getImportHosts() {
	if (argv._.length == 0) {
		console.error("You must specify a list of servers to import");
		process.exit(1);
	}
	return argv._.map((host) => {
		const [hostname, port] = host.split(':');
		return `${hostname}:${port || 443}`;
	});
}

/**
 * Add a single check
 * @param {String} token
 * @param {String} host hostname:port
 * @param {Callback} callback
 */
function addSingleCheck(token, host) {
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
			console.error(`failed \t${host}\t(status=${res.status})`);
			return null
		}
		console.info(`done\t${host}`);
		return res.json()
	});
}

/**
 * Get a JSON report for all hosts
 * @param {String} token
 * @return {Promise} the resulting promise
 */
function getAllHosts(token) {
	return fetch(SSLPING + '/api/v1/user/checks', {
		method: 'GET',
		headers: {
			'content-type': 'application/json',
			'securitytoken': token
		}
	}).then((res) => {
		if (res.status >= 400) {
			console.error(`failed to get servers (status=${res.status})`)
			return null
		}
		return res.json()
	})
}

/**
 * Now let's do it...
 * 
 * get the token for the user
 * create an async.queue
 * push all the hosts to the queue
 */

if (argv._.length < 1) {
	console.error("You must at least provide a command (import or export)")
	process.exit(1)
}

const command = argv._.shift()

const {user, password} = argv

getTokenFor(user, password).then(function (token) {
	switch (command) {
		case "import": {
			const hosts = getImportHosts()
			if (hosts.length == 0) {
				console.error("You must specify a list of servers to import");
				process.exit(1);
			}
			var worker = function worker(host, cb) {
				addSingleCheck(token, host).then(function (result) {
					return cb()
				})
			}
			var queue = async.queue(worker, QUEUE_LIMIT);
			queue.drain = function () {
				return process.exit(0)
			}
			for (var host in hosts) {
				queue.push(hosts[host])
			}
			break
		}
		case "export": { 
			var result = getAllHosts(token).then( res => {
				console.log(JSON.stringify(res, null, 4))
			})

			break
		}
	}
})
.catch((err) => {
	console.error(err);
	process.exit(1)
})
