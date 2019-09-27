// Constants
const STORE_CONFIG = {isGlobalStore:true}
const SOUP_CONFIGS = {
    internalString: {
        soupSpec: {
            name: "i_str",
            features: []
        },
        indexSpecs: [{path:"key", type:"string"}]
    },
    internalJson1: {
        soupSpec: {
            name: "i_json1",
            features: []
        },
        indexSpecs: [{path:"key", type:"json1"}]
    },
    externalString: {
        soupSpec: {
            name: "e_str",
            features: ["externalStorage"]
        },
        indexSpecs: [{path:"key", type:"string"}]
    }
}

// Global variables
var storeClient

// Sets up soup 
// If soup already exists:
// - if removeIfExist is true, the existing soup is removed and a new soup is created
// - if removeIfExist is false, the existing soup is left alone
function setupSoup(removeIfExist, soupConfig) {
    var soupName = soupConfig.soupSpec.name
    
    var createSoup = () => {
        log("Registering soup " + soupName, "blue")
        return storeClient.registerSoupWithSpec(STORE_CONFIG, soupConfig.soupSpec, soupConfig.indexSpecs)
            .then(() => { log("Registered soup " + soupName, "green") })
    }
    
    return storeClient.soupExists(STORE_CONFIG, soupName)
        .then((exists) => {
            if (exists && removeIfExist) {
                log("Removing soup " + soupName, "blue")
                return storeClient.removeSoup(STORE_CONFIG, soupName)
                    .then(() => {
                        log("Removed soup " + soupName, "green")
                        return createSoup()
                    })
            } else {
                return createSoup()
            }
        })
}

function setupSoups(removeIfExist) {
    log("Setting up soups", "blue")
    setupSoup(removeIfExist, SOUP_CONFIGS.internalString)
        .then(() => { setupSoup(removeIfExist, SOUP_CONFIGS.internalJson1) })
        .then(() => { setupSoup(removeIfExist, SOUP_CONFIGS.externalStorage) })
}

// Function invoked when a btnReset is pressed
function onReset() {
    clearLog()
    setupSoups(true)
}

// Function invoked when a btnBench* is pressed
function onBench(size) {
    log("Benchmark " + size + " not implemented yet")
}

