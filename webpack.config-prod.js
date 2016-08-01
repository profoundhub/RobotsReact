import Fs from "fs";
import Path from "path";
import {assoc, map, reduce} from "ramda";
import {Base64} from "js-base64";
import Webpack from "webpack";
import GlobalizePlugin from "globalize-webpack-plugin";
import CommonsChunkPlugin from "webpack/lib/optimize/CommonsChunkPlugin";
import ExtractTextPlugin from "extract-text-webpack-plugin";
import {NODE_MODULES_DIR, SHARED_DIR, FRONTEND_DIR, BACKEND_DIR, PUBLIC_DIR} from "shared/constants"

// CONSTANTS =======================================================================================
// Paths to minified library distributions relative to the root node_modules
const MINIFIED_DEPS = [
  "moment/min/moment.min.js",
];

const API_AUTH = process.env.hasOwnProperty("API_USER_NAME") && process.env.hasOwnProperty("API_USER_PASS")
  ? "Basic " + Base64.encode(process.env.API_USER_NAME + ":" + process.env.API_USER_PASS)
  : undefined;

const DEFINE = {
  "process.env": {
    "NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  "config": {
    "api-auth": JSON.stringify(API_AUTH),
  },
};

const AUTOPREFIXER = "autoprefixer?{browsers: ['> 5%']}";

// CONFIG ==========================================================================================
export default {
  // Compilation target: http://webpack.github.io/docs/configuration.html#target
  target: "web",

  // Entry files: http://webpack.github.io/docs/configuration.html#entry
  entry: {
    bundle: "./frontend/app",

		vendors: [
			"globalize",
			"globalize/dist/globalize-runtime/number",
			"globalize/dist/globalize-runtime/plural",
			"globalize/dist/globalize-runtime/message",
			"globalize/dist/globalize-runtime/currency",
			"globalize/dist/globalize-runtime/date",
			"globalize/dist/globalize-runtime/relative-time"
		],
  },

  // Output files: http://webpack.github.io/docs/configuration.html#output
  output: {
    // Abs. path to output directory: http://webpack.github.io/docs/configuration.html#output-path
    path: PUBLIC_DIR,

    // Filename of an entry chunk: http://webpack.github.io/docs/configuration.html#output-filename
    filename: "[name].js?[chunkhash]",

    // Web path (used to prefix URLs): http://webpack.github.io/docs/configuration.html#output-publicpath
    publicPath: "/public/",

    // Include pathinfo in output (like `require(/*./test*/23)`): http://webpack.github.io/docs/configuration.html#output-pathinfo
    pathinfo: false,
  },

  // Debug mode: http://webpack.github.io/docs/configuration.html#debug
  debug: false,

  // Enhance debugging: http://webpack.github.io/docs/configuration.html#devtool
  devtool: null,

  // Capture timing information: http://webpack.github.io/docs/configuration.html#profile
  profile: false,

  // http://webpack.github.io/docs/configuration.html#module
  module: {
    noParse: map(dep => {
      return Path.resolve(NODE_MODULES_DIR, dep);
    }, MINIFIED_DEPS),

    // http://webpack.github.io/docs/loaders.html
    loaders: [
      // JS https://github.com/babel/babel-loader
      {test: /\.(js(\?.*)?)$/, loaders: ["babel?stage=0"], exclude: /node_modules/},

      // JSON https://github.com/webpack/json-loader
      {test: /\.(json(\?.*)?)$/,  loaders: ["json"]},
      {test: /\.(json5(\?.*)?)$/, loaders: ["json5"]},

      // RAW https://github.com/webpack/raw-loader
      {test: /\.(txt(\?.*)?)$/, loaders: ["raw"]},

      // URL: https://github.com/webpack/url-loader
      {test: /\.(jpg(\?.*)?)$/,   loaders: ["url?limit=10000"]},
      {test: /\.(jpeg(\?.*)?)$/,  loaders: ["url?limit=10000"]},
      {test: /\.(png(\?.*)?)$/,   loaders: ["url?limit=10000"]},
      {test: /\.(gif(\?.*)?)$/,   loaders: ["url?limit=10000"]},
      {test: /\.(svg(\?.*)?)$/,   loaders: ["url?limit=10000"]},
      {test: /\.(woff(\?.*)?)$/,  loaders: ["url?limit=100000"]},
      {test: /\.(woff2(\?.*)?)$/, loaders: ["url?limit=100000"]},

      // FILE: https://github.com/webpack/file-loader
      {test: /\.(ttf(\?.*)?)$/, loaders: ["file"]},
      {test: /\.(eot(\?.*)?)$/, loaders: ["file"]},
      {test: /\.(wav(\?.*)?)$/, loaders: ["file"]},
      {test: /\.(mp3(\?.*)?)$/, loaders: ["file"]},

      // HTML
      {test: /\.(html(\?.*)?)$/, loaders: ["html"]},

      // MARKDOWN
      {test: /\.(md(\?.*)?)$/, loaders: ["html", "markdown"]},

      // CSS: https://github.com/webpack/css-loader
      {test: /\.(css(\?.*)?)$/, loader: ExtractTextPlugin.extract(`css!${AUTOPREFIXER}`)},

      // LESS: https://github.com/webpack/less-loader
      {test: /\.(less(\?.*)?)$/, loader: ExtractTextPlugin.extract(`css!${AUTOPREFIXER}!less`)},
    ],
  },

  // Module resolving: http://webpack.github.io/docs/configuration.html#resolve
  resolve: {
    // Abs. path with modules
    root: FRONTEND_DIR,

    // Additional folders
    modulesDirectories: ["web_modules", "node_modules"],

    // ???
    alias: reduce((memo, dep) => {
      let depPath = Path.resolve(NODE_MODULES_DIR, dep);
      return assoc(dep.split(Path.sep)[0], depPath, memo);
    }, {}, MINIFIED_DEPS),
  },

  // Loader resolving: http://webpack.github.io/docs/configuration.html#resolveloader
  resolveLoader: {
    // Abs. path with loaders
    root: NODE_MODULES_DIR,
  },

  // http://webpack.github.io/docs/list-of-plugins.html
  plugins: [
    new Webpack.NoErrorsPlugin(),
    new Webpack.IgnorePlugin(/^vertx$/),
    new Webpack.DefinePlugin(DEFINE),
    new Webpack.optimize.DedupePlugin(),
		new Webpack.optimize.UglifyJsPlugin({
			compress: {
				warnings: false,
			},
		}),
    new Webpack.optimize.CommonsChunkPlugin("vendors", "vendors.js?[chunkhash]"),
    new Webpack.optimize.UglifyJsPlugin({mangle: {except: ["$", "window", "document", "console"]}}),
    new ExtractTextPlugin("[name].css?[contenthash]"),
    new GlobalizePlugin({
			production: true,
			developmentLocale: "en",
			supportedLocales: ["en", "ru"],
			messages: "messages/[locale].json",
			output: "i18n/[locale].[hash].js"
		}),
    function () {
      this.plugin("done", function (stats) {
        let jsonStats = stats.toJson({
          chunkModules: true,
        });
        jsonStats.publicPath = "/public/";
        Fs.writeFileSync(
          Path.join(PUBLIC_DIR, "assets.json"),
          JSON.stringify(jsonStats.assetsByChunkName)
        );
      });
    },
  ],
};
