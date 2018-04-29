// init environment config
require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');

// standart config
const {routes} = require('./routes/routes');
var app = express();
const port = process.env.PORT || 3000;
app.use(bodyParser.json());


app.use(function(req, res, next){
    var whitelist = ['localhost:8100', 'https://guarded-escarpment-70218.herokuapp.com']
    var host = req.get('host');
  
    whitelist.forEach(function(val, key){
      if (host.indexOf(val) > -1){
        res.setHeader('Access-Control-Allow-Origin', host);
      }
    })
  
    next();
  });

// enable Cross-Origin Request [IMPORTANT]
app.use((req, res, next) => {
    // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8100');
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
