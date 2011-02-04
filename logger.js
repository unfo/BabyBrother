var http = require('http'),
io = require('socket.io'),
irc = require('irc'),
sys = require('sys'),
sanitizer = require('sanitizer'),
connect = require('connect');

var urls = [];
var CHANNEL = "#bigbrotherislistening";
var matcher = /(https?:\/\/[^ ]+)/;
var cmd = /.urls ?(.+?)?$/;
var client = new irc.Client('eu.irc6.net', 'unfoshelper', { channels: [CHANNEL] });

function addIfNew(url) {
    sys.puts("addIfNew(" + url + ")");
    var found = false;
    for (var i = 0; i < urls.length; i++) {
        if (urls[i] == url) {
            sys.puts("Already found");
            found = true;
            break;
        }
    }
    if (!found) {
        sys.puts("Url not found, adding");
        urls.push(url);
    }

}

function searchUrls(term) {
    var matches = [];
    var re = new RegExp(term);
    for (var i = 0; i < urls.length; i++) {
        if (urls[i].match(re)) {
            matches.push(urls[i]);
        }
    }
    return matches;
}


client.addListener('message', function (from, to, message) {
   // socket.broadcast(sanitizer.escape(message));
   var urlMatches = message.match(matcher);
   sys.puts(from + ' => ' + to + ': ' + message);
   sys.puts("urlMatches: " + urlMatches);
   if (urlMatches != null) {

       for (var i = 0; i < urlMatches.length; i++)
           addIfNew(urlMatches[i]);
   }
   var cmdMatch = message.match(cmd);
   sys.puts("cmdMatch: " + cmdMatch + "; .length=" + (cmdMatch == null ? "null" : cmdMatch.length));
   if (cmdMatch != null) {
       if (cmdMatch[1] == null || cmdMatch[1].length == 0){
           client.say(CHANNEL, "Total urls: " + urls.length);
       } else {
           var searchResults = searchUrls(cmdMatch[1]);
           if (searchResults.length == 0) {
               client.say(CHANNEL, "0/" + urls.length + " urls match");
           } else {
               client.say(CHANNEL, "First match: " + searchResults[0]);
           }
       }
   }

});


// this is for IDEA
if (typeof(sys) === "undefined") { sys = { puts: function() {} }}
if (typeof(client) === "undefined") {
    client = {
        say: function() {},
        addListener: this.say
    }
}
if (typeof(require) === "undefined") { require = function() { return {Client: function() {}}}}


