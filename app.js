require('dotenv').config();
const express = require('express');
const elasticsearch = require('elasticsearch');

const required_vars = process.env.LISTEN_PORT && process.env.ES_URL && process.env.ES_INDEX && process.env.ES_TYPE

if (!required_vars) {
  console.error("Missing environment variables, check your .env file");
  process.exit(1);
}

const host = process.env.ES_URL;

const kibanaUrl = `${host}_plugin/kibana/`;


const style = `<style type="text/css">
  body {
    font-family: sans-serif;
    padding: 0;
    marghin: 0;
  }

  h2 {
    color: #DDD;
  }
  table, th, td {
    border: 2px solid green;
    padding: 10px;
  }

  td {
    height: 30px;
    overflow: none;
    width: 50%;
  }

  th a:link {
    color: lightgreen;
    text-decoration: none;
  }

  th a:visited {
    color: lightgreen;
  }

  th a:hover {
    color: #FAFFFA;
  }

  th a:active {
    color: lightgreen;
  }

  th a:focus  {
    color: lightgreen;
  }

  th {
    background-color: green;
    font-weight: bolder;
    color: white;
    height: 40px;
    width: 30%;
  }
  table {
    border-collapse: collapse;
  }

  iframe {
    margin: 0; 
    padding: 0;
    border: none; 
    width: 100%; 
    height: 100%;  
  }
</style>
`

var client = new elasticsearch.Client({
  host: host,
  log: 'trace'
});

var app = express();

app.get('/', function (req, res) {
  client.search({
    index: process.env.ES_INDEX,
    type: process.env.ES_TYPE,
    body: {
      size: 0,
      aggs: {
        users: {
          terms: { field : "User", size: 50 }
        }
      }
    }
  }).then((esResp) => {
    const rows = esResp.aggregations.users.buckets.map((bucket) => {
      return `<tr><th><a href="/users/${bucket.key}/">${bucket.key}</a></th><td><b>${bucket.doc_count} data records</b></td></tr>`
    });
    const table = `<table>${rows.join('\n')}</table>`;
    res.send(style + table);
  }, (error) => {
    res.send('<p><h2><b>ElasticSearch seems offline</b></h2></p>' + iframe);
  });
});

app.get('/users/:userId', function (req, res) {
  const dashboard = `${kibanaUrl}#/dashboard/NatureIsOpen?embed&_a=(filters:!(),panels:!((col:1,id:NatureIsOpenTemperature,row:1,size_x:5,size_y:3,type:visualization),(col:6,id:NatureIsOpen-Humidity-ampersand-Moisture,row:1,size_x:3,size_y:3,type:visualization),(col:9,id:NatureIsOpen-Atmospheric-Pressure,row:1,size_x:3,size_y:3,type:visualization),(col:1,id:NatureIsOpen-UV,row:4,size_x:4,size_y:3,type:visualization),(col:5,id:NatureIsOpen-Light-Conditions,row:4,size_x:7,size_y:3,type:visualization)),query:(query_string:(analyze_wildcard:!t,query:'User%3D!'${req.params.userId}!'')),title:NatureIsOpen)&_g=(refreshInterval:(display:'5%20minutes',pause:!f,section:2,value:300000),time:(from:now-12h,mode:quick,to:now))`
  
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
    const rows = Object.keys(esResp.hits.hits[0]._source).map((key) => {
      return `<tr><th>${key}</th><td>${esResp.hits.hits[0]._source[key]}</td></tr>`;
    }).join('\n');
    res.send(`
      ${style}
      <div style="width: 100%; display: table; height: 100%">
          <div style="display: table-row; background-color: black; padding: 20px; text-align: center;">
              <div style="display: table-cell; padding: 15px; text-align: center; vertical-align: middle">
                <h2>Last data for <span style="color: white;"> ${req.params.userId}</span></h2>
              </div>
              <div style="display: table-cell; padding: 15px; align: center; vertical-align: middle">
                <h2>Dashboard for <span style="color: white;"> ${req.params.userId}</span></h2>
              </div>
          </div>
          <div style="display: table-row; height: 100%; vertical-align: top;">
              <div style="display: table-cell; height: 100%; width: 400px; vertical-align: top;">
                <table>${rows}</table>
              </div>
              <div style="display: table-cell; height: 100%; align: left; vertical-align: top; border: 2px solid green;">
                <iframe src="${dashboard}" width="100%" height="100%" />
              </div>
          </div>
      </div>
    `);

  }, (error) => {
    console.error('ElasticSearch Request FAILURE');
    res.send('<p><h2><b>ElasticSearch seems offline</b></h2></p>' + iframe);

  });
});

app.listen(process.env.LISTEN_PORT, function () {
  console.log(`HTTP server listening on port ${process.env.LISTEN_PORT}`);
});
