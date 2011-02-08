var http = require('http'),
io = require('socket.io'),
irc = require('irc'),
sys = require('sys'),
sanitizer = require('sanitizer'),
connect = require('connect'),
crypto = require('crypto'),
md5 = crypto.createHash('md5'),
url = require('url');


http.createServer(handleRequest).listen(8000);

var urls = [];
var searches = {};
var CHANNEL = "#bigbrotherislistening";
var matcher = /(https?:\/\/[^ ]+)/;
var cmd = /.urls ?(.+?)?$/;
var client = new irc.Client('irc.stealth.net', 'unfoshelper', { channels: [CHANNEL] });


function handleRequest(request, response) {
    var data = url.parse(request.url, true);
    sys.puts(JSON.stringify(data));
    if (data["href"] == "/favicon.ico") {
        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.write("Favicon not found");
    } else {
        try {
            var searchKey = data.query.search;
            var search = searches[searchKey];
            if (typeof(search) !== undefined && search != null) {
                response.writeHead(200, {'Content-Type': 'text/json'});
                response.write(JSON.stringify(search));
            } else {
                response.writeHead(404, {'Content-Type': 'text/plain'});
                response.write("Search not found");
            }
        } catch (err) {
            sys.puts("ERROR:: "  + err);
            response.writeHead(500, {'Content-Type': 'text/plain'});
            response.write("You broke it! (not really.)");
        }
    }

    response.end();
}


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
    if (matches.length > 0) {
        md5.update(term + Math.random());
        var searchKey = md5.digest('hex');
        searches[searchKey] = matches;
        return searchKey;
    } else {
        return "";
    }
}


client.addListener('message', function (from, to, message) {
   // socket.broadcast(sanitizer.escape(message));
   var urlMatches = message.match(matcher);
   sys.puts(from + ' => ' + to + ': ' + message);
   sys.puts("urlMatches: " + urlMatches);
   if (urlMatches != null) {
       for (var i = 0; i < urlMatches.length; i++) {
           addIfNew(urlMatches[i]);
       }
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
               var searchMatches = searches[searchResults];
               var numMatches = searchMatches.length;
               var reply = "Match 1/" + numMatches + ":" + searchMatches[0];
               if (numMatches > 1) {
                    reply += " - you can see the rest here: http://ec2-46-137-6-201.eu-west-1.compute.amazonaws.com/?search=" + searchResults;
               }
               
               client.say(CHANNEL, reply);
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

if (typeof(http) === "undefined") {
    http = {
        createServer: function() { return { listen: function(i) {}} }
    };
}

if (typeof(require) === "undefined") { require = function() { return {Client: function() {}}}}


