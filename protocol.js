const SW = {
  NAME: "Shokwave-Module",
  UART: "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  TX: "6e400003-b5a3-f393-e0a9-e50e24dcca9e",
  RX: "6e400002-b5a3-f393-e0a9-e50e24dcca9e",
  KEY: "shokwave-live-v1",
  device: null, rx: null, buf: "", last: null, listeners: []
};
SW.parseLine = function (line) {
  const p = line.trim().split(",");
  if (p.length < 11) return null;
  const n = p.map(Number);
  if (!isFinite(n[3])) return null;
  return { id:n[0], ms:n[1], handling:n[2]===1, axRms:n[3], ayRms:n[4], azRms:n[5], accRms:n[6], accPeak:n[7], accKurt:n[8], gyroRms:n[9], gyroPeak:n[10] };
};
SW.onSample = function (fn) { SW.listeners.push(fn); };
SW.emit = function (s) { SW.last = s; localStorage.setItem(SW.KEY, JSON.stringify({ t: Date.now(), s })); SW.listeners.forEach(function(fn){ try{fn(s);}catch(e){} }); };
SW.feed = function (chunk) { SW.buf += chunk; const parts = SW.buf.split(/\r?\n/); SW.buf = parts.pop() || ""; parts.forEach(function(line){ var s=SW.parseLine(line); if(s) SW.emit(s); }); };
SW.connect = async function () {
  const device = await navigator.bluetooth.requestDevice({ filters: [{ namePrefix: "Shokwave" }, { services: [SW.UART] }], optionalServices: [SW.UART] });
  SW.device = device;
  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService(SW.UART);
  const tx = await svc.getCharacteristic(SW.TX);
  try { SW.rx = await svc.getCharacteristic(SW.RX); } catch (e) {}
  await tx.startNotifications();
  tx.addEventListener("characteristicvaluechanged", function(ev){ SW.feed(new TextDecoder().decode(ev.target.value)); });
  device.addEventListener("gattserverdisconnected", function(){ SW.emit({ disconnected: true }); });
  return device.name || SW.NAME;
};
SW.disconnect = function () { try { SW.device && SW.device.gatt.disconnect(); } catch (e) {} SW.device = null; };
SW.calImu = async function () { if (!SW.rx) throw new Error("geen RX"); await SW.rx.writeValue(new TextEncoder().encode("CAL_IMU\n")); };
