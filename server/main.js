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
//to start HTTPS server run command: npm --server="HTTPS" run-script start
var startServer = function() {
    if (process.env.npm_config_server === "HTTPS") {
        https.createServer(secureConfig, app).listen(PORT, function() {
            console.log('HTTPS server patiently listening on port', PORT);
        })
    } else {
        require('./io')(server); // Attach socket.io.
        server.on('request', app); // Attach the Express application.
        server.listen(PORT, function() {
            console.log(chalk.blue('Server started on port', chalk.magenta(PORT)));
        });

    }

};

startDb.then(startServer).
catch (function(err) {
    console.error('Initialization error:', chalk.red(err.message));
    console.error('Process terminating . . .');
    process.kill(1);
});