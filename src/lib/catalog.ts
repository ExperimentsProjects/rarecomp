import { db } from '@/db';
import { products, sections } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

const initialSections = [
  { id: 'boards', name: 'Development Boards', order: 1 },
  { id: 'wireless', name: 'Wireless & RF Modules', order: 2 },
  { id: 'antennas', name: 'Antennas & Accessories', order: 3 },
  { id: 'kits', name: 'Kits & Bundles', order: 4 },
  { id: 'rare', name: 'Rare & Hard-to-Find', order: 5 },
];

type Seed = {
  id: string; name: string; description: string; category: string; sectionId: string;
  price: number; oldPrice: number | null; image: string | null; preview: string;
  tags: string[]; specs: { name: string; value: string }[]; badge: string | null; featured: boolean;
};

const initial: Seed[] = [
  {
    id: 'esp32-wroom32-devkit-v1',
    name: 'ESP32-WROOM-32 DevKit V1 — 38 Pin',
    description:
      'The workhorse of Indian maker projects. A genuine ESP32-WROOM-32 module on a 38-pin breakout with Wi-Fi, Bluetooth 4.2 + BLE, dual-core 240 MHz CPU and 4 MB flash. Runs Arduino, ESP-IDF and MicroPython out of the box. Ideal for IoT dashboards, home automation, robot control and anything that needs wireless plus plenty of GPIO.',
    category: 'Development Boards', sectionId: 'boards', price: 44900, oldPrice: 59900,
    image: '/products/esp32-devkit.jpg', preview: 'hardware-board', tags: ['ESP32', 'Wi-Fi + BT', 'IoT'], badge: 'BESTSELLER', featured: true,
    specs: [
      { name: 'MCU', value: 'ESP32-D0WDQ6 · dual-core Xtensa LX6 @ 240 MHz' },
      { name: 'Memory', value: '520 KB SRAM · 4 MB Flash' },
      { name: 'Wireless', value: 'Wi-Fi 802.11 b/g/n 2.4 GHz · Bluetooth 4.2 BR/EDR + BLE' },
      { name: 'GPIO', value: '34 pins · 18-ch 12-bit ADC · 10 capacitive touch' },
      { name: 'Interfaces', value: '3× UART · 2× I2C · 4× SPI · 2× I2S · 12× PWM' },
      { name: 'Logic level', value: '3.3 V (not 5 V tolerant)' },
      { name: 'USB', value: 'Micro-USB via CP2102 bridge' },
      { name: 'Deep sleep', value: '≈10 µA' },
      { name: 'Operating temp', value: '−40 °C to +85 °C' },
    ],
  },
  {
    id: 'esp32-s3-devkitc-n16r8',
    name: 'ESP32-S3 DevKitC-1 — N16R8 (16MB Flash / 8MB PSRAM)',
    description:
      'The board for edge AI and TinyML. ESP32-S3 dual-core LX7 with vector instructions for neural network acceleration, 16 MB flash and 8 MB octal PSRAM for image and audio workloads. Native USB-C OTG means no UART bridge — plug in and debug. BLE 5.0, 45 GPIO and camera support make it the go-to for vision and voice projects.',
    category: 'Development Boards', sectionId: 'boards', price: 79900, oldPrice: 99900,
    image: '/products/esp32-s3-devkit.jpg', preview: 'hardware-board', tags: ['ESP32-S3', 'Edge AI', 'TinyML'], badge: 'NEW', featured: true,
    specs: [
      { name: 'MCU', value: 'ESP32-S3 · dual-core Xtensa LX7 @ 240 MHz' },
      { name: 'Memory', value: '512 KB SRAM · 16 MB Flash · 8 MB Octal PSRAM' },
      { name: 'Wireless', value: 'Wi-Fi 802.11 b/g/n 2.4 GHz · BLE 5.0' },
      { name: 'AI / ML', value: 'IEEE 754 vector instructions for NN acceleration' },
      { name: 'GPIO', value: '45 GPIO · 20-ch 12-bit ADC · 14 capacitive touch' },
      { name: 'USB', value: 'Native USB OTG (USB-C) — no bridge needed' },
      { name: 'Logic level', value: '3.3 V' },
      { name: 'Best for', value: 'Camera (DVP) · audio · TinyML · edge inference' },
    ],
  },
  {
    id: 'esp8266-nodemcu-cp2102',
    name: 'ESP8266 NodeMCU (ESP-12E, CP2102)',
    description:
      'The cheapest way to put a project on Wi-Fi. ESP-12E module with 4 MB flash on the familiar NodeMCU breakout with onboard voltage regulator and CP2102 USB. Perfect for simple sensors-to-cloud builds, LED control and learning the ESP toolchain before moving to ESP32.',
    category: 'Development Boards', sectionId: 'boards', price: 24900, oldPrice: 34900,
    image: null, preview: 'hardware-board', tags: ['ESP8266', 'Wi-Fi', 'Budget IoT'], badge: null, featured: false,
    specs: [
      { name: 'MCU', value: 'ESP8266EX (ESP-12E) · single core @ 80/160 MHz' },
      { name: 'Memory', value: '80 KB RAM · 4 MB Flash' },
      { name: 'Wireless', value: 'Wi-Fi 802.11 b/g/n 2.4 GHz' },
      { name: 'GPIO', value: '11 usable · 1× 10-bit ADC' },
      { name: 'USB', value: 'Micro-USB via CP2102' },
      { name: 'Logic level', value: '3.3 V' },
    ],
  },
  {
    id: 'arduino-nano-ch340',
    name: 'Arduino Nano Compatible (ATmega328P, CH340)',
    description:
      'Breadboard-friendly 5 V classic. ATmega328P at 16 MHz with 14 digital pins (6 PWM) and 8 analog inputs, in a DIP-30 footprint that plugs straight into a breadboard. Fully supported by the Arduino IDE through the CH340 USB-serial chip. The safest starting point for beginners and school labs.',
    category: 'Development Boards', sectionId: 'boards', price: 29900, oldPrice: null,
    image: null, preview: 'hardware-board', tags: ['ATmega328P', '5V', 'Beginner'], badge: null, featured: false,
    specs: [
      { name: 'MCU', value: 'ATmega328P @ 16 MHz' },
      { name: 'Memory', value: '32 KB Flash · 2 KB SRAM · 1 KB EEPROM' },
      { name: 'GPIO', value: '14 digital (6 PWM) · 8 analog inputs' },
      { name: 'Logic level', value: '5 V' },
      { name: 'USB', value: 'Mini-USB via CH340' },
      { name: 'Form factor', value: 'Breadboard DIP-30 · 45 × 18 mm' },
    ],
  },
  {
    id: 'cc1101-433mhz',
    name: 'CC1101 433 MHz Sub-1GHz Transceiver Module',
    description:
      'Texas Instruments CC1101 sub-1GHz transceiver tuned to the license-free 433 MHz band. Extremely sensitive (−116 dBm) with GFSK, FSK, MSK, OOK and ASK modulation, which makes it the module of choice for reading 433 MHz remote controls, weather stations, door sensors and building custom long-range links on a budget.',
    category: 'Wireless & RF', sectionId: 'wireless', price: 24900, oldPrice: 34900,
    image: '/products/cc1101-433.jpg', preview: 'hardware-module', tags: ['CC1101', '433 MHz', 'Sub-1GHz'], badge: 'POPULAR', featured: true,
    specs: [
      { name: 'Chip', value: 'Texas Instruments CC1101' },
      { name: 'Frequency', value: '387–464 MHz (tuned to 433 MHz)' },
      { name: 'Modulation', value: '2-FSK · GFSK · MSK · OOK · ASK' },
      { name: 'Data rate', value: '1.2 – 500 kbps' },
      { name: 'Sensitivity', value: '−116 dBm @ 1.2 kBaud' },
      { name: 'Output power', value: 'up to +12 dBm' },
      { name: 'Interface', value: 'SPI (max 10 MHz)' },
      { name: 'Supply', value: '1.8 – 3.6 V (3.3 V typical)' },
      { name: 'Range', value: '100 – 300 m line of sight' },
      { name: 'Buffer', value: '64-byte FIFO' },
    ],
  },
  {
    id: 'nrf24l01-plus-pair',
    name: 'nRF24L01+ 2.4 GHz Transceiver — Pack of 2',
    description:
      'The classic Nordic 2.4 GHz SPI radio, sold as a matched pair so two Arduinos or ESP32s can talk straight away. Enhanced ShockBurst handles packetising, addressing, auto-acknowledge and retransmission for you. 125 channels, three data rates, and six receive pipes on a single radio. The cheapest reliable point-to-point link in Indian hobby electronics.',
    category: 'Wireless & RF', sectionId: 'wireless', price: 12900, oldPrice: 19900,
    image: null, preview: 'hardware-module', tags: ['nRF24L01+', '2.4 GHz', 'SPI'], badge: 'BESTSELLER', featured: true,
    specs: [
      { name: 'Chip', value: 'Nordic nRF24L01+' },
      { name: 'Frequency', value: '2.400 – 2.525 GHz · 125 channels' },
      { name: 'Data rate', value: '250 kbps · 1 Mbps · 2 Mbps' },
      { name: 'Sensitivity', value: '−94 dBm @ 250 kbps' },
      { name: 'Output power', value: '0 dBm (1 mW)' },
      { name: 'Interface', value: 'SPI (max 8 MHz)' },
      { name: 'Supply', value: '1.9 – 3.6 V' },
      { name: 'Buffer', value: '32-byte TX / RX FIFO' },
      { name: 'Features', value: 'Enhanced ShockBurst · auto-ACK · 6 data pipes' },
      { name: 'Range', value: '≈50 – 100 m indoor' },
    ],
  },
  {
    id: 'nrf24l01-pa-lna',
    name: 'nRF24L01+ PA + LNA Long Range Module with Antenna',
    description:
      'The long-range version: an nRF24L01+ with a power amplifier and low-noise amplifier front end, pushing +20 dBm (100 mW) instead of 1 mW, with an SMA rubber-duck antenna in the box. Real-world range reaches about a kilometre line of sight — the standard fix when plain nRF24L01+ modules keep dropping packets across a campus or farm.',
    category: 'Wireless & RF', sectionId: 'wireless', price: 29900, oldPrice: 44900,
    image: '/products/nrf24l01-palna.jpg', preview: 'hardware-module', tags: ['nRF24L01+', 'PA + LNA', '1 km'], badge: 'POPULAR', featured: true,
    specs: [
      { name: 'Chip', value: 'Nordic nRF24L01+ with PA + LNA front end' },
      { name: 'Frequency', value: '2.400 – 2.525 GHz · 125 channels' },
      { name: 'Output power', value: '+20 dBm (100 mW)' },
      { name: 'Data rate', value: '250 kbps · 1 Mbps · 2 Mbps' },
      { name: 'Interface', value: 'SPI (max 8 MHz)' },
      { name: 'Supply', value: '3.3 V · ≥250 mA peak (add 10–100 µF bulk cap)' },
      { name: 'Antenna', value: 'SMA connector · 2.4 GHz whip included' },
      { name: 'Range', value: 'up to ≈1000 m line of sight' },
      { name: 'Warning', value: 'Never transmit without the antenna attached' },
    ],
  },
  {
    id: 'ebyte-e01-2g4m27d',
    name: 'EByte E01-2G4M27D — 2.4 GHz 500 mW (27 dBm)',
    description:
      'Industrial-grade 2.4 GHz radio from EByte, built around an Si24R1 core that is register- and code-compatible with nRF24L01+. Where the standard module gives you 1 mW, this delivers a full 500 mW (27 dBm) through an integrated power amplifier, reaching 3–5 km line of sight. SMA-K antenna connector and an IPEX option. The module we recommend for serious long-range telemetry, drone links and agriculture monitoring.',
    category: 'Wireless & RF', sectionId: 'wireless', price: 54900, oldPrice: 69900,
    image: '/products/ebyte-e01-2g4m27d.jpg', preview: 'hardware-module', tags: ['EByte', '500 mW', 'Long range'], badge: 'NEW', featured: true,
    specs: [
      { name: 'Core', value: 'Si24R1 · nRF24L01+ compatible (register level)' },
      { name: 'Frequency', value: '2.400 – 2.525 GHz' },
      { name: 'Output power', value: '27 dBm (500 mW) maximum' },
      { name: 'Sensitivity', value: '−96 dBm' },
      { name: 'Data rate', value: '250 kbps · 1 Mbps · 2 Mbps' },
      { name: 'Interface', value: 'SPI · drop-in for nRF24L01+ code' },
      { name: 'Supply', value: '3.3 V · ≈380 mA peak TX current' },
      { name: 'Range', value: '3 – 5 km line of sight' },
      { name: 'Antenna', value: 'SMA-K connector (IPEX option)' },
      { name: 'Warning', value: 'Always attach antenna before powering on' },
    ],
  },
  {
    id: 'sx1278-lora-433',
    name: 'SX1278 LoRa 433 MHz Module (RA-02 Class)',
    description:
      'Semtech SX1278 LoRa module for links that plain radios cannot make. LoRa chirp spread spectrum reaches −148 dBm sensitivity, so it holds a connection at ranges where nRF24L01+ and CC1101 have long given up — 2 to 10 km line of sight, and impressive penetration through walls and foliage. Standard SPI RA-02 footprint with libraries available for Arduino and ESP32.',
    category: 'Wireless & RF', sectionId: 'wireless', price: 39900, oldPrice: 54900,
    image: '/products/lora-sx1278.jpg', preview: 'hardware-module', tags: ['LoRa', 'SX1278', '10 km'], badge: 'BESTSELLER', featured: true,
    specs: [
      { name: 'Chip', value: 'Semtech SX1278' },
      { name: 'Frequency', value: '410 – 525 MHz (tuned to 433 MHz)' },
      { name: 'Modulation', value: 'LoRa (CSS) · FSK / OOK' },
      { name: 'Sensitivity', value: '−148 dBm @ LoRa, 0.018 kbps' },
      { name: 'Output power', value: 'up to +20 dBm (100 mW)' },
      { name: 'Data rate', value: '0.018 – 37.5 kbps' },
      { name: 'Interface', value: 'SPI' },
      { name: 'Supply', value: '3.3 V' },
      { name: 'Range', value: '2 – 10 km line of sight' },
      { name: 'Best for', value: 'Remote telemetry · agriculture · asset tracking' },
    ],
  },
  {
    id: 'hc-12-433-pair',
    name: 'HC-12 433 MHz Serial Transceiver — Pack of 2',
    description:
      'Wireless serial without writing radio code. The HC-12 takes UART in one side and pushes it out the other — two Arduinos talk over 433 MHz with no library, no addressing and no SPI wiring. Just set the channel with an AT command and print() across the link. The fastest way to add wireless to an existing serial project.',
    category: 'Wireless & RF', sectionId: 'wireless', price: 34900, oldPrice: null,
    image: null, preview: 'hardware-module', tags: ['HC-12', 'UART', '433 MHz'], badge: null, featured: false,
    specs: [
      { name: 'Frequency', value: '433.4 – 473.0 MHz' },
      { name: 'Interface', value: 'UART / serial (no radio code needed)' },
      { name: 'Baud rate', value: '1200 – 115200 bps' },
      { name: 'Supply', value: '3.2 – 5.5 V' },
      { name: 'Modes', value: 'FU1 / FU2 / FU3 / FU4 (range vs current)' },
      { name: 'Range', value: 'up to ≈1000 m line of sight' },
    ],
  },
  {
    id: 'antenna-2g4-sma-5dbi',
    name: '2.4 GHz SMA Rubber Duck Antenna — 5 dBi',
    description:
      'Replacement or upgrade whip antenna for nRF24L01+ PA+LNA, EByte E01 series and any 2.4 GHz radio with an SMA connector. 5 dBi omnidirectional gain over the basic 2 dBi whip, hinged joint for aiming, and a 10 cm cable for flexible mounting. Measurably fewer dropped packets at range compared to the stock antenna.',
    category: 'Antennas & Accessories', sectionId: 'antennas', price: 14900, oldPrice: 19900,
    image: null, preview: 'hardware-antenna', tags: ['2.4 GHz', 'SMA', '5 dBi'], badge: null, featured: false,
    specs: [
      { name: 'Frequency', value: '2400 – 2500 MHz' },
      { name: 'Gain', value: '5 dBi omnidirectional' },
      { name: 'Connector', value: 'SMA' },
      { name: 'Cable', value: '≈10 cm pigtail · hinged joint' },
      { name: 'VSWR', value: '< 1.92' },
      { name: 'Compatible', value: 'nRF24L01+ PA/LNA · EByte E01 · ESP32 with SMA' },
    ],
  },
  {
    id: 'antenna-433-spring-5pk',
    name: '433 MHz Spring Antenna — Pack of 5',
    description:
      'Spare helical spring antennas for CC1101, HC-12, LoRa SX1278 and other 433 MHz modules. The cheapest way to noticeably improve range over a bit of wire — and having five means every radio on your bench has a proper matched antenna instead of a paperclip. Solder or push-fit onto the module antenna pad.',
    category: 'Antennas & Accessories', sectionId: 'antennas', price: 9900, oldPrice: null,
    image: null, preview: 'hardware-antenna', tags: ['433 MHz', 'Helical', 'Pack of 5'], badge: null, featured: false,
    specs: [
      { name: 'Frequency', value: '433 MHz' },
      { name: 'Type', value: 'Helical spring · omnidirectional' },
      { name: 'Gain', value: '≈2 dBi' },
      { name: 'Length', value: '≈35 mm' },
      { name: 'Mounting', value: 'Solder / push-fit pad' },
      { name: 'Compatible', value: 'CC1101 · HC-12 · SX1278 · 433 MHz modules' },
    ],
  },
  {
    id: 'kit-esp32-nrf-longrange',
    name: 'ESP32 Long Range Link Kit — 2 Nodes',
    description:
      'A complete two-node long-range wireless link, matched and tested before shipping. Two ESP32 DevKit boards, two nRF24L01+ PA+LNA modules with antennas, the 3.3 V adapter boards that prevent the classic brown-out problem, and a set of jumper wires. Flash both nodes and have packets crossing a kilometre the same afternoon — full Arduino sketch included on the order page.',
    category: 'Kits & Bundles', sectionId: 'kits', price: 129900, oldPrice: 179900,
    image: null, preview: 'hardware-kit', tags: ['ESP32', 'nRF24L01+', '1 km'], badge: 'BESTSELLER', featured: true,
    specs: [
      { name: 'Includes', value: '2× ESP32 DevKit · 2× nRF24L01+ PA+LNA · 2× adapter · 2× antenna · jumpers' },
      { name: 'Range', value: 'up to ≈1000 m line of sight' },
      { name: 'Code', value: 'Arduino sketch for TX + RX included' },
      { name: 'Voltage', value: 'Boards 5 V USB · radios 3.3 V via adapter' },
      { name: 'Assembly', value: 'Plug-in, no soldering required' },
      { name: 'Tested', value: 'Both nodes range-checked before dispatch' },
    ],
  },
  {
    id: 'kit-lora-p2p-433',
    name: 'LoRa 433 MHz Point-to-Point Kit — 2 Nodes',
    description:
      'Everything for your first multi-kilometre LoRa link: two SX1278 433 MHz modules, matched spring antennas, a breadboard and jumpers. LoRa keeps a connection at distances where Wi-Fi and 2.4 GHz radios are hopeless, and penetrates walls and crops far better. Ideal for farm monitoring, remote sensor nodes and campus projects. Arduino library example included.',
    category: 'Kits & Bundles', sectionId: 'kits', price: 149900, oldPrice: 199900,
    image: null, preview: 'hardware-kit', tags: ['LoRa', 'SX1278', 'Multi-km'], badge: 'NEW', featured: true,
    specs: [
      { name: 'Includes', value: '2× SX1278 433 MHz · 2× spring antenna · breadboard · jumpers' },
      { name: 'Range', value: '2 – 10 km line of sight' },
      { name: 'Modulation', value: 'LoRa spread spectrum' },
      { name: 'Interface', value: 'SPI (Arduino / ESP32 libraries available)' },
      { name: 'Best for', value: 'Agriculture · remote sensors · long-haul telemetry' },
      { name: 'Assembly', value: 'Breadboard, no soldering required' },
    ],
  },
  {
    id: 'esp32-s3-wroom1-n8r2',
    name: 'ESP32-S3-WROOM-1 Module (N8R2) — Bare',
    description:
      'The bare ESP32-S3-WROOM-1-N8R8-variant module for embedding into your own PCB. 8 MB flash with 2 MB PSRAM, castellated pads for easy hand-soldering, and the full ESP32-S3 feature set including vector instructions and BLE 5.0. Fully FCC / CE certified as a module, which simplifies your own compliance work.',
    category: 'Rare & Hard-to-Find', sectionId: 'rare', price: 39900, oldPrice: null,
    image: null, preview: 'hardware-module', tags: ['ESP32-S3', 'Bare module', 'PCB design'], badge: null, featured: false,
    specs: [
      { name: 'Module', value: 'ESP32-S3-WROOM-1 · N8R2' },
      { name: 'Memory', value: '8 MB Flash · 2 MB PSRAM' },
      { name: 'Wireless', value: 'Wi-Fi 2.4 GHz · BLE 5.0' },
      { name: 'Mounting', value: 'Castellated pads · 18 × 25.5 mm' },
      { name: 'Certification', value: 'FCC / CE certified module' },
      { name: 'Best for', value: 'Custom PCB design · product development' },
    ],
  },
  {
    id: 'cc1101-868mhz',
    name: 'CC1101 868 MHz Transceiver Module',
    description:
      'The 868 MHz sibling of our 433 MHz CC1101. Same TI silicon and SPI interface, but tuned to the 868 MHz ISM band used across Europe and by many industrial sensors — handy when you need a band with less crowd than 433 MHz in India, or are reverse-engineering 868 MHz equipment. Limited stock; this variant is not commonly stocked in India.',
    category: 'Rare & Hard-to-Find', sectionId: 'rare', price: 27900, oldPrice: null,
    image: null, preview: 'hardware-module', tags: ['CC1101', '868 MHz', 'Rare'], badge: 'RARE', featured: false,
    specs: [
      { name: 'Chip', value: 'Texas Instruments CC1101' },
      { name: 'Frequency', value: '779 – 928 MHz (tuned to 868 MHz)' },
      { name: 'Modulation', value: '2-FSK · GFSK · MSK · OOK · ASK' },
      { name: 'Data rate', value: '1.2 – 500 kbps' },
      { name: 'Sensitivity', value: '−116 dBm' },
      { name: 'Interface', value: 'SPI (max 10 MHz)' },
      { name: 'Supply', value: '1.8 – 3.6 V' },
      { name: 'Stock note', value: 'Limited stock — not commonly available in India' },
    ],
  },
];

let seeded: Promise<void> | undefined;

export async function ensureCatalog() {
  if (!seeded) {
    seeded = (async () => {
      await db.insert(sections).values(initialSections).onConflictDoNothing();
      await db.insert(products).values(initial).onConflictDoNothing();
    })().catch((e) => {
      seeded = undefined;
      throw e;
    });
  }
  await seeded;
}

export async function getProducts() {
  await ensureCatalog();
  return db.select().from(products).where(eq(products.active, true));
}

export async function getSections(admin = false) {
  await ensureCatalog();
  const rows = await db.select().from(sections).orderBy(asc(sections.order));
  return admin ? rows : rows.filter((s) => s.active);
}
