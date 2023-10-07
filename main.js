// Получение ссылок на элементы UI
let connectButton = document.getElementById('connect');
let disconnectButton = document.getElementById('disconnect');
let temperatureButton = document.getElementById('temperature');
let humidityButton = document.getElementById('humidity');
let terminalContainer = document.getElementById('terminal');
let timeForm = document.getElementById('time-form');
let colorForm = document.getElementById('color-form');
let inputTime = document.getElementById('input-time');
let inputDate = document.getElementById('input-date');
let inputColor = document.getElementById('input-color');
let speedForm = document.getElementById('speed-form');
let inputSpeed = document.getElementById('input1');
let delayTimeForm = document.getElementById('delay-time-form');
let inputDelayTime = document.getElementById('input2');
let delayOtherForm = document.getElementById('delay-other-form');
let inputDelayOther = document.getElementById('input3');
let printTextForm = document.getElementById('print-text-form');
let inputText = document.getElementById('input4');


// Подключение к устройству при нажатии на кнопку Connect
connectButton.addEventListener('click', function() {
  connect();
});

// Отключение от устройства при нажатии на кнопку Disconnect
disconnectButton.addEventListener('click', function() {
  disconnect();
});

temperatureButton.addEventListener('click', function() {
  send("0;"); // Отправить содержимое текстового поля
});


humidityButton.addEventListener('click', function() {
  send("1;"); // Отправить содержимое текстового поля
});

function getLocalDay(date) {
  let day = date.getDay();
  if (day == 0) { // день недели 0 (воскресенье) в европейской нумерации будет 7
    day = 7;
  }
  return day;
}

// Обработка события отправки формы
timeForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  date = inputDate.value.split('-', 3)
  dd = date[2]
  mm = date[1]
  yy = date[0].substring(date[0].length-2)
  ddd = new Date(inputDate.value)
  num = getLocalDay(ddd);
  time = inputTime.value.split(':', 2)
  value1 = String('2,'+'0,'+time[0]+','+time[1] +','+ dd+','+mm+','+yy+','+num+';')
  send(value1); // Отправить содержимое текстового поля
  inputTime.value = '';  // Обнулить текстовое поле
  //inputTime.focus();     // Вернуть фокус на текстовое поле
});

colorForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send(hex2rgb(inputColor.value)); // Отправить содержимое текстового поля
  inputColor.value = '';  // Обнулить текстовое поле
  //inputColor.focus();     // Вернуть фокус на текстовое поле
});

//speed
speedForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send('4,'+inputSpeed.value+';');
  inputSpeed.value = '';  // Обнулить текстовое поле
  //inputColor.focus();     // Вернуть фокус на текстовое поле
});

//delay-time
delayTimeForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send('5,'+inputDelayTime.value+';'); // Отправить содержимое текстового поля
  inputDelayTime.value = '';  // Обнулить текстовое поле
  //inputColor.focus();     // Вернуть фокус на текстовое поле
});

//delay-other
delayOtherForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send('6,'+inputDelayOther.value+';'); // Отправить содержимое текстового поля
  inputDelayOther.value = '';  // Обнулить текстовое поле
  //inputColor.focus();     // Вернуть фокус на текстовое поле
});

//text
printTextForm.addEventListener('submit', function(event) {
  event.preventDefault(); // Предотвратить отправку формы
  send('7,'+inputDelayOther.value+';'); // Отправить содержимое текстового поля
  inputDelayOther.value = '';  // Обнулить текстовое поле
  //inputColor.focus();     // Вернуть фокус на текстовое поле
});


// Кэш объекта выбранного устройства
let deviceCache = null;

// Кэш объекта характеристики
let characteristicCache = null;

// Промежуточный буфер для входящих данных
let readBuffer = '';

function hex2rgb(c) {
  var bigint = parseInt(c.split('#')[1], 16);
  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  return '3,'+ r + ',' + g + ',' + b+';';
}

