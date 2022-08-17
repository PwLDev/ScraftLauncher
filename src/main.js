// (function() {
//     var childProcess = require("child_process");
//     var oldSpawn = childProcess.spawn;
//     function mySpawn() {
//         //console.log('spawn called');
//         //console.log(arguments);
//         var result = oldSpawn.apply(this, arguments);
//         return result;
//     }
//     childProcess.spawn = mySpawn;
// })();

const { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog } = require("electron");
const path = require("path");
const https = require("https");
const msmc = require("msmc");
const fetch = require("node-fetch")
const { Authenticator, Client } = require("minecraft-launcher-core");
const javaInstall = require("./javaInstall");
const dataStore = require("data-store");
const DiscordRPC = require('discord-rpc');
const fs = require('fs');
const request = require("request");
let launcher = new Client();


const installs = new dataStore({ path: app.getPath("userData") + "/installs.json", });
const javaIns = new dataStore({ path: app.getPath("userData") + "/jre.json", });
const core = new dataStore({ path: app.getPath("userData") + "/core.json", });

//XMCL PACKAGES
const { install, MinecraftVersionList, getVersionList, MinecraftVersion, installVersionTask } = require("@xmcl/installer");
const { Version, launch } = require("@xmcl/core");
const { login, Authentication, offline, setTexture, lookup } = require("@xmcl/user");
//const { PlayerModel } = require("@xmcl/model");

var MsLaunch = "";
var PublicWin;
var minecraftDirPath = path.join(app.getPath("userData"), `/`, "minecraft")

if (core.get("mcDir") !== undefined) minecraftDirPath = core.get("mcDir");
if (core.get("mcDir") == ".minecraft") minecraftDirPath = path.join(app.getPath("userData"), `/../`, ".minecraft");
if (core.get("mcDir") == "default") minecraftDirPath = path.join(app.getPath("userData"), `/`, "minecraft")


console.log(minecraftDirPath);
const htmlLoad = "launcher.html";
//END

const createWindow = () => {
  	const win = new BrowserWindow({
    	width: 950,
    	height: 600,
    	webPreferences: {
      		contextIsolation: false,
      		nodeIntegration: true,
      		webviewTag: true,
    	},
    	icon: path.join(__dirname, "assets/icon.ico"),
	});

	var isDev = process.env.APP_DEV ? process.env.APP_DEV.trim() == "true" : false;
  	if (!isDev) Menu.setApplicationMenu(null);

	PublicWin = win;
	win.loadFile("src/views/launcher.html");
};

ipcMain.on("restartApp", (event, data) => {
	if (!data) data = 1000;

	setTimeout(function () {
		app.quit();
		app.relaunch();
	}, data);
});

ipcMain.on("saveInstallation", (event, data) => {
  	installs.set("idTimestamp" + Date.now(), data);
  	event.reply("success", "yes");
});

ipcMain.on("open_dev_tools", (event) => {
  	PublicWin.webContents.openDevTools();
});

ipcMain.on("getJavaInstalls", (event) => {
  	event.reply('javaVersionGet',{
    	installs: javaIns.data,
    	isWin: process.platform === "win32"
  	});
});

ipcMain.on("exit", (event) => {
  	PublicWin.close();
});

ipcMain.on("core", (event, data) => {
	core.set("core", data);
});

ipcMain.on("purgeData", (event, data) => {
	installs.clear();
	javaIns.clear();
	require("fs").rmSync(path.join(app.getPath("userData"), `/`, "minecraft"), { recursive: true });
	event.reply("success", data);
	setTimeout(function () {
		app.exit();
		app.relaunch();
	}, 3000)
});

