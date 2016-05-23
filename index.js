var _ = require('lodash');
var Q = require('q-plus');
var cheerio = require('cheerio');

var languagesList = [];
var parseLanguages = false;

function generateMethod(book, body, examples) {
    // Main container
    var $ = cheerio.load('<div class="api-method"></div>'),
        $apiMethod = $('div.api-method'),
    // Method definition
        $apiDefinition = $('<div class="api-method-definition"></div>'),
    // Method code
        $apiCode = $('<div class="api-method-code"></div>');

    // Append elements
    $apiMethod.append($apiDefinition);
    $apiMethod.append($apiCode);

    // Render method body
    return Q()
    .then(function() {
        return book.renderBlock('markdown', body);
    })
    .then(function(apiDefinition) {
        $apiDefinition.html(apiDefinition);

        // Set method examples
        return Q(examples).eachSeries(function(example) {
            var $example;

            // Common text
            if (example.name == 'common') {
                $example = $('<div class="api-method-example"></div>');

            }

            // Example code snippet
            if (example.name == 'sample') {
                var langClass = 'lang-'+example.lang;
                $example = $('<div class="api-method-sample '+langClass+'"></div>');
            }

            return book.renderBlock('markdown', example.body)
            .then(function(body) {
                $example.html(body);
                $apiCode.append($example);
            });
        });
    })
    .then(function() {
        // Return whole HTML
        return $.html('div.api-method');
    });
}

module.exports = {
    book: {
        assets: './assets',
        js: [
            'theme-api.js'
        ],
        css: [
            'theme-api.css'
        ]
    },

    blocks: {
        method: {
            parse: true,
            blocks: ['sample', 'common'],
            process: function(blk) {
                var examples = [];

                _.each(blk.blocks, function(_blk) {
                    // Add lang to list of languages
                    if (parseLanguages && languagesList.indexOf(_blk.kwargs.lang) == -1) {
                        languagesList.push(_blk.kwargs.lang);
                    }

                    examples.push({
                        name: _blk.name,
                        body: _blk.body.trim(),
                        lang: _blk.kwargs.lang
                    });
                });

                return generateMethod(this, blk.body.trim(), examples);
            }
        }
    },

    hooks: {
        init: function() {
            // Check if we should parse the list of languages from the blocks
            var config = this.config.get('theme-api');

            languagesList = config.languages;
            if (!languagesList.length) {
                parseLanguages = true;
            }
        },

        finish: function() {
            // Update list of languages if parsed
            if (parseLanguages) {
                var config = this.config.get('theme-api');

                config.languages = _.map(languagesList, function(lang, i) {
                    return {
                        name: lang.toUpperCase(),
                        lang: lang,
                        default: (i == 0)
                    };
                });

                this.config.set('theme-api', config);
            }
        }
    }
};
