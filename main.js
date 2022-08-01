const { app, BrowserWindow, Menu, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const axios = require('axios');
const ufs = require("url-file-size");
const wallpaper = require("wallpaper");
https.globalAgent.options.rejectUnauthorized = false;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    minWidth: 900,
    minHeight: 500,
    icon: "./src/icons/favicon.ico",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false
  });
  Menu.setApplicationMenu(null);
  mainWindow.loadFile('src/loading.html');
  //mainWindow.webContents.openDevTools();
  //tetststst
}

app.whenReady().then(() => {
  ipcMain.handle('load-mainpage', async () => {
    const json = await axios.get('https://api.discoverse.space/mainpage/get-mainpage');
    return JSON.stringify(json.data);
  });

  ipcMain.handle('get-cwd', () => {
    return process.cwd().replaceAll("\\", "/");
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

async function downloadImage(url, name) {
  const writer = fs.createWriteStream(path.join(process.cwd(), "cache/", name));

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}


ipcMain.on('init', async () => {
  if (!fs.existsSync(path.join(process.cwd(), "cache")))
    fs.mkdirSync(path.join(process.cwd(), "cache"));
  let mainpageData = await axios.get('https://api.discoverse.space/mainpage/get-mainpage');
  mainpageData = mainpageData.data;
  if (mainpageData.code != "0") {
    let filename = path.join(process.cwd(), "cache", mainpageData.data.id + ".png");
    if (!fs.existsSync(filename)) {
      downloadImage(mainpageData.data.url, mainpageData.data.id + ".png")
        .then(() => {
          mainWindow.loadFile('src/index.html');
        });
    }
    else {
      if (await ufs(mainpageData.data.url) == fs.statSync(filename).size) {
        mainWindow.loadFile('src/index.html');
      }
      else {
        downloadImage(mainpageData.data.url, mainpageData.data.id + ".png")
          .then(() => {
            mainWindow.loadFile('src/index.html');
          });
      }
    }
  }
  else {
    new Notification({ title: "Something is Wrong:(", body: mainpageData.msg + "因此退出了程序。将此问题反馈给我们也许会得到解决。" }).show();
    app.quit();
  }
});


ipcMain.on('set-wallpaper', async (event, id) => {
  await wallpaper.set(path.join(process.cwd(), "cache/", id + ".png"));
});

ipcMain.on('window-events', async (event, type) => {
  if (type === 1)
    mainWindow.minimize();
  else if (type === 2) {
    if (mainWindow.isMaximized())
      mainWindow.unmaximize();
    else
      mainWindow.maximize();
  }
  else if (type === 3)
    app.quit();
});

// Part of Share
let shareId;
ipcMain.on('share', async (event, id) => {
  shareId = id;
  mainWindow.loadFile("src/share.html");
});

ipcMain.on('save-share', async (event, data) => {
  let dataBuffer = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  fs.writeFileSync(dialog.showSaveDialogSync({
    filters: [{
      name: 'img',
      extensions: ['jpeg']
    }]
  }), dataBuffer);
});

ipcMain.on('back-to-mainpage', async (event) => {
  mainWindow.loadFile("src/index.html");
});




