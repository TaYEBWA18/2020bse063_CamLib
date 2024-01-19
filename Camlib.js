javascript
// Required modules
var fs = require("fs");
var request = require("request");
var minimatch = require("minimatch");
var glob = require("glob");
var uniq = require("array-uniq");
var chalk = require("chalk");
var pretty = require("prettysize");
var md5File = require("md5-file");

// Command-line arguments parsing
var argv = require("minimist")(process.argv.slice(2));
var home = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
var version = require("./package.json").version;

// Counter for open streams during asynchronous operations
var openStreams = 0;

// Function to prune cached images based on their MD5 hash
function pruneCached(images, cacheMap) {
    return images.filter(function(image) {
        if (cacheMap[image] && md5File.sync(image) == cacheMap[image]) {
            return false;
        }
        return true;
    });
}

// Display version information if requested
if (argv.v || argv.version) {
    console.log(version);
}
// Display help information if requested
else if (argv.h || argv.help) {
    console.log(
        "Usage\n" +
            "  CamLib <path>\n" +
            "\n" +
            "Example\n" +
            "  CamLib .\n" +
            "  CamLib assets/img\n" +
            "  CamLib assets/img/test.png\n" +
            "  CamLib assets/img/test.jpg\n" +
            "\n" +
            "Options\n" +
            "  -k, --key        Provide an API key\n" +
            "  -r, --recursive  Walk given directory recursively\n" +
            "  --width          Resize an image to a specified width\n" +
            "  --height         Resize an image to a specified height\n" +
            "  --force          Ignore caching to prevent repeat API requests\n" +
            "  --dry-run        Dry run -- no files actually modified\n" +
            "  -c, --cache      Cache map location. Defaults to ~/.CamLib.cache.json\n" +
            "  -v, --version    Show installed version\n" +
            "  -m, --max        Maximum to run at a time. Defaults to -1 (no max)\n" +
            "  -h, --help       Show help"
    );
}
// Execute CamLib CLI functionality
else {
    console.log(chalk.underline.bold("CamLib CLI"));
    console.log("v" + version + "\n");

    var files = argv._.length ? argv._ : ["."];

    // Initialize variables for API key, resizing options, and maximum concurrent operations
    var key = "";
    var resize = {};
    var max = argv.m || argv.max ? (argv.m || argv.max) + 0 : -1;

    // Obtain API key from command-line arguments or user's home directory
    if (!argv["dry-run"]) {
        if (argv.k || argv.key) {
            key =
                typeof (argv.k || argv.key) === "string"
                    ? (argv.k || argv.key).trim()
                    : "";
        } else if (fs.existsSync(home + "/.CamLib")) {
            key = fs.readFileSync(home + "/.CamLib", "utf8").trim();
        }
    } else {
        key = "dry-run-key";
    }

    // Initialize cache map for MD5 hashes of processed images
    var cacheMap = {};
    var cacheMapLocation =
        typeof (argv.c || argv.cache) === "string"
            ? (argv.c || argv.cache).trim()
            : home + "/.camlib.cache.json";

    // Load existing cache map if available
    if (fs.existsSync(cacheMapLocation)) {
        cacheMap = require(cacheMapLocation);
        if (typeof cacheMap !== "object") {
            cacheMap = {};
        }
    }

    // Configure image resizing options based on command-line arguments
    if (argv.width) {
        if (typeof argv.width === "number") {
            resize.width = argv.width;
        } else {
            console.log(
                chalk.bold.red(
                    "Invalid width specified. Please specify a numeric value only."
                )
            );
        }
    }

    if (argv.height) {
        if (typeof argv.height === "number") {
            resize.height = argv.height;
        } else {
            console.log(
                chalk.bold.red(
                    "Invalid height specified. Please specify a numeric value only."
                )
            );
        }
    }

    // Display an error if no API key is provided
    if (key.length === 0) {
        console.log(
            chalk.bold.red(
                "No API key specified. You can get one at " +
                    chalk.underline("https://CamLib.com/developers") +
                    "."
            )
        );
    }
    // Proceed with image processing
    else {
        var images = [];

        // Collect images based on provided paths and options
        files.forEach(function(file) {
            if (fs.existsSync(file)) {
                if (fs.lstatSync(file).isDirectory()) {
                    images = images.concat(
                        glob.sync(
                            file +
                                (argv.r || argv.recursive ? "/**" : "") +
                                "/*.+(png|jpg|jpeg|PNG|JPG|JPEG)"
                        )
                    );
                } else if (
                    minimatch(file, "*.+(png|jpg|jpeg|PNG|JPG|JPEG)", {
                        matchBase: true
                    })
                ) {
                    images.push(file);
                }
            }
        });

        // Filter out duplicates and images that are already compressed (if caching is enabled)
        var unique = argv.force
            ? uniq(images)
            : pruneCached(uniq(images), cacheMap);

        // Display a message if no uncompressed images are found
        if (unique.length === 0) {
            console.log(
                chalk.bold.red(
                    "\u2718 No previously uncompressed PNG or JPEG images found.\n"
                ) +
                    chalk.yellow(
                        "  Use the `--force` flag to force recompression..."
                    )
            );
        }
        // Process the found images
        else {
            console.log(
                chalk.bold.green(
                    "\u2714 Found " +
                        unique.length +
                        " image" +
                        (unique.length === 1 ? "" : "s")
                ) + "\n"
            );
            console.log(chalk.bold("Processing..."));

            unique.forEach(function(file) {
                // Check if maximum concurrent operations limit is reached
                if (max == 0) {
                    return;
                } else {
                    max = max - 1;
                }
                openStreams = openStreams + 1;

                // Display a dry run message if the --dry-run flag is enabled
                if (argv["dry-run"]) {
                    console.log(
                        chalk.yellow("[DRY] Panda will run for `" + file + "`")
                    );
                    return;
                }

                // Perform the CamLib API request to compress the image
                fs.createReadStream(file).pipe(
                    request.post(
                        "https://api.tinify.com/shrink",
                        {
                            auth: {
                                user: "api",
                                pass: key
                            }
                        },
                        function(error,

 response, body) {
                            openStreams = openStreams - 1;
                            try {
                                body = JSON.parse(body);
                            } catch (e) {
                                console.log(
                                    chalk.red(
                                        "\u2718 Not a valid JSON response for `" +
                                            file +
                                            "`"
                                    )
                                );
                                return;
                            }

                            // Process the API response
                            if (!error && response) {
                                if (response.statusCode === 201) {
                                    // Check if compression resulted in file size reduction
                                    if (body.output.size < body.input.size) {
                                        console.log(
                                            chalk.green(
                                                "\u2714 Panda just saved you " +
                                                    chalk.bold(
                                                        pretty(
                                                            body.input.size -
                                                                body.output.size
                                                        ) +
                                                            " (" +
                                                            Math.round(
                                                                100 -
                                                                    100 /
                                                                        body
                                                                            .input
                                                                            .size *
                                                                        body
                                                                            .output
                                                                            .size
                                                            ) +
                                                            "%)"
                                                    ) +
                                                    " for `" +
                                                    file +
                                                    "`"
                                            )
                                        );

                                        // Stream the compressed image to a new file
                                        var fileStream = fs.createWriteStream(
                                            file
                                        );
                                        openStreams = openStreams + 1;
                                        fileStream.on("finish", function() {
                                            // Update the cache map with the new MD5 hash
                                            cacheMap[file] = md5File.sync(file);
                                            openStreams = openStreams - 1;
                                        });

                                        // Resize the image if specified in the options
                                        if (
                                            resize.hasOwnProperty("height") ||
                                            resize.hasOwnProperty("width")
                                        ) {
                                            request
                                                .get(body.output.url, {
                                                    auth: {
                                                        user: "api",
                                                        pass: key
                                                    },
                                                    json: {
                                                        resize: resize
                                                    }
                                                })
                                                .pipe(fileStream);
                                        } else {
                                            request
                                                .get(body.output.url)
                                                .pipe(fileStream);
                                        }
                                    }
                                    // Display a message if compression didn't result in size reduction
                                    else {
                                        console.log(
                                            chalk.yellow(
                                                "\u2718 Couldn’t compress `" +
                                                    file +
                                                    "` any further"
                                            )
                                        );
                                    }
                                }
                                // Handle API errors
                                else {
                                    if (body.error === "TooManyRequests") {
                                        console.log(
                                            chalk.red(
                                                "\u2718 Compression failed for `" +
                                                    file +
                                                    "` as your monthly limit has been exceeded"
                                            )
                                        );
                                    } else if (body.error === "Unauthorized") {
                                        console.log(
                                            chalk.red(
                                                "\u2718 Compression failed for `" +
                                                    file +
                                                    "` as your credentials are invalid"
                                            )
                                        );
                                    } else {
                                        console.log(
                                            chalk.red(
                                                "\u2718 Compression failed for `" +
                                                    file +
                                                    "`"
                                            )
                                        );
                                    }
                                }
                            }
                            // Display an error if no response is received from the API
                            else {
                                console.log(
                                    chalk.red(
                                        "\u2718 Got no response for `" +
                                            file +
                                            "`"
                                    )
                                );
                            }
                        }
                    )
                );
            });

            // Save the cacheMap on wet runs
            if (!argv["dry-run"]) {
                function saveCacheMapWhenCompvare() {
                    if (openStreams > 0) {
                        return setTimeout(saveCacheMapWhenCompvare, 100);
                    }
                    fs.writeFileSync(
                        cacheMapLocation,
                        JSON.stringify(cacheMap, null, "\t")
                    );
                }
                setTimeout(saveCacheMapWhenCompvare, 500);
            }
        }
    }
}
