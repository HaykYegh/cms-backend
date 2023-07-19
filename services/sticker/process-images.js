const forEach = require('lodash/forEach');
const zipFolder = require('zip-folder');
const rimraf = require('rimraf');
const fs = require('fs-extra');
const Jimp = require('jimp');
const path = require('path');
const gm = require('gm');


const rootPath = process.env.PWD;

const processAndroidPromise = (file, dirs, packageName, toOther = true) =>
  new Promise((resolve, reject) => {
    let newPath;
    if (toOther && !fs.existsSync(`${packageName}/xxxhdpi/other`)) {
      fs.mkdirSync(`${packageName}/xxxhdpi/other`);
    }

    if (file.name.includes('banner')) {
      newPath = path.join(rootPath, `${packageName}/baners/xxxhdpi/`, file.name);
    } else if ((file.name.includes('icon') || file.name.includes('avatar')) && toOther) {
      newPath = path.join(rootPath, `${packageName}/xxxhdpi/other/`, file.name);
    } else {
      newPath = path.join(rootPath, `${packageName}/xxxhdpi/`, file.name);
    }

    const data = file.value.Body;

    fs.writeFile(newPath, data, (err) => {
      if (err) {
        console.log('write error');
        console.log(err);
        return reject(err);
      }

      if (newPath.includes('preview')) {
        Jimp.read(newPath, (err, image) => {
          console.log('JIMP IMAGE');
          console.log(err);
          console.log(image);

          if (err) {
            return reject(err);
          }

          image.background(0xFFFFFFFF).write(newPath.replace('.png', '.jpg'), () => {
            fs.unlink(newPath, (err) => {
              if (err) {
                console.log('deleting preview.png error');
                console.log(err);
              }
            });
          });
        });
      }
    });

    gm(data)
      .size((err, size) => {
        if (err) {
          console.log('gm error');
          console.log(err);
          return reject(err);
        }

        forEach(dirs, (dir, index) => {
          if (dir.name !== 'xxxhdpi') {
            if (toOther && !fs.existsSync(`${packageName}/${dir.name}/other`)) {
              fs.mkdirSync(`${packageName}/${dir.name}/other`);
            }

            let dest;

            if (file.name.includes('banner')) {
              dest = path.join(rootPath, `${packageName}/baners/${dir.name}/`, file.name);
            } else if ((file.name.includes('icon') || file.name.includes('avatar')) && toOther) {
              dest = path.join(rootPath, `${packageName}/${dir.name}/other/`, file.name);
            } else {
              dest = path.join(rootPath, `${packageName}/${dir.name}/`, file.name);
            }

            const newWidth = Math.round((size.width * dir.size) / 640);
            const newHeight = Math.round((size.height * dir.size) / 640);

            if (dest.includes('preview')) {
              Jimp.read(data, (err, image) => {
                if (err) {
                  return reject(err);
                }
                image.background(0xFFFFFFFF).resize(newWidth, newHeight).write(dest.replace('.png', '.jpg'), () => {
                  if (index === (dirs.length - 2)) {
                    resolve();
                  }
                });
              });
            } else {
              gm(data).resize(newWidth, newHeight).quality(80).noProfile()
                .colors(132)
                .write(dest, (err) => {
                  if (err) {
                    console.log('resize and save error');
                    console.log(err);
                    return reject(err);
                  }
                  if (index === (dirs.length - 2)) {
                    resolve();
                  }
                });
            }
          }
        });
      });
  });