ipcMain.on("installJava", (event, vdata) => {
  	var minecraft = path.join(app.getPath("userData"), `/`, "minecraft")
  	if (core.get('mcDir') !== undefined) minecraft = core.get('mcDir');
  	if (core.get('mcDir') == ".minecraft") minecraft = path.join(app.getPath("userData"), `/../`, ".minecraft");
	if (core.get('mcDir') == "default") minecraft = path.join(app.getPath("userData"), `/`, "minecraft")
	if (require('fs').existsSync(path.join(minecraft, "javaVersions"))) {
		console.log("Everything is OK!");
	} else {
		console.log('This is not OK!');
		require('fs').mkdirSync(path.join(minecraft, "javaVersions"), { recursive: true });
	}

	javaInstall.install({
		ver: vdata,
		path: path.join(minecraft, "javaVersions", "/")
	}, function (data) {
		console.log(data);
		if (data.state == "downloadComplete") {
			event.reply('javaStatus', {
				complete: "download",
				isextract: "no",
				total: 0,
				transferred: 0,
			});
		} else if (data.state == "extracted") {
			event.reply('javaStatus',{
				complete: "extract",
				isextract: "yes",
				total: 0,
				transferred: 0,
			});
			javaIns.set(`Java: ${vdata}`, data.path);
		} else {
			event.reply('javaStatus',{
				complete: "fetch",
				isextract: "no",
				total: data.total,
				transferred: data.transferred,
			});
		}
	});
})

ipcMain.on('setMcLocation', (event, data) => {
	core.set("mcDir" ,data);
	if (core.get("mcDir") !== undefined) minecraftDirPath = core.get("mcDir");
	else if (core.get("mcDir") == ".minecraft") minecraftDirPath = path.join(app.getPath("userData"), `/../`, ".minecraft")
	else if (core.get("mcDir") == "default") path.join(app.getPath("userData"), `/`, "minecraft")
});

ipcMain.on('getMCLocation', (event, data) => {
  	event.reply("mcLocation", core.get("mcDir"));
});

ipcMain.on("getLocation", (event, data) => {
  	event.reply("location", path.join(__dirname, "/html/render_views/"));
});

ipcMain.on("getInstallations", (event) => {
	let data = installs.data;
	event.reply("installations", data);
	console.log(data);
});

ipcMain.on("deleteInstallation", (event, id) => {
  	installs.del(id);
  	event.reply("success", "yes");
});

ipcMain.on("getAllMcVersions", (event, data) => {
	const manifest = `https://launchermeta.mojang.com/mc/game/version_manifest.json`
	request.get(manifest, (error, response, body) => {
		if (error) resolve(error)
		let vArray = []
	
		const parsed = JSON.parse(body)
		let allIds = parsed.versions.map(({ id }) => id);
		let allTypes = parsed.versions.map(({ type }) => type);

		parsed.versions.forEach(v => {
			if (v.type == data) {
				vArray.push(v.id);
			}
		})
		// const final = objArray.forEach(v => {
		// 	v = `"${v}"`
		// 	vArray.push(v);
		// });
			
		event.reply("mcVersions", vArray)
		console.log(vArray)
	});
});

ipcMain.on("launchMcXmcl", async (event, data) => {
	const insData = installs.get(data.id);
	console.log(path.join(minecraftDirPath, "versions", insData.version,`${insData.version}.json`))
	const versionDir = path.join(minecraftDirPath, "versions", insData.version, `${insData.version}.json`);
	if (!fs.existsSync(versionDir)) installMcXmcl(event, data);
  	else launchMcXmcl(event, data);
});

ipcMain.on("setSkinXmcl", (event, data) => {
	let dir;
	dialog.showOpenDialog(PublicWin, {
		properties: ["openFile"],
		filters: [
			{ name: "*", extensions: ["png"] }
		]
	}).then(result => {
		setSkinXmcl(event, result.filePaths[0])
		console.log(result.filePaths[0])
	}).catch(err => {
		return console.error(err);
	})
});

// ipcMain.on("launchMCXMCL", (event, data) => {
// 	var gamePath = app.getPath("userData") + `/` + "minecraft";
// 	if (core.get("mcDir") !== undefined) gamePath = core.get('mcDir');
// 	if (core.get("mcDir") == ".minecraft") gamePath = app.getPath("userData") + `/../` + ".minecraft";
// 	if (core.get("mcDir") == "default") gamePath = app.getPath("userData") + `/` + "minecraft";
	
