var express = require('express');
var elasticsearch = require('elasticsearch');

var host = 'https://search-mosquitto-k34joo6mwdg7ynzkts6epsxuqy.eu-west-1.es.amazonaws.com/';

var kibanaUrl = `${host}_plugin/kibana/`;

var style = "margin: 0; padding: 0; border: none; width: 100%; height: 100%;";
var tableStyle = "border: 1px solid black; padding: 5px; align: center; height: 50px; font-family: sans-serif;";


var client = new elasticsearch.Client({
  host: host,
  log: 'trace'
});
var app = express();


app.get('/', function (req, res) {
  client.search({
    index: 'pantin',
    type: 'node9',
    body: {
      size: 0,
      aggs: {
        users: {
          terms: { field : "User" }
        }
      }
    }
  }).then((esResp) => {
    const rows = esResp.aggregations.users.buckets.map((bucket) => {
      return `<tr><th><a href="/users/${bucket.key}/">${bucket.key}</a></th><td><b>${bucket.doc_count} documents</b></td></tr>`
    });
    const table = `<table style="${tableStyle}">${rows.join('\n')}</table>`;
    res.send(table);
  }, (error) => {
    res.send("FAILED TO FETCH USER LIST");
  });
});

app.get('/users/:userId', function (req, res) {

  var dashboard = `${kibanaUrl}?embed&#/dashboard/TamataKit-Spiru-DashBoard?_g=(refreshInterval:(display:'5%20minutes',pause:!f,section:2,value:300000),time:(from:now-12h,mode:quick,to:now))&_a=(filters:!(),panels:!((col:9,id:Tamata-Atmospheric-Pressure,row:1,size_x:3,size_y:3,type:visualization),(col:6,id:Tamata-Humidity-ampersand-Moisture,row:1,size_x:3,size_y:3,type:visualization),(col:8,id:Tamata-Light-Conditions,row:4,size_x:4,size_y:3,type:visualization),(col:5,id:Tamata-UV,row:4,size_x:3,size_y:3,type:visualization),(col:1,id:Tamata-Temperature_OK,row:1,size_x:5,size_y:3,type:visualization),(col:1,id:TamataKit-RGB,row:4,size_x:4,size_y:3,type:visualization),(col:1,id:TamataKit-Lux,row:7,size_x:7,size_y:2,type:visualization)),query:(query_string:(analyze_wildcard:!t,query:'User%3D!'${req.params.userId}!'')),title:'TamataKit%20Spiru%20DashBoard')`
  
  var iframe = `<iframe src="${dashboard}" style="${style}" width="100%" height="100%"/>`;
  client.ping({
    requestTimeout: 1000
  }, function (error) {
    if (error) {
      console.error('ElasticSeach is OFFLINE');
      res.send('<p><h2><b>ElasticSearch seems OFFLINE</b></h2></p>');
    } else {
      client.search({
        index: 'pantin',
        type: 'node9',
        body: {
          size: 1, 
          query: {
            match: {
              User: req.params.userId
            }
          },
          sort: {
            T: 'desc'
          }
        }
      }).then((esResp) => {
        console.log('ElasticSearch Request SUCCESS');
        let table = `<table style="${tableStyle}">\n`;
        rows = esResp.hits.hits.map(
          (esDoc) => {
            let headerRow = '<tr>'
            let row = '<tr>';
            for (var prop in esDoc._source) {
              if (esDoc._source.hasOwnProperty(prop)) {
                row += `<td style="${tableStyle}">` + esDoc._source[prop] + "</td>"
                headerRow += `<th style="${tableStyle}">` + prop + "</th>"
              }
            }
            row = row + '</tr>';
            headerRow = headerRow + '</tr>\n'
            return headerRow + row;
          }
        );
        let body = "";
        body += `<p><h2>Last Value from ${req.params.userId}</h2></p>`;
        table += rows.join("\n") + "\n</table>";
        body += table;
        body += `<p><h2>${req.params.userId} Dashboard</h2></p>`;
        body += iframe;
        res.send(body);

      }, (error) => {
        console.error('ElasticSearch Request FAILURE');
        res.send('<p><h2><b>ElasticSearch seems offline</b></h2></p>' + iframe);
        
      });
    }
  });
});

app.listen(8080, function () {
  console.log('listening on port 8080');
});
