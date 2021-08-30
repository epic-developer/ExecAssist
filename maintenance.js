'use strict';
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const fs = require('fs');

app.set('trust proxy', true);

const helmet = require('helmet');
app.use(helmet.frameguard());

app.use(express.static('public'));

app.use((request, response, next) => {
    response.status(503).send(`
    <center>
        <h2 style="font-family:Verdana">Planned Site Maintenance Ongoing</h2>
        <h3 style="font-family:Verdana">ExecAssist.io will return soon</h3>
    </center>
    `);
});

server.listen(8080);