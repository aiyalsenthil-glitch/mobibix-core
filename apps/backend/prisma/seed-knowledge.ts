import { PrismaClient, RepairKnowledgeStatus, RepairKnowledgeSource } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_DATA = {
  "faultTypes": [
    { "faultName": "Not Charging", "description": "Device does not recognize charger or battery percentage does not increase" },
    { "faultName": "No Display", "description": "Device turns on but screen remains black or shows abnormal graphics" },
    { "faultName": "No Power", "description": "Device is completely dead and does not react to power button or charger" },
    { "faultName": "Boot Loop", "description": "Device restarts repeatedly at the brand logo or is stuck on the loading screen" },
    { "faultName": "No Network", "description": "Device shows 'No Service', 'Emergency Calls Only', or fails to detect SIM card" },
    { "faultName": "Audio Issue", "description": "Problems with loudspeaker, earpiece, or microphone during calls and media" },
    { "faultName": "Touch Not Working", "description": "Screen does not respond to touch or has 'ghost touch' issues" },
    { "faultName": "Rapid Battery Drain", "description": "Battery depletes unexpectedly fast or device gets hot during idle" },
    { "faultName": "WiFi/Bluetooth Grayed Out", "description": "WiFi or Bluetooth switches cannot be toggled or signal is extremely weak" },
    { "faultName": "Camera Failure", "description": "Camera app crashes, shows black screen, or produces blurry images" }
  ],
  "diagnosisGuides": [
    {
      "faultType": "Not Charging",
      "steps": [
        "Inspect the charging port for lint, debris, or moisture corrosion",
        "Test with a high-wattage known-good cable and adapter",
        "Check battery connector for loose fit or bent pins",
        "Measure VBUS 5V at the charging port flex connector",
        "Check VPH_PWR and VBAT line voltages",
        "Inspect charging IC or OVP (Over Voltage Protection) chip for shorts"
      ]
    },
    {
      "faultType": "No Display",
      "steps": [
        "Check if device is vibrating or making sounds (proving motherboard life)",
        "Shine a flashlight on the screen to check for low-light images (Backlight issue)",
        "Test with a known-good working LCD/OLED assembly",
        "Inspect Display FPC connector on the motherboard for damaged pins",
        "Check display power supply lines (VSP/VSN or +5V/-5V)",
        "Measure backlight diode and coil for continuity"
      ]
    },
    {
      "faultType": "No Power",
      "steps": [
        "Connect to a DC Power Supply and check current draw (Amps)",
        "Check for a short circuit on the VCC_MAIN or BATT line",
        "Trigger the power button and observe boot sequence current",
        "Inspect the motherboard for signs of water damage or burnt components",
        "Verify 1.8V and 0.8V rails for PMIC (Power Management IC) activity",
        "Check 26MHz clock crystal and CPU reset signals"
      ]
    }
  ],
  "repairNotes": [
    // --- XIAOMI / REDMI / POCO ---
    { "phoneModel": "Poco X3", "faultType": "Boot Loop", "repairTip": "CPU soldering failure (Dry Solder). Reballing the Snapdragon 732G CPU is 100% required fix." },
    { "phoneModel": "Poco X3 Pro", "faultType": "No Power", "repairTip": "Sudden death is usually a CPU/RAM dual-stack failure. Requires professional reballing." },
    { "phoneModel": "Redmi Note 10 Pro", "faultType": "Camera Failure", "repairTip": "Front camera or main camera black screen is caused by CPU solder joints breaking. Reball CPU." },
    { "phoneModel": "Redmi Note 10", "faultType": "Not Charging", "repairTip": "Main-to-sub interconnect flex cable often breaks internally. Replace flex before motherbord repair." },
    { "phoneModel": "Redmi 9 Power", "faultType": "No Power", "repairTip": "Common PMIC (Power Management IC) bug. Cooling the PMIC or slightly reflowing sometimes works, but replacement is better." },
    { "phoneModel": "Poco M3", "faultType": "No Power", "repairTip": "Device dies after shutdown. Usually a failure in the 1.8V line near the CPU. Reballing fixes it." },
    { "phoneModel": "Redmi Note 9 Pro", "faultType": "WiFi/Bluetooth Grayed Out", "repairTip": "Check the WiFi IC WCN3950. Often fails after impact/drops. Reflow or replace." },
    { "phoneModel": "Redmi Note 7 Pro", "faultType": "No Display", "repairTip": "Inspect the display light IC and diode (near the battery connector). Water damage often shorts the backlight filter." },
    { "phoneModel": "Redmi Note 8", "faultType": "Audio Issue", "repairTip": "Lower speaker stops working due to sub-board connector oxidation. Clean FPC with IPA." },
    { "phoneModel": "Mi 11 Ultra", "faultType": "WiFi/Bluetooth Grayed Out", "repairTip": "WiFi IC overheating leads to solder bridge/disconnect. Highly common manufacturing defect." },
    { "phoneModel": "Redmi 10 Prime", "faultType": "Boot Loop", "repairTip": "Check the power button strip; it's prone to ghost-triggering. Disconnect and test boot." },
    { "phoneModel": "Poco F1", "faultType": "Touch Not Working", "repairTip": "The display connector is prone to popping loose. Check the battery pressure bracket." },
    { "phoneModel": "Redmi Note 12 Pro", "faultType": "No Network", "repairTip": "RF antenna clips on the sub-board are fragile. Often pop loose after screen replacements." },
    { "phoneModel": "Redmi 9A", "faultType": "No Display", "repairTip": "Blue screen or REMOVED_PAYMENT_INFRAs often indicates a faulty LCD panel. Test with original quality display." },
    { "phoneModel": "Poco X2", "faultType": "Camera Failure", "repairTip": "Known CPU soldering issue affecting data lines to the sensor. Requires CPU reball." },
    { "phoneModel": "Mi 10T", "faultType": "No Power", "repairTip": "Check for short on VPH_PWR line. Frequently a capacitor near the PMIC." },
    { "phoneModel": "Redmi Note 11", "faultType": "Rapid Battery Drain", "repairTip": "Check for current leakage in the charging IC even when off. Typical SMB chip failure." },
    { "phoneModel": "Redmi 12 5G", "faultType": "Not Charging", "repairTip": "USB-C port pins are easily bent. Always inspect pins under a microscope." },
    { "phoneModel": "Redmi Note 10S", "faultType": "No Display", "repairTip": "Backlight coil failure. Replace the 4R7 coil near the display connector." },
    { "phoneModel": "Poco M2 Pro", "faultType": "No Network", "repairTip": "Signal drops are caused by the network transceiver IC WTR2965. Replace it." },

    // --- SAMSUNG ---
    { "phoneModel": "Samsung A51", "faultType": "No Display", "repairTip": "Motherboard main FPC connector develops spider-cracks in solder. Reflow or replace connector." },
    { "phoneModel": "Samsung M31", "faultType": "Boot Loop", "repairTip": "Exynos 9611 CPU solder joints fail to the motherboard. Reballing the CPU is the only permanent solution." },
    { "phoneModel": "Samsung M21", "faultType": "No Power", "repairTip": "Sudden death often related to the CPU/RAM stack. Common in 9611 chipset models." },
    { "phoneModel": "Samsung A50", "faultType": "Not Charging", "repairTip": "Slow charging or 'Moisture detected' error. Replace the sub-board with an original module." },
    { "phoneModel": "Samsung M51", "faultType": "No Display", "repairTip": "OLED panel internal crack common near bottom edge. Test with a known good original display pack." },
    { "phoneModel": "Samsung S20 FE", "faultType": "Touch Not Working", "repairTip": "If touch is jittery, check the display flex for pressure marks. Common assembly issue." },
    { "phoneModel": "Samsung A21s", "faultType": "No Network", "repairTip": "Signal IC 77656-11 is a frequent failure point. Replace the PA module." },
    { "phoneModel": "Samsung J7 Prime", "faultType": "No Power", "repairTip": "Power IC (S2MU004X01) short is very common in this old running model." },
    { "phoneModel": "Samsung A31", "faultType": "No Display", "repairTip": "Check display power PMIC. If VSP/VSN (+5/-5) are missing, replace display supply IC." },
    { "phoneModel": "Samsung M31s", "faultType": "Boot Loop", "repairTip": "Hangs on Samsung logo. CPU reball is standard practice for this model." },
    { "phoneModel": "Samsung A12", "faultType": "No Power", "repairTip": "Dead device often caused by MediaTek PMIC failure. Check for Vcore rails." },
    { "phoneModel": "Samsung A71", "faultType": "Not Charging", "repairTip": "Interconnect flex port on the motherboard gets damaged by heat. Inspect FPC closely." },
    { "phoneModel": "Samsung J2", "faultType": "Touch Not Working", "repairTip": "Corrosion on the touch IC pins (located on the display flex) is very common." },
    { "phoneModel": "Samsung S21 Ultra", "faultType": "WiFi/Bluetooth Grayed Out", "repairTip": "Sandwich board separation. Bottom board contains WiFi logic. Requires re-sandwiching." },
    { "phoneModel": "Samsung M30s", "faultType": "No Power", "repairTip": "Sudden death due to dry solder on Exynos CPU. Reballing is the fix." },
    { "phoneModel": "Samsung A20", "faultType": "No Display", "repairTip": "Blue REMOVED_PAYMENT_INFRAs or black screen after drop. OLED cracked at the IC level." },
    { "phoneModel": "Samsung A52", "faultType": "Audio Issue", "repairTip": "Bottom speaker distortion. Water usually enters through the mesh and damages the cone." },
    { "phoneModel": "Samsung M11", "faultType": "Not Charging", "repairTip": "Check USB port for oxidation. Charge port is soldered directly on the sub-board." },
    { "phoneModel": "Samsung S22", "faultType": "No Network", "repairTip": "Network antenna cable is easily pinched during back glass replacement." },
    { "phoneModel": "Samsung S8", "faultType": "Rapid Battery Drain", "repairTip": "Old batteries swell and cause high current consumption. Replace battery." },

    // --- APPLE ---
    { "phoneModel": "iPhone 7", "faultType": "Audio Issue", "repairTip": "Loop disease (Audio IC failure). Pad C12 is broken. Requires jumper to Audio IC." },
    { "phoneModel": "iPhone 7 Plus", "faultType": "Camera Failure", "repairTip": "Rear camera black screen due to 2.8V line shorted. Check the small LDO chip." },
    { "phoneModel": "iPhone 8", "faultType": "No Power", "repairTip": "Short circuit on VDD_MAIN. Usually a capacitor near the A11 CPU or NAND." },
    { "phoneModel": "iPhone X", "faultType": "Touch Not Working", "repairTip": "Sandwich board separation. Touch data lines are on the interposer pins. Re-solder layers." },
    { "phoneModel": "iPhone XR", "faultType": "No Display", "repairTip": "Filing/cracking of the backlight filter (near LCD connector) after screen swap." },
    { "phoneModel": "iPhone 11", "faultType": "No Power", "repairTip": "Short on PP_VDD_BOOST. Common failure in charging circuitry after using cheap cables." },
    { "phoneModel": "iPhone 11 Pro", "faultType": "Camera Failure", "repairTip": "FaceID failure frequently caused by moisture entering the top earpiece assembly (Flood Illuminator)." },
    { "phoneModel": "iPhone 12", "faultType": "No Display", "repairTip": "OLED 'Green Screen' or flicker. Internal OLED fracture. Panel replacement only." },
    { "phoneModel": "iPhone 12 Mini", "faultType": "No Power", "repairTip": "Check for short in the 5G modem subsystem caps. Proximity to heat causes issues." },
    { "phoneModel": "iPhone 13", "faultType": "No Display", "repairTip": "Sudden white or pink screen. Motherboard display signal line disconnect. Sometimes fixable with jumpers." },
    { "phoneModel": "iPhone 6S", "faultType": "No Display", "repairTip": "Backlight circuit failure. Diode and Coil D1/L1 are the primary suspects." },
    { "phoneModel": "iPhone 14", "faultType": "No Network", "repairTip": "Satellite/SOS only. Board flex after drop causes e-SIM chip disconnect." },
    { "phoneModel": "iPhone 15 Pro", "faultType": "Not Charging", "repairTip": "USB-C controller IC failure common if non-MFi cables are used." },
    { "phoneModel": "iPhone SE 2020", "faultType": "Rapid Battery Drain", "repairTip": "Tristar (charging IC) failure causes high drain while off." },
    { "phoneModel": "iPhone XS Max", "faultType": "Audio Issue", "repairTip": "Lower speaker crackling. Inspect for debris in the acoustic chamber." },

    // --- REALME ---
    { "phoneModel": "Realme 8", "faultType": "Not Charging", "repairTip": "SuperDart charging fails if the VBUS pin in the Type-C port is slightly wide. Replace port." },
    { "phoneModel": "Realme 7", "faultType": "No Display", "repairTip": "Check the 8-pin display driver IC near the CPU. Often shorts after liquid damage." },
    { "phoneModel": "Realme Narzo 50", "faultType": "No Power", "repairTip": "Check the battery connector connector on the board. It's fragile and often breaks solder." },
    { "phoneModel": "Realme 6", "faultType": "Touch Not Working", "repairTip": "Ghost touch is 90% a low-quality screen issue. Use original-quality parts." },
    { "phoneModel": "Realme C11", "faultType": "No Power", "repairTip": "MTK PMIC MT6357 often fails. Check for a short on the secondary coil." },
    { "phoneModel": "Realme Narzo 20", "faultType": "No Network", "repairTip": "Signal drops after drop. Antennna coax cable often pops off the motherboard." },
    { "phoneModel": "Realme 9 Pro", "faultType": "Camera Failure", "repairTip": "Main camera data lines are routed near the top screw. A long screw can kill the path." },
    { "phoneModel": "Realme C35", "faultType": "No Display", "repairTip": "Backlight fuse (marked 0) near the display connector often blows." },
    { "phoneModel": "Realme 5 Pro", "faultType": "Not Charging", "repairTip": "VooC charging needs the 5th ID pin. If middle pins are dirty, it charges slowly." },
    { "phoneModel": "Realme 8i", "faultType": "Audio Issue", "repairTip": "Microphone low volume. Clean the secondary noise-cancelling mic on top." },

    // --- VIVO ---
    { "phoneModel": "Vivo V20", "faultType": "No Power", "repairTip": "Power button flex is paper-thin and easily tears. Check button resistance first." },
    { "phoneModel": "Vivo V15 Pro", "faultType": "Not Charging", "repairTip": "Pop-up assembly uses high power. Check the motor driver for shorts if charging stalls." },
    { "phoneModel": "Vivo Y20", "faultType": "No Power", "repairTip": "Common short in the VCC_MAIN caps around the CPU area." },
    { "phoneModel": "Vivo V21", "faultType": "No Display", "repairTip": "AMOLED panel easily develops green lines. Defective panel batch is common." },
    { "phoneModel": "Vivo Y11", "faultType": "Touch Not Working", "repairTip": "Check for moisture near the LCD connector pins. 1.8V touch line is easily corroded." },
    { "phoneModel": "Vivo V23", "faultType": "WiFi/Bluetooth Grayed Out", "repairTip": "WiFi IC overheating. Requires reball or replacement of the WiFi chip." },
    { "phoneModel": "Vivo Y33s", "faultType": "No Network", "repairTip": "Check the RF antenna cables. The blue wire often snaps during disassembly." },
    { "phoneModel": "Vivo V9", "faultType": "Boot Loop", "repairTip": "Stuck on Vivo logo. Usually a faulty EMMC/Memory chip or depleted battery." },
    { "phoneModel": "Vivo Y15", "faultType": "Audio Issue", "repairTip": "No ringer sound. Inspect the loudspeaker housing for loose spring contacts." },
    { "phoneModel": "Vivo V20 Pro", "faultType": "Camera Failure", "repairTip": "Rear wide-angle camera short stops the whole camera app from opening." },

    // --- OPPO ---
    { "phoneModel": "Oppo F17", "faultType": "Not Charging", "repairTip": "SMB charging IC (usually SMB1351) fails after using non-Oppo VOOC chargers." },
    { "phoneModel": "Oppo F19 Pro", "faultType": "No Display", "repairTip": "Display flex is very short. If the battery is swollen, it pulls and cracks the flex." },
    { "phoneModel": "Oppo A15", "faultType": "No Power", "repairTip": "Check for short in the network PA area. Common entry point for water damage." },
    { "phoneModel": "Oppo F21 Pro", "faultType": "Camera Failure", "repairTip": "Orbit light (ring light) short can cause the camera system to crash." },
    { "phoneModel": "Oppo A54", "faultType": "No Power", "repairTip": "PMIC failure MT6358. Check the boot voltage at the power button (should be 4V)." },
    { "phoneModel": "Oppo Renee 6", "faultType": "WiFi/Bluetooth Grayed Out", "repairTip": "Check the WiFi antenna contacts. If they are oxidized, WiFi will scan but not connect." },
    { "phoneModel": "Oppo A74", "faultType": "Not Charging", "repairTip": "Sub-to-main flex FPC connector pins are fragile. Inspect for burnt ground pin." },
    { "phoneModel": "Oppo F15", "faultType": "Touch Not Working", "repairTip": "Commonly fails after localized pressure on the top right screen corner." },
    { "phoneModel": "Oppo A5", "faultType": "Audio Issue", "repairTip": "Microphone failure. Replace the entire charging flex for a clean fix." },
    { "phoneModel": "Oppo Reno 8", "faultType": "Rapid Battery Drain", "repairTip": "Check the 5G modem for overheating. Disable 5G to test current drop." },

    // --- ONEPLUS ---
    { "phoneModel": "OnePlus 7", "faultType": "No Power", "repairTip": "UFS memory chip common failure (EMMC/UFS wear). Usually stays in Qualcomm 9008 mode." },
    { "phoneModel": "OnePlus 7T", "faultType": "No Display", "repairTip": "Sudden black screen. OLED flex failure at the fold. Requires new screen." },
    { "phoneModel": "OnePlus 8", "faultType": "WiFi/Bluetooth Grayed Out", "repairTip": "WiFi IC WCN3998 failure. Highly sensitive to heat. Re-ball carefully." },
    { "phoneModel": "OnePlus Nord", "faultType": "No Network", "repairTip": "Signal drops on the Nord series are often related to 5G PA IC issues." },
    { "phoneModel": "OnePlus Nord 2", "faultType": "No Power", "repairTip": "Sudden death. Check for 1.8V short near the Mediatek Dimensity CPU." },
    { "phoneModel": "OnePlus 8T", "faultType": "Green Line Issue", "repairTip": "Defective OLED display batch. Free replacement often available from official centres." },
    { "phoneModel": "OnePlus 9R", "faultType": "No Display", "repairTip": "Black screen with vibration. Display ID pin is disconnected. Re-seat connector." },
    { "phoneModel": "OnePlus Nord CE", "faultType": "Not Charging", "repairTip": "Port oxide is very common. Clean the port with a needle before replacing." },

    // --- GOOGLE PIXEL ---
    { "phoneModel": "Pixel 6", "faultType": "No Network", "repairTip": "Exynos modem network dropout issues. Often fixed by latest OTA, else hardware swap." },
    { "phoneModel": "Pixel 7a", "faultType": "No Power", "repairTip": "Tensor G2 CPU overheating. Check for thermal pad status." },
    { "phoneModel": "Pixel 4a", "faultType": "No Display", "repairTip": "Super fragile OLED. Even a 1 foot drop can crack the inner OLED layer." },

    // --- MOTOROLA ---
    { "phoneModel": "Moto G60", "faultType": "No Display", "repairTip": "LCD backlight booster IC common failure after using high-brightness in heat." },
    { "phoneModel": "Moto G40 Fusion", "faultType": "No Network", "repairTip": "Antenna path disconnects near the top. Check the gold spring pins." },

    // --- INFINIX / TECHNO ---
    { "phoneModel": "Infinix Note 12", "faultType": "Not Charging", "repairTip": "Type-C port sub-board is very thin. Breaks easily. Use reinforced original sub." },
    { "phoneModel": "Techno Pova 2", "faultType": "No Power", "repairTip": "PMIC overheating. Check the large coil near the CPU." }
  ]
};