// Запустить выбор Bluetooth устройства и подключиться к выбранному
function connect() {
  return (deviceCache ? Promise.resolve(deviceCache) :
      requestBluetoothDevice()).
      then(device => connectDeviceAndCacheCharacteristic(device)).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

// Запрос выбора Bluetooth устройства
function requestBluetoothDevice() {
  //log('Requesting bluetooth device...');
  log('Requesting bluetooth device...');
  return navigator.bluetooth.requestDevice({
    filters: [{services: [0xFFE0]}],
  }).
      then(device => {
        log('"' + device.name + '" bluetooth device selected');
        deviceCache = device;
        deviceCache.addEventListener('gattserverdisconnected',
            handleDisconnection);

        return deviceCache;
      });
}

// Обработчик разъединения
function handleDisconnection(event) {
  let device = event.target;

  log('"' + device.name +
      '" bluetooth device disconnected, trying to reconnect...');

  connectDeviceAndCacheCharacteristic(device).
      then(characteristic => startNotifications(characteristic)).
      catch(error => log(error));
}

// Подключение к определенному устройству, получение сервиса и характеристики
function connectDeviceAndCacheCharacteristic(device) {
  if (device.gatt.connected && characteristicCache) {
    return Promise.resolve(characteristicCache);
  }

  log('Connecting to GATT server...');

  return device.gatt.connect().
      then(server => {
        log('GATT server connected, getting service...');

        return server.getPrimaryService(0xFFE0);
      }).
      then(service => {
        log('Service found, getting characteristic...');

        return service.getCharacteristic(0xFFE1);
      }).
      then(characteristic => {
        log('Characteristic found');
        characteristicCache = characteristic;

        return characteristicCache;
      });
}

// Включение получения уведомлений об изменении характеристики
function startNotifications(characteristic) {
  log('Starting notifications...');

  return characteristic.startNotifications().
      then(() => {
        log('Notifications started');
        characteristic.addEventListener('characteristicvaluechanged',
            handleCharacteristicValueChanged);
      });
}

// Получение данных
function handleCharacteristicValueChanged(event) {
  let value = new TextDecoder().decode(event.target.value);

  for (let c of value) {
    if (c === '\n') {
      let data = readBuffer.trim();
      readBuffer = '';

      if (data) {
        receive(data);
      }
    }
    else {
      readBuffer += c;
    }
  }
}

// Обработка полученных данных
function receive(data) {
  log(data, 'in');
}

// Вывод в терминал
function log(data, type = '') {
  terminalContainer.insertAdjacentHTML('beforeend',
      '<div' + (type ? ' class="' + type + '"' : '') + '>' + data + '</div>');
}

// Отключиться от подключенного устройства
function disconnect() {
  if (deviceCache) {
    log('Disconnecting from "' + deviceCache.name + '" bluetooth device...');
    deviceCache.removeEventListener('gattserverdisconnected',
        handleDisconnection);

    if (deviceCache.gatt.connected) {
      deviceCache.gatt.disconnect();
      log('"' + deviceCache.name + '" bluetooth device disconnected');
    }
    else {
      log('"' + deviceCache.name +
          '" bluetooth device is already disconnected');
    }
  }

  if (characteristicCache) {
    characteristicCache.removeEventListener('characteristicvaluechanged',
        handleCharacteristicValueChanged);
    characteristicCache = null;
  }

  deviceCache = null;
}

// Отправить данные подключенному устройству
function send(data) {
  data = String(data);

  if (!data || !characteristicCache) {
    return;
  }

  data += '\n';

  // if (data.length > 20) {
  //   let chunks = data.match(/(.|[\r\n]){1,20}/g);

  //   writeToCharacteristic(characteristicCache, chunks[0]);

  //   for (let i = 1; i < chunks.length; i++) {
  //     setTimeout(() => {
  //       writeToCharacteristic(characteristicCache, chunks[i]);
  //     }, i * 100);
  //   }
  // }
  // else {
  //   writeToCharacteristic(characteristicCache, data);
  // }
  writeToCharacteristic(characteristicCache, data);
  log(data, 'out');
}

// Записать значение в характеристику
function writeToCharacteristic(characteristic, data) {
  characteristic.writeValue(new TextEncoder().encode(data));
}