const resizeAndCreatePromiseForIOS = (file, dirs, packageName, pName) =>
  new Promise((resolve, reject) => {
    const data = file.value.Body;


    gm(data)
      .size((err, size) => {
        if (err) {
          console.log('gm error');
          console.log(err);
          return reject(err);
        }

        if (file.name.includes('preview')) {
          const destinations = [
            {
              path: path.join(rootPath, `${packageName}/x1/bucket_whole.png`),
              height: Math.round(0.185 * size.height),
              width: Math.round(0.185 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/x1/bucket_whole_ipad.png`),
              height: Math.round(0.363 * size.height),
              width: Math.round(0.363 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/x2/bucket_whole@2x.png`),
              height: Math.round(0.37 * size.height),
              width: Math.round(0.37 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/x2/bucket_whole_ipad@2x.png`),
              height: Math.round(0.726 * size.height),
              width: Math.round(0.726 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/x3/bucket_whole@3x.png`),
              height: Math.round(0.43 * size.height),
              width: Math.round(0.43 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/x3/bucket_whole_iphone6+@3x.png`),
              height: Math.round(0.625 * size.height),
              width: Math.round(0.625 * size.width)
            }
          ];

          forEach(destinations, (destination, index) => {
            gm(data)
              .resize(destination.width, destination.height)
              .quality(80)
            // .noProfile()
            // .colors(132)
              .write(destination.path, (err) => {
                if (err) {
                  console.log('resize and save error');
                  console.log(err);
                }
                if (index === (destinations.length - 1)) {
                  return resolve();
                }
              });
          });
        } else if (file.name.includes('banner')) {
          const dests = [
            {
              path: path.join(rootPath, `${packageName}/banner/ipad/bucket_banner.png`),
              height: Math.round(0.375 * size.height),
              width: Math.round(0.375 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/banner/ipad/bucket_banner@2x.png`),
              height: Math.round(0.75 * size.height),
              width: Math.round(0.75 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/banner/iphone/320/bucket_banner@2x.png`),
              height: Math.round(0.444 * size.height),
              width: Math.round(0.444 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/banner/iphone/375/bucket_banner@2x.png`),
              height: Math.round(0.52 * size.height),
              width: Math.round(0.52 * size.width)
            },
            {
              path: path.join(rootPath, `${packageName}/banner/iphone/414/bucket_banner@3x.png`),
              height: Math.round(0.862 * size.height),
              width: Math.round(0.862 * size.width)
            }
          ];

          forEach(dests, (dest, index) => {
            gm(data).resize(dest.width, dest.height).noProfile().quality(80)
              .colors(132)
              .write(dest.path, (err) => {
                if (err) {
                  console.log('resize and save error');
                  console.log(err);
                  return reject('1 - resize and save error');
                }

                if (index === (dests.length - 1)) {
                  return resolve();
                }
              });
          });
        } else {
          forEach(dirs, (dir, index) => {
            let dest;

            if (dir.name !== 'x1') {
              const nameParts = file.name.split('.');
              dest = path.join(rootPath, `${packageName}/${dir.name}/${pName ? `${pName}/` : ''}`, `${nameParts[0]}@${dir.name.split('').reverse().join('')}.${nameParts[1]}`);
            } else {
              dest = path.join(rootPath, `${packageName}/${dir.name}/${pName ? `${pName}/` : ''}`, file.name);
            }

            if (dest.indexOf('avatar') !== -1) {
              dest = dest.replace('avatar', 'bucket_icon');
            }

            if (dest.indexOf('/icon') !== -1) {
              dest = dest.replace('icon', 'avatar_small');
            }

            let newHeight = Math.round(size.height * dir.size);
            let newWidth = Math.round(size.width * dir.size);

            if (dest.indexOf('/avatar_small') !== -1 && dir.name === 'x1') {
              newHeight = Math.round(0.375 * size.height);
              newWidth = Math.round(0.375 * size.width);
            }

            gm(data).resize(newWidth, newHeight).noProfile().quality(80)
              .colors(132)
              .write(dest, (err) => {
                if (err) {
                  console.log('resize and save error');
                  console.log(err);
                  return reject('2 - resize and save error');
                }

                if (index === (dirs.length - 1)) {
                  return resolve();
                }
              });
          });
        }
      });
  });

