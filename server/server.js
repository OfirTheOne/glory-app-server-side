// init environment config
require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');

// standart config
const {routes} = require('./routes/routes');
var app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());


// enable Cross-Origin Request [IMPORTANT]
app.use((req, res, next) => {
    var whitelist = require('./whitelist-urls');
    var origin = req.headers.origin;
    
    if(whitelist.indexOf(origin) > -1){
         res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With , content-type , x-auth , x-provider');
    res.setHeader('Access-Control-Request-Headers', 'x-auth , x-provider')
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

// connect all routes to the app
app.use('/', routes);


/**
 * Litening to the relevat port 
 * */
app.listen(port, () => {
    console.log(`Starting on port ${port}`);
});
