/*
NodeJS CMX Receiver

A basic web service to accept CMX data from a Cisco Meraki network
- Accept a GET request from Meraki and respond with a validator
- Meraki will POST to server, if validated.
- POST will contain a secret, which can be verified by the server.
- JSON data will be in the req.body.data. This will be available in the cmxData function's data object.

-- This skeleton app will only place the data received on the console. It's up to the developer to use this how ever required

*/

// CHANGE THESE CONFIGURATIONS to match your CMX configuration
var port = process.env.OVERRIDE_PORT || process.env.PORT || 1890;
var secret = process.env.SECRET || "Pedro";
var validator = process.env.VALIDATOR || "enterYourValidator";
var route = process.env.ROUTE || "/cmx";
var prevData = {};
var macAdress = [];
// All CMX JSON data will end up here. Send it to a database or whatever you fancy.
// data format specifications: https://documentation.meraki.com/MR/Monitoring_and_Reporting/CMX_Analytics#Version_2.0
function cmxData(data) {
    console.log("Version:" + data["version"]);
    console.log("Type:" + data.type);


    if (data.type != "DevicesSeen") {
        return;
    }
    if (data.data.observations.length != 0) {
        prevData[data.data.apMac] = data;
        //console.log("JSON Feed: " + JSON.stringify(data, null, 2));

        console.log(data.data.observations.length);
    }
};

var knowMac = ["bc:44:34:22:04:ef", "a0:f8:95:f5:0b:a5"];
var names = {
        "bc:44:34:22:04:ef": "pim",
        "a0:f8:95:f5:0b:a5": "nia"
    }
    //**********************************************************

// Express Server 
var express = require('express');
var app = express();
var cors = require('cors')
var bodyParser = require('body-parser')
app.use(cors())
app.use(bodyParser.json())

// CMX Location Protocol, see https://documentation.meraki.com/MR/Monitoring_and_Reporting/CMX_Analytics#API_Configuration
//
// Meraki asks for us to know the secret
app.get(route, function(req, res) {
    console.log("Validator = " + validator);
    res.status(200).send(validator);
});
//
// Getting the flow of data every 1 to 2 minutes
app.post(route, function(req, res) {

    cmxData(req.body);

    res.status(200);
});
app.get("/data", function(req, res) {

    var obs = [];
    for (var prop in prevData) {
        //console.log(JSON.stringify(prevData[prop].data.observations,null,2));
        obs = obs.concat(obs, prevData[prop].data.observations);

    }
    res.json(obs);
});
app.get("/data.geojson", function(req, res) {


    var gjs = {};
    gjs.type = "FeatureCollection";
    var feats = [];

    for (var prop in prevData) {
        //console.log(JSON.stringify(prevData[prop].data.observations,null,2));
        //obs = obs.concat(obs,prevData[prop].data.observations);
        var arr = prevData[prop].data.observations;
        for (var ele in arr) {
            if (arr[ele].location != null) {

                var temp = {};
                temp.type = "Feature";
                temp.properties = {};
                temp.properties.mac = arr[ele].clientMac;
                if (temp.properties.mac == "bc.44.34.22.04") {
                    temp.properties.icon = "walk";
                }
                else {
                    temp.properties.icon = "star";
                }

                var geometry = {};
                geometry.type = "Point";
                var coord = [arr[ele].location.lng, arr[ele].location.lat];
                geometry.coordinates = coord;
                temp.geometry = geometry;

                feats.push(temp);
            }
        }

    }

    gjs.features = feats;
    res.json(gjs);


});

app.get("/importantdata.geojson", function(req, res) {


    var gjs = {};
    gjs.type = "FeatureCollection";
    var feats = [];

    for (var prop in prevData) {
        //console.log(JSON.stringify(prevData[prop].data.observations,null,2));
        //obs = obs.concat(obs,prevData[prop].data.observations);
        var arr = prevData[prop].data.observations;
        for (var ele in arr) {
            if (knowMac.indexOf(arr[ele].clientMac) > -1) {

                if (arr[ele].location != null) {


                    var temp = {};
                    temp.type = "Feature";
                    temp.properties = {};
                    temp.properties.err = arr[ele].location.unc;
                    temp.properties.mac = arr[ele].clientMac;

                    temp.properties.title = names[arr[ele].clientMac];
                    temp.properties.icon = "rocket";

                    var geometry = {};
                    geometry.type = "Point";
                    var coord = [arr[ele].location.lng, arr[ele].location.lat];
                    geometry.coordinates = coord;
                    temp.geometry = geometry;

                    feats.push(temp);
                }
            }
        }

    }

    gjs.features = feats;
    res.json(gjs);


});
app.get("/map", function(req, res) {

    var options = {
        root: __dirname,
        dotfiles: 'deny',
        headers: {
            'x-timestamp': Date.now(),
            'x-sent': true
        }
    };

    res.sendFile("./map.html", options);
})

// Start server
app.listen(port, function() {
    console.log("CMX Receiver listening on port: " + port);
});
