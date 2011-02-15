var request = require('request'),
        jsdom = require('jsdom'),
        sys = require('sys');

var quotes = {};
var maxRPL = {
    rpl: 0,
    id: null
};

var words = {};

request({uri:'http://bash.org/?top'}, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        var window = jsdom.jsdom(body).createWindow();
        var $ = require('jquery').create(window);
        $('.quote').each(function (i,e) {
            var q = $(e);
            var id = $("a[title^='Permanent']", q).text();
            var rating = parseInt(q.text().match(new RegExp("\\+\\((-?[0-9]+)\\)-"))[1], 10);
            var quoteContent = $(".qt").eq(i).text();
            take_a_good_look_at_the_content(quoteContent);
            var lineCount = quoteContent.split("\n").length;
            var ratingPerLines = rating / lineCount;
            if (ratingPerLines > maxRPL.rpl) {
                maxRPL.rpl = ratingPerLines;
                maxRPL.id = id;
            }
            quotes[id] = {
                rating: rating,
                content: quoteContent,
                lineCount: lineCount,
                rpl: ratingPerLines
            };
            // sys.puts("id \t" + id + "\trating\t" + rating + "\tlines\t" + lineCount + "\tR/L:\t" + ratingPerLines);
        });
        sys.puts("Biggest R/L:\t\t" + maxRPL.id + "\t\t" + maxRPL.rpl);
        sys.puts("Top 5 words:");

        var wordsReverse = {};
        var frequencies = [];
        for (var word in words) {
            if (words.hasOwnProperty(word)) {
                var value = words[word];

                frequencies.push(value);
                wordsReverse[value] = wordsReverse[value] || [];
                wordsReverse[value].push(word);
            }
        }
        frequencies = frequencies.sort(function(a,b) {
            return b - a;
        });

        var wordsNeeded = 10;
        if (typeof(frequencies) !== "undefined"){
            try {
                frequencies.forEach(function(freq, index, ary){
                    var wordsOfThisFreq = wordsReverse[freq];
                    if (typeof(wordsOfThisFreq) !== "undefined"){
                        wordsOfThisFreq.forEach(function(word,i,a) {
                            sys.puts(freq + ": " + word);
                            wordsNeeded--;
                            if (wordsNeeded == 0) {
                                throw "EnoughWords";
                            }
                        });
                    }
                });
            } catch (err) {
                if (err == "EnoughWords") {
                    // I need to get a better program flow
                } else {
                    throw err;
                }
            }
        }
    }
});

function take_a_good_look_at_the_content(quote) {
    var quoteWords = quote.split(/[\s.,]+/);
    quoteWords.forEach(function(word,index,ary) {
        words[word] = words[word] || 0;
        words[word] += 1;
    });
}
