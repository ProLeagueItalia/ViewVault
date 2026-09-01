import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const MESSAGES_DIR = path.join(
  ROOT_DIR,
  "messages"
);

const SOURCE_LOCALE = "it";

const LOCALES = [
  "it",
  "en",
  "es",
  "fr",
  "de",
];

function loadMessages(locale) {
  const filePath = path.join(
    MESSAGES_DIR,
    `${locale}.json`
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `File delle traduzioni non trovato: messages/${locale}.json`
    );
  }

  const content = fs.readFileSync(
    filePath,
    "utf8"
  );

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `JSON non valido in messages/${locale}.json: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }
}

function getKeys(
  object,
  prefix = ""
) {
  const keys = [];

  for (const [key, value] of Object.entries(
    object
  )) {
    const fullKey = prefix
      ? `${prefix}.${key}`
      : key;

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      keys.push(
        ...getKeys(value, fullKey)
      );
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function difference(
  firstSet,
  secondSet
) {
  return [...firstSet].filter(
    (key) => !secondSet.has(key)
  );
}

function printKeys(title, keys) {
  if (keys.length === 0) {
    return;
  }

  console.log(`\n${title}`);

  for (const key of keys) {
    console.log(`  • ${key}`);
  }
}

console.log(
  "\n🌍 ViewVault Translation Check\n"
);

let sourceMessages;

try {
  sourceMessages =
    loadMessages(SOURCE_LOCALE);
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : error
  );

  process.exit(1);
}

const sourceKeys = new Set(
  getKeys(sourceMessages)
);

console.log(
  `🇮🇹 Sorgente: ${SOURCE_LOCALE}.json`
);

console.log(
  `🔑 Chiavi trovate: ${sourceKeys.size}\n`
);

let hasErrors = false;

for (const locale of LOCALES) {
  if (locale === SOURCE_LOCALE) {
    continue;
  }

  let messages;

  try {
    messages = loadMessages(locale);
  } catch (error) {
    console.error(
      `❌ ${locale.toUpperCase()}: ${
        error instanceof Error
          ? error.message
          : error
      }`
    );

    hasErrors = true;
    continue;
  }

  const localeKeys = new Set(
    getKeys(messages)
  );

  const missingKeys = difference(
    sourceKeys,
    localeKeys
  );

  const extraKeys = difference(
    localeKeys,
    sourceKeys
  );

  if (
    missingKeys.length === 0 &&
    extraKeys.length === 0
  ) {
    console.log(
      `✅ ${locale.toUpperCase()}: ${localeKeys.size} chiavi, tutto sincronizzato`
    );

    continue;
  }

  hasErrors = true;

  console.log(
    `❌ ${locale.toUpperCase()}: traduzioni non sincronizzate`
  );

  printKeys(
    "   Chiavi mancanti:",
    missingKeys
  );

  printKeys(
    "   Chiavi extra:",
    extraKeys
  );
}

if (hasErrors) {
  console.log(
    "\n❌ Controllo traduzioni fallito.\n"
  );

  process.exit(1);
}

console.log(
  "\n🎉 Tutti i file delle traduzioni sono sincronizzati.\n"
);