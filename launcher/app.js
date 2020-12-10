var electron = require('electron')
var RPC = require('electron-rpc/server')
var app = electron.app
var BrowserWindow = electron.BrowserWindow;
var path = require('path')
var url = require('url')
var fs = require("fs");
const { init, showReportDialog, configureScope } = require('@sentry/electron');
const Forever = require('forever-monitor')
const Store = require('electron-store')

/* Module should return true if this application should be single instance only */
const lock = app.requestSingleInstanceLock();
if (!lock) {
	electron.dialog.showErrorBox('Multiple instances', 'Another instance is already running. Please close the other instance first.');
	app.quit();
	return;
}

const buildNumber = fs.readFileSync(__dirname + "/../BUILD").toString().trim();

const pkgInfo = require('./package.json');

const store = new Store({
	name: 'launcherConfig',
	defaults: {
		startMinimised: false,
	}
});

init({
	dsn: 'https://535745b2e446442ab024d1c93a349154@sentry.bitfocus.io/8',
	release: 'companion@' + buildNumber,
	beforeSend(event) {
    if (event.exception) {
      showReportDialog();
    }
    return event;
  }
});

var window;
var tray = null;

var skeleton_info = {
	appName: '',
	appBuild: '',
	appVersion: '',
	appURL: '',
	appStatus: '',
	startMinimised: store.get('startMinimised'),
};

let child
function restartChild() {
	if (child) {
		child.stop()
	}

	child = new (Forever.Monitor)(['node', '../app.js'], {
		fork: true,
		// killTree: false,
		// watch: false,
		// silent: true,
		env: {
			COMPANION_CONFIG_BASEDIR: app.getPath('appData'),
			START_NOW: 1,
		},
	})
	
	child.on('exit', () => {
		console.log('child exited')
	})
	child.on('message', (a, b, c) => {
		console.log('message', a, b, c)
	})
	child.start();
	child.send('hi')
}

// TODO - find child if a pid file exists
if (!child) {
	restartChild()
}

function createWindow() {
	window = new BrowserWindow({
		show: false,
		width: 400,
		height: 470,
		minHeight: 600,
		minWidth: 440,
		maxHeight: 380,
		frame: false,
		resizable: false,
		icon: path.join(__dirname, 'assets/icon.png'),
		webPreferences: {
			pageVisibility: true,
			nodeIntegration: true
		}
	});

	window.loadURL(url.format({
		pathname: path.join(__dirname, 'window.html'),
		protocol: 'file:',
		slashes: true
	}));

	window.webContents.setBackgroundThrottling(false)

	var rpc = new RPC();
	rpc.configure(window.webContents);

	rpc.on('info', function(req, cb) {
		cb(null, skeleton_info);
	});

	rpc.on('log', function(req, cb) {
		cb(null, "Started");
	});

	// rpc.on('launcher-close', function(req, cb) {
	// 	system.emit('exit');
	// });

	rpc.on('launcher-minimize', function(req, cb) {
		window.hide();
	});

	// rpc.on('skeleton-bind-ip', function(req, cb) {
	// 	console.log("changed bind ip:",req.body)
	// 	system.emit('skeleton-bind-ip', req.body);
	// });

	// rpc.on('skeleton-bind-port', function(req, cb) {
	// 	console.log("changed bind port:",req.body)
	// 	system.emit('skeleton-bind-port', req.body);
	// });

	rpc.on('launcher-start-minimised', function(req, cb) {
		console.log("changed start minimized:", req.body)
		store.set('startMinimised', req.body)
	});

	// rpc.on('skeleton-ready', function(req, cb) {
	// 	system.emit('skeleton-ready');
	// });

	// system.on('skeleton-info', function(key,val) {
	// 	if (key !== 'startMinimised') {
	// 		skeleton_info[key] = val;
	// 		rpc.send('info', skeleton_info);
	// 	}
	// });

	// system.on('restart', function() {
	// 	app.relaunch()
	// 	app.exit()
	// });

	// system.on('skeleton-log', function(line) {
	// 	rpc.send('log', line);
	// });

	window.on('closed', function () {
		window = null
	});

	window.on('ready-to-show', function () {
		if (!skeleton_info.startMinimised) {
			showWindow();
		}
	});

	try {
		var pkg = pkgInfo;
		// system.emit('skeleton-info', 'appStatus', 'Starting');
		
		configureScope(function(scope) {
			var machidFile = app.getPath('appData') + '/companion/machid'
			var machid = fs.readFileSync(machidFile).toString().trim()
			scope.setUser({"id": machid});
			scope.setExtra("build", buildNumber);
		});
		

	} catch (e) {
		console.log("Error reading BUILD and/or package info: ", e);
	}
}

function createTray() {
	tray = new electron.Tray(
		process.platform == "darwin" ?
		path.join(__dirname, 'assets', 'trayTemplate.png') :
		path.join(__dirname, 'assets', 'icon.png')
	);
	tray.on('right-click', toggleWindow);
	tray.on('double-click', toggleWindow);
	tray.on('click', toggleWindow);
}

function toggleWindow() {
	if (window.isVisible()) {
		window.hide()
	} else {
		showWindow()
	}
}

function showWindow() {
	window.show()
	window.focus()
}

app.whenReady().then(function () {
	createTray();
	createWindow();

	// electron.powerMonitor.on('suspend', () => {
	// 	system.emit('skeleton-power', 'suspend');
	// });

	// electron.powerMonitor.on('resume', () => {
	// 	system.emit('skeleton-power', 'resume');
	// });

	// electron.powerMonitor.on('on-ac', () => {
	// 	system.emit('skeleton-power', 'ac');
	// });

	// electron.powerMonitor.on('on-battery', () => {
	// 	system.emit('skeleton-power', 'battery');
	// });

});

app.on('window-all-closed', function () {
	app.quit()
});

app.on('activate', function () {
	if (window === null) {
		createWindow();
	}
})