// 	const javaPath = "C:\\java-runtime-beta\\bin\\java.exe";
// 	const version = data.version;
// 	console.log(javaPath);
// 	console.log(version);
// 	console.log(gamePath);
// 	const proc = launch({ gamePath, javaPath , version });
// 	console.log(proc);
// });

// ipcMain.on("msLogin", (event) => {
//   msmc
//     .fastLaunch("raw", (update) => {
//       	console.log("CallBack");
//       	console.log(update);
//     })
//     .then((result) => {
//       	MsLaunch = msmc.getMCLC().getAuth(result);
//     })
//     .catch((reason) => {
//       	launcher.on("close", (e) =>
//         	unHide(
//           		"Unable to Login Into Microsoft Account <br> Reason: " + reason,
//           	event
//         ));
//       	console.log("Failed to login because: " + reason);
//     });
// });

// ipcMain.on("launchMinecraftId", (event, data) => {
// 	var install = installs.get(data.id);
// 	var opt = {
// 		username: data.username,
// 		javaPath: install.javapath,
// 		version: install.version,
// 		type: install.type,
// 		maxram: install.maxram,
// 		minram: install.minram,
// 		id: installs.get(data.id),
// 		// custom: install.cversion,
// 	};

// 	if (typeof data.isMsft !== "undefined") {
// 		if (data.isMsft == true) LaunchMs(opt, event);
// 		else Launch(opt, event);
// 	} else Launch(opt, event);
// });

async function installMcXmcl(event, data) {
	let versionMetaList;
	const insData = installs.get(data.id);
	console.log(insData);

	versionMetaList = await getVersionList({ original: versionMetaList });
	
	let versionMeta;

	const list = (await getVersionList()).versions;
	//const mappedList = list.map(v => v.id);
	list.forEach(v => {
		if (v.id == insData.version) {
			versionMeta = {
				id: v.id,
				type: v.type,
				time: v.time,
				releaseTime: v.releaseTime, 
				url: v.url,
			}
		}
	});

	event.reply("installMcTask", {
		installed: false,
		progress: 0,
		total: 0,
		isStarted: true,
		failed: false,
		failedReason: ""
	});


	const installAllTask = installVersionTask(versionMeta, path.join(app.getPath("userData"), `/`, "minecraft"));
	await installAllTask.startAndWait({
		onStart(task) {
			event.reply("installMcTask", {
				installed: false,
				progress: task.progress,
				total: task.total,
				isStarted: false,
				failed: false,
				failedReason: ""
			});
		},
		onUpdate(task, chunkSize) {
			event.reply("installMcTask", {
				installed: false,
				progress: task.progress,
				total: task.total,
				isStarted: false,
				failed: false,
				failedReason: ""
			});
		},
		onFailed(task, error) {
			event.reply("installMcTask", {
				installed: true,
				progress: task.progress,
				total: task.total,
				isStarted: false,
				failed: true,
				failedReason: error,
			});
		},
		onSucceed(task, result) {
			event.reply("installMcTask", {
				installed: true,
				progress: task.progress,
				total: task.total,
				isStarted: false,
				failed: false,
				failedReason: ""
			});
		},
		onPaused(task) {
		},
		onResumed(task) {
		},
		onCancelled(task) {
		},
	});
}


// Game Launch

async function launchMcXmcl(event, data) {
	let auth = offline(`${data.username}`);
	let insData = installs.get(data.id);
	let gamePath = minecraftDirPath;
	let javaPath = insData.javapath;
	console.log("Minecraft Launch Called!"+` As version ${insData.version}`);

	const process = await launch({
        accessToken: auth.accessToken,
        gamePath,
        javaPath,
        version: insData.version,
        gameProfile: auth.selectedProfile,
		maxMemory: parseInt(insData.maxram.replace("M", "")),
		minMemory: parseInt(insData.minram.replace("M", ""))
    })

    process.stdout.on('data', (b) => {
		event.reply("logger", b.toString())
    });
    process.stderr.on('data', (b) => {
		event.reply("logger", b.toString())
    });
}

