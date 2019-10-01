// Constants
const TOTAL_SIZES_MB = {
    SMALL: 8,
    MEDIUM: 32,
    LARGE: 128
}

// Store config for all soups
const STORE_CONFIG =  {isGlobalStore:true}

// Configuration for the test soups
const SOUP_CONFIGS = {
    intString: {
        soupSpec: {
            name: "intString",
            features: []
        },
        indexSpecs: [{path:"key", type:"string"}]
    },
    intJson1: {
        soupSpec: {
            name: "intJson1",
            features: []
        },
        indexSpecs: [{path:"key", type:"json1"}]
    },
    extString: {
        soupSpec: {
            name: "extString",
            features: ["externalStorage"]
        },
        indexSpecs: [{path:"key", type:"string"}]
    }
}

// Characters to use
const MIN_CODE_POINT = 0x20
const MAX_CODE_POINT = 0xFF

// Global variables
var storeClient    // client to do smartstore operations
var events = {}    // map of message to start time
var TOTAL_SIZE_MB  // total number of characters (in leaf values) written and read during a benchmark

// Sets up a test soup
function setupSoup(soupConfig) {
    var soupName = soupConfig.soupSpec.name
    var rmMsg = `rm ${soupName}`
    var addMsg = `add ${soupName}`
        
    return storeClient.removeSoup(STORE_CONFIG, soupName)
        .then(() => {
            return storeClient.registerSoupWithSpec(STORE_CONFIG, soupConfig.soupSpec, soupConfig.indexSpecs)
        })
}

// Setup all test soups
function setupSoups() {
    return setupSoup(SOUP_CONFIGS.intString)
        .then(() => { return setupSoup(SOUP_CONFIGS.intJson1) })
        .then(() => { return setupSoup(SOUP_CONFIGS.extString) })
}

// Function invoked when top segmeted control is changed
function setTotalSize(totalSizeMb) {
    TOTAL_SIZE_MB = totalSizeMb
    var sizes = [TOTAL_SIZES_MB.SMALL, TOTAL_SIZES_MB.MEDIUM, TOTAL_SIZES_MB.LARGE]
    var activeIndex = sizes.indexOf(totalSizeMb)
    var eltIds = ["anchorTotalSizeSmall", "anchorTotalSizeMedium", "anchorTotalSizeLarge"]
    eltIds.forEach((eltId, i) => {
        if (i == activeIndex) {
            document.getElementById(eltId).classList.add('active')
        } else {
            document.getElementById(eltId).classList.remove('active')
        }
    })
}

// Function invoked when a btnBench* is pressed
function onBench(entrySize) {
    var n = TOTAL_SIZE_MB*1024*1024 / entrySize
    resetResultTable(`BENCHMARK ${n} x ${roundedSize(entrySize)}`)

    var entryShape = {
        depth: 1,                      // depth of json objects
        numberOfChildren: 16,          // number of branches at each level
        keyLength: 128                 // length of keys
    }
    entryShape.valueLength = entrySize / Math.pow(entryShape.numberOfChildren, entryShape.depth) // length of leaf values

    return setupSoups()
        // populate tables
        .then(() => { return insert(SOUP_CONFIGS.intString, entryShape, n) })
        .then(() => { return insert(SOUP_CONFIGS.extString, entryShape, n) })
        .then(() => { return insert(SOUP_CONFIGS.intJson1, entryShape, n) })
        // query with page size 1
        .then(() => { return query(SOUP_CONFIGS.intString, n, 1) })
        .then(() => { return query(SOUP_CONFIGS.extString, n, 1) })
        .then(() => { return query(SOUP_CONFIGS.intJson1, n, 1) })
        // query with page size 4
        .then(() => { return query(SOUP_CONFIGS.intString, n, 4) })
        .then(() => { return query(SOUP_CONFIGS.extString, n, 4) })
        .then(() => { return query(SOUP_CONFIGS.intJson1, n, 4) })
        // query with page size 16
        .then(() => { return query(SOUP_CONFIGS.intString, n, 16) })
        .then(() => { return query(SOUP_CONFIGS.extString, n, 16) })
        .then(() => { return query(SOUP_CONFIGS.intJson1, n, 16) })

}

// Insert n entries with the given shape in the given soup
function insert(soupConfig, entryShape, n) {
    var soupName = soupConfig.soupSpec.name
    startBench(`bench_${soupName}_ins`)
    return actualInsert(soupName, entryShape, n, 0)
}