async function seed() {
  console.log('🚀 Bulk Seeding Repair Knowledge Base (v4 - Massive 100+ Model Update)...');

  // 1. Fault Types
  for (const ft of SEED_DATA.faultTypes) {
    const existing = await prisma.faultType.findUnique({ where: { name: ft.faultName } });
    if (!existing) {
       await prisma.faultType.create({ data: { name: ft.faultName } });
    }
  }
  console.log('✅ Fault Types Verified');

  // 2. Diagnosis Guides
  for (const guide of SEED_DATA.diagnosisGuides) {
    const faultType = await prisma.faultType.findUnique({
      where: { name: guide.faultType },
    });
    if (!faultType) continue;

    const existingGuide = await prisma.faultDiagnosis.findFirst({
      where: { tenantId: null, faultTypeId: faultType.id }
    });

    if (existingGuide) {
      await prisma.faultDiagnosis.update({
        where: { id: existingGuide.id },
        data: {
          steps: {
            deleteMany: {},
            create: guide.steps.map((step, idx) => ({
              order: idx + 1,
              stepText: step,
            })),
          },
        },
      });
    } else {
      await prisma.faultDiagnosis.create({
        data: {
          tenantId: undefined,
          faultTypeId: faultType.id,
          steps: {
            create: guide.steps.map((step, idx) => ({
              order: idx + 1,
              stepText: step,
            })),
          },
        },
      });
    }
  }
  console.log('✅ Diagnosis Guides Verified');

  // 3. Brand/Model Helper
  const getBrandAndModel = (fullName: string) => {
    const parts = fullName.split(' ');
    let brandName = parts[0];
    let modelName = parts.slice(1).join(' ');
    
    // Normalize Logic
    if (brandName.toLowerCase() === 'iphone') {
        brandName = 'Apple';
        modelName = fullName;
    }
    if (brandName.toLowerCase() === 'pixel') {
        brandName = 'Google';
    }
    if (brandName.toLowerCase() === 'moto') {
        brandName = 'Motorola';
    }
    
    return { brandName, modelName };
  };

  // 4. Batch Repair Notes (with model creation)
  console.log(`📦 Processing ${SEED_DATA.repairNotes.length} professional notes...`);
  
  const allBrands = await prisma.brand.findMany();
  const allFaultTypes = await prisma.faultType.findMany();
  
  let noteCount = 0;
  for (const note of SEED_DATA.repairNotes) {
    const faultType = allFaultTypes.find(f => f.name === note.faultType);
    if (!faultType) continue;

    const { brandName, modelName } = getBrandAndModel(note.phoneModel);

    // Ensure Brand
    let brand = allBrands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
    if (!brand) {
        brand = await prisma.brand.create({ data: { name: brandName } });
        allBrands.push(brand);
    }

    // Ensure PhoneModel
    let phoneModel = await prisma.phoneModel.findFirst({
        where: { brandId: brand.id, modelName: { equals: modelName, mode: 'insensitive' } }
    });

    if (!phoneModel) {
        phoneModel = await prisma.phoneModel.create({
            data: { brandId: brand.id, modelName: modelName }
        });
    }

    // Upsert Note
    const existingNote = await prisma.repairKnowledge.findFirst({
        where: {
            phoneModelId: phoneModel.id,
            faultTypeId: faultType.id,
            content: note.repairTip,
            tenantId: null
        }
    });

    if (!existingNote) {
        await prisma.repairKnowledge.create({
          data: {
            phoneModelId: phoneModel.id,
            faultTypeId: faultType.id,
            content: note.repairTip,
            source: RepairKnowledgeSource.SYSTEM,
            status: RepairKnowledgeStatus.APPROVED,
          },
        });
        noteCount++;
    }
  }

  console.log(`✅ Bulk Seeding Complete. Added ${noteCount} new unique repair notes.`);
  console.log(`✨ MobiBix Knowledge Base now covers ${SEED_DATA.repairNotes.length} signature issues.`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
