var http = require('http'),
io = require('socket.io'),
irc = require('irc'),
sys = require('sys'),
sanitizer = require('sanitizer'),
connect = require('connect'),
crypto = require('crypto'),
fs = require('fs'),
path = require('path'),
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
    } else if (typeof(data.search) === "undefined") {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write("<form method='get'><input type='text' name='search'/><input type='submit' value='Go'/></form>");
    } else {
        try {
            var key;
            if (typeof(data.query.key) !== "undefined") {
                key = data.query.key;
            } else if (typeof(data.query.search) !== "undefined") {
                key = searchUrls(decodeURI(data.query.search));
            }
            sys.puts("Key = " + key);
            var searchResults = searches[key];
            if (typeof(searchResults) !== undefined && searchResults != null) {
                sys.puts("typeof(searchResults) = " + typeof(searchResults));
                sys.puts(searchResults);
                var searchJson = JSON.stringify(searchResults);
                response.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Length': searchJson.length
                });
                response.write(searchJson);
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
    var found = false;
    for (var i = 0; i < urls.length; i++) {
        if (urls[i] == url) {
            found = true;
            break;
        }
    }
    if (!found) {
        sys.puts("New url:: " + url);
        urls.push(url);
        return true;
    } else {
        return false;
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
        var hashData = term + Math.random();
        var md5 = crypto.createHash('md5');
        md5.update(hashData);
        var searchKey = md5.digest('hex');
        sys.puts("Matches = " + typeof(matches));
        searches[searchKey] = matches;
        return searchKey;
    } else {
        return "";
    }
}

function parseOldLogFile() {
     path.exists('#can_i_has_server.txt', function(exists) {
        if (exists) {
            var fd = fs.createReadStream('#can_i_has_server.txt');
            var data = fd.data();
            searches = JSON.parse(data);
        }
    });
}


function saveToFS() {
    try {
        var fd = fs.createWriteStream('urls.json');
        var contents = JSON.stringify(urls);
        fd.write(contents);
        fd.close();

        var fd2 = fs.createWriteStream('searches.json');
        contents = JSON.stringify(searches);
        fd2.write(contents);
        fd2.close();

    } catch (err) {
        sys.puts(err);
        return false;
    }
    return true;


}
function loadFromFS() {
    path.exists('urls.json', function(exists) {
        if (exists) {
            var fd = fs.createReadStream('urls.json');
            var data = fd.data();
            urls = JSON.parse(data);
        }
    });
    path.exists('searches.json', function(exists) {
        if (exists) {
            var fd = fs.createReadStream('searches.json');
            var data = fd.data();
            searches = JSON.parse(data);
        }
    });
}

function addUrlFromLine(line) {
    var urlMatches = line.match(matcher);
    if (urlMatches != null) {
        for (var i = 0; i < urlMatches.length; i++) {
            addIfNew(urlMatches[i]);
        }
    }
}

client.addListener('message', function (from, to, message) {
   // socket.broadcast(sanitizer.escape(message));
    sys.puts(from + ' => ' + to + ': ' + message);
    addUrlFromLine(message);
   var cmdMatch = message.match(cmd);
   //sys.puts("cmdMatch: " + cmdMatch + "; .length=" + (cmdMatch == null ? "null" : cmdMatch.length));
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
               var reply = "Match 1/" + numMatches + ": " + searchMatches[0];
               if (numMatches > 1) {
                    reply += " - you can see the rest here: http://46.137.6.201:8000/?key=" + searchResults;
               }
               
               client.say(CHANNEL, reply);
           }
       }
   }

    if (message == ".old") {
        var oldUrls = parseOldLogFile();
    }

    if (message == ".save") {
        var success = saveToFS();
        client.say(CHANNEL, "Save operation was " + (success ? "successful" : "a failure" ));
    }

    if (message == ".load") {
        loadFromFS();
        client.say(CHANNEL, "Url count now: " + urls.length + "; searches count now: " + searches.length);
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