// Helper for the insert(...)
function actualInsert(soupName, entryShape, n, i) {
    if (i < n) {
        return storeClient
            .upsertSoupEntries(STORE_CONFIG, soupName, [generateEntry(entryShape)])
            .then(() => {
                return actualInsert(soupName, entryShape, n, i+1)
            })
    }
    else {
        endBench(`bench_${soupName}_ins`)
    }
}

// Query all entries using the given pageSize
function query(soupConfig, n, pageSize) {
    var soupName = soupConfig.soupSpec.name
    var query = {queryType: "smart", smartSql:`select {${soupName}:key}, {${soupName}:_soup} from {${soupName}}`, pageSize:pageSize}

    startBench(`bench_${soupName}_q_${pageSize}`)
    return storeClient.runSmartQuery(STORE_CONFIG, query)
        .then(cursor => {
            return traverseResultSet(soupName, cursor)
        })
}

// Helper for query(...)
function traverseResultSet(soupName, cursor) {
    if (cursor.currentPageIndex < cursor.totalPages - 1) {
        return storeClient.moveCursorToNextPage(STORE_CONFIG, cursor)
            .then(cursor => {
                return traverseResultSet(soupName, cursor)
            })
    } else {
        endBench(`bench_${soupName}_q_${cursor.pageSize}`)
    }
}


// Return rounded size in b, kb or mb
function roundedSize(size) {
    if (size < 1024) {
        return size + " b"
    } else if (size < 1024 * 1024) {
        return Math.round(size*100 / 1024)/100 + " kb"
    } else {
        return Math.round(size*100 / 1024 / 1024)/100 + " mb"
    }
}

// Helper function to generate entry
function generateEntry(entryShape) {
    return {
        key: generateString(entryShape.keyLength),
        value: generateObject(entryShape.depth, entryShape.numberOfChildren, entryShape.keyLength, entryShape.valueLength)
    }
}

// Helper for generateEntryGenerate object with given shape
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

// Generate string of length l
function generateString(l) {
    return [...Array(l)].map(() => {
        return String.fromCodePoint(Math.floor(Math.random() * (MAX_CODE_POINT+1-MIN_CODE_POINT) + MIN_CODE_POINT))
    }).join('')
}

// Return current time in ms
function time() {
    return (new Date()).getTime()
}

// Capture start time and show "running" in result table
function startBench(id) {
    events[id] = time()
    document.querySelector(`#${id}`).innerHTML = 'running'.fontcolor('red')
}

// Compute elapsed time and show in result table
function endBench(id) {
    var elapsedTime = time() - events[id]
    document.querySelector(`#${id}`).innerHTML = `${elapsedTime}`
}

// Reset result table
function resetResultTable(title) {
    document.querySelector('#benchTitle').innerHTML = title
    Object.keys(SOUP_CONFIGS).map((soupName) => {
        ["ins", "q_1", "q_4", "q_16"].map((suffix) => {
            document.querySelector(`#bench_${soupName}_${suffix}`).innerHTML = 'not run'
        })
    })
}

// main function
function main() {
    document.addEventListener("deviceready", function () {
        // Watch for global errors
        window.onerror = (message, source, lineno, colno, error) => {
            alert(`windowError fired with ${message}`)
        }
        // Connect buttons
        document.getElementById('btnBenchSmall').addEventListener("click", () => { onBench(8*1024) })
        document.getElementById('btnBenchMedium').addEventListener("click", () => { onBench(128*1024) })
        document.getElementById('btnBenchLarge').addEventListener("click", () => { onBench(1024*1024) })
        document.getElementById('btnBenchExtraLarge').addEventListener("click", () => { onBench(8*1024*1024) })
        document.getElementById('anchorTotalSizeSmall').addEventListener("click", () => { setTotalSize(TOTAL_SIZES_MB.SMALL) })
        document.getElementById('anchorTotalSizeMedium').addEventListener("click", () => { setTotalSize(TOTAL_SIZES_MB.MEDIUM) })
        document.getElementById('anchorTotalSizeLarge').addEventListener("click", () => { setTotalSize(TOTAL_SIZES_MB.LARGE) })

        // Get store client
        storeClient = cordova.require("com.salesforce.plugin.smartstore.client")
        // Reset result table
        resetResultTable("BENCHMARK pick one")
        // Set total size
        setTotalSize(TOTAL_SIZES_MB.SMALL)
    })
}

main()
