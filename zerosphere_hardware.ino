#define BLYNK_TEMPLATE_ID "TMPL3nVFVEDDH"
#define BLYNK_TEMPLATE_NAME "Emission Monitor"
#define BLYNK_AUTH_TOKEN "3cTERa9FcTnZiJ2S__30tjAZpxIiugMT"

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

char ssid[] = "wifi_name";
char pass[] = "wifi_password";

const int MQ4_PIN   = 34;
const int MQ135_PIN = 35;
const int MQ9_PIN   = 32;

// LCD: address 0x27 or 0x3F, 16 columns, 2 rows
LiquidCrystal_I2C lcd(0x27, 16, 2);
BlynkTimer timer;

// ---- Variables ----
int mq4Raw   = 0;
int mq135Raw = 0;
int mq9Raw   = 0;

// LCD screen control
int screenIndex = 0;  // 0 = MQ4, 1 = MQ9, 2 = MQ135
unsigned long lastScreenSwitch = 0;
const unsigned long SCREEN_INTERVAL = 2000;   // 2 seconds

// For smoothing LCD value updates
unsigned long lastValueUpdate = 0;
const unsigned long VALUE_UPDATE_INTERVAL = 200; // update value text every 200 ms

// ---- Read sensors ----
void readSensors() {
  mq4Raw   = analogRead(MQ4_PIN);
  mq135Raw = analogRead(MQ135_PIN);
  mq9Raw   = analogRead(MQ9_PIN);

  // Debug
  Serial.print("MQ4: ");   Serial.print(mq4Raw);
  Serial.print(" | MQ135: "); Serial.print(mq135Raw);
  Serial.print(" | MQ9: ");  Serial.println(mq9Raw);
}

// ---- Send data to Blynk ----
void sendToBlynk() {
  Blynk.virtualWrite(V0, mq4Raw);   // MQ4 -> LPG/Methane
  Blynk.virtualWrite(V1, mq135Raw); // MQ135 -> Air Quality
  Blynk.virtualWrite(V2, mq9Raw);   // MQ9 -> CO/LPG
}

// ---- Update LCD display without flicker ----
void updateLCD() {
  unsigned long now = millis();
  static int prevScreenIndex = -1;  // remember last screen drawn
  if (now - lastScreenSwitch >= SCREEN_INTERVAL) {  // Change screen every 2 seconds
    lastScreenSwitch = now;
    screenIndex++;
    if (screenIndex > 2) screenIndex = 0;
  }
  if (screenIndex != prevScreenIndex) {// If screen changed, clear once and write the heading line (line 0)
    lcd.clear();
    if (screenIndex == 0) {
      // MQ4
      lcd.setCursor(0, 0);
      lcd.print("MQ4 Methane");
    } else if (screenIndex == 1) {
      // MQ9
      lcd.setCursor(0, 0);
      lcd.print("MQ9 CO   ");
    } else if (screenIndex == 2) {
      // MQ135
      lcd.setCursor(0, 0);
      lcd.print("MQ135 CO2 ");}
    lcd.setCursor(0, 1); // Label for line 2 (stays same format)
    lcd.print("Value: ");
    prevScreenIndex = screenIndex; }
  if (now - lastValueUpdate >= VALUE_UPDATE_INTERVAL) { // Update only the numeric value on line 2 every 200 ms (no clear)
    lastValueUpdate = now;
    int valueToShow = 0;
    if (screenIndex == 0) {
      valueToShow = mq4Raw;
    } else if (screenIndex == 1) {
      valueToShow = mq9Raw;
    } else if (screenIndex == 2) {
      valueToShow = mq135Raw; }
    lcd.setCursor(7, 1); // Overwrite old value area with spaces then print new value // after "Value: "
    lcd.print("      ");   // clear previous digits
    lcd.setCursor(7, 1);
    lcd.print(valueToShow);}}

void setup() {
  Serial.begin(115200);
  delay(1000);

  // ---- ADC config ----
  analogReadResolution(12);          // 0 - 4095
  analogSetAttenuation(ADC_11db);    // full range ~3.3V

  // ---- LCD init ----
  Wire.begin();                      // SDA=21, SCL=22 on ESP32
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Gas Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  // ---- WiFi & Blynk ----
 Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  // ---- Timers ----
  // Read sensors + send to Blynk every 1 second
  timer.setInterval(1000L, []() {
    readSensors();
    sendToBlynk();
  });
}

void loop() {
  Blynk.run();
  timer.run();
  updateLCD();   // safe to call continuously now, no flicker
}