async function setSkinXmcl(event, data) {
	let auth = offline(`${data.username}`);
	console.log(data)
	await setTexture({
		accessToken: auth.accessToken,
		//uuid: auth.selectedProfile.id,
		type: "skin",
		texture: {
			url: data,
			metadata: {
				model: "slim"
			}
		}
	}).then(function () {
		event.reply("success", "yes");
	}).catch(function (err) {
		event.reply("failed", {
			failedReason: err,
		});
	});

	const userUUID = auth.selectedProfile.id;
    const gameProfile = await lookup(userUUID);
    const infos = getTextures(gameProfile);
    const skin = infos.textures.SKIN;
    const skinUrl = skin.url; // use url to display skin
    const isSlim = GameProfile.Texture.isSlim(skin); // determine if model is slim or not
}

// function Launch(data, event) {
//   	console.log("Launch Minecraft Called");
//   	console.log(data);
//   	let opts;
//   	if (typeof data.custom == "undefined") {
// 		console.log("Launching Normally");
// 		opts = {
// 			clientPackage: null,
// 			authorization: Authenticator.getAuth(data.username),
// 			root: minecraftDirPath,
// 			javaPath: data.javaPath,
// 			version: {
// 				number: data.version,
// 				type: data.type, //default : release
// 			},
// 			memory: {
// 				max: data.maxram,
// 				min: data.minram,
// 			},
//     	};
//   	} else {
// 		console.log("Launching Advanced");
// 		opts = {
// 			clientPackage: null,
// 			authorization: Authenticator.getAuth(data.username),
// 			root: minecraftDirPath,
// 			javaPath: data.javaPath,
// 			version: {
// 				number: data.version,
// 				type: data.type, //default : release,
// 				custom: data.custom,
// 			},
// 			memory: {
// 				max: data.maxRam,
// 				min: data.minRam,
// 			},
// 		};
// 	}

// 	launcher.launch(opts);

// 	launcher.on("debug", (e) => event.reply("logger", e));
// 	launcher.on("data", (e) => hide_win_ulog(e, event));
// 	launcher.on("download-status", (e) => event.reply("download-status", e));
// 	launcher.on("progress", (e) => event.reply("progress", e));
// 	launcher.on("close", (e) => event.reply("close", e));
// }

// function LaunchMs(data, event) {
//   	console.log("Authenticating With Microsoft...");
//   	let opts;
//   	if (typeof data.custom == "undefined") {
// 		console.log("Normal Launching...");
// 		opts = {
// 			clientPackage: null,
// 			authorization: MsLaunch,
// 			root: minecraftDirPath,
// 			javaPath: data.javaPath,
// 			version: {
// 				number: data.version,
// 				type: data.type, //default : release
// 			},
// 			memory: {
// 				max: data.max_ram,
// 				min: data.min_ram,
// 			},
// 		};
// 	} else {
// 		console.log("Launching Advanced");
// 		opts = {
// 			clientPackage: null,
// 			authorization: MsLaunch,
// 			root: minecraftDirPath,
// 			javaPath: data.javaPath,
// 			version: {
// 				number: data.version,
// 				type: data.type, //default : release,
// 				custom: data.custom,
// 			},
// 			memory: {
// 				max: data.max_ram,
// 				min: data.min_ram,
// 			},
// 		};
// 	}

// 	console.log("Launching Now...");
// 	launcher.launch(opts);

// 	launcher.on("debug", (e) => event.reply("logger", e));
// 	launcher.on("data", (e) => hideWinLog(e, event));
// 	launcher.on("data", (e) => event.reply("logger", e));
// 	launcher.on("download-status", (e) => event.reply("download-status", e));
// 	launcher.on("progress", (e) => event.reply("progress", e));
// 	launcher.on("close", (e) => unHide(e, event));
// }

//Discord
// const clientId = "999461421664452628";
// DiscordRPC.register(clientId);

// const rpc = new DiscordRPC.Client({ transport: "ipc" });
// const startTimestamp = new Date();



function hideWinLog(log, event) {
	event.reply("logger", log);
	if (log.includes("OpenAL initialized")) {
	  	PublicWin.hide();
	} else if (log.includes("Setting User")) {
	  	PublicWin.hide();
	}
}

function unHide(log, event) {
	event.reply("close", log);
}

app.whenReady().then(() => {
  	createWindow();
});