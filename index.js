const request = require('request')
const NodeGeoCoder = require('node-geocoder');
const pug = require('pug');
const merge = require('merge');
var moment = require('moment');
var fs = require('fs');

const API_KEY = '35534110625c4553257c3073232542a';
const upcomingUrl = "/find/upcoming_events";
const API_POINT = "https://api.meetup.com";
const city = "London";
const topic = "Yoga";
const DATE_FORMAT = "YYYY-MM-DDTHH:mm:ss"
const FILE_NAME = "answer.html"
const DEBUG = false;
var today = moment().toDate();
var endDate = moment().add(7,'d').toDate();

var geoOpts = {
	provider: 'openstreetmap',
	httpAdapter: 'https'

};

var geo = NodeGeoCoder(geoOpts);

geo.geocode(city, function(err, res){
	if (DEBUG)
		console.log(res);
	if (!err) {
		if (res.length > 0) {
			var first = res[0];
			getMeetups(first.latitude,first.longitude);
		} else {
			errorPage("No meetings for this week");	
		}		
	} else {
		errorPage(err);
	}
});

function getMeetups(lat,lng) {	
	var query = {
		key: API_KEY,
		city: city,
		lat: lat,
		lon: lng,
		text: topic,
		start_date_range: moment(today).format(DATE_FORMAT),
		end_date_range: moment(endDate).format(DATE_FORMAT)
	};

	var url = prepareUrl(API_POINT + upcomingUrl, query);	
	if (DEBUG)
	console.log(url);


	request(url, function(error, response, body){
		if (!error) {
			var r = JSON.parse(body);
			if (r) mainPage(r);
			else errorPage("Response parse error");
		} else {
			errorPage(error);
		}		
});
}

function prepareUrl(url,query) {
	var c = 0;	
	Object.keys(query).forEach(function(e) {
		url = url.concat(c++ == 0 ? '?' : '&', e,'=',query[e]);
	});
	return url;
}

function errorPage(msg) {
	generateHtml({
		hasError: true,
		error: msg
	});
}

const days= {0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wenesday", 4: "Thursday", 5: "Friday", 6: "Saturday"}
function getDayName(dayNumber) {
	return days[dayNumber];
}

function mainPage(resp) {
	if (DEBUG)
		console.log(resp);
	var eventsAll = [];	
	if (resp.events)
		resp.events.forEach(function(e){
			var desc = e['description'];
			var title = e['name'];
			var date = moment(e['time']).format("dddd HH:mm (Z)");
			var ven = e['venue'];		
			if (ven)	
				var address = e['venue']['name'] + ", " + ven['address_1'] + ", " + ven['city'] + ", " + ven['localized_country_name'];
			else 
				var address = "";			
			var day = moment(e['time']).day();
			if (eventsAll[day]){
				eventsAll[day].events.push(event(date,title,address,desc));	
			} else {
				eventsAll[day] = {
					title: getDayName(day),
					events: [event(date,title,address,desc)]
				}
			}
			
		});
	else {
		if (DEBUG)
		console.log(resp);
	}

	generateHtml({
		hasError: false,
		values: eventsAll.clean(undefined)
	})
}

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};



function event(date,title,address,annotations){
	return {
		title: title,
		date: date,
		address: address,
		text: annotations
	}
}



function generateHtml(data) {
	var opts = {pretty: true, pageTitle:"Meetups"};
	var html = pug.renderFile('result.pug',merge(opts,data));
	fs.writeFile(FILE_NAME, html, function(err){
		if (err) {
			return console.log(err);
		}

		console.log("File saved \'" + FILE_NAME + "\'");
	})
}