const uploadAndroid = (configuration, packageNumber, files) => {
  const dirs = [
    { name: 'hdpi', size: 160 },
    { name: 'mdpi', size: 240 },
    { name: 'xhdpi', size: 320 },
    { name: 'xxhdpi', size: 480 },
    { name: 'xxxhdpi', size: 640 }
  ];


  const packageName = `./uploads/${packageNumber}`;

  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }

  if (!fs.existsSync(packageName)) {
    fs.mkdirSync(packageName);
  }

  if (!fs.existsSync(`${packageName}/baners`)) {
    fs.mkdirSync(`${packageName}/baners`);
  }

  forEach(dirs, (dir) => {
    if (!fs.existsSync(`${packageName}/baners/${dir.name}`)) {
      fs.mkdirSync(`${packageName}/baners/${dir.name}`);
    }

    if (!fs.existsSync(`${packageName}/${dir.name}`)) {
      fs.mkdirSync(`${packageName}/${dir.name}`);
    }

    if (!fs.existsSync(`${packageName}/${dir.name}/boxes`)) {
      fs.mkdirSync(`${packageName}/${dir.name}/boxes`);
    }
  });

  const data = configuration.map((box, index) => ({
    [Object.keys(box)[0]]: box[Object.keys(box)[0]].map((sticker) => {
      sticker.startY = (sticker.startY - (4 * index)).toString();
      return sticker;
    })
  }));

  forEach(data, (txt, index) => {
    forEach(dirs, (dir) => {
      fs.writeFile(`${packageName}/${dir.name}/boxes/box${index + 1}.txt`, JSON.stringify(txt), (err) => {
        if (err) {
          console.log('creating box error');
          console.log(err);
        }
      });
    });
  });

  let promises = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const file in files) {
    if (Object.prototype.hasOwnProperty.call(files, file)) {
      if (!file.includes('preview') && !file.includes('unavailable_icon')) {
        promises.push(processAndroidPromise({ name: `${file}.png`, value: files[file] }, dirs, packageName));
      }
    }
  }


  return Promise.all(promises).then(() => {
    forEach(dirs, (dir) => {
      zipFolder(`${packageName}/${dir.name}/`, `./uploads/${dir.name}_${packageNumber}.zip`, (err) => {
        if (err) {
          console.log('creating zip error');
          console.log(err);
        } else {
          fs.rename(`./uploads/${dir.name}_${packageNumber}.zip`, `${packageName}/${dir.name}/${packageNumber}.zip`, () => {
            rimraf(`${packageName}/${dir.name}/boxes`, () => {
              rimraf(`${packageName}/${dir.name}/other`, () => packageName);
            });
          });
        }
      });
    });
  }).then(() => {
    promises = [];


    // eslint-disable-next-line no-restricted-syntax
    for (const file in files) {
      if (Object.prototype.hasOwnProperty.call(files, file)) {
        if ((file.includes('preview') || file.includes('avatar') || file.includes('icon')) && !file.includes('unavailable_icon')) {
          promises.push(processAndroidPromise({ name: `${file}.png`, value: files[file] }, dirs, packageName, false));
        }
      }
    }


    return promises;
  }).then(() => Promise.all(promises).then(() => {
    console.log('android finished');
    return packageNumber;
  }).catch((err) => {
    console.log(err);
  }));
};

