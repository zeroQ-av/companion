#!/usr/bin/env node
var main = require('./app.js');
var system = main(process.env.DEVELOPER ? false : true);

console.log("Starting");

if (process.argv.length < 3) {
	console.log("Usage: ./headless.js <address> [port]");
	console.log("");
	console.log("Example: ./headless.js 192.168.81.1");
	process.exit(1);
}

var port = '8000';
if (process.argv[3] != null) {
		port = process.argv[3];
}
setTimeout(function () {
	system.emit('init_ip_bind', process.argv[2], port);
	console.log("Started");
}, 1000);
