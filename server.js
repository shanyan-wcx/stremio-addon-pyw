#!/usr/bin/env node

const { serveHTTP, publishToCentral } = require("stremio-addon-sdk")
const addonInterface = require("./addon")
serveHTTP(addonInterface, { port: process.env.PORT || 49595 })
publishToCentral("https://2b8facee70bc-pyw.baby-beamup.club/manifest.json")