const uploadIOS = (configuration, packageNumber, files) => {
  const dirs = [
    { name: 'x1', size: 0.25 },
    { name: 'x2', size: 0.5 },
    { name: 'x3', size: 0.75 }
  ];

  const shortPName = packageNumber;

  const pName = `${shortPName}_IOS`;

  const packageName = `./uploads/${pName}`;

  if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
  }

  if (!fs.existsSync(packageName)) {
    fs.mkdirSync(packageName);
  }


  if (!fs.existsSync(`${packageName}/banner`)) {
    fs.mkdirSync(`${packageName}/banner`);
  }

  if (!fs.existsSync(`${packageName}/banner/ipad`)) {
    fs.mkdirSync(`${packageName}/banner/ipad`);
  }

  if (!fs.existsSync(`${packageName}/banner/iphone`)) {
    fs.mkdirSync(`${packageName}/banner/iphone`);
  }

  if (!fs.existsSync(`${packageName}/banner/iphone/320`)) {
    fs.mkdirSync(`${packageName}/banner/iphone/320`);
  }

  if (!fs.existsSync(`${packageName}/banner/iphone/375`)) {
    fs.mkdirSync(`${packageName}/banner/iphone/375`);
  }

  if (!fs.existsSync(`${packageName}/banner/iphone/414`)) {
    fs.mkdirSync(`${packageName}/banner/iphone/414`);
  }

  forEach(dirs, (dir) => {
    if (!fs.existsSync(`${packageName}/${dir.name}`)) {
      fs.mkdirSync(`${packageName}/${dir.name}`);
    }
    if (!fs.existsSync(`${packageName}/${dir.name}/${shortPName}`)) {
      fs.mkdirSync(`${packageName}/${dir.name}/${shortPName}`);
    }
  });

  const iosTxtFiles = JSON.stringify(configuration)
    .replace(new RegExp('name', 'g'), 'sticker_id')
    .replace(new RegExp('startX', 'g'), 'ps_portrait')
    .replace(new RegExp('startY', 'g'), 'ps_landscape')
    .replace(new RegExp('xCount', 'g'), 'used_columns')
    .replace(new RegExp('yCount', 'g'), 'used_rows');

  const data = JSON.parse(iosTxtFiles);

  const settingsCFG = {
    bucket_id: packageNumber,
    bucket_name: packageNumber,
    percent: '75.6',
    cell_width: '75',
    cell_height: '40',
    margins: [
      {
        for5: '10',
        for6: '35',
        'for6+': '10',
        ipad: '10'
      }
    ],
    lineSpacingPortrait: [
      {
        for5: '0',
        for6: '10',
        'for6+': '0',
        ipad: '0'
      }
    ],
    lineSpacinglandscape: [
      {
        for5: '0',
        for6: '10',
        'for6+': '0',
        ipad: '0'
      }
    ],
    stickers: []
  };


  let stickers = [];

  forEach(data, (txt) => {
    stickers.push(...txt[Object.keys(txt)[0]]);
  });

  stickers.sort((st1, st2) => {
    if (parseInt(st2.ps_landscape, 10) < parseInt(st1.ps_landscape, 10)) {
      return 1;
    } else if (parseInt(st2.ps_landscape, 10) > parseInt(st1.ps_landscape, 10)) {
      return -1;
    } else if (parseInt(st2.ps_portrait, 10) < parseInt(st1.ps_portrait, 10)) {
      return 1;
    } else if (parseInt(st2.ps_portrait, 10) > parseInt(st1.ps_portrait, 10)) {
      return -1;
    }
    return 0;
  });

  stickers = stickers.map((sticker) => {
    sticker.sticker_id = sticker.sticker_id.split('_').pop().toString();
    return sticker;
  });

  settingsCFG.stickers = stickers.map((sticker, index) => {
    sticker.ps_portrait = (index + 1).toString();
    sticker.ps_landscape = (index + 1).toString();
    sticker.used_columns = sticker.used_columns.toString();
    sticker.used_rows = sticker.used_rows.toString();
    return sticker;
  });

  forEach(dirs, (dir) => {
    fs.writeFile(`${packageName}/${dir.name}/${shortPName}/settings.cfg`, JSON.stringify(settingsCFG, null, 2), (err) => {
      if (err) {
        console.log('creating settings error');
        console.log(err);
      }
    });

    fs.writeFile(`${packageName}/${dir.name}/${shortPName}/settings_ipad.cfg`, JSON.stringify(settingsCFG, null, 2), (err) => {
      if (err) {
        console.log('creating settings error');
        console.log(err);
      }
    });
  });

  let promises = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const file in files) {
    if (Object.prototype.hasOwnProperty.call(files, file)) {
      if (!file.includes('preview') && !file.includes('unavailable_icon')) {
        promises.push(resizeAndCreatePromiseForIOS({ name: `${file}.png`, value: files[file] }, dirs, packageName, shortPName));
      }
    }
  }

  return Promise.all(promises).then(() => {
    forEach(dirs, (dir) => {
      zipFolder(`${packageName}/${dir.name}/`, `./uploads/${dir.name}_${shortPName}.zip`, (err) => {
        if (err) {
          console.log('creating zip error');
          console.log(err);
        } else {
          fs.rename(`./uploads/${dir.name}_${shortPName}.zip`, `${packageName}/${dir.name}/${shortPName}.zip`, () => {
            rimraf(`${packageName}/${dir.name}/${shortPName}/`, () => {
              console.log(`${packageName}/${dir.name}/${shortPName}/`);
            });
          });
        }
      });
    });
  }).then(() => {
    promises = [];


    // eslint-disable-next-line no-restricted-syntax
    for (const file in files) {
      if (Object.prototype.hasOwnProperty.call(files, file)) {
        promises.push(resizeAndCreatePromiseForIOS({ name: `${file}.png`, value: files[file] }, dirs, packageName));
      }
    }


    return promises;
  }).then(() => Promise.all(promises).then(() => {
    console.log('IOS finished');
    return shortPName;
  }));
};


const self = module.exports;
self.uploadAndroid = uploadAndroid;
self.uploadIOS = uploadIOS;

