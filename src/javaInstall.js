const JavaList = require('./javaVersions.json');
const fs = require('fs');
const request = require('request');
const Zip = require('adm-zip')
const unzipper = require('unzipper');
const progress = require('request-progress');

console.log(JavaList);
var isWin = process.platform === "win32";

var install = function (data, callback) {
	var url = "";
	if (!isWin) return;
	var zipSave = "";

	if (data.ver == "java8") {
		if (isWin) {
			url = JavaList["java8"]["windows"];
			zipSave = "j8win.zip";
		} else {
			url = JavaList["java8"]["linux"];
			zipSave = "j8linux.tar.gz";
		}
	} else if (data.ver == "java17") {
		if (isWin) {
			url = JavaList["java17"]["windows"];
			zipSave = "j17win.zip";
		} else {
			url = JavaList["java17"]["linux"];
			zipSave = "j17linux.tar.gz";
		}
	} else if (data.ver == "java17lite") {
		if (isWin) {
			url = JavaList["java17lite"]["windows"];
			zipSave = "j17litewin.zip";
		} else {
			url = JavaList["java17lite"]["linux"];
			zipSave = "j17litelinux.tar.gz";
		}
	}

	progress(request(url), {})
	.on("progress", function (state) {
		console.log('progress', state);
		callback({
			error: false,
			error: "",
			state: state,
			total: module.exports.byte(state.size.total),
			transferred: module.exports.byte(state.size.transferred),
			percent: state.percent
		});
	})
	.on('error', function (err) {
		callback({
			error: true,
			error: err,
			state: "failure"
		});
	})
	.on('end', function () {
		callback({
			error: false,
			error: "",
			state: "downloadComplete"
		});
		try {
			new Zip(require('path').join(data.path + zipSave)).extractAllTo(data.path + zipSave + "_extract", true);
			getDirectories(data.path + zipSave + "_extract", function (rdata) {
	  			callback({
				  	error: false,
				   	error: "",
				   	state: "extracted",
				   	path: data.path + zipSave + "_extract/" + rdata[0],
				});
	  		});
		} catch (e) {
			console.log(e);
			process.exit(1);
		}
	})
	.pipe(fs.createWriteStream(data.path + zipSave));
}

const { readdir } = require('fs');
const getDirectories = (source, callback) => {
	readdir(source, { withFileTypes: true }, (err, files) => {
		if (err) {
			callback(err)
		} else {
			callback(
				files
				.filter(dirent => dirent.isDirectory())
				.map(dirent => dirent.name)
			)
		}
	});
}

var byte = function (bytes) {
	var marker = 1024;
	var decimal = 3;
	var kiloBytes = marker;
	var megaBytes = marker * marker;
	var gigaBytes = marker * marker * marker;
	var teraBytes = marker * marker * marker * marker;


	if(bytes < kiloBytes) return bytes + " B"
	else if (bytes < megaBytes) return (bytes / kiloBytes).toFixed(decimal) + " KB"
	else if (bytes < gigaBytes) return (bytes / megaBytes).toFixed(decimal) + " MB"
	else return (bytes / gigaBytes).toFixed(decimal) + " GB";
}

module.exports = {
	install: install,
	byte: byte
}