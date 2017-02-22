#include <Adafruit_NeoPixel.h>

#define WS2811_PIN 6
#define WS2811_LED_COUNT 8

const long DEBOUNCE_DELAY = 50;
const long TRIGGER_PULSE = 50;

#define BUTTON_STATE_COUNT 1
long buttonDebounceTime[BUTTON_STATE_COUNT]; 
boolean buttonState[BUTTON_STATE_COUNT];

long triggerReset = 0;

boolean ledState = 0;
boolean ledOverride = 0;

int target_r[WS2811_LED_COUNT];
int target_g[WS2811_LED_COUNT];
int target_b[WS2811_LED_COUNT];

int current_r[WS2811_LED_COUNT];
int current_g[WS2811_LED_COUNT];
int current_b[WS2811_LED_COUNT];
long defer = 0;

Adafruit_NeoPixel strip = Adafruit_NeoPixel(WS2811_LED_COUNT, WS2811_PIN, NEO_GRB + NEO_KHZ400);

void setup() {
  int i;

  for (i = 0; i < BUTTON_STATE_COUNT; i++) {
    buttonDebounceTime[i] = -50;
    buttonState[i] = 255;
  }

  for (i = 0; i < WS2811_LED_COUNT; i++) {
    current_r[i] = 0;
    current_g[i] = 0;
    current_b[i] = 0;
    target_r[i] = 0;
    target_g[i] = 0;
    target_b[i] = 0;
  }
  
  pinMode(10, INPUT_PULLUP); // Main push button - green
  pinMode(9, OUTPUT); // Trigger the button's behaviour
  pinMode(8, OUTPUT); // LED - blue
  pinMode(7, INPUT_PULLUP); // LED sense (i.e. what the device wants to do) - grey
  digitalWrite(9, HIGH);

  strip.begin();

  for (i = 0; i < WS2811_LED_COUNT; i++) {
    strip.setPixelColor(i, strip.Color(0, 0, 0));
  }
  strip.show();
  
  Serial.begin(9600);
}

void handle_message(char *ptr)
{
  char *p, *i;
  
  p = strtok_r(ptr, " ", &i);
  if (strcmp(p, "TRIGGER") == 0) {
    digitalWrite(9, LOW);
    triggerReset = millis() + TRIGGER_PULSE;
  }
  else if (strcmp(p, "COLOR") == 0) {
    p = strtok_r(NULL, " ", &i);
    if (p && (strlen(p) == 7) && (p[0] == '#')) {
      long colval = (long)strtol(&p[1], NULL, 16);
      for (int j = 0; j < WS2811_LED_COUNT; j++) {
        target_r[j] = colval >> 16;
        target_g[j] = colval >> 8 & 0xFF;
        target_b[j] = colval & 0xFF;
      }
      defer = millis()/5;
    }
    else if (p && (strcmp(p, "OCTOBLU") ==0)) {
      target_r[0] = 0x00;
      target_g[0] = 0x7F;
      target_b[0] = 0x00;
      for (int j = 1; j < WS2811_LED_COUNT; j++) {
        target_r[j] = 0x00;
        target_g[j] = 0x00;
        target_b[j] = 0x7F;
      }
      defer = millis()/5;
    }
  }
  else if (strcmp(p, "LED") == 0) {
    p = strtok_r(NULL, " ", &i);
    if (strcmp(p, "ON") == 0) {
      ledState = 1;
      ledOverride = 1;
    }
    else if (strcmp(p, "OFF") == 0) {
      ledState = 0;
      ledOverride = 1;
    }
    else if (strcmp(p, "PASSTHRU") == 0) {
      ledOverride = 0;
    }
  }
}

const int RX_BUFFER_SIZE = 64;
char rxBuffer[RX_BUFFER_SIZE];
int rxBufferPtr = 0;
void handle_char(int data)
{
  if ((data == '\n') || (data == '\0') || (data == '!')) {
    if (rxBufferPtr < RX_BUFFER_SIZE) {
      rxBuffer[rxBufferPtr] = '\0';
      handle_message(rxBuffer);
    }
    rxBufferPtr = 0;
  }
  else {
    if (rxBufferPtr < RX_BUFFER_SIZE) {
      rxBuffer[rxBufferPtr] = (char)data;
      rxBufferPtr++;
    }
  }
}

void do_button(int pin, int idx, char *fn)
{
  byte v;
  long now;
  
  v = digitalRead(pin);
  if (v != buttonState[idx]) {
    now = millis();
    if ((now - buttonDebounceTime[idx]) < DEBOUNCE_DELAY) {
      // In the debounce window, ignore
    }
    else {
      buttonState[idx] = v;
      buttonDebounceTime[idx] = now;
      if (buttonState[idx] == LOW) {
        Serial.println(fn);
      }
    }
  }
}

long last_millis = 0;
void loop() { 
  if (Serial.available()) {
    handle_char(Serial.read());
  }  

  if (triggerReset) {
    if (millis() > triggerReset) {
      digitalWrite(9, HIGH);
      triggerReset = 0;
    }
  }
  
  do_button(10, 0, "BUTTON");

  if (ledOverride) {
    digitalWrite(8, !ledState);
  }
  else {
    digitalWrite(8, digitalRead(7));
  }

  long m = millis()/5;
  if (m > last_millis) {
    last_millis = m;
    boolean changed = false;
    for (int i = 0; i < WS2811_LED_COUNT; i++) {
      if (m < (defer + 20 * i)) {
        continue;
      }
      if (target_r[i] != current_r[i]) {
        current_r[i] += (target_r[i]>current_r[i])?1:-1;
        changed = true;
      }
      if (target_g[i] != current_g[i]) {
        current_g[i] += (target_g[i]>current_g[i])?1:-1;
        changed = true;
      }
      if (target_b[i] != current_b[i]) {
        current_b[i] += (target_b[i]>current_b[i])?1:-1;
        changed = true;
      }
    }
    if (changed) {
      for (int i = 0; i < WS2811_LED_COUNT; i++) {
        strip.setPixelColor(i, strip.Color(current_r[i], current_g[i], current_b[i]));
      }
      strip.show();
    }
  }
}