/*
// Function invoked when a btnBench is pressed
function onBench(totalSize) {
    COUNTS.map((count) => {
        var settings = {
            depth: 0,                      // depth of json objects
            numberOfChildren: 1,           // number of branches at each level
            keyLength: 100,                // length of keys
            valueLength: totalSize/count,  // length of leaf values
            minCodePoint: "20",            // smallest code point to use in random strings
            maxCodePoint: "FF"             // largest code point to use in random strings
        }

        
    })
}

function benchMark(soupConfig, entryShape, count) {
    return insert(soupConfig, entryShape, count)
        .then(queryAll(soupConfig, 
}


// Function returning rounded size in b, kb or mb
function roundedSize(size) {
    if (size < 1024) {
        return size + " b"
    } else if (size < 1024 * 1024) {
        return Math.round(size*100 / 1024)/100 + " kb"
    } else {
        return Math.round(size*100 / 1024 / 1024)/100 + " mb"
    }
}

// Function returning approximate entry size as a string
function getEntrySizeAsString(settings) {
    return roundedSize(JSON.stringify(generateEntry(settings)).length)
}


function insert(settings, n, i, start, actuallyAdded) {
    var entrySize = getEntrySizeAsString(settings)
    i = i || 0
    start = start || time()
    actuallyAdded = actuallyAdded || 0

    if (i == 0) {
        log(`+ ${n} x ${entrySize}`, "blue")
    }
    
    if (i < n) {
        storeClient.upsertSoupEntries(STORE_CONFIG, SOUPNAME, [generateEntry()])
            .then(() => { return onInsert(n, i+1, start, actuallyAdded+1) } )
            .catch(() => { return onInsert(n, i+1, start, actuallyAdded) } )
    }
    else {
        var elapsedTime = time() - start
        log(`+ ${actuallyAdded} in ${elapsedTime} ms`, "green")
    }
}

// Function invoked when a btnQueryAll* button is pressed
function onQueryAll(pageSize) {
    var start = time()
    log(`Q with page ${pageSize}`, "blue")
    storeClient.runSmartQuery(STORE_CONFIG, {queryType: "smart", smartSql:SMART_QUERY, pageSize:pageSize})
        .then(cursor => {
            log(`Q matching ${cursor.totalEntries}`)
            return traverseResultSet(cursor, cursor.currentPageOrderedEntries.length, start)
        })
}

// Helper for onQueryAll to traverse the result set to the end and count number of records actually returned
function traverseResultSet(cursor, countSeenSoFar, start) {
    if (cursor.currentPageIndex < cursor.totalPages - 1) {
        return storeClient.moveCursorToNextPage(STORE_CONFIG, cursor)
            .then(cursor => {
                return traverseResultSet(cursor, countSeenSoFar + cursor.currentPageOrderedEntries.length, start)
            })
    } else {
        var elapsedTime = time() - start
        log(`Q ${countSeenSoFar} in ${elapsedTime} ms`, "green")
    }
}

// Helper function to generate object
// @param depth
// @param numberOfChildren
// @param keyLength
// @param valueLength
function generateObject(depth, numberOfChildren, keyLength, valueLength) {
    if (depth > 0) {
        var obj = {}
        for (var i=0; i<numberOfChildren; i++) {
            obj[generateString(keyLength)] = generateObject(depth-1, numberOfChildren, keyLength, valueLength) 
        }
        return obj
    } else {
        return generateString(valueLength)
    }
}

// Helper function to generate string of length l
// @param l desired length
function generateString(l) {
    var minCodePoint = parseInt(settings.minCodePoint, 16)
    var maxCodePoint = parseInt(settings.maxCodePoint, 16)
    return [...Array(l)].map(() => {
        return String.fromCodePoint(Math.floor(Math.random() * (maxCodePoint+1-minCodePoint) + minCodePoint))
    }).join('')
}

// Helper function to return current time in ms
function time() {
    return (new Date()).getTime()
}
*/

// Helper function to clear screen
function clearLog() {
    document.querySelector('#ulConsole').innerHTML = ""
}

// Helper function to write output to screen
// @param msg to write out
// @param color (optional)
function log(msg, color) {
    var d = new Date()
    var prefix = new Date().toISOString().slice(14, 23)
    msg = color ? msg.fontcolor(color) : msg
    document.querySelector('#ulConsole').innerHTML = `<li class="table-view-cell"><div class="media-body">${prefix}: ${msg}</div></li>`
        + document.querySelector('#ulConsole').innerHTML
}

// Helper function to generate entry
function generateEntry() {
    try {
        return {
            key: generateString(settings.keyLength),
            value: generateObject(settings.depth, settings.numberOfChildren, settings.keyLength, settings.valueLength)
            
        }
    }
    catch (err) {
        log(`Could not generate entry: ${err.message}`, "red")
        throw err
    }
}


// main function
// Sets up soups if needed
function main() {
    document.addEventListener("deviceready", function () {
        // Watch for global errors
        window.onerror = (message, source, lineno, colno, error) => {
            log(`windowError fired with ${message}`, "red")
        }
        // Connect buttons
        document.getElementById('btnReset').addEventListener("click", onReset)
        document.getElementById('btnBenchSmall').addEventListener("click", () => { onBench(5) })
        document.getElementById('btnBenchMedium').addEventListener("click", () => { onBench(100) })
        document.getElementById('btnBenchLarge').addEventListener("click", () => { onBench(1000) })
        document.getElementById('btnBenchExtraLarge').addEventListener("click", () => { onBench(5000) })
                              
        // Get store client
        storeClient = cordova.require("com.salesforce.plugin.smartstore.client")
        // Sets up soups - don't drop soups if it already exists
        setupSoups(false)
    })
}

main()
