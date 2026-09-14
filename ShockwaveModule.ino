/*
  Shockwave module — ESP32
  Board heeft de sensoren. Telefoon is alleen display.
  BLE UART Nordic UUID. Een JSON-lijn per sample + newline.
*/

#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define TX_UUID      "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

BLECharacteristic *txChar;
bool bleReady = false;

class ServerCB : public BLEServerCallbacks {
  void onConnect(BLEServer *) { bleReady = true; }
  void onDisconnect(BLEServer *s) { bleReady = false; s->startAdvertising(); }
};

float readG() {
  // Plak hier jouw bestaande sensor-read.
  static float sim = 1.0;
  return sim;
}

void setup() {
  Serial.begin(115200);
  BLEDevice::init("Shockwave");
  BLEServer *server = BLEDevice::createServer();
  server->setCallbacks(new ServerCB());
  BLEService *svc = server->createService(SERVICE_UUID);
  txChar = svc->createCharacteristic(TX_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  txChar->addDescriptor(new BLE2902());
  svc->start();
  BLEAdvertising *adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(SERVICE_UUID);
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

void loop() {
  float g = readG();
  char line[96];
  snprintf(line, sizeof(line), "{\"g\":%.3f}\n", g);
  Serial.print(line);
  if (bleReady) {
    txChar->setValue((uint8_t *)line, strlen(line));
    txChar->notify();
  }
  delay(40);
}
