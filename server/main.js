'use strict';
var chalk = require('chalk');
// Requires in ./db/index.js -- which returns a promise that represents
// mongoose establishing a connection to a MongoDB database.
var startDb = require('./db');
// Create a node server instance! cOoL!
var server = require('http').createServer();
var https = require('https');
var fs = require('fs')
var app = require('./app');
var secureConfig = {
    cert: fs.readFileSync(__dirname + '/cert.pem'),
    key: fs.readFileSync(__dirname + '/key.pem')
};
var PORT = process.env.PORT || 1337;
var HTTPS_PORT = 1443
//to start HTTPS server run command: npm --server="HTTPS" run-script start
var startServer = function() {
    //start both http and https server
    var secureServer = https.createServer(secureConfig);
    secureServer.on('request', app)
    secureServer.listen(HTTPS_PORT, function(err) {
        if (err) console.log(err);
        console.log('HTTPS server patiently listening on port', HTTPS_PORT);
    })
    require('./io')(server); // Attach socket.io.
    server.on('request', app); // Attach the Express application.
    server.listen(PORT, function(err) {
        if (err) console.log(err);
        // console.log("You can use following command to start https server: npm --server=\"HTTPS\" run-script start");
        console.log(chalk.blue('Server started on port', chalk.magenta(PORT)));
    });
};
startDb.then(startServer).
catch (function(err) {
    console.error('Initialization error:', chalk.red(err.message));
    console.error('Process terminating . . .');
    process.kill(1);
});